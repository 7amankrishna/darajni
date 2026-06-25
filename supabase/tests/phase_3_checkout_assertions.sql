\set ON_ERROR_STOP on

do $$
begin
  if has_function_privilege(
    'anon',
    'public.create_checkout_order(jsonb,jsonb,public.payment_method)',
    'execute'
  ) then
    raise exception 'anonymous checkout RPC access must be denied';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.create_checkout_order(jsonb,jsonb,public.payment_method)',
    'execute'
  ) then
    raise exception 'service role checkout RPC access is required';
  end if;
end;
$$;

update public.products
set stock = 5,
    size = array['S', 'M', 'Custom'],
    price = 1000,
    discount = 10
where id = '10000000-0000-0000-0000-000000000001';

update public.settings
set shipping_charge = 100,
    tax_rate = 5,
    cod_enabled = true
where id = true;

create temporary table checkout_result as
select *
from public.create_checkout_order(
  jsonb_build_object(
    'customer_name', 'Checkout Customer',
    'phone', '+91 98765 43210',
    'address', '123 Checkout Street, Test Colony',
    'city', 'Bihar Sharif',
    'state', 'Bihar',
    'pincode', '803101',
    'landmark', '',
    'email', 'checkout@example.com'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'M',
      'quantity', 2
    )
  ),
  'razorpay'
);

do $$
declare
  v_order_id uuid;
begin
  select order_id into v_order_id from checkout_result;

  if (select subtotal from checkout_result) <> 1800 then
    raise exception 'discounted checkout subtotal is incorrect';
  end if;

  if (select shipping_fee from checkout_result) <> 100 then
    raise exception 'checkout shipping is incorrect';
  end if;

  if (select tax_amount from checkout_result) <> 90 then
    raise exception 'checkout tax is incorrect';
  end if;

  if (select total from checkout_result) <> 1990 then
    raise exception 'checkout total is incorrect';
  end if;

  if (
    select stock from public.products
    where id = '10000000-0000-0000-0000-000000000001'
  ) <> 3 then
    raise exception 'checkout did not reserve inventory';
  end if;

  perform public.cancel_order_reservation(v_order_id, false);

  if (
    select stock from public.products
    where id = '10000000-0000-0000-0000-000000000001'
  ) <> 5 then
    raise exception 'cancellation did not restore inventory';
  end if;
end;
$$;

create temporary table razorpay_checkout_result as
select *
from public.create_checkout_order(
  jsonb_build_object(
    'customer_name', 'Online Customer',
    'phone', '9876543210',
    'address', '456 Online Street, Test Colony',
    'city', 'Bihar Sharif',
    'state', 'Bihar',
    'pincode', '803101'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'S',
      'quantity', 1
    )
  ),
  'razorpay'
);

do $$
declare
  v_order_id uuid;
  v_order_number text;
begin
  select order_id into v_order_id from razorpay_checkout_result;

  update public.orders
  set razorpay_order_id = 'order_test_123'
  where id = v_order_id;

  v_order_number := public.confirm_razorpay_payment(
    v_order_id,
    'order_test_123',
    'pay_test_123'
  );

  if v_order_number is null then
    raise exception 'payment confirmation returned no order number';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = v_order_id
      and payment_status = 'paid'
      and status = 'confirmed'
      and razorpay_payment_id = 'pay_test_123'
  ) then
    raise exception 'Razorpay payment was not confirmed';
  end if;
end;
$$;
