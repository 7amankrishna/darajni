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
