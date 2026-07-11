-- Shiprocket is an external fulfilment processor. Keep only delivery metadata
-- and integration state locally; never persist Shiprocket credentials/tokens or
-- request payloads containing customer delivery details.

create table public.shiprocket_order_syncs (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'syncing', 'synced', 'failed', 'skipped')),
  shiprocket_order_id text,
  shipment_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 300),
  next_retry_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'synced'
    or (shiprocket_order_id is not null and synced_at is not null)
  )
);

create index shiprocket_order_syncs_retry_idx
  on public.shiprocket_order_syncs (status, next_retry_at, updated_at);

drop trigger if exists shiprocket_order_syncs_updated_at on public.shiprocket_order_syncs;
create trigger shiprocket_order_syncs_updated_at
  before update on public.shiprocket_order_syncs
  for each row execute procedure public.set_updated_at();

alter table public.shiprocket_order_syncs enable row level security;

revoke all on public.shiprocket_order_syncs from anon, authenticated;
grant all on public.shiprocket_order_syncs to service_role;

-- A conditional claim prevents the Razorpay browser verification and webhook
-- from creating the same Shiprocket order concurrently. A stale claim can be
-- reclaimed after 15 minutes if a serverless invocation stopped mid-request.
create or replace function public.claim_shiprocket_order_sync(
  p_order_id uuid
)
returns table (attempt_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.shiprocket_order_syncs (order_id)
  values (p_order_id)
  on conflict (order_id) do nothing;

  return query
  update public.shiprocket_order_syncs as sync
  set
    status = 'syncing',
    attempt_count = sync.attempt_count + 1,
    next_retry_at = null,
    last_error = null
  where sync.order_id = p_order_id
    and (
      sync.status = 'pending'
      or (
        sync.status = 'failed'
        and (sync.next_retry_at is null or sync.next_retry_at <= now())
      )
      or (
        sync.status = 'syncing'
        and sync.updated_at <= now() - interval '15 minutes'
      )
    )
  returning sync.attempt_count;
end;
$$;

revoke all on function public.claim_shiprocket_order_sync(uuid) from public;
grant execute on function public.claim_shiprocket_order_sync(uuid) to service_role;

create or replace function public.get_due_shiprocket_order_syncs(
  p_limit integer default 25
)
returns table (order_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select sync.order_id
  from public.shiprocket_order_syncs as sync
  where sync.status = 'pending'
    or (
      sync.status = 'failed'
      and (sync.next_retry_at is null or sync.next_retry_at <= now())
    )
    or (
      sync.status = 'syncing'
      and sync.updated_at <= now() - interval '15 minutes'
    )
  order by coalesce(sync.next_retry_at, sync.created_at), sync.created_at
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

revoke all on function public.get_due_shiprocket_order_syncs(integer) from public;
grant execute on function public.get_due_shiprocket_order_syncs(integer) to service_role;
