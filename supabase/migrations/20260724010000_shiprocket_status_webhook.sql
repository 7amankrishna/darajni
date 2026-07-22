-- Inbound Shiprocket status webhook support. The courier reports shipment
-- movement (picked up, in transit, delivered); we record only the minimal
-- delivery metadata needed to advance the customer-facing order status. No
-- Shiprocket credentials, tokens, or raw payloads are ever persisted.

alter table public.shiprocket_order_syncs
  add column if not exists courier_awb text
    check (courier_awb is null or char_length(courier_awb) <= 100),
  add column if not exists courier_status text
    check (courier_status is null or char_length(courier_status) <= 100),
  add column if not exists courier_status_at timestamptz;

-- Advances an order forward to a courier-reported milestone (shipped/delivered),
-- stepping through each intermediate state so the existing status-transition
-- trigger validates every hop. Never moves an order backward and never
-- overrides a terminal (cancelled/delivered) status. Returns the resulting
-- status, or null when the order does not exist / target is not a courier state.
create or replace function public.advance_order_status(
  p_order_id uuid,
  p_target public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pipeline public.order_status[] :=
    array['pending', 'confirmed', 'packed', 'shipped', 'delivered']::public.order_status[];
  v_current public.order_status;
  v_current_rank integer;
  v_target_rank integer;
  v_next public.order_status;
begin
  -- Only forward courier milestones are accepted here.
  if p_target not in ('shipped', 'delivered') then
    return null;
  end if;

  select status into v_current
  from public.orders
  where id = p_order_id
  for update;

  if v_current is null then
    return null;
  end if;

  -- Terminal states are authoritative and never overridden by courier events.
  if v_current in ('cancelled', 'delivered') then
    return v_current;
  end if;

  v_current_rank := array_position(v_pipeline, v_current);
  v_target_rank := array_position(v_pipeline, p_target);

  -- Ignore stale or out-of-order events that would move the order backward.
  if v_target_rank <= v_current_rank then
    return v_current;
  end if;

  -- Step one status at a time (pending→confirmed→packed→shipped→delivered) so
  -- the orders_apply_status_metadata trigger validates each transition.
  while v_current_rank < v_target_rank loop
    v_next := v_pipeline[v_current_rank + 1];
    update public.orders
      set status = v_next
      where id = p_order_id
        and status = v_current;
    v_current := v_next;
    v_current_rank := v_current_rank + 1;
  end loop;

  return v_current;
end;
$$;

revoke all on function public.advance_order_status(uuid, public.order_status) from public;
grant execute on function public.advance_order_status(uuid, public.order_status) to service_role;
