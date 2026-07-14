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
