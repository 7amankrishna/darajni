# Database (Supabase Postgres)

> **Fresh deployment:** run `supabase/master_schema.sql` once (Supabase SQL
> Editor or psql) — it concatenates every migration below in order with
> post-setup checklist (first admin bootstrap) and verification queries.

Migrations live in `supabase/migrations/` and are **applied manually** (SQL
editor or `supabase db push`). Full index with dates in
`docs/DIRECTORY_MAP.md`. Tests/assertions in `supabase/tests/`.

## Access model (critical)

- Browser: anon key client (`lib/supabase/client.ts`) — SELECT-only via RLS.
- Route handlers: service-role client (`lib/supabase/service.ts`) — bypasses
  RLS; guarded by same-origin + rate limit + auth as applicable.
- SSR session client (`lib/supabase/server.ts`) — cookie-bound, used for auth
  checks and middleware.

Pattern for public tables: `enable row level security` → SELECT policy for
anon+authenticated on published rows → `REVOKE ALL` → explicit column grants →
`GRANT ALL ... TO service_role`.

## Core tables

### products
`id uuid pk`, `name`, `slug` (unique, kebab regex), `description`,
`fabric`, `size text[]`, `stock int`, `price numeric(12,2)`, `discount int`
(percent), `images text[]`, `video_url`, `category_id → categories`,
`is_featured bool`, `is_active bool`, timestamps.
Mapped by `mapProduct` in `lib/data/catalog.ts` (+ `lib/data/admin.ts`).

### categories
`id`, `name`, `slug`, `is_system`. Trigger ensures product category exists
(`ensure_product_category`).

### orders  *(most-integrated table)*
Customer/address block: `customer_name`, `phone`, `address`, `city`, `state`,
`pincode`, `landmark?`, `email?`.
Money: `subtotal`, `discount_amount`, `promo_code?`, `shipping_fee`,
`tax_amount`, `total`.
Fulfilment/payment: `payment_method ('cod'|'payu'|'razorpay'|'shiprocket')`,
`payment_status`, `status (OrderStatus enum)`, `payu_txn_id?`,
`razorpay_order_id?`, `customer_id? → auth.users`.
**2026-08 deliverability columns**: `deliverability_status text default
'unverified'` check ∈ {unverified, serviceable, cod_unavailable,
not_serviceable}, `deliverability_days int?`, `deliverability_checked_at
timestamptz?` — written by checkout `after()` hook, shown in admin panel.
Realtime enabled (20260724 migration).

### order_items
`order_id`, `product_id`, `product_name_at_time`, `selected_size`,
`quantity`, `price_at_time`, `line_total` (denormalized names/prices on
purpose).

### settings (single row `id = true`)
`shipping_charge`, `cod_enabled`, `tax_rate`,
`developer_support_number`, `designer_support_number`,
hero fields (`hero_eyebrow/title/cursive_title/subtitle/font_family/accent_color`)
→ surfaced as `StoreSettings` via `getStoreSettings()` (cached tag `settings`).

### customer_profiles
Mirrors auth users: `full_name`, `phone`, `email`, address fields. Used to
resolve review/dress-request display names.

### product_reviews  *(2026-08)*
`product_id → products ON DELETE CASCADE`, `user_id → auth.users ON DELETE
CASCADE`, `user_name`, `rating 1..5`, `comment ≤600 nullable`,
`status ∈ {published, hidden}`, timestamps,
**UNIQUE(product_id, user_id)** (resubmit = update).
Public SELECT only where `status='published'`; writes via service role only.
Read: `lib/data/reviews.ts` (tag `product-reviews`). Write:
`POST /api/reviews`.

### requested_dresses / requested_dress_comments
Public inspiration board. Dress rows: `image_url` (bucket
`requested-dresses`), `storage_path unique`, `description ≤160`, `status ∈
{published, hidden}` → admin approvals tab flips status, `user_id/email/name/
phone`, `consented_at`. Comments table for team/customer threads.

### homepage_slides / event_banners
Admin-managed hero launch slider + events carousel. Sort order + active flags;
slides support video + scheduling window.

### promo_codes / promo_redemptions
Coupon/voucher types, percentage/fixed discount, min subtotal, max discount,
usage + per-phone limits, windows. Redemption enforced server-side in
checkout RPC.

### shiprocket_order_syncs
Outbox for order sync: statuses `syncing/synced/failed/skipped`,
`attempt_count`, `next_retry_at`, RPCs `claim_shiprocket_order_sync` /
`get_due_shiprocket_order_syncs`. Retried by store-maintenance cron.

## Storage buckets

| Bucket | Public | Limits |
|---|---|---|
| product/admin uploads | yes | via admin upload pipeline |
| requested-dresses | yes | 2MB jpeg/png/webp |

## Caching tags (Next.js)

`catalog`, `settings`, `product:{slug}`, `requested-dresses`,
`product-reviews`, `serviceability`(unused tag—keyed cache), `postal-pincodes`.
Mutating routes must `revalidateTag(...)`/`revalidatePath(...)` accordingly
(e.g. reviews POST revalidates `product-reviews`; requested-dress POST
revalidates `requested-dresses` + `/`).
