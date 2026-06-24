do $$ begin
  create type public.account_status as enum ('active', 'warned', 'restricted', 'blocked');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists address_line_1 text not null default '',
  add column if not exists address_line_2 text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists account_status public.account_status not null default 'active',
  add column if not exists moderation_message text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid;

do $$ begin
  alter table public.profiles
    add constraint profiles_phone_length check (char_length(phone) <= 20),
    add constraint profiles_address_1_length check (char_length(address_line_1) <= 160),
    add constraint profiles_address_2_length check (char_length(address_line_2) <= 160),
    add constraint profiles_city_length check (char_length(city) <= 80),
    add constraint profiles_state_length check (char_length(state) <= 80),
    add constraint profiles_postal_code_length check (char_length(postal_code) <= 12),
    add constraint profiles_moderation_message_length
      check (moderation_message is null or char_length(moderation_message) <= 500),
    add constraint profiles_moderated_by_fkey
      foreign key (moderated_by) references public.profiles(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_submit_reviews()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or account_status in ('active', 'warned'))
  );
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
       new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.moderation_message is distinct from old.moderation_message
       or new.moderated_at is distinct from old.moderated_at
       or new.moderated_by is distinct from old.moderated_by
     )
     and current_user <> 'postgres'
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an administrator can change protected profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_admin_fields();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_name_lower_idx
  on public.categories (lower(name));

delete from public.products
where slug in (
  'crimson-royale-lehenga',
  'rose-petal-lehenga',
  'midnight-zari-gown',
  'emerald-anarkali',
  'golden-sharara-set',
  'mauve-organza-saree'
);

insert into public.categories (name, slug, is_system)
values
  ('Lehenga', 'lehenga', true),
  ('Anarkali', 'anarkali', true),
  ('Saree', 'saree', true),
  ('Gown', 'gown', true),
  ('Sharara', 'sharara', true),
  ('Kurti', 'kurti', true)
on conflict (slug) do update set is_system = true;

insert into public.categories (name, slug, is_system)
select distinct
  p.category,
  trim(both '-' from regexp_replace(lower(p.category), '[^a-z0-9]+', '-', 'g')),
  false
from public.products p
where not exists (
  select 1 from public.categories c where lower(c.name) = lower(p.category)
)
on conflict (slug) do nothing;

create or replace function public.ensure_product_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.categories where name = new.category) then
    raise exception 'Product category does not exist';
  end if;
  return new;
end;
$$;

drop trigger if exists products_validate_category on public.products;
create trigger products_validate_category
  before insert or update of category on public.products
  for each row execute procedure public.ensure_product_category();

create or replace function public.protect_category_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_system then
    raise exception 'Fixed categories cannot be deleted';
  end if;
  if exists (select 1 from public.products where category = old.name) then
    raise exception 'Move products to another category before deleting this category';
  end if;
  return old;
end;
$$;

drop trigger if exists categories_protect_delete on public.categories;
create trigger categories_protect_delete
  before delete on public.categories
  for each row execute procedure public.protect_category_delete();

create or replace function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and (
    select count(*) from public.reviews
    where user_id = new.user_id
      and created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'Review rate limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit
  before insert on public.reviews
  for each row execute procedure public.enforce_review_rate_limit();

create or replace function public.sync_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.reviews
    set author_name = new.full_name
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_review_author on public.profiles;
create trigger profiles_sync_review_author
  after update of full_name on public.profiles
  for each row execute procedure public.sync_review_author_name();

alter table public.categories enable row level security;

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using ((id = auth.uid() and account_status <> 'blocked') or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories for select
  using (true);

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories for insert
  with check (public.is_admin() and not is_system);

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  using (public.is_admin() and not is_system);

drop policy if exists "reviews_user_insert_pending" on public.reviews;
create policy "reviews_user_insert_pending"
  on public.reviews for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and public.can_submit_reviews()
  );

drop policy if exists "reviews_user_update_unpublished" on public.reviews;
create policy "reviews_user_update_unpublished"
  on public.reviews for update
  using (
    user_id = auth.uid()
    and status <> 'approved'
    and public.can_submit_reviews()
  )
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and public.can_submit_reviews()
  );

grant select on public.categories to anon, authenticated;
grant insert, delete on public.categories to authenticated;
