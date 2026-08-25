-- =============================================================================
-- DARAJNI DESIGNER HOUSE — MASTER DATABASE SCHEMA
-- =============================================================================
-- One-file bootstrap for a FRESH Supabase project. Running this single script
-- creates the complete database for every feature currently in the app:
--
--   catalog + categories ............. products, categories, images, videos
--   guest checkout ................... orders, order_items, stock reservation,
--                                      server-side pricing (RPCs)
--   promos ........................... promo_codes, redemptions, archives
--   payments ......................... razorpay + payu columns/verification
--   logistics ........................ shiprocket_order_syncs outbox + RPCs
--   customer accounts ................ customer_profiles
--   reviews .......................... product_reviews (unique per user)
--   address deliverability ........... orders.deliverability_* columns
--   content ops ...................... homepage_slides, event_banners,
--                                      settings (hero copy/colors), storage buckets
--   public board ..................... requested_dresses (+comments) + bucket
--
-- Generated from supabase/migrations/*.sql (20260624000000 .. 20260825010000).
-- Re-generate after adding migrations; do not hand-edit sections.
--
-- HOW TO RUN
--   Option A: Supabase Dashboard -> SQL Editor -> paste entire file -> Run.
--   Option B: psql "$DATABASE_URL" -f supabase/master_schema.sql
--
-- Safe to re-run: every section is IF NOT EXISTS / upsert-guarded.
-- =============================================================================

-- =============================================================
-- MIGRATION: 20260624000000_initial_schema.sql
-- =============================================================
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


-- =============================================================
-- MIGRATION: 20260625000000_live_accounts_categories.sql
-- =============================================================
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


-- =============================================================
-- MIGRATION: 20260625010000_optimized_product_images.sql
-- =============================================================
-- Product photos are compressed in the admin browser before upload. This limit
-- also prevents unoptimized files from bypassing the normal upload flow.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';


-- =============================================================
-- MIGRATION: 20260625020000_ecommerce_core.sql
-- =============================================================
-- Phase 2: replace the legacy account/review schema with the normalized
-- guest-checkout commerce schema. Existing categories, products, and
-- administrator identities are preserved where possible.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.order_status as enum (
    'pending',
    'confirmed',
    'packed',
    'shipped',
    'delivered',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('cod', 'razorpay');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending',
    'paid',
    'failed',
    'refunded'
  );
exception
  when duplicate_object then null;
end $$;

-- Admin access is tied directly to Supabase Auth. Customer profiles are not
-- stored: storefront checkout remains guest-first.
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Preserve administrator identities from the legacy profile table before it
-- is removed. New installations can bootstrap the first admin with a reviewed
-- SQL statement documented below.
insert into public.admin_users (id, created_at)
select id, created_at
from public.profiles
where role = 'admin'
on conflict (id) do nothing;

drop policy if exists "product_images_admin_insert" on storage.objects;
drop policy if exists "product_images_admin_update" on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;

drop policy if exists "categories_admin_insert" on public.categories;
drop policy if exists "categories_admin_delete" on public.categories;
drop policy if exists "categories_public_read" on public.categories;

drop policy if exists "products_public_read" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_sync_review_author on public.profiles;
drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists reviews_set_author on public.reviews;
drop trigger if exists reviews_updated_at on public.reviews;
drop trigger if exists reviews_sanitize_customer_update on public.reviews;
drop trigger if exists reviews_rate_limit on public.reviews;
drop trigger if exists products_validate_category on public.products;
drop trigger if exists products_updated_at on public.products;
drop trigger if exists categories_protect_delete on public.categories;

drop table if exists public.reviews cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user();
drop function if exists public.can_submit_reviews();
drop function if exists public.protect_profile_admin_fields();
drop function if exists public.sync_review_author_name();
drop function if exists public.set_review_author();
drop function if exists public.sanitize_customer_review_update();
drop function if exists public.enforce_review_rate_limit();
drop function if exists public.ensure_product_category();
drop function if exists public.protect_category_delete();
drop function if exists public.is_admin();

drop type if exists public.review_status;
drop type if exists public.account_status;
drop type if exists public.user_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users
    where id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Rebuild products to replace the denormalized category name with category_id
-- and add inventory, sizing, and discount fields.
alter table public.products rename to products_legacy;

create table public.products_new (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null check (char_length(trim(description)) between 30 and 5000),
  fabric text not null check (char_length(trim(fabric)) between 2 and 1000),
  size text[] not null default array['Custom']::text[]
    check (cardinality(size) > 0),
  stock integer not null default 0 check (stock >= 0),
  price numeric(12, 2) not null check (price >= 0),
  discount numeric(5, 2) not null default 0
    check (discount >= 0 and discount <= 100),
  images text[] not null default '{}'::text[]
    check (cardinality(images) > 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products_new (
  id,
  name,
  slug,
  description,
  fabric,
  size,
  stock,
  price,
  discount,
  images,
  category_id,
  is_featured,
  is_active,
  created_at,
  updated_at
)
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.fabric,
  array['Custom']::text[],
  case when p.available then 1 else 0 end,
  p.price,
  0,
  p.images,
  c.id,
  p.featured,
  p.available,
  p.created_at,
  p.updated_at
from public.products_legacy p
join public.categories c on lower(c.name) = lower(p.category);

drop table public.products_legacy cascade;
alter table public.products_new rename to products;

create index products_category_id_idx on public.products(category_id);
create index products_active_created_idx
  on public.products(is_active, created_at desc);
create index products_featured_idx
  on public.products(is_featured, created_at desc)
  where is_featured = true and is_active = true;
create index products_low_stock_idx
  on public.products(stock)
  where is_active = true;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

create or replace function public.protect_system_category_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.is_system then
    raise exception 'Fixed categories cannot be deleted';
  end if;
  return old;
end;
$$;

create or replace function public.protect_system_category_flag()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_system is distinct from old.is_system then
    raise exception 'The fixed-category flag cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists categories_protect_system_delete on public.categories;
create trigger categories_protect_system_delete
  before delete on public.categories
  for each row execute procedure public.protect_system_category_delete();

drop trigger if exists categories_protect_system_flag on public.categories;
create trigger categories_protect_system_flag
  before update of is_system on public.categories
  for each row execute procedure public.protect_system_category_flag();

create sequence if not exists public.order_number_seq;

create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select
    'DJ-' ||
    to_char(clock_timestamp() at time zone 'Asia/Kolkata', 'YYYYMMDD') ||
    '-' ||
    lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

revoke all on function public.generate_order_number() from public;
grant execute on function public.generate_order_number() to service_role;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number()
    check (order_number ~ '^DJ-[0-9]{8}-[0-9]{6,}$'),
  customer_name text not null
    check (char_length(trim(customer_name)) between 2 and 100),
  phone text not null
    check (char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 15),
  address text not null
    check (char_length(trim(address)) between 10 and 300),
  city text not null check (char_length(trim(city)) between 2 and 80),
  state text not null check (char_length(trim(state)) between 2 and 80),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  landmark text check (
    landmark is null or char_length(trim(landmark)) between 2 and 160
  ),
  email text check (
    email is null or (
      char_length(email) <= 254
      and position('@' in email) > 1
    )
  ),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  status public.order_status not null default 'pending',
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = round(subtotal + shipping_fee + tax_amount, 2)),
  check (
    payment_method = 'razorpay'
    or (
      razorpay_order_id is null
      and razorpay_payment_id is null
    )
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_at_time text not null
    check (char_length(trim(product_name_at_time)) between 2 and 140),
  selected_size text not null
    check (char_length(trim(selected_size)) between 1 and 40),
  quantity integer not null check (quantity > 0 and quantity <= 50),
  price_at_time numeric(12, 2) not null check (price_at_time >= 0),
  line_total numeric(12, 2)
    generated always as (round(quantity * price_at_time, 2)) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_id, selected_size)
);

create table public.archived_orders (
  id uuid primary key default gen_random_uuid(),
  original_order_id uuid not null unique,
  customer_name text not null
    check (char_length(trim(customer_name)) between 2 and 100),
  phone text not null
    check (char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 15),
  total numeric(12, 2) not null check (total >= 0),
  date_archived timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true check (id),
  shipping_charge numeric(12, 2) not null default 0
    check (shipping_charge >= 0),
  cod_enabled boolean not null default true,
  tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100),
  developer_support_number text not null default ''
    check (char_length(developer_support_number) <= 20),
  designer_support_number text not null default ''
    check (char_length(designer_support_number) <= 20),
  updated_at timestamptz not null default now()
);

insert into public.settings (id)
values (true)
on conflict (id) do nothing;

create index orders_status_created_idx
  on public.orders(status, created_at desc);
create index orders_phone_idx
  on public.orders((right(regexp_replace(phone, '\D', '', 'g'), 10)));
create index orders_delivered_at_idx
  on public.orders(delivered_at)
  where status = 'delivered';
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_product_id_idx on public.order_items(product_id);
create index archived_orders_date_archived_idx
  on public.archived_orders(date_archived);

create or replace function public.apply_order_status_metadata()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('packed', 'cancelled'))
      or (old.status = 'packed' and new.status in ('shipped', 'cancelled'))
      or (old.status = 'shipped' and new.status = 'delivered')
    ) then
      raise exception 'Invalid order status transition from % to %', old.status, new.status;
    end if;

    if new.status = 'delivered' then
      new.delivered_at = coalesce(new.delivered_at, now());
    elsif new.status = 'cancelled' then
      new.cancelled_at = coalesce(new.cancelled_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_apply_status_metadata on public.orders;
create trigger orders_apply_status_metadata
  before update of status on public.orders
  for each row execute procedure public.apply_order_status_metadata();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute procedure public.set_updated_at();

-- Tracking never exposes the orders table. The caller must provide both the
-- public order number (or UUID) and matching phone number.
create or replace function public.track_order(
  p_order_reference text,
  p_phone text
)
returns table (
  order_id uuid,
  order_number text,
  status public.order_status,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    o.id,
    o.order_number,
    o.status,
    o.created_at,
    o.updated_at
  from public.orders o
  where (
      o.order_number = upper(trim(p_order_reference))
      or o.id::text = trim(p_order_reference)
    )
    and right(regexp_replace(o.phone, '\D', '', 'g'), 10)
      = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to service_role;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.archived_orders enable row level security;
alter table public.settings enable row level security;

create policy "admin_users_admin_read"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "categories_admin_insert"
  on public.categories for insert
  to authenticated
  with check (public.is_admin() and not is_system);

create policy "categories_admin_update"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_admin_delete"
  on public.categories for delete
  to authenticated
  using (public.is_admin() and not is_system);

create policy "products_public_read_active"
  on public.products for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "products_admin_insert"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

create policy "products_admin_update"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_admin_delete"
  on public.products for delete
  to authenticated
  using (public.is_admin());

create policy "orders_admin_read"
  on public.orders for select
  to authenticated
  using (public.is_admin());

create policy "orders_admin_update"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items_admin_read"
  on public.order_items for select
  to authenticated
  using (public.is_admin());

create policy "archived_orders_admin_read"
  on public.archived_orders for select
  to authenticated
  using (public.is_admin());

create policy "settings_public_read"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "settings_admin_update"
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin() and id);

revoke all on public.admin_users from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.archived_orders from anon, authenticated;
revoke all on public.settings from anon, authenticated;

grant select on public.admin_users to authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.archived_orders to authenticated;
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;

grant all on public.admin_users to service_role;
grant all on public.categories to service_role;
grant all on public.products to service_role;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;
grant all on public.archived_orders to service_role;
grant all on public.settings to service_role;
grant usage, select on sequence public.order_number_seq to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

comment on table public.admin_users is
  'Supabase Auth users allowed to access the store administration tools.';
comment on table public.orders is
  'Active guest orders. Delivered orders are archived by Phase 5 lifecycle automation.';
comment on table public.archived_orders is
  'Minimal records retained after active delivered orders leave the operational tables.';
comment on table public.settings is
  'Singleton public store configuration; id must always be true.';


-- =============================================================
-- MIGRATION: 20260625030000_checkout_functions.sql
-- =============================================================
-- Phase 3: atomic guest checkout and payment lifecycle functions.
-- These functions are server-only and are never executable with the anon key.

create or replace function public.restore_stock_after_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = new.id
    and oi.product_id = p.id;

  return new;
end;
$$;

drop trigger if exists orders_restore_stock_after_cancellation on public.orders;
create trigger orders_restore_stock_after_cancellation
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute procedure public.restore_stock_after_cancellation();

create or replace function public.create_checkout_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  shipping_fee numeric,
  tax_amount numeric,
  total numeric,
  status public.order_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.settings%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_size text;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_tax numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_item_count integer;
begin
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'Customer details are required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart items are required';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 20 then
    raise exception 'Cart must contain between 1 and 20 items';
  end if;

  select * into v_settings
  from public.settings
  where id = true;

  if not found then
    raise exception 'Store settings are unavailable';
  end if;

  if p_payment_method = 'cod' and not v_settings.cod_enabled then
    raise exception 'Cash on delivery is currently unavailable';
  end if;

  -- Lock products in a stable order before calculating any amount. This
  -- prevents overselling and avoids trusting prices submitted by the browser.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'product_id', lower(trim(value ->> 'size'))
  loop
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'Each item must include a valid quantity';
    end;

    v_size := trim(coalesce(v_item ->> 'size', ''));

    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'Item quantity must be between 1 and 10';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found or not v_product.is_active then
      raise exception 'A cart product is no longer available';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    if v_size = '' or not (v_size = any(v_product.size)) then
      raise exception 'Choose a valid size for %', v_product.name;
    end if;

    v_unit_price := round(
      v_product.price * (1 - (v_product.discount / 100)),
      2
    );
    v_subtotal := v_subtotal + round(v_unit_price * v_quantity, 2);
  end loop;

  v_shipping := v_settings.shipping_charge;
  v_tax := round(v_subtotal * (v_settings.tax_rate / 100), 2);
  v_total := round(v_subtotal + v_shipping + v_tax, 2);

  insert into public.orders (
    customer_name,
    phone,
    address,
    city,
    state,
    pincode,
    landmark,
    email,
    subtotal,
    shipping_fee,
    tax_amount,
    total,
    payment_method
  )
  values (
    trim(p_customer ->> 'customer_name'),
    trim(p_customer ->> 'phone'),
    trim(p_customer ->> 'address'),
    trim(p_customer ->> 'city'),
    trim(p_customer ->> 'state'),
    trim(p_customer ->> 'pincode'),
    nullif(trim(p_customer ->> 'landmark'), ''),
    nullif(lower(trim(p_customer ->> 'email')), ''),
    v_subtotal,
    v_shipping,
    v_tax,
    v_total,
    p_payment_method
  )
  returning * into v_order;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'product_id', lower(trim(value ->> 'size'))
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_size := trim(v_item ->> 'size');

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    v_unit_price := round(
      v_product.price * (1 - (v_product.discount / 100)),
      2
    );

    insert into public.order_items (
      order_id,
      product_id,
      product_name_at_time,
      selected_size,
      quantity,
      price_at_time
    )
    values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_size,
      v_quantity,
      v_unit_price
    );

    update public.products
    set stock = stock - v_quantity
    where id = v_product.id;
  end loop;

  return query
  select
    v_order.id,
    v_order.order_number,
    v_order.subtotal,
    v_order.shipping_fee,
    v_order.tax_amount,
    v_order.total,
    v_order.status;
end;
$$;

create or replace function public.cancel_order_reservation(
  p_order_id uuid,
  p_payment_failed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = case
      when p_payment_failed then 'failed'::public.payment_status
      else payment_status
    end
  where id = p_order_id
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending';

  if not found then
    raise exception 'Order cannot be cancelled';
  end if;
end;
$$;

create or replace function public.confirm_razorpay_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_number text;
begin
  update public.orders
  set
    payment_status = 'paid',
    razorpay_payment_id = p_razorpay_payment_id,
    status = 'confirmed'
  where id = p_order_id
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending'
    and razorpay_order_id = p_razorpay_order_id
  returning order_number into v_order_number;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

revoke all on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method
) from public;
revoke all on function public.cancel_order_reservation(uuid, boolean) from public;
revoke all on function public.confirm_razorpay_payment(uuid, text, text) from public;

grant execute on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method
) to service_role;
grant execute on function public.cancel_order_reservation(uuid, boolean)
  to service_role;
grant execute on function public.confirm_razorpay_payment(uuid, text, text)
  to service_role;


-- =============================================================
-- MIGRATION: 20260625040000_promos_lifecycle.sql
-- =============================================================
-- Phase 5: coupon/voucher promotions plus data lifecycle automation.
-- This migration only defines the automation and server-side discount logic.
-- Run it after Phase 2 and Phase 3 have successfully created orders/products.

do $$ begin
  create type public.promo_code_type as enum ('coupon', 'voucher');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.promo_discount_type as enum ('percentage', 'fixed_amount');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'
    ),
  title text not null check (char_length(trim(title)) between 2 and 100),
  description text check (
    description is null or char_length(trim(description)) <= 300
  ),
  code_type public.promo_code_type not null default 'coupon',
  discount_type public.promo_discount_type not null,
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_subtotal numeric(12, 2) not null default 0
    check (minimum_subtotal >= 0),
  maximum_discount numeric(12, 2) check (
    maximum_discount is null or maximum_discount > 0
  ),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_phone_limit integer not null default 1
    check (per_phone_limit between 1 and 100000),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    discount_type <> 'percentage'
    or discount_value <= 100
  ),
  check (
    starts_at is null
    or ends_at is null
    or starts_at < ends_at
  )
);

create index if not exists promo_codes_active_window_idx
  on public.promo_codes(is_active, starts_at, ends_at);
create index if not exists promo_codes_type_idx on public.promo_codes(code_type);

alter table public.orders
  add column if not exists promo_code_id uuid,
  add column if not exists promo_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_promo_code_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_promo_code_id_fkey
      foreign key (promo_code_id)
      references public.promo_codes(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_discount_amount_nonnegative'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_discount_amount_nonnegative
      check (discount_amount >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_discount_not_above_subtotal'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_discount_not_above_subtotal
      check (discount_amount <= subtotal);
  end if;
end $$;

do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%total%'
      and pg_get_constraintdef(oid) like '%subtotal%'
      and pg_get_constraintdef(oid) like '%shipping_fee%'
      and pg_get_constraintdef(oid) like '%tax_amount%'
      and pg_get_constraintdef(oid) not like '%discount_amount%'
  loop
    execute format('alter table public.orders drop constraint %I', v_constraint);
  end loop;
end $$;

alter table public.orders
  drop constraint if exists orders_total_matches_components;

alter table public.orders
  add constraint orders_total_matches_components
  check (
    total = round(subtotal - discount_amount + shipping_fee + tax_amount, 2)
  );

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  order_id uuid unique references public.orders(id) on delete set null,
  order_number text not null,
  phone_last10 text not null check (phone_last10 ~ '^[0-9]{10}$'),
  subtotal_at_time numeric(12, 2) not null check (subtotal_at_time >= 0),
  discount_amount numeric(12, 2) not null check (discount_amount > 0),
  redeemed_at timestamptz not null default now(),
  unique (promo_code_id, order_number)
);

create index if not exists promo_redemptions_code_redeemed_idx
  on public.promo_redemptions(promo_code_id, redeemed_at desc);
create index if not exists promo_redemptions_phone_idx
  on public.promo_redemptions(promo_code_id, phone_last10);

drop trigger if exists promo_codes_updated_at on public.promo_codes;
create trigger promo_codes_updated_at
  before update on public.promo_codes
  for each row execute procedure public.set_updated_at();

create or replace function public.normalize_promo_code(p_code text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));
$$;

create or replace function public.calculate_promo_discount(
  p_discount_type public.promo_discount_type,
  p_discount_value numeric,
  p_subtotal numeric,
  p_maximum_discount numeric default null
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    least(
      case
        when p_discount_type = 'percentage'
          then round(p_subtotal * (p_discount_value / 100), 2)
        else round(p_discount_value, 2)
      end,
      coalesce(p_maximum_discount, p_subtotal),
      p_subtotal
    )
  );
$$;

create or replace function public.resolve_promo_discount(
  p_promo_code text,
  p_subtotal numeric,
  p_phone text default null,
  p_lock boolean default false
)
returns table (
  promo_code_id uuid,
  code text,
  code_type public.promo_code_type,
  discount_type public.promo_discount_type,
  discount_amount numeric,
  discounted_subtotal numeric,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := public.normalize_promo_code(p_promo_code);
  v_promo public.promo_codes%rowtype;
  v_phone_last10 text;
  v_total_redemptions integer;
  v_phone_redemptions integer;
  v_discount numeric(12, 2);
begin
  if v_code = '' then
    raise exception 'Enter a coupon or voucher code';
  end if;

  if p_subtotal <= 0 then
    raise exception 'A coupon or voucher needs a valid cart subtotal';
  end if;

  if p_lock then
    select *
    into v_promo
    from public.promo_codes
    where code = v_code
    for update;
  else
    select *
    into v_promo
    from public.promo_codes
    where code = v_code;
  end if;

  if not found then
    raise exception 'Coupon or voucher code is not valid';
  end if;

  if not v_promo.is_active then
    raise exception 'Coupon or voucher code is not active';
  end if;

  if v_promo.starts_at is not null and v_promo.starts_at > now() then
    raise exception 'Coupon or voucher code is not active yet';
  end if;

  if v_promo.ends_at is not null and v_promo.ends_at <= now() then
    raise exception 'Coupon or voucher code has expired';
  end if;

  if p_subtotal < v_promo.minimum_subtotal then
    raise exception 'Cart subtotal is below the minimum required for this code';
  end if;

  select count(*)::integer
  into v_total_redemptions
  from public.promo_redemptions
  where promo_code_id = v_promo.id;

  if v_promo.usage_limit is not null
     and v_total_redemptions >= v_promo.usage_limit then
    raise exception 'Coupon or voucher code has reached its usage limit';
  end if;

  v_phone_last10 := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  if char_length(v_phone_last10) = 10 then
    select count(*)::integer
    into v_phone_redemptions
    from public.promo_redemptions
    where promo_code_id = v_promo.id
      and phone_last10 = v_phone_last10;

    if v_phone_redemptions >= v_promo.per_phone_limit then
      raise exception 'This phone number has already used this code';
    end if;
  end if;

  v_discount := public.calculate_promo_discount(
    v_promo.discount_type,
    v_promo.discount_value,
    p_subtotal,
    v_promo.maximum_discount
  );

  if v_discount <= 0 then
    raise exception 'Coupon or voucher code does not reduce this order';
  end if;

  return query
  select
    v_promo.id,
    v_promo.code,
    v_promo.code_type,
    v_promo.discount_type,
    v_discount,
    round(p_subtotal - v_discount, 2),
    case
      when v_promo.code_type = 'voucher' then 'Voucher applied'
      else 'Coupon applied'
    end;
end;
$$;

create or replace function public.quote_checkout_discount(
  p_promo_code text,
  p_items jsonb,
  p_phone text default null
)
returns table (
  promo_code_id uuid,
  code text,
  code_type public.promo_code_type,
  discount_type public.promo_discount_type,
  discount_amount numeric,
  discounted_subtotal numeric,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
  v_item jsonb;
  v_quantity integer;
  v_size text;
  v_subtotal numeric(12, 2) := 0;
  v_item_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart items are required';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 20 then
    raise exception 'Cart must contain between 1 and 20 items';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'product_id', lower(trim(value ->> 'size'))
  loop
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'Each item must include a valid quantity';
    end;

    v_size := trim(coalesce(v_item ->> 'size', ''));

    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'Item quantity must be between 1 and 10';
    end if;

    select *
    into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    if not found or not v_product.is_active then
      raise exception 'A cart product is no longer available';
    end if;

    if v_size = '' or not (v_size = any(v_product.size)) then
      raise exception 'Choose a valid size for %', v_product.name;
    end if;

    v_subtotal := v_subtotal + round(
      round(v_product.price * (1 - (v_product.discount / 100)), 2) *
      v_quantity,
      2
    );
  end loop;

  return query
  select *
  from public.resolve_promo_discount(p_promo_code, v_subtotal, p_phone, false);
end;
$$;

create or replace function public.create_checkout_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method,
  p_promo_code text default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
  promo_code text,
  shipping_fee numeric,
  tax_amount numeric,
  total numeric,
  status public.order_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.settings%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_size text;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_discounted_subtotal numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_tax numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_item_count integer;
  v_promo_id uuid;
  v_promo_code text;
  v_phone_last10 text;
begin
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'Customer details are required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart items are required';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 20 then
    raise exception 'Cart must contain between 1 and 20 items';
  end if;

  select * into v_settings
  from public.settings
  where id = true;

  if not found then
    raise exception 'Store settings are unavailable';
  end if;

  if p_payment_method = 'cod' and not v_settings.cod_enabled then
    raise exception 'Cash on delivery is currently unavailable';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'product_id', lower(trim(value ->> 'size'))
  loop
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'Each item must include a valid quantity';
    end;

    v_size := trim(coalesce(v_item ->> 'size', ''));

    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'Item quantity must be between 1 and 10';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found or not v_product.is_active then
      raise exception 'A cart product is no longer available';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    if v_size = '' or not (v_size = any(v_product.size)) then
      raise exception 'Choose a valid size for %', v_product.name;
    end if;

    v_unit_price := round(
      v_product.price * (1 - (v_product.discount / 100)),
      2
    );
    v_subtotal := v_subtotal + round(v_unit_price * v_quantity, 2);
  end loop;

  if public.normalize_promo_code(p_promo_code) <> '' then
    select
      resolved.promo_code_id,
      resolved.code,
      resolved.discount_amount,
      resolved.discounted_subtotal
    into
      v_promo_id,
      v_promo_code,
      v_discount,
      v_discounted_subtotal
    from public.resolve_promo_discount(
      p_promo_code,
      v_subtotal,
      p_customer ->> 'phone',
      true
    ) resolved;
  else
    v_discounted_subtotal := v_subtotal;
  end if;

  v_shipping := v_settings.shipping_charge;
  v_tax := round(v_discounted_subtotal * (v_settings.tax_rate / 100), 2);
  v_total := round(v_discounted_subtotal + v_shipping + v_tax, 2);

  insert into public.orders (
    customer_name,
    phone,
    address,
    city,
    state,
    pincode,
    landmark,
    email,
    subtotal,
    discount_amount,
    promo_code_id,
    promo_code,
    shipping_fee,
    tax_amount,
    total,
    payment_method
  )
  values (
    trim(p_customer ->> 'customer_name'),
    trim(p_customer ->> 'phone'),
    trim(p_customer ->> 'address'),
    trim(p_customer ->> 'city'),
    trim(p_customer ->> 'state'),
    trim(p_customer ->> 'pincode'),
    nullif(trim(p_customer ->> 'landmark'), ''),
    nullif(lower(trim(p_customer ->> 'email')), ''),
    v_subtotal,
    v_discount,
    v_promo_id,
    v_promo_code,
    v_shipping,
    v_tax,
    v_total,
    p_payment_method
  )
  returning * into v_order;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'product_id', lower(trim(value ->> 'size'))
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_size := trim(v_item ->> 'size');

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    v_unit_price := round(
      v_product.price * (1 - (v_product.discount / 100)),
      2
    );

    insert into public.order_items (
      order_id,
      product_id,
      product_name_at_time,
      selected_size,
      quantity,
      price_at_time
    )
    values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_size,
      v_quantity,
      v_unit_price
    );

    update public.products
    set stock = stock - v_quantity
    where id = v_product.id;
  end loop;

  if v_promo_id is not null then
    v_phone_last10 := right(regexp_replace(v_order.phone, '\D', '', 'g'), 10);
    insert into public.promo_redemptions (
      promo_code_id,
      order_id,
      order_number,
      phone_last10,
      subtotal_at_time,
      discount_amount
    )
    values (
      v_promo_id,
      v_order.id,
      v_order.order_number,
      v_phone_last10,
      v_subtotal,
      v_discount
    );
  end if;

  return query
  select
    v_order.id,
    v_order.order_number,
    v_order.subtotal,
    v_order.discount_amount,
    v_order.promo_code,
    v_order.shipping_fee,
    v_order.tax_amount,
    v_order.total,
    v_order.status;
end;
$$;

create or replace function public.release_promo_after_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.promo_redemptions
  where order_id = new.id;
  return new;
end;
$$;

drop trigger if exists orders_release_promo_after_cancellation on public.orders;
create trigger orders_release_promo_after_cancellation
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute procedure public.release_promo_after_cancellation();

create or replace function public.run_store_maintenance()
returns table (
  archived_orders integer,
  deleted_archives integer,
  cancelled_expired_razorpay integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_archived integer := 0;
  v_deleted integer := 0;
  v_cancelled integer := 0;
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = 'failed'
  where payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '1 hour';
  get diagnostics v_cancelled = row_count;

  insert into public.archived_orders (
    original_order_id,
    customer_name,
    phone,
    total,
    date_archived
  )
  select
    id,
    customer_name,
    phone,
    total,
    now()
  from public.orders
  where status = 'delivered'
    and delivered_at is not null
    and delivered_at < now() - interval '10 days'
  on conflict (original_order_id) do nothing;

  delete from public.orders o
  where o.status = 'delivered'
    and o.delivered_at is not null
    and o.delivered_at < now() - interval '10 days'
    and exists (
      select 1
      from public.archived_orders a
      where a.original_order_id = o.id
    );
  get diagnostics v_archived = row_count;

  delete from public.archived_orders
  where date_archived < now() - interval '90 days';
  get diagnostics v_deleted = row_count;

  return query select v_archived, v_deleted, v_cancelled;
end;
$$;

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists "promo_codes_admin_read" on public.promo_codes;
drop policy if exists "promo_codes_admin_insert" on public.promo_codes;
drop policy if exists "promo_codes_admin_update" on public.promo_codes;
drop policy if exists "promo_codes_admin_delete" on public.promo_codes;
drop policy if exists "promo_redemptions_admin_read" on public.promo_redemptions;

create policy "promo_codes_admin_read"
  on public.promo_codes for select
  to authenticated
  using (public.is_admin());

create policy "promo_codes_admin_insert"
  on public.promo_codes for insert
  to authenticated
  with check (public.is_admin());

create policy "promo_codes_admin_update"
  on public.promo_codes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "promo_codes_admin_delete"
  on public.promo_codes for delete
  to authenticated
  using (public.is_admin());

create policy "promo_redemptions_admin_read"
  on public.promo_redemptions for select
  to authenticated
  using (public.is_admin());

revoke all on public.promo_codes from anon, authenticated;
revoke all on public.promo_redemptions from anon, authenticated;
grant select, insert, update, delete on public.promo_codes to authenticated;
grant select on public.promo_redemptions to authenticated;

grant all on public.promo_codes to service_role;
grant all on public.promo_redemptions to service_role;

revoke all on function public.normalize_promo_code(text) from public;
revoke all on function public.calculate_promo_discount(
  public.promo_discount_type,
  numeric,
  numeric,
  numeric
) from public;
revoke all on function public.resolve_promo_discount(
  text,
  numeric,
  text,
  boolean
) from public;
revoke all on function public.quote_checkout_discount(text, jsonb, text)
  from public;
revoke all on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method,
  text
) from public;
revoke all on function public.run_store_maintenance() from public;

grant execute on function public.quote_checkout_discount(text, jsonb, text)
  to service_role;
grant execute on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method,
  text
) to service_role;
grant execute on function public.run_store_maintenance() to service_role;

comment on table public.promo_codes is
  'Admin-managed coupon and voucher codes. Discounts are calculated in PostgreSQL during checkout.';
comment on table public.promo_redemptions is
  'Authoritative promotion usage records used for global and per-phone redemption limits.';
comment on function public.run_store_maintenance() is
  'Archives delivered orders after 10 days, deletes archived records after 90 days, and cancels stale pending Razorpay reservations.';


-- =============================================================
-- MIGRATION: 20260709000000_customer_accounts.sql
-- =============================================================
-- Customer accounts for storefront users. Profiles intentionally store only
-- basic delivery/contact details; there is no profile-image storage surface.

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '' check (char_length(email) <= 254),
  full_name text not null default ''
    check (full_name = '' or char_length(trim(full_name)) between 2 and 100),
  phone text not null default ''
    check (
      phone = ''
      or char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 15
    ),
  address text not null default '' check (char_length(address) <= 300),
  city text not null default '' check (char_length(city) <= 80),
  state text not null default '' check (char_length(state) <= 80),
  pincode text not null default ''
    check (pincode = '' or pincode ~ '^[1-9][0-9]{5}$'),
  landmark text not null default '' check (char_length(landmark) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists customer_id uuid references auth.users(id) on delete set null;

create index if not exists customer_profiles_phone_last10_idx
  on public.customer_profiles((right(regexp_replace(phone, '\D', '', 'g'), 10)))
  where phone <> '';

create index if not exists orders_customer_id_created_idx
  on public.orders(customer_id, created_at desc)
  where customer_id is not null;

create index if not exists orders_email_lower_idx
  on public.orders(lower(email))
  where email is not null;

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Customer'
  );

  if char_length(trim(v_full_name)) < 2 then
    v_full_name := 'Customer';
  end if;

  insert into public.customer_profiles (id, email, full_name)
  values (new.id, coalesce(lower(new.email), ''), v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_customer_user_created on auth.users;
create trigger on_auth_customer_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer_user();

drop trigger if exists customer_profiles_updated_at on public.customer_profiles;
create trigger customer_profiles_updated_at
  before update on public.customer_profiles
  for each row execute procedure public.set_updated_at();

alter table public.customer_profiles enable row level security;

drop policy if exists "customer_profiles_select_own" on public.customer_profiles;
create policy "customer_profiles_select_own"
  on public.customer_profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "customer_profiles_insert_own" on public.customer_profiles;
create policy "customer_profiles_insert_own"
  on public.customer_profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "customer_profiles_update_own" on public.customer_profiles;
create policy "customer_profiles_update_own"
  on public.customer_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "orders_customer_read" on public.orders;
create policy "orders_customer_read"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "order_items_customer_read" on public.order_items;
create policy "order_items_customer_read"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

revoke all on public.customer_profiles from anon, authenticated;
grant select, insert, update on public.customer_profiles to authenticated;
grant all on public.customer_profiles to service_role;

comment on table public.customer_profiles is
  'Storefront customer account details without profile-image uploads.';


-- =============================================================
-- MIGRATION: 20260711000000_shiprocket_order_sync.sql
-- =============================================================
-- Shiprocket is an external fulfilment processor. Keep only delivery metadata
-- and integration state locally; never persist Shiprocket credentials/tokens or
-- request payloads containing customer delivery details.

create table public.shiprocket_order_syncs (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'syncing', 'synced', 'failed', 'skipped')),
  shiprocket_order_id text,
  shipment_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 300),
  next_retry_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'synced'
    or (shiprocket_order_id is not null and synced_at is not null)
  )
);

create index shiprocket_order_syncs_retry_idx
  on public.shiprocket_order_syncs (status, next_retry_at, updated_at);

drop trigger if exists shiprocket_order_syncs_updated_at on public.shiprocket_order_syncs;
create trigger shiprocket_order_syncs_updated_at
  before update on public.shiprocket_order_syncs
  for each row execute procedure public.set_updated_at();

alter table public.shiprocket_order_syncs enable row level security;

revoke all on public.shiprocket_order_syncs from anon, authenticated;
grant all on public.shiprocket_order_syncs to service_role;

-- A conditional claim prevents the Razorpay browser verification and webhook
-- from creating the same Shiprocket order concurrently. A stale claim can be
-- reclaimed after 15 minutes if a serverless invocation stopped mid-request.
create or replace function public.claim_shiprocket_order_sync(
  p_order_id uuid
)
returns table (attempt_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.shiprocket_order_syncs (order_id)
  values (p_order_id)
  on conflict (order_id) do nothing;

  return query
  update public.shiprocket_order_syncs as sync
  set
    status = 'syncing',
    attempt_count = sync.attempt_count + 1,
    next_retry_at = null,
    last_error = null
  where sync.order_id = p_order_id
    and (
      sync.status = 'pending'
      or (
        sync.status = 'failed'
        and (sync.next_retry_at is null or sync.next_retry_at <= now())
      )
      or (
        sync.status = 'syncing'
        and sync.updated_at <= now() - interval '15 minutes'
      )
    )
  returning sync.attempt_count;
end;
$$;

revoke all on function public.claim_shiprocket_order_sync(uuid) from public;
grant execute on function public.claim_shiprocket_order_sync(uuid) to service_role;

create or replace function public.get_due_shiprocket_order_syncs(
  p_limit integer default 25
)
returns table (order_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select sync.order_id
  from public.shiprocket_order_syncs as sync
  where sync.status = 'pending'
    or (
      sync.status = 'failed'
      and (sync.next_retry_at is null or sync.next_retry_at <= now())
    )
    or (
      sync.status = 'syncing'
      and sync.updated_at <= now() - interval '15 minutes'
    )
  order by coalesce(sync.next_retry_at, sync.created_at), sync.created_at
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

revoke all on function public.get_due_shiprocket_order_syncs(integer) from public;
grant execute on function public.get_due_shiprocket_order_syncs(integer) to service_role;


-- =============================================================
-- MIGRATION: 20260714000000_homepage_launch_slides.sql
-- =============================================================
-- Admin-managed homepage launches. A slide can be scheduled in advance and
-- links to either an internal storefront route or an approved HTTPS destination.

create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  eyebrow text check (
    eyebrow is null or char_length(trim(eyebrow)) <= 60
  ),
  description text check (
    description is null or char_length(trim(description)) <= 320
  ),
  image_url text not null check (
    char_length(image_url) <= 2048
    and (
      (image_url like '/%' and image_url not like '//%')
      or image_url like 'https://%'
    )
  ),
  link_url text not null default '/collection' check (
    char_length(link_url) <= 2048
    and (
      (link_url like '/%' and link_url not like '//%')
      or link_url like 'https://%'
    )
  ),
  cta_label text not null default 'Explore now' check (
    char_length(trim(cta_label)) between 2 and 40
  ),
  sort_order integer not null default 0 check (
    sort_order between 0 and 10000
  ),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index if not exists homepage_slides_public_order_idx
  on public.homepage_slides (sort_order, created_at)
  where is_active = true;

drop trigger if exists homepage_slides_updated_at on public.homepage_slides;
create trigger homepage_slides_updated_at
  before update on public.homepage_slides
  for each row execute procedure public.set_updated_at();

alter table public.homepage_slides enable row level security;

drop policy if exists "homepage_slides_public_read_live" on public.homepage_slides;
create policy "homepage_slides_public_read_live"
  on public.homepage_slides for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

revoke all on public.homepage_slides from anon, authenticated;
grant select on public.homepage_slides to anon, authenticated;
grant all on public.homepage_slides to service_role;


-- =============================================================
-- MIGRATION: 20260721000000_requested_dresses.sql
-- =============================================================
-- Public user-submitted dress references displayed on the storefront homepage.
-- Writes pass through the server API; anonymous database/storage writes remain disabled.

create table if not exists public.requested_dresses (
  id uuid primary key default gen_random_uuid(),
  image_url text not null check (
    char_length(image_url) <= 2048
    and image_url like 'https://%'
  ),
  storage_path text not null unique check (
    char_length(trim(storage_path)) between 3 and 512
  ),
  description text check (
    description is null or char_length(trim(description)) between 1 and 160
  ),
  status text not null default 'published' check (
    status in ('published', 'hidden')
  ),
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists requested_dresses_public_feed_idx
  on public.requested_dresses (created_at desc)
  where status = 'published';

alter table public.requested_dresses enable row level security;

drop policy if exists "requested_dresses_public_read" on public.requested_dresses;
create policy "requested_dresses_public_read"
  on public.requested_dresses for select
  to anon, authenticated
  using (status = 'published');

revoke all on public.requested_dresses from anon, authenticated;
grant select (id, image_url, description, created_at)
  on public.requested_dresses to anon, authenticated;
grant all on public.requested_dresses to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'requested-dresses',
  'requested-dresses',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "requested_dresses_images_public_read" on storage.objects;
create policy "requested_dresses_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'requested-dresses');

comment on table public.requested_dresses is
  'Public dress-reference images and optional notes submitted with explicit homepage-display consent.';


-- =============================================================
-- MIGRATION: 20260722000000_requested_dresses_and_comments.sql
-- =============================================================
-- 1. Create requested_dresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.requested_dresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL CHECK (
    char_length(image_url) <= 2048
    AND image_url LIKE 'https://%'
  ),
  storage_path TEXT NOT NULL UNIQUE CHECK (
    char_length(trim(storage_path)) BETWEEN 3 AND 512
  ),
  description TEXT CHECK (
    description IS NULL OR char_length(trim(description)) BETWEEN 1 AND 160
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'published', 'hidden', 'rejected')
  ),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update constraint if table already existed with older constraint
ALTER TABLE public.requested_dresses DROP CONSTRAINT IF EXISTS requested_dresses_status_check;
ALTER TABLE public.requested_dresses ADD CONSTRAINT requested_dresses_status_check 
CHECK (status IN ('pending', 'published', 'hidden', 'rejected'));

-- Index and RLS for requested_dresses
CREATE INDEX IF NOT EXISTS requested_dresses_public_feed_idx
  ON public.requested_dresses (created_at DESC)
  WHERE status = 'published';

ALTER TABLE public.requested_dresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requested_dresses_public_read" ON public.requested_dresses;
CREATE POLICY "requested_dresses_public_read"
  ON public.requested_dresses FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

REVOKE ALL ON public.requested_dresses FROM anon, authenticated;
GRANT SELECT (id, image_url, description, created_at)
  ON public.requested_dresses TO anon, authenticated;
GRANT ALL ON public.requested_dresses TO service_role;

-- Storage Bucket Setup for requested-dresses
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'requested-dresses',
  'requested-dresses',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "requested_dresses_images_public_read" ON storage.objects;
CREATE POLICY "requested_dresses_images_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'requested-dresses');

-- 2. Create requested_dress_comments table
CREATE TABLE IF NOT EXISTS public.requested_dress_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requested_dress_id UUID REFERENCES public.requested_dresses(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (char_length(trim(comment_text)) >= 1),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.requested_dress_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved comments" ON public.requested_dress_comments;
CREATE POLICY "Public can view approved comments" 
ON public.requested_dress_comments FOR SELECT 
USING (status = 'approved');

DROP POLICY IF EXISTS "Public can insert comments" ON public.requested_dress_comments;
CREATE POLICY "Public can insert comments" 
ON public.requested_dress_comments FOR INSERT 
WITH CHECK (true);

GRANT SELECT, INSERT ON public.requested_dress_comments TO anon, authenticated;
GRANT ALL ON public.requested_dress_comments TO service_role;


-- =============================================================
-- MIGRATION: 20260723000000_requested_dresses_user_info.sql
-- =============================================================
-- Migration: Add user details columns to requested_dresses table

ALTER TABLE public.requested_dresses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_phone TEXT;

CREATE INDEX IF NOT EXISTS requested_dresses_user_id_idx
  ON public.requested_dresses (user_id)
  WHERE user_id IS NOT NULL;


-- =============================================================
-- MIGRATION: 20260724000000_orders_realtime.sql
-- =============================================================
-- Broadcast order changes to signed-in customers so their dashboard timeline
-- advances automatically when the status moves forward. Row visibility is still
-- governed by the existing `orders_customer_read` RLS policy, so each customer
-- only ever receives Realtime events for their own orders.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- UPDATE events omit unchanged/no-op detail unless the full row image is
-- replicated. REPLICA IDENTITY FULL guarantees the customer_id used by the
-- Realtime RLS filter is present on every change event.
alter table public.orders replica identity full;


-- =============================================================
-- MIGRATION: 20260724010000_shiprocket_status_webhook.sql
-- =============================================================
-- Inbound Shiprocket status webhook support. The courier reports shipment
-- movement (picked up, in transit, delivered); we record only the minimal
-- delivery metadata needed to advance the customer-facing order status. No
-- Shiprocket credentials, tokens, or raw payloads are ever persisted.

alter table public.shiprocket_order_syncs
  add column if not exists courier_awb text
    check (courier_awb is null or char_length(courier_awb) <= 100),
  add column if not exists courier_status text
    check (courier_status is null or char_length(courier_status) <= 100),
  add column if not exists courier_status_at timestamptz;

-- Advances an order forward to a courier-reported milestone (shipped/delivered),
-- stepping through each intermediate state so the existing status-transition
-- trigger validates every hop. Never moves an order backward and never
-- overrides a terminal (cancelled/delivered) status. Returns the resulting
-- status, or null when the order does not exist / target is not a courier state.
create or replace function public.advance_order_status(
  p_order_id uuid,
  p_target public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pipeline public.order_status[] :=
    array['pending', 'confirmed', 'packed', 'shipped', 'delivered']::public.order_status[];
  v_current public.order_status;
  v_current_rank integer;
  v_target_rank integer;
  v_next public.order_status;
begin
  -- Only forward courier milestones are accepted here.
  if p_target not in ('shipped', 'delivered') then
    return null;
  end if;

  select status into v_current
  from public.orders
  where id = p_order_id
  for update;

  if v_current is null then
    return null;
  end if;

  -- Terminal states are authoritative and never overridden by courier events.
  if v_current in ('cancelled', 'delivered') then
    return v_current;
  end if;

  v_current_rank := array_position(v_pipeline, v_current);
  v_target_rank := array_position(v_pipeline, p_target);

  -- Ignore stale or out-of-order events that would move the order backward.
  if v_target_rank <= v_current_rank then
    return v_current;
  end if;

  -- Step one status at a time (pendingâ†’confirmedâ†’packedâ†’shippedâ†’delivered) so
  -- the orders_apply_status_metadata trigger validates each transition.
  while v_current_rank < v_target_rank loop
    v_next := v_pipeline[v_current_rank + 1];
    update public.orders
      set status = v_next
      where id = p_order_id
        and status = v_current;
    v_current := v_next;
    v_current_rank := v_current_rank + 1;
  end loop;

  return v_current;
end;
$$;

revoke all on function public.advance_order_status(uuid, public.order_status) from public;
grant execute on function public.advance_order_status(uuid, public.order_status) to service_role;


-- =============================================================
-- MIGRATION: 20260724020000_payu_integration.sql
-- =============================================================
-- Migration: Add PayU payment gateway support

alter type public.payment_method add value if not exists 'payu';

alter table public.orders
  add column if not exists payu_txn_id text unique,
  add column if not exists payu_payment_id text;

-- RPC to confirm PayU payments cleanly and atomically
create or replace function public.confirm_payu_payment(
  p_order_id uuid,
  p_payu_txn_id text,
  p_payu_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_number text;
begin
  update public.orders
  set
    payment_status = 'paid',
    payu_payment_id = p_payu_payment_id,
    status = 'confirmed'
  where id = p_order_id
    and payment_method = 'payu'
    and payment_status = 'pending'
    and status = 'pending'
    and (payu_txn_id = p_payu_txn_id or payu_txn_id is null)
  returning order_number into v_order_number;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

-- Update store maintenance to cancel expired PayU orders as well
create or replace function public.run_store_maintenance()
returns table (
  archived_orders integer,
  deleted_archives integer,
  cancelled_expired_razorpay integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_archived integer := 0;
  v_deleted integer := 0;
  v_cancelled integer := 0;
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = 'failed'
  where (payment_method = 'razorpay' or payment_method = 'payu')
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '1 hour';
  get diagnostics v_cancelled = row_count;

  insert into public.archived_orders (
    original_order_id,
    customer_name,
    phone,
    total,
    status,
    archived_at
  )
  select
    id,
    customer_name,
    phone,
    total,
    status,
    now()
  from public.orders
  where created_at < now() - interval '90 days'
  on conflict (original_order_id) do nothing;
  get diagnostics v_archived = row_count;

  delete from public.archived_orders
  where archived_at < now() - interval '1 year';
  get diagnostics v_deleted = row_count;

  return query select v_archived, v_deleted, v_cancelled;
end;
$$;

revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
grant execute on function public.confirm_payu_payment(uuid, text, text) to service_role;
revoke all on function public.run_store_maintenance() from public;
grant execute on function public.run_store_maintenance() to service_role;


-- =============================================================
-- MIGRATION: 20260724030000_secure_payu_confirmation.sql
-- =============================================================
-- Repairs partially applied/manual PayU setup and makes payment confirmation
-- strict, idempotent, and safe to run after older PayU migrations.

alter type public.payment_method add value if not exists 'payu';

alter table public.orders
  add column if not exists payu_txn_id text,
  add column if not exists payu_payment_id text;

-- Use new index names so an index left behind by an interrupted earlier setup
-- cannot collide with this migration. Partial indexes allow multiple pending
-- legacy rows with no PayU reference.
create unique index if not exists orders_payu_txn_id_verified_unique_idx
  on public.orders (payu_txn_id)
  where payu_txn_id is not null;

create unique index if not exists orders_payu_payment_id_verified_unique_idx
  on public.orders (payu_payment_id)
  where payu_payment_id is not null;

-- Older scripts required a particular historical transaction-id format and
-- failed on existing rows. New IDs are validated by the server; this database
-- check only keeps stored references bounded and non-empty.
alter table public.orders
  drop constraint if exists orders_payu_reference_check;

alter table public.orders
  add constraint orders_payu_reference_check check (
    payment_method <> 'payu'
    or (
      (payu_txn_id is null or char_length(payu_txn_id) between 1 and 100)
      and (payu_payment_id is null or char_length(payu_payment_id) between 1 and 100)
    )
  );

-- A failed or abandoned hosted-payment attempt must release the inventory
-- reservation. The existing cancellation trigger restores the quantities and
-- releases any promotion redemption.
create or replace function public.cancel_order_reservation(
  p_order_id uuid,
  p_payment_failed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = case
      when p_payment_failed then 'failed'::public.payment_status
      else payment_status
    end
  where id = p_order_id
    and payment_method in ('razorpay', 'payu')
    and payment_status = 'pending'
    and status = 'pending';

  if not found then
    raise exception 'Order cannot be cancelled';
  end if;
end;
$$;

create or replace function public.confirm_payu_payment(
  p_order_id uuid,
  p_payu_txn_id text,
  p_payu_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_number text;
begin
  update public.orders
  set
    payment_status = 'paid',
    payu_payment_id = p_payu_payment_id,
    status = 'confirmed'
  where id = p_order_id
    and payment_method = 'payu'
    and payment_status = 'pending'
    and status = 'pending'
    and payu_txn_id = p_payu_txn_id
  returning order_number into v_order_number;

  -- PayU can deliver the same result more than once. The identical result is
  -- accepted, but a different transaction or payment ID is always rejected.
  if v_order_number is null then
    select order_number into v_order_number
    from public.orders
    where id = p_order_id
      and payment_method = 'payu'
      and payment_status = 'paid'
      and payu_txn_id = p_payu_txn_id
      and payu_payment_id = p_payu_payment_id;
  end if;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
revoke all on function public.cancel_order_reservation(uuid, boolean) from public;
grant execute on function public.confirm_payu_payment(uuid, text, text) to service_role;
grant execute on function public.cancel_order_reservation(uuid, boolean) to service_role;


-- =============================================================
-- MIGRATION: 20260724040000_reconcile_verified_payu_payments.sql
-- =============================================================
-- PayU's browser return can be interrupted after a successful bank payment.
-- This allows a service-only confirmation to recover a previously cancelled
-- PayU reservation, but only after the application has verified the exact
-- transaction against PayU's server-to-server Verify Payment API.

create or replace function public.apply_order_status_metadata()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('packed', 'cancelled'))
      or (old.status = 'packed' and new.status in ('shipped', 'cancelled'))
      or (old.status = 'shipped' and new.status = 'delivered')
      or (
        old.status = 'cancelled'
        and new.status = 'confirmed'
        and current_setting('app.confirming_verified_payu_payment', true) = 'on'
      )
    ) then
      raise exception 'Invalid order status transition from % to %', old.status, new.status;
    end if;

    if new.status = 'delivered' then
      new.delivered_at = coalesce(new.delivered_at, now());
    elsif new.status = 'cancelled' then
      new.cancelled_at = coalesce(new.cancelled_at, now());
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.confirm_payu_payment(
  p_order_id uuid,
  p_payu_txn_id text,
  p_payu_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock integer;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
    and payment_method = 'payu'
    and payu_txn_id = p_payu_txn_id
  for update;

  if not found then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  if v_order.payment_status = 'paid' then
    if v_order.payu_payment_id = p_payu_payment_id then
      return v_order.order_number;
    end if;
    raise exception 'Payment ID does not match the confirmed order';
  end if;

  if v_order.payment_status = 'pending' and v_order.status = 'pending' then
    update public.orders
    set
      payment_status = 'paid',
      payu_payment_id = p_payu_payment_id,
      status = 'confirmed'
    where id = p_order_id;
    return v_order.order_number;
  end if;

  -- A previous, unverified browser callback may have cancelled the order and
  -- restored its stock. Re-reserve that exact stock before accepting PayU's
  -- independently verified successful result.
  if v_order.payment_status = 'failed' and v_order.status = 'cancelled' then
    for v_item in
      select oi.product_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      where oi.order_id = p_order_id
      group by oi.product_id
      order by oi.product_id
    loop
      select stock into v_stock
      from public.products
      where id = v_item.product_id
      for update;

      if not found or v_stock < v_item.quantity then
        raise exception 'Insufficient stock to recover verified PayU payment';
      end if;
    end loop;

    update public.products p
    set stock = p.stock - reserved.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) as reserved
    where p.id = reserved.product_id;

    perform set_config('app.confirming_verified_payu_payment', 'on', true);
    update public.orders
    set
      payment_status = 'paid',
      payu_payment_id = p_payu_payment_id,
      status = 'confirmed',
      cancelled_at = null
    where id = p_order_id;
    return v_order.order_number;
  end if;

  raise exception 'Payment cannot be confirmed for this order';
end;
$$;

revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
grant execute on function public.confirm_payu_payment(uuid, text, text) to service_role;


-- =============================================================
-- MIGRATION: 20260724050000_delete_expired_online_reservations.sql
-- =============================================================
-- Online-payment reservations are not orders until their payment is verified.
-- Expire them quickly so abandoned PayU/Razorpay attempts do not consume stock
-- or remain in the orders table. The separate UPDATE is intentional: its
-- cancellation triggers must restore stock and release any promotion before
-- the DELETE cascades to order_items.

create or replace function public.run_store_maintenance()
returns table (
  archived_orders integer,
  deleted_archives integer,
  cancelled_expired_razorpay integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_archived integer := 0;
  v_deleted_archives integer := 0;
  v_deleted_expired_online integer := 0;
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = 'failed'
  where payment_method in ('razorpay', 'payu')
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '5 minutes';

  -- Any failed online reservation is disposable. Related order items and
  -- Shiprocket sync records are removed by their foreign-key cascades.
  delete from public.orders
  where payment_method in ('razorpay', 'payu')
    and payment_status = 'failed'
    and status = 'cancelled';
  get diagnostics v_deleted_expired_online = row_count;

  insert into public.archived_orders (
    original_order_id,
    customer_name,
    phone,
    total,
    date_archived
  )
  select
    id,
    customer_name,
    phone,
    total,
    now()
  from public.orders
  where status = 'delivered'
    and delivered_at is not null
    and delivered_at < now() - interval '10 days'
  on conflict (original_order_id) do nothing;

  delete from public.orders o
  where o.status = 'delivered'
    and o.delivered_at is not null
    and o.delivered_at < now() - interval '10 days'
    and exists (
      select 1
      from public.archived_orders a
      where a.original_order_id = o.id
    );
  get diagnostics v_archived = row_count;

  delete from public.archived_orders
  where date_archived < now() - interval '90 days';
  get diagnostics v_deleted_archives = row_count;

  return query select v_archived, v_deleted_archives, v_deleted_expired_online;
end;
$$;

revoke all on function public.run_store_maintenance() from public;
grant execute on function public.run_store_maintenance() to service_role;

comment on function public.run_store_maintenance() is
  'Deletes failed, unconfirmed PayU and Razorpay reservations after five minutes; archives delivered orders after ten days; deletes archived records after ninety days.';


-- =============================================================
-- MIGRATION: 20260725000000_shiprocket_checkout.sql
-- =============================================================
-- Shiprocket Checkout orders are created by a signed webhook after the
-- customer completes payment in Shiprocket's hosted iframe.
alter type public.payment_method add value if not exists 'shiprocket';

alter table public.orders
  add column if not exists shiprocket_checkout_order_id text;

create unique index if not exists orders_shiprocket_checkout_order_id_key
  on public.orders (shiprocket_checkout_order_id)
  where shiprocket_checkout_order_id is not null;

create or replace function public.create_shiprocket_checkout_order(
  p_remote_order_id text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
  promo_code text,
  shipping_fee numeric,
  tax_amount numeric,
  total numeric,
  status public.order_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created record;
begin
  if p_remote_order_id !~ '^[A-Za-z0-9_-]{1,100}$' then
    raise exception 'Invalid Shiprocket Checkout order ID';
  end if;

  -- The webhook can be retried. Lock on its remote ID so retries cannot
  -- reserve stock twice before the unique index is written.
  perform pg_advisory_xact_lock(hashtextextended(p_remote_order_id, 0));

  if exists (
    select 1
    from public.orders
    where shiprocket_checkout_order_id = p_remote_order_id
  ) then
    return query
    select
      o.id,
      o.order_number,
      o.subtotal,
      o.discount_amount,
      o.promo_code,
      o.shipping_fee,
      o.tax_amount,
      o.total,
      o.status
    from public.orders o
    where o.shiprocket_checkout_order_id = p_remote_order_id;
    return;
  end if;

  select * into v_created
  from public.create_checkout_order(
    p_customer,
    p_items,
    p_payment_method,
    null
  );

  update public.orders
  set shiprocket_checkout_order_id = p_remote_order_id
  where id = v_created.order_id;

  return query
  select
    v_created.order_id,
    v_created.order_number,
    v_created.subtotal,
    v_created.discount_amount,
    v_created.promo_code,
    v_created.shipping_fee,
    v_created.tax_amount,
    v_created.total,
    v_created.status;
end;
$$;

revoke all on function public.create_shiprocket_checkout_order(
  text,
  jsonb,
  jsonb,
  public.payment_method
) from public, anon, authenticated;
grant execute on function public.create_shiprocket_checkout_order(
  text,
  jsonb,
  jsonb,
  public.payment_method
) to service_role;


-- =============================================================
-- MIGRATION: 20260726000000_product_and_homepage_videos.sql
-- =============================================================
-- Optional campaign and product videos. Existing images remain the poster and
-- fallback media when a video has not been attached.

alter table public.products
  add column if not exists video_url text check (
    video_url is null
    or (
      char_length(video_url) <= 2048
      and (
        (video_url like '/%' and video_url not like '//%')
        or video_url like 'https://%'
      )
    )
  );

alter table public.homepage_slides
  add column if not exists video_url text check (
    video_url is null
    or (
      char_length(video_url) <= 2048
      and (
        (video_url like '/%' and video_url not like '//%')
        or video_url like 'https://%'
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  26214400,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_videos_public_read" on storage.objects;
create policy "product_videos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-videos');


-- =============================================================
-- MIGRATION: 20260821000000_event_banners.sql
-- =============================================================
-- Create the event_banners table for the EventsSlider on the homepage
create table if not exists public.event_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.event_banners enable row level security;

-- Policies for public access (anyone can view active event banners)
create policy "Active event banners are visible to everyone"
  on public.event_banners
  for select
  to public
  using (is_active = true);

-- Policies for admin access (admins can do everything)
-- Using the existing auth.role() = 'authenticated' as a proxy for admin,
-- or whatever policy is used for homepage_slides. We can match homepage_slides.
create policy "Admins can insert event banners"
  on public.event_banners
  for insert
  to authenticated
  with check (true);

create policy "Admins can update event banners"
  on public.event_banners
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete event banners"
  on public.event_banners
  for delete
  to authenticated
  using (true);

-- Add a trigger to update the updated_at column automatically
create or replace function update_event_banners_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_event_banners_updated_at
  before update on public.event_banners
  for each row
  execute function update_event_banners_updated_at();


-- =============================================================
-- MIGRATION: 20260822000000_hero_settings.sql
-- =============================================================
-- Add dynamic hero fields to store settings
ALTER TABLE public.settings 
ADD COLUMN hero_eyebrow TEXT NOT NULL DEFAULT 'New Season, New You',
ADD COLUMN hero_title TEXT NOT NULL DEFAULT 'The Art of',
ADD COLUMN hero_cursive_title TEXT NOT NULL DEFAULT 'Darajni.',
ADD COLUMN hero_subtitle TEXT NOT NULL DEFAULT 'Timeless pieces. Modern looks. Made to empower every woman.',
ADD COLUMN hero_font_family TEXT NOT NULL DEFAULT 'Great_Vibes',
ADD COLUMN hero_accent_color TEXT NOT NULL DEFAULT '#B58A4A';


-- =============================================================
-- MIGRATION: 20260825000000_product_reviews.sql
-- =============================================================
-- Verified-buyer style product reviews shown on product detail pages.
-- Writes pass through the server API; anonymous database writes remain disabled.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text not null default 'DARAJNI Customer' check (
    char_length(trim(user_name)) between 1 and 60
  ),
  rating integer not null check (rating between 1 and 5),
  comment text check (
    comment is null or char_length(trim(comment)) between 1 and 600
  ),
  status text not null default 'published' check (
    status in ('published', 'hidden')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_feed_idx
  on public.product_reviews (product_id, created_at desc)
  where status = 'published';

alter table public.product_reviews enable row level security;

drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read"
  on public.product_reviews for select
  to anon, authenticated
  using (status = 'published');

revoke all on public.product_reviews from anon, authenticated;
grant select (id, product_id, user_id, user_name, rating, comment, created_at)
  on public.product_reviews to anon, authenticated;
grant all on public.product_reviews to service_role;

comment on table public.product_reviews is
  'Customer star ratings and optional comments per product; one review per account per product, published through the server API.';


-- =============================================================
-- MIGRATION: 20260825010000_order_deliverability.sql
-- =============================================================
-- Address deliverability assessed via ShipRocket courier serviceability at
-- checkout time (pincode reachable from the store pickup location, COD
-- support on that lane, estimated transit days). Surfaced in the admin panel.

alter table public.orders
  add column if not exists deliverability_status text not null default 'unverified',
  add column if not exists deliverability_days integer,
  add column if not exists deliverability_checked_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_deliverability_status_check'
  ) then
    alter table public.orders
      add constraint orders_deliverability_status_check
      check (deliverability_status in (
        'unverified', 'serviceable', 'cod_unavailable', 'not_serviceable'
      ));
  end if;
end $$;

comment on column public.orders.deliverability_status is
  'ShipRocket serviceability verdict for the shipping pincode at checkout time.';


-- =============================================================================
-- POST-SETUP CHECKLIST (required before the site is usable)
-- =============================================================================
-- 1. FIRST ADMIN — create a user first (Dashboard -> Authentication -> Users ->
--    "Add user"), then run, replacing the UUID:
--
--      insert into public.admin_users (id)
--      values ('00000000-0000-0000-0000-000000000000')
--      on conflict (id) do nothing;
--
--    More admins = same insert. Remove admin = delete the row.
--
-- 2. SETTINGS — one row in public.settings is pre-seeded (id = true).
--    Configure shipping charge, COD toggle, support numbers and hero
--    copy/colors from Admin -> Settings (no SQL needed).
--
-- 3. STORAGE — buckets are created/upserted by this script:
--       product-images (admin uploads), requested-dresses (public board),
--       product-videos / homepage media (video feature).
--    Public read policies included; writes require admin/service role.
--
-- 4. REALTIME — orders realtime enabled by the publication migration below;
--    keep Supabase Realtime enabled on the project.
--
-- 5. APP ENV — set variables from docs/ENVIRONMENT.md on Vercel/local
--    (.env.local): SUPABASE URL/ANON/SERVICE_ROLE, ORDER_ACCESS_SECRET,
--    payments keys, ShipRocket credentials + SHIPROCKET_PICKUP_LOCATION and
--    parcel defaults.
--
-- 6. Run the app: npm install && npm run dev  (or deploy to Vercel).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VERIFICATION (safe to run; expected results in comments)
-- -----------------------------------------------------------------------------
select 'tables' as check_name, count(*) as value
from information_schema.tables
where table_schema = 'public'
union all
select 'settings_row_seeded', count(*) from public.settings where id = true
union all
select 'categories', count(*) from public.categories
union all
select 'storage_buckets', count(*) from storage.buckets
where id in ('product-images','requested-dresses');
-- Expected: tables >= 14, settings_row_seeded = 1, categories >= 4, buckets >= 2.

-- Master schema end.