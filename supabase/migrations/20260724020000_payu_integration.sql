-- Migration: Add PayU payment gateway support

alter type public.payment_method add value if not exists 'payu';

alter table public.orders
  add column if not exists payu_txn_id text unique,
  add column if not exists payu_payment_id text;

-- RPC to confirm PayU payments cleanly and atomically
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
  v_order_number text;
begin
  update public.orders
  set
    payment_status = 'paid',
    payu_payment_id = p_payu_payment_id,
    status = 'confirmed'
  where id = p_order_id
    and payment_method = 'payu'
    and payment_status = 'pending'
    and status = 'pending'
    and (payu_txn_id = p_payu_txn_id or payu_txn_id is null)
  returning order_number into v_order_number;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

-- Update store maintenance to cancel expired PayU orders as well
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
  where (payment_method = 'razorpay' or payment_method = 'payu')
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '1 hour';
  get diagnostics v_cancelled = row_count;

  insert into public.archived_orders (
    original_order_id,
    customer_name,
    phone,
    total,
    status,
    archived_at
  )
  select
    id,
    customer_name,
    phone,
    total,
    status,
    now()
  from public.orders
  where created_at < now() - interval '90 days'
  on conflict (original_order_id) do nothing;
  get diagnostics v_archived = row_count;

  delete from public.archived_orders
  where archived_at < now() - interval '1 year';
  get diagnostics v_deleted = row_count;

  return query select v_archived, v_deleted, v_cancelled;
end;
$$;

revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
grant execute on function public.confirm_payu_payment(uuid, text, text) to service_role;
revoke all on function public.run_store_maintenance() from public;
grant execute on function public.run_store_maintenance() to service_role;
