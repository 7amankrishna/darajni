\set ON_ERROR_STOP on

do $$
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'profiles must not exist after Phase 2';
  end if;

  if to_regclass('public.reviews') is not null then
    raise exception 'reviews must not exist after Phase 2';
  end if;

  if not exists (
    select 1
    from public.admin_users
    where id = '00000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'legacy administrator was not preserved';
  end if;

  if not exists (
    select 1
    from public.products
    where id = '10000000-0000-0000-0000-000000000001'
      and category_id is not null
      and size = array['Custom']::text[]
      and stock = 1
      and discount = 0
  ) then
    raise exception 'legacy product was not normalized correctly';
  end if;

  if has_table_privilege('anon', 'public.orders', 'select') then
    raise exception 'anonymous role must not read orders directly';
  end if;

  if has_table_privilege('authenticated', 'public.orders', 'insert') then
    raise exception 'authenticated clients must not insert orders directly';
  end if;

  if has_function_privilege(
    'anon',
    'public.track_order(text,text)',
    'execute'
  ) then
    raise exception 'anonymous tracking RPC execution must be denied';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.track_order(text,text)',
    'execute'
  ) then
    raise exception 'service-role tracking RPC execution is required';
  end if;

  if has_function_privilege(
    'anon',
    'public.generate_order_number()',
    'execute'
  ) then
    raise exception 'anonymous order-number generation must be denied';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'product-images'
      and public
      and file_size_limit = 2097152
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'product image bucket configuration is incorrect';
  end if;
end;
$$;

insert into public.orders (
  id,
  order_number,
  customer_name,
  phone,
  address,
  city,
  state,
  pincode,
  subtotal,
  total,
  shipping_fee,
  tax_amount,
  payment_method
)
values (
  '20000000-0000-0000-0000-000000000001',
  'DJ-20260625-999999',
  'Test Customer',
  '+91 98765 43210',
  '123 Test Street, Test Colony',
  'Bihar Sharif',
  'Bihar',
  '803101',
  1000,
  1100,
  100,
  0,
  'cod'
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
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Migration Test Product',
  'Custom',
  2,
  500
);

do $$
begin
  if (
    select line_total
    from public.order_items
    where order_id = '20000000-0000-0000-0000-000000000001'
  ) <> 1000 then
    raise exception 'order item line total is incorrect';
  end if;

  if (
    select count(*)
    from public.track_order('DJ-20260625-999999', '9876543210')
  ) <> 1 then
    raise exception 'tracking must return a matching order';
  end if;

  if (
    select count(*)
    from public.track_order('DJ-20260625-999999', '9999999999')
  ) <> 0 then
    raise exception 'tracking must reject a mismatched phone';
  end if;
end;
$$;

update public.orders set status = 'confirmed'
where id = '20000000-0000-0000-0000-000000000001';
update public.orders set status = 'packed'
where id = '20000000-0000-0000-0000-000000000001';
update public.orders set status = 'shipped'
where id = '20000000-0000-0000-0000-000000000001';
update public.orders set status = 'delivered'
where id = '20000000-0000-0000-0000-000000000001';

do $$
declare
  rejected boolean := false;
begin
  if (
    select delivered_at
    from public.orders
    where id = '20000000-0000-0000-0000-000000000001'
  ) is null then
    raise exception 'delivered_at was not set';
  end if;

  begin
    update public.orders
    set status = 'pending'
    where id = '20000000-0000-0000-0000-000000000001';
  exception
    when others then
      rejected := true;
  end;

  if not rejected then
    raise exception 'invalid status transition was accepted';
  end if;
end;
$$;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  false
);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  if not public.is_admin() then
    raise exception 'preserved administrator is not recognized';
  end if;

  if (select count(*) from public.orders) <> 1 then
    raise exception 'administrator cannot read orders';
  end if;
end;
$$;

reset role;
