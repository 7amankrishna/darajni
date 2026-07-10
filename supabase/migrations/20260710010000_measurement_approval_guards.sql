-- Keep payment capture separate from tailoring approval and enforce custom-size
-- order invariants at the database boundary.

update public.products
set size = array['Custom Size']
where size is distinct from array['Custom Size']::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_custom_size_only'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_custom_size_only
      check (size = array['Custom Size']::text[]);
  end if;
end;
$$;

create or replace function public.enforce_measurements_before_order_confirmation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    if new.payment_method = 'razorpay' and new.payment_status <> 'paid' then
      raise exception 'Online payment must be paid before order confirmation';
    end if;

    if not exists (
      select 1 from public.order_items where order_id = new.id
    ) or exists (
      select 1
      from public.order_items
      where order_id = new.id
        and (
          measurements is null
          or measurement_status is distinct from 'confirmed'
          or coalesce(measurements ->> 'customerConfirmed', 'false') <> 'true'
        )
    ) then
      raise exception 'Every item measurement must be approved before order confirmation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_require_measurement_approval on public.orders;
create trigger orders_require_measurement_approval
  before update of status on public.orders
  for each row execute procedure public.enforce_measurements_before_order_confirmation();

create or replace function public.lock_measurements_after_order_confirmation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order_status public.order_status;
begin
  if new.measurements is distinct from old.measurements
    or new.measurement_status is distinct from old.measurement_status then
    select status into v_order_status
    from public.orders
    where id = new.order_id;

    if v_order_status <> 'pending' then
      raise exception 'Measurements are locked after order confirmation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_lock_approved_measurements on public.order_items;
create trigger order_items_lock_approved_measurements
  before update of measurements, measurement_status on public.order_items
  for each row execute procedure public.lock_measurements_after_order_confirmation();

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
    razorpay_payment_id = p_razorpay_payment_id
  where id = p_order_id
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending'
    and razorpay_order_id = p_razorpay_order_id
  returning order_number into v_order_number;

  if v_order_number is null then
    select order_number into v_order_number
    from public.orders
    where id = p_order_id
      and payment_method = 'razorpay'
      and payment_status = 'paid'
      and razorpay_order_id = p_razorpay_order_id
      and razorpay_payment_id = p_razorpay_payment_id;
  end if;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

revoke all on function public.confirm_razorpay_payment(uuid, text, text) from public;
grant execute on function public.confirm_razorpay_payment(uuid, text, text)
to service_role;

comment on function public.confirm_razorpay_payment(uuid, text, text) is
  'Records successful online payment while leaving order confirmation pending until measurement approval.';
