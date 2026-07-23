-- PayU reservations use the existing inventory and promotion lifecycle.
-- Both PayU and historical Razorpay reservations remain cancellable.
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
    and payment_method in ('razorpay', 'payu')
    and payment_status = 'pending'
    and status = 'pending';

  if not found then
    raise exception 'Order cannot be cancelled';
  end if;
end;
$$;

-- Make a manually re-run migration safe: PostgreSQL creates an index for a
-- unique constraint, and a previous partial/manual run may have created it.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payu_txn_id_key'
  ) then
    if exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'orders'
        and indexname = 'orders_payu_txn_id_key'
    ) then
      alter table public.orders
        add constraint orders_payu_txn_id_key
        unique using index orders_payu_txn_id_key;
    else
      alter table public.orders
        add constraint orders_payu_txn_id_key unique (payu_txn_id);
    end if;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payu_payment_id_key'
  ) then
    if exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'orders'
        and indexname = 'orders_payu_payment_id_key'
    ) then
      alter table public.orders
        add constraint orders_payu_payment_id_key
        unique using index orders_payu_payment_id_key;
    else
      alter table public.orders
        add constraint orders_payu_payment_id_key unique (payu_payment_id);
    end if;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payu_reference_check'
  ) then
    alter table public.orders
      add constraint orders_payu_reference_check check (
        payment_method <> 'payu'
        or (
          -- Keep historic/manual PayU transaction references readable. New
          -- checkout IDs are strictly validated by the server before PayU
          -- verification and before the confirmation RPC is invoked.
          (payu_txn_id is null or char_length(payu_txn_id) between 1 and 100)
          and (payu_payment_id is null or char_length(payu_payment_id) between 1 and 100)
        )
      );
  end if;
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
    and payu_txn_id = p_payu_txn_id
  returning order_number into v_order_number;

  -- A browser return and a PayU callback can arrive at nearly the same time.
  -- Treat the exact already-confirmed transaction as success, while refusing
  -- every mismatched payment reference.
  if v_order_number is null then
    select order_number into v_order_number
    from public.orders
    where id = p_order_id
      and payment_method = 'payu'
      and payment_status = 'paid'
      and payu_txn_id = p_payu_txn_id
      and payu_payment_id = p_payu_payment_id;
  end if;

  if v_order_number is null then
    raise exception 'Payment cannot be confirmed for this order';
  end if;

  return v_order_number;
end;
$$;

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
  where payment_method in ('razorpay', 'payu')
    and payment_status = 'pending'
    and status = 'pending'
    and created_at < now() - interval '1 hour';
  get diagnostics v_cancelled = row_count;

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
  get diagnostics v_deleted = row_count;

  return query select v_archived, v_deleted, v_cancelled;
end;
$$;

revoke all on function public.cancel_order_reservation(uuid, boolean) from public;
revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
revoke all on function public.run_store_maintenance() from public;

grant execute on function public.cancel_order_reservation(uuid, boolean)
  to service_role;
grant execute on function public.confirm_payu_payment(uuid, text, text)
  to service_role;
grant execute on function public.run_store_maintenance() to service_role;

comment on function public.run_store_maintenance() is
  'Archives delivered orders, deletes expired archives, and cancels stale pending online-payment reservations.';
