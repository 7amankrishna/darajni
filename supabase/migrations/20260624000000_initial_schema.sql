create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'warned', 'restricted', 'blocked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role public.user_role not null default 'user',
  phone text not null default '' check (char_length(phone) <= 20),
  address_line_1 text not null default '' check (char_length(address_line_1) <= 160),
  address_line_2 text not null default '' check (char_length(address_line_2) <= 160),
  city text not null default '' check (char_length(city) <= 80),
  state text not null default '' check (char_length(state) <= 80),
  postal_code text not null default '' check (char_length(postal_code) <= 12),
  account_status public.account_status not null default 'active',
  moderation_message text check (moderation_message is null or char_length(moderation_message) <= 500),
  moderated_at timestamptz,
  moderated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Customer'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_admin_fields();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_name_lower_idx
  on public.categories (lower(name));

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

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null,
  price numeric(12, 2) not null check (price > 0),
  fabric text not null,
  description text not null check (char_length(description) >= 30),
  tags text[] not null default '{}',
  images text[] not null check (cardinality(images) > 0),
  featured boolean not null default false,
  available boolean not null default true,
  color text not null default '#caaa70',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

drop trigger if exists categories_protect_delete on public.categories;
create trigger categories_protect_delete
  before delete on public.categories
  for each row execute procedure public.protect_category_delete();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default 'Customer',
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 1000),
  status public.review_status not null default 'pending',
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

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

create index if not exists reviews_product_status_idx on public.reviews(product_id, status);
create index if not exists reviews_user_idx on public.reviews(user_id);

create or replace function public.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select full_name into new.author_name from public.profiles where id = new.user_id;
  new.author_name = coalesce(new.author_name, 'Customer');
  return new;
end;
$$;

drop trigger if exists reviews_set_author on public.reviews;
create trigger reviews_set_author
  before insert or update of user_id on public.reviews
  for each row execute procedure public.set_review_author();

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

create or replace function public.sanitize_customer_review_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'postgres'
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    new.user_id = old.user_id;
    new.product_id = old.product_id;
    new.author_name = old.author_name;
    new.status = 'pending';
    new.moderation_note = null;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_sanitize_customer_update on public.reviews;
create trigger reviews_sanitize_customer_update
  before update on public.reviews
  for each row execute procedure public.sanitize_customer_review_update();

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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

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

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  using (true);

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  using (public.is_admin());

drop policy if exists "reviews_visible_to_public_owner_admin" on public.reviews;
create policy "reviews_visible_to_public_owner_admin"
  on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());

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

drop policy if exists "reviews_admin_update" on public.reviews;
create policy "reviews_admin_update"
  on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reviews_owner_or_admin_delete" on public.reviews;
create policy "reviews_owner_or_admin_delete"
  on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, delete on public.categories to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select, update on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

insert into public.categories (name, slug, is_system)
values
  ('Lehenga', 'lehenga', true),
  ('Anarkali', 'anarkali', true),
  ('Saree', 'saree', true),
  ('Gown', 'gown', true),
  ('Sharara', 'sharara', true),
  ('Kurti', 'kurti', true)
on conflict (slug) do update set is_system = true;
