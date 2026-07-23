-- Repairs partially applied/manual PayU setup and makes payment confirmation
-- strict, idempotent, and safe to run after older PayU migrations.

alter type public.payment_method add value if not exists 'payu';

alter table public.orders
  add column if not exists payu_txn_id text,
  add column if not exists payu_payment_id text;

-- Use new index names so an index left behind by an interrupted earlier setup
-- cannot collide with this migration. Partial indexes allow multiple pending
-- legacy rows with no PayU reference.
create unique index if not exists orders_payu_txn_id_verified_unique_idx
  on public.orders (payu_txn_id)
  where payu_txn_id is not null;

create unique index if not exists orders_payu_payment_id_verified_unique_idx
  on public.orders (payu_payment_id)
  where payu_payment_id is not null;

-- Older scripts required a particular historical transaction-id format and
-- failed on existing rows. New IDs are validated by the server; this database
-- check only keeps stored references bounded and non-empty.
alter table public.orders
  drop constraint if exists orders_payu_reference_check;

alter table public.orders
  add constraint orders_payu_reference_check check (
    payment_method <> 'payu'
    or (
      (payu_txn_id is null or char_length(payu_txn_id) between 1 and 100)
      and (payu_payment_id is null or char_length(payu_payment_id) between 1 and 100)
    )
  );

-- A failed or abandoned hosted-payment attempt must release the inventory
-- reservation. The existing cancellation trigger restores the quantities and
-- releases any promotion redemption.
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

  -- PayU can deliver the same result more than once. The identical result is
  -- accepted, but a different transaction or payment ID is always rejected.
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

revoke all on function public.confirm_payu_payment(uuid, text, text) from public;
revoke all on function public.cancel_order_reservation(uuid, boolean) from public;
grant execute on function public.confirm_payu_payment(uuid, text, text) to service_role;
grant execute on function public.cancel_order_reservation(uuid, boolean) to service_role;
