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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role public.user_role not null default 'user',
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

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user <> 'postgres'
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

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

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

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
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "reviews_user_update_unpublished" on public.reviews;
create policy "reviews_user_update_unpublished"
  on public.reviews for update
  using (user_id = auth.uid() and status <> 'approved')
  with check (user_id = auth.uid() and status = 'pending');

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

insert into public.products
  (name, slug, category, price, fabric, description, tags, images, featured, available, color)
values
  (
    'Crimson Royale Lehenga',
    'crimson-royale-lehenga',
    'Lehenga',
    18500,
    'Silk blend with zari work',
    'A rich crimson occasion lehenga finished with intricate zari-inspired detailing, a generous flare and a coordinated dupatta. Custom measurements are available before production.',
    array['Bridal', 'Wedding', 'Festive'],
    array[
      'https://images.pexels.com/photos/37628619/pexels-photo-37628619.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/33101418/pexels-photo-33101418.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    true,
    true,
    '#8B1A1A'
  ),
  (
    'Rose Petal Lehenga',
    'rose-petal-lehenga',
    'Lehenga',
    14200,
    'Georgette and raw silk',
    'A soft rose-pink lehenga with floral thread work, a coordinated blouse and a light sequin-detailed dupatta for mehendi, engagement and festive celebrations.',
    array['Mehendi', 'Pastel', 'Floral'],
    array[
      'https://images.pexels.com/photos/37628608/pexels-photo-37628608.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/37396069/pexels-photo-37396069.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    true,
    true,
    '#E8A0B4'
  ),
  (
    'Midnight Zari Gown',
    'midnight-zari-gown',
    'Gown',
    22000,
    'Velvet and net',
    'A midnight-blue floor-length gown with gold detailing, a structured bodice and a fluid silhouette designed for receptions and evening celebrations.',
    array['Reception', 'Cocktail', 'Evening'],
    array[
      'https://images.pexels.com/photos/17559250/pexels-photo-17559250.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/34326848/pexels-photo-34326848.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    true,
    true,
    '#1A1A5E'
  ),
  (
    'Emerald Anarkali',
    'emerald-anarkali',
    'Anarkali',
    9500,
    'Chanderi silk blend',
    'An emerald Anarkali with delicate embroidery, a floor-length silhouette and a printed dupatta for festive gatherings and family celebrations.',
    array['Festive', 'Eid', 'Embroidered'],
    array[
      'https://images.pexels.com/photos/6236647/pexels-photo-6236647.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/6234216/pexels-photo-6234216.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    false,
    true,
    '#1B5E20'
  ),
  (
    'Golden Sharara Set',
    'golden-sharara-set',
    'Sharara',
    12000,
    'Banarasi brocade',
    'A woven sharara set with a short kurta, wide-legged flare and sheer dupatta. Designed as a versatile statement piece for wedding festivities.',
    array['Wedding Guest', 'Banarasi', 'Festive'],
    array[
      'https://images.pexels.com/photos/19588667/pexels-photo-19588667.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/37396069/pexels-photo-37396069.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    true,
    true,
    '#B8860B'
  ),
  (
    'Mauve Organza Saree',
    'mauve-organza-saree',
    'Saree',
    7800,
    'Organza with hand-finished embroidery',
    'A lightweight mauve organza saree with a floral border and coordinated blouse fabric, suited to sangeet, reception and intimate celebrations.',
    array['Saree', 'Sangeet', 'Lightweight'],
    array[
      'https://images.pexels.com/photos/12791932/pexels-photo-12791932.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800',
      'https://images.pexels.com/photos/34326848/pexels-photo-34326848.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800'
    ],
    false,
    true,
    '#C9A0B0'
  )
on conflict (slug) do nothing;
