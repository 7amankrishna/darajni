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
