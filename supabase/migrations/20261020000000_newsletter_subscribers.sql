-- Store explicit newsletter opt-ins separately from customer/order data.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(email) <= 254 and email = lower(email)),
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant select, insert, update, delete on public.newsletter_subscribers to service_role;
