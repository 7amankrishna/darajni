-- Custom-size ordering, product completeness, and tailoring confirmation state.

alter table public.products
  add column if not exists colour text not null default 'As shown in the product photographs',
  add column if not exists included_pieces text not null default 'Made-to-order outfit as shown',
  add column if not exists work_details text not null default 'Studio-finished detailing as shown',
  add column if not exists lining text not null default 'Lining selected to suit the garment',
  add column if not exists care_instructions text not null default 'Dry clean only. Store in a cool, dry place.';

alter table public.products
  add constraint products_colour_length check (char_length(trim(colour)) between 2 and 300),
  add constraint products_included_pieces_length check (char_length(trim(included_pieces)) between 2 and 500),
  add constraint products_work_details_length check (char_length(trim(work_details)) between 2 and 1000),
  add constraint products_lining_length check (char_length(trim(lining)) between 2 and 500),
  add constraint products_care_instructions_length check (char_length(trim(care_instructions)) between 2 and 1000);

-- DARAJNI now accepts custom-size orders only. Keeping one canonical value also
-- makes the checkout RPC's server-side size validation deterministic.
update public.products set size = array['Custom Size'];
alter table public.products alter column size set default array['Custom Size']::text[];

alter table public.order_items
  add column if not exists measurements jsonb,
  add column if not exists measurement_status text;

alter table public.order_items
  add constraint order_items_measurements_object check (
    measurements is null or jsonb_typeof(measurements) = 'object'
  ),
  add constraint order_items_measurement_status_valid check (
    measurement_status is null
    or measurement_status in ('customer_submitted', 'confirmed', 'needs_revision')
  );

comment on column public.order_items.measurements is
  'Customer-confirmed custom measurements captured at checkout in inches.';
comment on column public.order_items.measurement_status is
  'Tailoring review state for customer-submitted custom measurements.';
