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
