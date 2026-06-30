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
