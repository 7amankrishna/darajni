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
  fabric text not null check (char_length(trim(fabric)) between 2 and 160),
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

drop trigger if exists categories_protect_system_delete on public.categories;
create trigger categories_protect_system_delete
  before delete on public.categories
  for each row execute procedure public.protect_system_category_delete();

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
grant execute on function public.track_order(text, text)
  to anon, authenticated, service_role;

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
