# Runtime Flows (step-by-step)

## 1. Checkout → order → payment → fulfilment

1. `components/cart/cart-page.tsx` → `components/checkout/checkout-form.tsx`
   collects customer + items + `paymentMethod` (`cod|payu|razorpay`).
2. `POST /api/checkout` (`app/api/checkout/route.ts`):
   same-origin → limit(5/15m) → ORDER_ACCESS_SECRET gate → zod
   (`lib/validation/checkout.ts`) → RPC **`create_checkout_order`**
   (reserves stock, prices server-side, applies promo) → returns order row.
3. Links `customer_id` if signed in; saves checkout profile.
4. `after()` #1: deliverability assessment (see flow 4). Payment branch:
   - **cod** → respond success URL; `after()` #2 runs ShipRocket sync + admin
     email + customer email.
   - **payu** → build request hash (`lib/security/payu.ts`, udf1=orderId,
     udf2=order token) → redirect to PayU; callback/webhook verifies and marks
     paid.
   - **razorpay** → create gateway order → client opens checkout → verify
     endpoint signs off; webhook as backup channel.
5. Success page reads signed order token
   (`lib/security/order-token.ts`) — guests can view their order without an
   account.
6. Cancellation of unpaid reservations: `/api/checkout/cancel` + cron cleanup.

## 2. ShipRocket logistics

- **Order sync** (`lib/shiprocket.ts`): token cached 9 days; adhoc order
  create with pickup location + parcel dims from env; failures land in
  `shiprocket_order_syncs` with exponential retry; store-maintenance cron
  retries due rows. 401 triggers single token refresh retry.
- **Status webhooks** update `orders.status` (shipped/delivered transitions).
- **Hosted checkout** alternative: `/api/shiprocket/checkout` uses separate
  API-key pair (`resolveShiprocketCheckoutEnvironment`, collision-checked).

## 3. Delivery estimate (product page)

`components/product/pincode-checker.tsx` →
`GET /api/shiprocket/serviceability?pincode=` →
`getDeliveryEstimateForPincode(pin)` in `lib/shiprocket.ts`:
1. Validate `\d{6}`.
2. **Gate A — India Post** (`api.postalpincode.in`, cached 30d): pincode must
   EXIST → else `not-serviceable`. Returns district/state.
3. **Gate B — ShipRocket serviceability** (pickup = siteConfig.postalCode
   803111, parcel weight from env; NO cod filter — per-courier flags used):
   fastest/slowest days, codAvailable, fastest courier name. Cached 24h/pin.
4. UI shows: Serviceable · pincode (District, State) · date range · COD note.

## 4. Address deliverability scoring (admin)

At checkout, `assessOrderDeliverability(pincode, paymentMethod)` maps the
cached estimate to a verdict written async to `orders.deliverability_*`:

| Verdict | Condition |
|---|---|
| `serviceable` | reachable (+COD ok for the chosen method) |
| `cod_unavailable` | reachable but COD chosen on prepaid-only lane |
| `not_serviceable` | India Post invalid OR zero couriers |
| `unverified` | ShipRocket not configured / network fail |

Admin → Orders list badge under phone; detail dialog shows badge + "~X days
transit". Component: `DeliverabilityBadge` in
`components/admin/order-management.tsx`.

## 5. Product reviews

- Server section `components/product/product-reviews.tsx` renders summary
  (avg + gold stars), list, and client `review-form.tsx`.
- Form requires auth (server passes `isAuthenticated` from design page);
  submit POSTs `/api/reviews` → upsert (unique product+user) → toast +
  `router.refresh()`; revalidates tag `product-reviews`.
- `app/design/[slug]/page.tsx` adds schema.org `aggregateRating` when reviews
  exist.

## 6. Requested dresses (public board)

Upload (auth required) → magic-byte validated image ≤2MB → bucket
`requested-dresses` → row `pending` → admin approvals tab publishes/hides →
homepage teaser + gallery read published rows (tag `requested-dresses`).

## 7. Auth & admin access

- Customers: Supabase email/password accounts; SSR client manages cookies;
  middleware keeps sessions fresh on every matched route.
- Admin: `/admin/**` + `/api/admin/**` blocked by middleware unless
  `supabase.rpc("is_admin")`; pages double-check via
  `requireAdminPage` (`lib/auth/admin.ts`).

## 8. Homepage content ops

All homepage sections read live data: hero copy/colors/fonts (settings table,
admin Settings panel), launch slides, event banners, requested teaser,
featured products (`isFeatured`), categories with stock. Content edits need no
deploys.

## 9. Backups

Cron `/api/cron/backup` (`CRON_SECRET`) → `lib/backup/orchestrator.ts`
(pg_dump via `SUPABASE_DB_URL`, encrypt w/ `BACKUP_ENCRYPTION_KEY`, upload to
destination Supabase storage / optional Firebase, retention pruning, status
rows). Restore runbook: `docs/BACKUP_DISASTER_RECOVERY.md`. Admin Backup tab
surfaces status. *(Module under active parallel development.)*
