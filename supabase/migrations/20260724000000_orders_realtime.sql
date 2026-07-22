-- Broadcast order changes to signed-in customers so their dashboard timeline
-- advances automatically when the status moves forward. Row visibility is still
-- governed by the existing `orders_customer_read` RLS policy, so each customer
-- only ever receives Realtime events for their own orders.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- UPDATE events omit unchanged/no-op detail unless the full row image is
-- replicated. REPLICA IDENTITY FULL guarantees the customer_id used by the
-- Realtime RLS filter is present on every change event.
alter table public.orders replica identity full;
