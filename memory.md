# DARAJNI project memory

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
- Product images are the only assets stored in Supabase Storage.
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

supabase/migrations/20260625020000_ecommerce_core.sql
  Normalized products, orders, items, archives, admins, settings, RLS, storage.

supabase/migrations/20260625030000_checkout_functions.sql
  Atomic checkout, inventory reservation/restoration, payment confirmation.
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
| `/privacy`, `/terms` | Legal pages |

## Release checks

```bash
npm run typecheck
npm run build
npm audit
git diff --check
```

Database tests use PostgreSQL 15 and the SQL files under `supabase/tests`.
