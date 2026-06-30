\set ON_ERROR_STOP on

do $$
begin
  if has_function_privilege(
    'anon',
    'public.quote_checkout_discount(text,jsonb,text)',
    'execute'
  ) then
    raise exception 'anonymous promo quote RPC access must be denied';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.quote_checkout_discount(text,jsonb,text)',
    'execute'
  ) then
    raise exception 'service role promo quote RPC access is required';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.run_store_maintenance()',
    'execute'
  ) then
    raise exception 'service role maintenance RPC access is required';
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

insert into public.promo_codes (
  code,
  title,
  code_type,
  discount_type,
  discount_value,
  minimum_subtotal,
  maximum_discount,
  usage_limit,
  per_phone_limit
)
values (
  'SAVE10',
  'Test coupon',
  'coupon',
  'percentage',
  10,
  500,
  200,
  10,
  1
)
on conflict (code) do update
set is_active = true,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    minimum_subtotal = excluded.minimum_subtotal,
    maximum_discount = excluded.maximum_discount,
    usage_limit = excluded.usage_limit,
    per_phone_limit = excluded.per_phone_limit;

create temporary table promo_quote_result as
select *
from public.quote_checkout_discount(
  'save10',
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'M',
      'quantity', 2
    )
  ),
  '9876543210'
);

do $$
begin
  if (select code from promo_quote_result) <> 'SAVE10' then
    raise exception 'promo quote did not normalize code';
  end if;

  if (select discount_amount from promo_quote_result) <> 180 then
    raise exception 'promo quote discount is incorrect';
  end if;

  if (select discounted_subtotal from promo_quote_result) <> 1620 then
    raise exception 'promo quote discounted subtotal is incorrect';
  end if;
end;
$$;

create temporary table promo_checkout_result as
select *
from public.create_checkout_order(
  jsonb_build_object(
    'customer_name', 'Promo Customer',
    'phone', '+91 98765 43210',
    'address', '789 Promo Street, Test Colony',
    'city', 'Bihar Sharif',
    'state', 'Bihar',
    'pincode', '803101'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', '10000000-0000-0000-0000-000000000001',
      'size', 'M',
      'quantity', 2
    )
  ),
  'razorpay',
  'SAVE10'
);

do $$
declare
  v_order_id uuid;
begin
  select order_id into v_order_id from promo_checkout_result;

  if (select subtotal from promo_checkout_result) <> 1800 then
    raise exception 'promo checkout subtotal is incorrect';
  end if;

  if (select discount_amount from promo_checkout_result) <> 180 then
    raise exception 'promo checkout discount is incorrect';
  end if;

  if (select tax_amount from promo_checkout_result) <> 81 then
    raise exception 'promo checkout tax is incorrect';
  end if;

  if (select total from promo_checkout_result) <> 1801 then
    raise exception 'promo checkout total is incorrect';
  end if;

  if not exists (
    select 1
    from public.promo_redemptions
    where order_id = v_order_id
      and discount_amount = 180
      and phone_last10 = '9876543210'
  ) then
    raise exception 'promo redemption was not recorded';
  end if;

  perform public.cancel_order_reservation(v_order_id, false);

  if exists (
    select 1
    from public.promo_redemptions
    where order_id = v_order_id
  ) then
    raise exception 'cancellation did not release promo redemption';
  end if;
end;
$$;

insert into public.orders (
  customer_name,
  phone,
  address,
  city,
  state,
  pincode,
  subtotal,
  discount_amount,
  shipping_fee,
  tax_amount,
  total,
  payment_method,
  status,
  delivered_at
)
values (
  'Lifecycle Customer',
  '9876543211',
  '123 Lifecycle Street',
  'Bihar Sharif',
  'Bihar',
  '803101',
  1000,
  100,
  0,
  0,
  900,
  'cod',
  'delivered',
  now() - interval '11 days'
);

insert into public.archived_orders (
  original_order_id,
  customer_name,
  phone,
  total,
  date_archived
)
values (
  '99999999-9999-9999-9999-999999999999',
  'Old Archive',
  '9876543212',
  500,
  now() - interval '91 days'
);

create temporary table maintenance_result as
select *
from public.run_store_maintenance();

do $$
begin
  if (select archived_orders from maintenance_result) < 1 then
    raise exception 'maintenance did not archive delivered orders';
  end if;

  if exists (
    select 1
    from public.orders
    where customer_name = 'Lifecycle Customer'
  ) then
    raise exception 'archived delivered order still exists in active orders';
  end if;

  if exists (
    select 1
    from public.archived_orders
    where original_order_id = '99999999-9999-9999-9999-999999999999'
  ) then
    raise exception 'maintenance did not delete old archived orders';
  end if;
end;
$$;
