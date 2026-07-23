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
