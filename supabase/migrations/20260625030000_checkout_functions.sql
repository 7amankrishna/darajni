-- Phase 3: atomic guest checkout and payment lifecycle functions.
-- These functions are server-only and are never executable with the anon key.

create or replace function public.restore_stock_after_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = new.id
    and oi.product_id = p.id;

  return new;
end;
$$;

drop trigger if exists orders_restore_stock_after_cancellation on public.orders;
create trigger orders_restore_stock_after_cancellation
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute procedure public.restore_stock_after_cancellation();

create or replace function public.create_checkout_order(
  p_customer jsonb,
  p_items jsonb,
  p_payment_method public.payment_method
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
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
  v_shipping numeric(12, 2) := 0;
  v_tax numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_item_count integer;
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

  -- Lock products in a stable order before calculating any amount. This
  -- prevents overselling and avoids trusting prices submitted by the browser.
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

  v_shipping := v_settings.shipping_charge;
  v_tax := round(v_subtotal * (v_settings.tax_rate / 100), 2);
  v_total := round(v_subtotal + v_shipping + v_tax, 2);

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

  return query
  select
    v_order.id,
    v_order.order_number,
    v_order.subtotal,
    v_order.shipping_fee,
    v_order.tax_amount,
    v_order.total,
    v_order.status;
end;
$$;

create or replace function public.cancel_order_reservation(
  p_order_id uuid,
  p_payment_failed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = case
      when p_payment_failed then 'failed'::public.payment_status
      else payment_status
    end
  where id = p_order_id
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending';

  if not found then
    raise exception 'Order cannot be cancelled';
  end if;
end;
$$;

create or replace function public.confirm_razorpay_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_number text;
begin
  update public.orders
  set
    payment_status = 'paid',
    razorpay_payment_id = p_razorpay_payment_id,
    status = 'confirmed'
  where id = p_order_id
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending'
    and razorpay_order_id = p_razorpay_order_id
  returning order_number into v_order_number;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

revoke all on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method
) from public;
revoke all on function public.cancel_order_reservation(uuid, boolean) from public;
revoke all on function public.confirm_razorpay_payment(uuid, text, text) from public;

grant execute on function public.create_checkout_order(
  jsonb,
  jsonb,
  public.payment_method
) to service_role;
grant execute on function public.cancel_order_reservation(uuid, boolean)
  to service_role;
grant execute on function public.confirm_razorpay_payment(uuid, text, text)
  to service_role;
