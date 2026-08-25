# DARAJNI project memory

## Documentation index (read AGENTS.md first)

- `AGENTS.md` — agent entry point, stack rules, golden rules
- `docs/DIRECTORY_MAP.md` — where every file/folder lives
- `docs/ARCHITECTURE.md` — layers, caching, security model, integrations
- `docs/API_ROUTES.md` — every route + guard + rate limit
- `docs/DATABASE.md` — tables, migrations, RLS pattern, cache tags
- `docs/DESIGN_SYSTEM.md` — brand.css tokens/classes, dark-mode pitfalls
- `docs/FLOWS.md` — checkout/ShipRocket/deliverability/reviews step-by-step
- `docs/ENVIRONMENT.md` — env var reference

## Brand

- Public name: DARAJNI Designer House
- Slogan: Dont just wear Clothes. WEAR CONFIDENCE.
- Location: Bihar Sharif, Bihar 803111
- Delivery: Pan India
- WhatsApp is support-only. Never reintroduce WhatsApp ordering.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4
- shadcn/ui, Radix UI, next-themes
- Supabase PostgreSQL, Auth for admins only, and product-image Storage
- Razorpay for online payments
- Optional Upstash Redis REST for distributed rate limiting
- Vercel deployment

## Commerce rules

- Customer checkout is guest-first; there are no customer profile or avatar tables.
- The browser never submits trusted prices, tax, shipping, or totals.
- `create_checkout_order` locks products and computes all amounts in PostgreSQL.
- Order and order-item tables are never directly available to anonymous clients.
- Tracking is exposed only through the rate-limited app API and requires both
  order ID and matching phone number.
- Order success links use a short-lived HMAC token.
- Coupon and voucher codes are only previews in the browser; final eligibility,
  redemption limits, discount, tax, and total are recomputed in PostgreSQL.
- Delivered orders leave the active order table after 10 days via maintenance
  automation; minimal archives are deleted after 90 days.
- Browser carts are local-only and self-expire after 48 hours.
- Product images are the only assets stored in Supabase Storage.
- Every admin page and API verifies both a Supabase Auth session and membership
  in `admin_users`.
- Admin mutations use same-origin checks and server-only service-role access.
- Applying SQL migrations always requires explicit user confirmation.

## Important paths

```text
app/api/checkout/route.ts
  Validates checkout, rate limits, creates atomic orders, and starts Razorpay.

app/api/payments/razorpay/verify/route.ts
  Verifies Razorpay signatures before confirming payment.

app/api/payments/razorpay/webhook/route.ts
  Handles signed asynchronous payment confirmation.

lib/data/catalog.ts
  Cached public product/category/settings queries.

lib/security/
  Rate limiting, same-origin checks, and signed order tokens.

components/cart/cart-provider.tsx
  Persistent local guest cart.

components/admin/
  Order management, product CRUD, analytics, settings and print documents.

lib/auth/admin.ts
  Verified Supabase Auth plus `admin_users` authorization.

supabase/migrations/20260625020000_ecommerce_core.sql
  Normalized products, orders, items, archives, admins, settings, RLS, storage.

supabase/migrations/20260625030000_checkout_functions.sql
  Atomic checkout, inventory reservation/restoration, payment confirmation.

supabase/migrations/20260625040000_promos_lifecycle.sql
  Coupon/voucher tables, redemption limits, order archival, cleanup automation.

app/api/cron/store-maintenance/route.ts
  CRON_SECRET-protected endpoint that calls run_store_maintenance().
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Storefront, featured products, categories, arrivals, filters |
| `/design/[slug]` | Product gallery, details, sizes, cart actions |
| `/cart` | Quantity management and estimated totals |
| `/checkout` | Guest delivery and payment form |
| `/order/success` | Signed private order summary |
| `/track` | Order ID and phone tracking |
| `/support` | Developer and designer support |
| `/admin/login` | Administrator authentication |
| `/admin` | Orders, products, analytics and settings |
| `/admin/orders/[id]/invoice` | A4 invoice with prices |
| `/admin/orders/[id]/packing-slip` | A4 packing slip without prices |
| `/privacy`, `/terms` | Legal pages |

## Release checks

```bash
npm run typecheck
npm run build
npm audit
git diff --check
```

Database tests use PostgreSQL 15 and the SQL files under `supabase/tests`.

## Features added 2026-08 (post-initial docs)

- **Product reviews**: `product_reviews` table (migration 20260825000000),
  `POST /api/reviews` (auth-only upsert, tag `product-reviews`),
  `components/product/{product-reviews,review-form}.tsx`, aggregateRating in
  Product JSON-LD.
- **Pincode delivery estimates**: `GET /api/shiprocket/serviceability` —
  India Post existence gate THEN ShipRocket reach (`lib/shiprocket.ts →
  getDeliveryEstimateForPincode`, 24h cache/pin). UI:
  `components/product/pincode-checker.tsx` inside PDP Delivery panel.
  NEVER trust ShipRocket alone: surface couriers false-positive on made-up
  pincodes.
- **Address deliverability scoring**: migration 20260825010000 adds
  `orders.deliverability_{status,days,checked_at}`; checkout writes verdict via
  `after()` using `assessOrderDeliverability`; admin Orders list + detail show
  Deliverable / COD-unsupported / Not-deliverable / Unverified badges.
- **Premium "heritage luxe" refresh**: token system extended (`--maroon`,
  `--gold`, `--gold-dark`, `--accent-gradient`, `--shadow-luxe*`, warm-charcoal
  dark palette), shine-sweep primary buttons, espresso footer (`.site-footer`),
  medallion icons, nav underlines. All pages must use tokens — hardcoded hexes
  caused dark-mode bugs (fixed across ~20 files).
- **Mobile drawer invariants**: header always `position: fixed` + spacer div;
  drawer portaled to `document.body`; scroll lock = `<html>` overflow +
  `overscroll-behavior:none`. Do not revert to body-freeze or sticky header.
