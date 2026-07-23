\set ON_ERROR_STOP on

update public.products
set stock = 5,
    size = array['S', 'M', 'Custom'],
    price = 1000,
    discount = 0
where id = '10000000-0000-0000-0000-000000000001';

update public.settings
set shipping_charge = 0,
    tax_rate = 0
where id = true;

create temporary table payu_checkout_result as
select *
from public.create_checkout_order(
  jsonb_build_object(
    'customer_name', 'PayU Customer',
    'phone', '9876543210',
    'address', '123 Verified Payment Street',
    'city', 'Bihar Sharif',
    'state', 'Bihar',
    'pincode', '803101',
    'email', 'payu@example.com'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'S',
      'quantity', 1
    )
  ),
  'payu'
);

do $$
declare
  v_order_id uuid;
  v_order_number text;
begin
  select order_id into v_order_id from payu_checkout_result;

  update public.orders
  set payu_txn_id = 'payu0123456789abcdef0123'
  where id = v_order_id;

  v_order_number := public.confirm_payu_payment(
    v_order_id,
    'payu0123456789abcdef0123',
    '403993715537577186'
  );

  if v_order_number is null then
    raise exception 'PayU confirmation returned no order number';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = v_order_id
      and payment_method = 'payu'
      and payment_status = 'paid'
      and status = 'confirmed'
      and payu_payment_id = '403993715537577186'
  ) then
    raise exception 'PayU payment was not confirmed';
  end if;

  -- Replayed verified callbacks must be safe and leave the order unchanged.
  perform public.confirm_payu_payment(
    v_order_id,
    'payu0123456789abcdef0123',
    '403993715537577186'
  );
end;
$$;

create temporary table cancelled_payu_checkout_result as
select *
from public.create_checkout_order(
  jsonb_build_object(
    'customer_name', 'Cancelled PayU Customer',
    'phone', '9876543211',
    'address', '456 Cancelled Payment Street',
    'city', 'Bihar Sharif',
    'state', 'Bihar',
    'pincode', '803101',
    'email', 'cancelled-payu@example.com'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'M',
      'quantity', 1
    )
  ),
  'payu'
);

do $$
declare
  v_order_id uuid;
begin
  select order_id into v_order_id from cancelled_payu_checkout_result;
  perform public.cancel_order_reservation(v_order_id, true);

  if not exists (
    select 1
    from public.orders
    where id = v_order_id
      and status = 'cancelled'
      and payment_status = 'failed'
  ) then
    raise exception 'Failed PayU reservation was not cancelled';
  end if;
end;
$$;
