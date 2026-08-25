-- Address deliverability assessed via ShipRocket courier serviceability at
-- checkout time (pincode reachable from the store pickup location, COD
-- support on that lane, estimated transit days). Surfaced in the admin panel.

alter table public.orders
  add column if not exists deliverability_status text not null default 'unverified',
  add column if not exists deliverability_days integer,
  add column if not exists deliverability_checked_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_deliverability_status_check'
  ) then
    alter table public.orders
      add constraint orders_deliverability_status_check
      check (deliverability_status in (
        'unverified', 'serviceable', 'cod_unavailable', 'not_serviceable'
      ));
  end if;
end $$;

comment on column public.orders.deliverability_status is
  'ShipRocket serviceability verdict for the shipping pincode at checkout time.';
