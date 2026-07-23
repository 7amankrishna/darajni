-- Online-payment reservations are not orders until their payment is verified.
-- Expire them quickly so abandoned PayU/Razorpay attempts do not consume stock
-- or remain in the orders table. The separate UPDATE is intentional: its
-- cancellation triggers must restore stock and release any promotion before
-- the DELETE cascades to order_items.

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
  v_deleted_archives integer := 0;
  v_deleted_expired_online integer := 0;
begin
  update public.orders
  set
    status = 'cancelled',
    payment_status = 'failed'
  where payment_method in ('razorpay', 'payu')
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '5 minutes';

  -- Any failed online reservation is disposable. Related order items and
  -- Shiprocket sync records are removed by their foreign-key cascades.
  delete from public.orders
  where payment_method in ('razorpay', 'payu')
    and payment_status = 'failed'
    and status = 'cancelled';
  get diagnostics v_deleted_expired_online = row_count;

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
  get diagnostics v_deleted_archives = row_count;

  return query select v_archived, v_deleted_archives, v_deleted_expired_online;
end;
$$;

revoke all on function public.run_store_maintenance() from public;
grant execute on function public.run_store_maintenance() to service_role;

comment on function public.run_store_maintenance() is
  'Deletes failed, unconfirmed PayU and Razorpay reservations after five minutes; archives delivered orders after ten days; deletes archived records after ninety days.';
