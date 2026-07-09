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
