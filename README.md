# DARAJNI Designer House

> Dont just wear Clothes. WEAR CONFIDENCE.

DARAJNI is a production-oriented, guest-first e-commerce application for
made-to-order Indian occasion wear. The store is based in Bihar Sharif, Bihar,
ships across India, and supports cash on delivery and PayU payments.

The application includes the public storefront, cart, secure checkout, order
tracking, support pages, and a protected operations dashboard for products,
orders, analytics, settings, image uploads, invoices, and packing slips.

## Contents

- [Application capabilities](#application-capabilities)
- [Technology stack](#technology-stack)
- [Roles and access control](#roles-and-access-control)
- [Administrator promotion and revocation](#administrator-promotion-and-revocation)
- [Application routes](#application-routes)
- [API routes](#api-routes)
- [Architecture](#architecture)
- [Database model](#database-model)
- [Checkout and payment lifecycle](#checkout-and-payment-lifecycle)
- [Order and inventory lifecycle](#order-and-inventory-lifecycle)
- [Security model](#security-model)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Supabase setup and migrations](#supabase-setup-and-migrations)
- [PayU setup](#payu-setup)
- [Shiprocket setup](#shiprocket-setup)
- [Deployment](#deployment)
- [Administrator operations](#administrator-operations)
- [Caching, SEO, and images](#caching-seo-and-images)
- [Testing and release checks](#testing-and-release-checks)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

## Application capabilities

### Storefront

- Server-rendered product catalog backed by Supabase PostgreSQL
- Featured products, new arrivals, category filters, search, and sorting
- Scheduled, admin-managed homepage launch slider with image, copy, and CTA links
- Product pages with images, description, fabric, sizes, stock, discount, and
  related products
- Indian currency formatting and discounted-price presentation
- Product and store structured data for search engines
- Dynamic sitemap containing active product pages
- Responsive mobile and desktop interface

### Cart and checkout

- Guest checkout with optional customer account sign-in
- Signed-in checkout prefills saved customer contact and delivery details
- Browser-persistent cart stored under `darajni-cart-v1` in local storage
- Cart items separated by product and selected size
- Quantity controls constrained by the stock value last seen by the browser
- Cash on delivery, when enabled in store settings
- PayU Hosted Checkout online payments
- Coupon and voucher codes with server-side redemption limits
- Server-authoritative product prices, discounts, stock, tax, and shipping
- Atomic inventory reservation during order creation
- Signed, short-lived private order-success links
- Estimated delivery window of 7–12 calendar days

Browser totals are estimates only. PostgreSQL recalculates the final order from
current database values during checkout.

### Order tracking and support

- Order tracking using both the order number and matching phone number
- Signed-in customers can view saved order progress from `/login`
- Public tracking returns status metadata only
- Separate technical/developer and dress-designer support contacts
- WhatsApp is support-only; orders must be placed through the website checkout
- Email fallback when a support WhatsApp number is unavailable
- Privacy and terms pages

### Administration

- Supabase Auth email/password sign-in at `/admin/login`
- Additional authorization through membership in `public.admin_users`
- Daily and weekly order/revenue analytics calculated in India time
- Active-order count, top products, and low-stock alerts
- Order detail view with customer, address, items, payment, and totals
- Controlled order-status transitions
- Printable A4 invoices and packing slips
- Product-category creation plus product editing, activation, featuring, and deletion
- Multiple product images from Supabase Storage or existing HTTPS URLs
- Homepage launch management with ordering, visibility, scheduling, and CTA links
- Store shipping, tax, COD, and support-number settings

## Technology stack

- Next.js 15 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui and Radix UI primitives
- Supabase PostgreSQL 15
- Supabase Auth for administrators and optional customer accounts
- Supabase Storage for product images
- PayU for online payments
- Shiprocket custom-order sync for fulfilment
- Upstash Redis REST rate limiting in production with a bounded local fallback
- Zod request validation
- Vercel deployment configuration

## Roles and access control

Customer accounts are optional. Guests can still shop and track orders with the
public order-number-plus-phone flow, while signed-in customers can save basic
delivery details and view linked order progress.

| Actor | Authentication | Access |
|---|---|---|
| Guest customer | None | Active catalog, public settings, local cart, checkout APIs, support, and tracking with order number plus phone |
| Customer account | Supabase Auth session | Own `customer_profiles` row, linked order progress, account checkout prefill |
| Authenticated non-admin | Supabase Auth session | Customer account access only; redirected away from admin pages |
| Administrator | Supabase Auth session plus a row in `public.admin_users` | Dashboard, orders, products, settings, uploads, invoices, and packing slips |
| Service role | Server-only Supabase key | Trusted application database and storage operations |
| PayU return | Valid reverse hash plus a matching PayU verification API response | Online-payment confirmation only |

Important role rules:

- Supabase Auth registration alone does not grant administrator access.
- Auth user metadata such as `role: "admin"` does not grant access.
- The authoritative promotion record is `public.admin_users.id`.
- All current administrators have the same operational permissions. There is
  no separate owner, editor, support-agent, or super-admin tier.
- There is no self-service promotion endpoint or admin-management screen.
- Promotions and revocations must be reviewed and performed through Supabase
  SQL administration.
- The service-role key is not a human role and must never be placed in browser
  code or shared with an administrator.

## Administrator promotion and revocation

### 1. Create the Auth user

Create the user in:

```text
Supabase Dashboard → Authentication → Users → Add user
```

Use a verified email address and a strong password. The user must exist in
`auth.users` before promotion.

### 2. Promote the user

Run this reviewed statement in the Supabase SQL editor after replacing the
email:

```sql
do $$
declare
  v_user_id uuid;
begin
  select id
  into v_user_id
  from auth.users
  where lower(email) = lower('owner@example.com');

  if v_user_id is null then
    raise exception 'No Supabase Auth user exists for that email';
  end if;

  insert into public.admin_users (id)
  values (v_user_id)
  on conflict (id) do nothing;
end;
$$;
```

The administrator can then sign in at `/admin/login`.

### 3. Verify promoted administrators

```sql
select
  u.id,
  u.email,
  a.created_at as promoted_at
from public.admin_users a
join auth.users u on u.id = a.id
order by a.created_at;
```

### 4. Revoke administrator access

Replace the email and run:

```sql
delete from public.admin_users
where id = (
  select id
  from auth.users
  where lower(email) = lower('owner@example.com')
);
```

Revocation removes operational authorization without deleting the Supabase Auth
user. Existing browser authentication may remain, but subsequent protected
requests fail the admin check and redirect the user to `/admin/login`.

To remove the identity completely, revoke admin access first and then delete the
Auth user from the Supabase Dashboard.

### Adding more role levels later

The current schema is binary: a user is either in `admin_users` or is not. Adding
roles such as owner, catalog editor, fulfilment operator, or support agent
requires a reviewed database migration, role-aware authorization helpers,
updated RLS policies, API permission checks, and dashboard restrictions. Do not
implement extra roles only in the browser; browser-only role checks are not a
security boundary.

## Application routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Home, categories, featured products, arrivals, and complete collection | Public |
| `/design/[slug]` | Product details, gallery, sizing, stock, and cart actions | Public |
| `/cart` | Persistent guest cart and estimated totals | Public |
| `/checkout` | Guest delivery form and payment selection | Public |
| `/order/success?token=...` | Private order confirmation and item summary | Valid signed token |
| `/track` | Order tracking form | Public |
| `/login` | Customer sign-in, profile details, and saved order progress | Public form / customer session |
| `/forgot-password` | Request a customer password-reset email | Public |
| `/reset-password` | Choose a new password from a valid recovery link | Valid Supabase recovery session |
| `/support` | Developer and designer support contacts | Public |
| `/privacy` | Privacy information | Public |
| `/terms` | Store terms | Public |
| `/admin/login` | Administrator authentication | Public form |
| `/admin` | Analytics and store operations dashboard | Administrator |
| `/admin/orders/[id]/invoice` | Printable A4 invoice | Administrator |
| `/admin/orders/[id]/packing-slip` | Printable A4 packing slip | Administrator |
| `/dashboard` | Legacy route that redirects to `/track` | Public |

Cart, checkout, admin, API, and private order pages are excluded from search
engine indexing through metadata and `robots.txt`.

## API routes

| Method and route | Purpose | Protection |
|---|---|---|
| `POST /api/checkout` | Validate input, create an atomic order, reserve stock, and begin COD or PayU Hosted Checkout | Same-origin, validation, per-IP rate limit, server service role |
| `POST /api/checkout/promo` | Preview an order-wide coupon or voucher discount against current catalog prices | Same-origin, validation, rate limit, server service role |
| `POST /api/checkout/cancel` | Cancel a pending online-payment reservation | Same-origin and signed order token |
| `POST /api/account/profile` | Save a signed-in customer's basic contact and delivery details | Auth session, same-origin, validation, rate limit |
| `POST /api/payments/payu/return` | Reverse-hash the PayU return, reconcile it with PayU, and confirm a paid order | PayU response hash, PayU verification API, transaction/amount matching, rate limit |
| `POST /api/track` | Return matching order status metadata | Same-origin, order reference plus phone, rate limit |
| `GET /api/admin/me` | Verify the active administrator | Auth session and `admin_users` membership |
| `POST /api/admin/products` | Create a product | Administrator and same-origin |
| `PUT /api/admin/products/[id]` | Update a product | Administrator and same-origin |
| `DELETE /api/admin/products/[id]` | Delete an unreferenced product | Administrator and same-origin |
| `PATCH /api/admin/orders/[id]/status` | Apply an allowed order transition | Administrator and same-origin |
| `POST /api/admin/promos` | Create a coupon or voucher | Administrator and same-origin |
| `PUT /api/admin/promos/[id]` | Update a coupon or voucher | Administrator and same-origin |
| `DELETE /api/admin/promos/[id]` | Deactivate a coupon or voucher | Administrator and same-origin |
| `PUT /api/admin/settings` | Update singleton store settings | Administrator and same-origin |
| `POST /api/admin/uploads` | Upload a validated product image | Administrator and same-origin |
| `GET /api/cron/store-maintenance` | Run lifecycle cleanup, archival automation, and Shiprocket retry attempts | `CRON_SECRET` bearer token |

## Architecture

```text
Browser
├── Public server-rendered pages
├── Local-storage cart
├── Supabase Auth browser session for customers and admins
└── Same-origin application API requests
        │
        ▼
Next.js application
├── Middleware: refreshes Auth cookies and protects admin pages
├── Server Components: catalog, settings, admin data, print documents
├── Route Handlers: account profile, checkout, promo quote, tracking, payments, cron, admin mutations
├── Validation: Zod schemas
├── Security: origin checks, rate limits, signed order tokens
└── Service-role clients: trusted database and storage operations
        │
        ├── Supabase PostgreSQL
        │   ├── catalog and settings
        │   ├── administrator allow-list
        │   ├── customer profiles
        │   ├── orders and immutable item snapshots
        │   ├── atomic checkout/payment/promo functions
        │   └── lifecycle maintenance function
        │
        ├── Supabase Storage
        │   └── public product-images bucket
        │
        ├── PayU Hosted Checkout
        │   ├── signed form redirect
        │   ├── reverse-hash validation
        │   └── verification API reconciliation
        │
        ├── Shiprocket
        │   └── server-to-server custom-order creation
        │
        └── Upstash Redis (optional)
            └── distributed rate-limit counters
```

### Trust boundaries

- The browser is never trusted for prices, discounts, shipping, tax, totals,
  product availability, or final stock.
- Public users cannot directly read or write orders or order items.
- Signed-in customers can read orders linked to their account through the
  account page.
- Checkout and tracking RPC functions are executable only by the service role.
- Admin APIs verify the Auth user and `admin_users` membership before using the
  service-role client.
- Product images are publicly readable but write operations require admin
  authorization.

## Database model

### Tables

| Table | Purpose |
|---|---|
| `categories` | Product grouping and protected fixed categories |
| `products` | Product content, sizes, stock, pricing, discounts, images, category, and visibility |
| `admin_users` | Allow-list of Supabase Auth UUIDs permitted to administer the store |
| `customer_profiles` | Basic signed-in customer contact and delivery details without profile images |
| `orders` | Active guest or linked customer order, delivery, payment, amount, and status data |
| `order_items` | Immutable product-name, size, quantity, and price snapshots |
| `promo_codes` | Admin-managed coupons and fixed-value vouchers |
| `promo_redemptions` | Authoritative coupon/voucher usage records for global and per-phone limits |
| `archived_orders` | Minimal delivered-order archive retained after active cleanup |
| `shiprocket_order_syncs` | Server-only Shiprocket order/shipment IDs, retry state, and sanitized errors |
| `settings` | Singleton row for shipping, COD, tax, and support numbers |

Phase 2 removes the legacy `profiles` and `reviews` tables. Customer account
details now live in `customer_profiles`; checkout still stores the delivery
snapshot on each order.

### Enums

```text
order_status:
pending → confirmed → packed → shipped → delivered
   └──────── cancellation is allowed from pending, confirmed, or packed

payment_method:
cod | payu | razorpay (legacy)

payment_status:
pending | paid | failed | refunded

promo_code_type:
coupon | voucher

promo_discount_type:
percentage | fixed_amount
```

### Important database functions

- `is_admin()` checks whether `auth.uid()` exists in `admin_users`.
- `generate_order_number()` generates `DJ-YYYYMMDD-NNNNNN` order numbers.
- `track_order(reference, phone)` returns limited status metadata only when both
  values match.
- `quote_checkout_discount(code, items, phone)` previews a coupon/voucher
  against current catalog prices.
- `create_checkout_order(customer, items, payment_method, promo_code)` creates
  an order, snapshots items, applies an eligible promotion, and reserves stock
  atomically.
- `cancel_order_reservation(order_id, payment_failed)` cancels an eligible
  pending online-payment reservation.
- `confirm_payu_payment(order_id, payu_txn_id, payu_payment_id)` marks a
  PayU-verified pending order paid and confirmed.
- `restore_stock_after_cancellation()` restores item quantities whenever an
  order first transitions to `cancelled`.
- `release_promo_after_cancellation()` releases coupon/voucher usage when an
  order is cancelled.
- `run_store_maintenance()` archives delivered orders after 10 days, deletes
  minimal archives after 90 days, and cancels stale pending online-payment
  reservations.

### Store settings

`public.settings` is a singleton row with `id = true`:

- Fixed shipping charge
- COD enabled/disabled
- Percentage tax rate
- Developer support number
- Designer support number

## Checkout and payment lifecycle

### Common checkout flow

1. The browser submits customer details, product UUIDs, selected sizes,
   quantities, the requested payment method, and an optional coupon/voucher
   code.
2. `/api/checkout` verifies same-origin access and required server
   configuration.
3. Zod validates the request:
   - 1–20 cart lines
   - 1–10 units per submitted line
   - UUID product IDs
   - valid Indian-style 10-digit phone normalization
   - six-digit PIN code
   - bounded delivery and contact fields
4. Configured, structurally valid requests consume the per-IP checkout limit of
   5 attempts per 15 minutes. Missing configuration and invalid form payloads
   do not consume the order-creation quota.
5. `create_checkout_order` locks products in a stable order to avoid overselling
   and deadlock-prone lock ordering.
6. PostgreSQL verifies active products, selected sizes, stock, and COD
   availability.
7. PostgreSQL calculates discounted unit prices, subtotal, optional
   coupon/voucher discount, fixed shipping, percentage tax, and total.
8. The order and item snapshots are inserted and stock is decremented in the
   same database transaction.
9. The server creates a 24-hour HMAC-signed order-access token.

Coupon/voucher previews use `/api/checkout/promo`, but the preview is only a
convenience. The final code eligibility, redemption limits, and discount amount
are recomputed by `create_checkout_order`.

### Cash on delivery

- The server returns a private success URL containing the signed token.
- The browser clears the cart and opens the order summary.
- A new COD order begins with order status `pending`.
- An administrator confirms and advances it through fulfilment.
- COD payment status currently remains `pending`; there is no separate
  cash-collected action in the present dashboard.

### PayU Hosted Checkout

1. The server reserves inventory using the database-calculated total and
   creates a unique local PayU transaction ID.
2. It sends the browser a signed form for PayU Hosted Checkout; the browser
   posts it directly to PayU's test or production payment page.
3. PayU posts the result to `/api/payments/payu/return`.
4. The return route validates PayU's SHA-512 reverse hash, local transaction
   ID, local order ID, and exact amount.
5. It then calls PayU's server-to-server `verify_payment` API. Only a matching
   PayU `success` response marks the order `paid` and `confirmed`.
6. Pending, failed, or unverifiable payments never enter the admin order queue.

Failed payment callbacks cancel the reservation and restore stock. Stale
unconfirmed online reservations are cancelled automatically after one hour.

## Order and inventory lifecycle

Allowed order transitions are enforced in both application validation and a
PostgreSQL trigger:

```text
pending   → confirmed | cancelled
confirmed → packed    | cancelled
packed    → shipped   | cancelled
shipped   → delivered
delivered → terminal
cancelled → terminal
```

Additional behavior:

- `delivered_at` is set when the order becomes delivered.
- `cancelled_at` is set when the order becomes cancelled.
- Stock is restored exactly when an order first transitions to cancelled.
- Coupon/voucher redemptions are released exactly when an order first
  transitions to cancelled.
- Product names, selected sizes, quantities, and prices are snapshotted in
  `order_items`; later catalog edits do not rewrite order history.
- Products referenced by an order cannot be deleted because of foreign-key
  protection. Mark them inactive instead.
- A Vercel Cron request to `/api/cron/store-maintenance` calls
  `run_store_maintenance()` once per day:
  - delivered orders older than 10 days move to `archived_orders` and leave the
    active orders table;
  - archived rows older than 90 days are deleted;
  - stale pending online-payment reservations older than 1 hour are cancelled.
- Shiprocket order creation is attempted after COD checkout and after a verified
  PayU payment. Failed attempts are retried by the maintenance cron; the unique
  local order reference and an atomic claim prevent duplicate remote orders.
- Browser carts are local-only and self-expire after 48 hours.

## Security model

### Authentication and authorization

- Supabase Auth manages administrator sessions.
- Middleware refreshes Supabase cookies and protects `/admin` routes.
- Server page helpers repeat the authorization check.
- Admin APIs repeat the authorization check and require same-origin requests.
- Authorization requires both a valid Auth user and membership in
  `public.admin_users`.

### Row-level security and database privileges

- Active products, categories, and public settings are readable by storefront
  clients.
- Orders and order items are not directly available to anonymous clients.
- Authenticated database permissions remain constrained by RLS and
  `is_admin()`.
- Sensitive checkout, cancellation, confirmation, and tracking functions deny
  public execution and grant execution to `service_role`.
- `shiprocket_order_syncs` has no anonymous or authenticated access. It stores
  only Shiprocket identifiers and sanitized retry errors, never credentials,
  tokens, or customer-address payloads.

### Signed order access

`ORDER_ACCESS_SECRET` signs private order links used for:

- displaying the complete order confirmation;
- identifying a pending online-payment reservation during cancellation;
- opening a verified PayU order summary.

Tokens expire after 24 hours. After expiration, customers can still use the
public tracking page with their order number and phone.

Use a dedicated high-entropy secret:

```bash
openssl rand -hex 32
```

`ORDER_ACCESS_SECRET` is mandatory for checkout and cannot fall back to or reuse
the PayU merchant salt.

### Rate limits

| Operation | Limit |
|---|---|
| Checkout | 5 attempts per IP per 15 minutes |
| Coupon/voucher preview | 20 attempts per IP per 15 minutes |
| Checkout cancellation | 20 attempts per IP per 15 minutes |
| PayU payment return | 10 attempts per transaction per 15 minutes |
| Order tracking | 12 attempts per IP per 15 minutes |
| Customer profile update | 20 updates per account per 15 minutes |
| Admin read/verification | 120 requests per IP per 15 minutes |
| Admin mutations | 60 requests per IP per 15 minutes |
| Admin uploads | 20 requests per IP per 15 minutes |
| Store maintenance | 10 requests per IP per hour |

When both Upstash variables are configured, counters are shared across
instances. Otherwise, the application uses an in-memory fallback suitable for
development but not reliable as a distributed production limit. Rate-limit
keys hash the client identifier before storage, memory counters are bounded,
and throttled responses include standard limit and retry headers.

### Product upload validation

- Admin session and same-origin request required
- JPEG, PNG, and WebP only
- Maximum uploaded file size: 2 MiB
- MIME type and file signature checked
- Random server-generated object name
- Long-lived public cache header
- Product records accept 1–12 secure image URLs

### HTTP and SEO protections

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Restricted browser permissions for camera, microphone, and geolocation
- `X-Frame-Options: SAMEORIGIN`
- Content Security Policy restricting scripts, connections, frames, and images
- HSTS in production with subdomain protection
- Cross-origin opener and resource isolation headers
- `no-store` and `noindex` headers for API responses
- Sensitive and transactional routes excluded from indexing

## Environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

| Variable | Exposure | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | Yes | Canonical production origin without a trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Supabase publishable/anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes | Trusted database and Storage operations |
| `ORDER_ACCESS_SECRET` | Server only | Yes | Signs private 24-hour order links |
| `CRON_SECRET` | Server only | Yes for maintenance cron | Authorizes `/api/cron/store-maintenance` |
| `PAYU_KEY` | Server only | For online payment | PayU merchant key; it is sent only in the signed hosted-checkout form |
| `PAYU_SALT` | Server only | For online payment | PayU request/response and verification API hash secret |
| `PAYU_ENVIRONMENT` | Server only | For online payment | `test` or `production` |
| `SHIPROCKET_API_EMAIL` | Server only | For Shiprocket sync | Separate Shiprocket API-user email |
| `SHIPROCKET_API_PASSWORD` | Server only | For Shiprocket sync | Separate Shiprocket API-user password |
| `SHIPROCKET_PICKUP_LOCATION` | Server only | For Shiprocket sync | Exact name of an existing Shiprocket pickup location |
| `SHIPROCKET_DEFAULT_WEIGHT_KG` | Server only | For Shiprocket sync | Actual packed parcel weight in kg; must be greater than zero |
| `SHIPROCKET_DEFAULT_LENGTH_CM` | Server only | For Shiprocket sync | Actual packed parcel length in cm; must be greater than 0.5 |
| `SHIPROCKET_DEFAULT_BREADTH_CM` | Server only | For Shiprocket sync | Actual packed parcel breadth in cm; must be greater than 0.5 |
| `SHIPROCKET_DEFAULT_HEIGHT_CM` | Server only | For Shiprocket sync | Actual packed parcel height in cm; must be greater than 0.5 |
| `UPSTASH_REDIS_REST_URL` | Server only | Yes in production | Distributed rate-limit store; configure together with its token |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | Yes in production | Upstash authorization token; configure together with its URL |
| `NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP` | Public | Optional fallback | Digits-only technical support number |
| `NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP` | Public | Optional fallback | Digits-only designer support number |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public | Optional | Public email and support fallback |

Example:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

ORDER_ACCESS_SECRET=GENERATE_WITH_OPENSSL_RAND_HEX_32
CRON_SECRET=GENERATE_WITH_OPENSSL_RAND_HEX_32

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

SHIPROCKET_API_EMAIL=api-user@example.com
SHIPROCKET_API_PASSWORD=UNIQUE_SHIPROCKET_API_PASSWORD
SHIPROCKET_PICKUP_LOCATION=Primary Warehouse
SHIPROCKET_DEFAULT_WEIGHT_KG=0.5
SHIPROCKET_DEFAULT_LENGTH_CM=25
SHIPROCKET_DEFAULT_BREADTH_CM=20
SHIPROCKET_DEFAULT_HEIGHT_CM=5

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP=
NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP=
NEXT_PUBLIC_CONTACT_EMAIL=hello@example.com
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ORDER_ACCESS_SECRET`, `CRON_SECRET`,
the PayU salt, Shiprocket credentials/tokens, or Upstash credentials through
a `NEXT_PUBLIC_` variable.

Use a different random value for every server-side secret. `ORDER_ACCESS_SECRET`
and `CRON_SECRET` must contain at least 32 characters and must never reuse the
PayU merchant salt. Validate a local or deployment environment before
release:

```bash
npm run validate:env
```

The validator rejects missing values, placeholders, malformed URLs, incomplete
PayU, Shiprocket, or Upstash configuration, short or reused secrets, and
secret-like variables with a `NEXT_PUBLIC_` prefix. Production deployments
should configure Upstash; without it, rate limiting falls back to a bounded
per-instance memory store and cannot coordinate limits across multiple server
instances.

Restart the development server after changing `.env.local`. In Vercel, changing
an environment variable requires a new deployment.

## Local development

### Requirements

- Node.js and npm
- A Supabase project or the Supabase CLI with Docker for local services
- PayU test credentials when testing online payments

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

### Available commands

```bash
npm run dev        # Next.js development server
npm run typecheck  # TypeScript validation
npm run build      # Typecheck and optimized production build
npm start          # Serve a completed production build
npm run audit      # Dependency security audit
```

## Supabase setup and migrations

Migrations are stored in `supabase/migrations` and run in timestamp order:

| Migration | Purpose |
|---|---|
| `20260624000000_initial_schema.sql` | Legacy initial account, catalog, review, and Storage foundation |
| `20260625000000_live_accounts_categories.sql` | Legacy account/category hardening and fixed categories |
| `20260625010000_optimized_product_images.sql` | Product image data update |
| `20260625020000_ecommerce_core.sql` | Guest-commerce schema, admins, normalized products, orders, settings, RLS, and Storage policies |
| `20260625030000_checkout_functions.sql` | Atomic checkout, inventory restoration, cancellation, and payment confirmation |
| `20260625040000_promos_lifecycle.sql` | Coupons, vouchers, promo redemptions, maintenance archival, and cleanup automation |
| `20260711000000_shiprocket_order_sync.sql` | Server-only Shiprocket sync state, concurrency claim, and retry support |

All migrations are required for a new database because later phases transform
objects created by earlier phases.

### Link and apply

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Migrations are never applied automatically by the Next.js deployment.

Before applying migrations to production:

1. Back up the database.
2. Review the SQL and current schema.
3. Confirm the application deployment expects the same migration phase.
4. Apply migrations in a controlled deployment window.
5. Verify catalog, admin login, checkout, tracking, and payment callbacks.

Do not run files under `supabase/tests` against production. Applied migration
files should be treated as immutable; create a new timestamped migration for
later production changes.

### Fixed categories

The migration seeds these protected system categories:

- Lehenga
- Anarkali
- Saree
- Gown
- Sharara
- Kurti

The current admin dashboard selects existing categories but does not provide
category CRUD controls. Add or change non-system categories through a reviewed
migration or SQL administration. System categories are protected from deletion
and from changes to their system flag.

## PayU setup

### Credentials

Set:

```dotenv
PAYU_KEY=your_test_or_production_merchant_key
PAYU_SALT=matching_merchant_salt
PAYU_ENVIRONMENT=test
```

Set `PAYU_ENVIRONMENT=production` only with production credentials. The hosted
payment form is sent to `test.payu.in` for test mode and `secure.payu.in` for
production mode.

### Return and verification

Set this HTTPS endpoint as the PayU success, failure, and cancel return URL:

```text
https://your-domain.example/api/payments/payu/return
```

The app computes the payment-request SHA-512 hash on the server. On return, it
validates PayU's reverse hash, checks the local transaction and exact amount,
then calls PayU's `verify_payment` API before setting `payment_status` to
`paid` and showing the order in admin. A failed or unverified online attempt is
never treated as a confirmed order.

## Shiprocket setup

The integration creates a Shiprocket **custom order** with the customer’s
delivery address, ordered items, payment mode, server-calculated amount, and
the configured pickup location. It does not expose a Shiprocket endpoint to the
browser, create an AWB, select a courier, or schedule pickup automatically;
those remain controlled in the Shiprocket panel.

1. In the Shiprocket panel, add and verify your pickup address. Copy its pickup
   location name exactly; it is case-sensitive configuration for
   `SHIPROCKET_PICKUP_LOCATION`.
2. Go to **Settings → API → Configure → Create API User**. Use a new email
   address, not the main Shiprocket login, and grant only the **Orders** module
   this integration needs. Choose the lowest Buyer Details API access that your
   Shiprocket account permits for this custom-order creation flow; this app does
   not call buyer search or address-update APIs.
3. Add all seven `SHIPROCKET_*` values to `.env.local` locally and to every
   Vercel environment used for checkout. Use your measured *packed* parcel
   dimensions and weight—not an arbitrary product estimate.
4. Apply the new database migration, deploy, and create a test COD order. In
   Shiprocket, open **Orders → All Orders** and search the numeric reference
   formed from the store order number (for example, `DJ-20260711-000001`
   becomes `20260711000001`). The Shiprocket order ID and shipment ID are
   recorded only in `shiprocket_order_syncs`.

The integration sends an online order only after the PayU return hash and PayU
verification API have confirmed payment. COD orders are queued immediately
after the database order is committed. The configured parcel profile applies to
every order; add per-product/package dimensions before going live if your
garments vary materially in packed size or weight. A Shiprocket failure never
loses the customer order or exposes a failure message to the customer; it is
retried by the protected maintenance cron with exponential backoff.

For a controlled operational check, run this in the Supabase SQL editor as an
administrator:

```sql
select
  o.order_number,
  s.status,
  s.shiprocket_order_id,
  s.shipment_id,
  s.attempt_count,
  s.last_error,
  s.synced_at
from public.shiprocket_order_syncs s
join public.orders o on o.id = s.order_id
order by s.updated_at desc;
```

Do not put Shiprocket credentials in source code, browser JavaScript, API
responses, Git commits, or client-side analytics. Rotate the separate API user
password immediately if it is ever exposed, update the environment variables,
and redeploy. Shiprocket custom orders are not automatically cancelled when a
store admin cancels an order; cancel a created Shiprocket order in its panel
until you choose to add a reviewed cancellation workflow.

## Deployment

### Vercel

1. Import the GitHub repository into Vercel.
2. Keep the detected Next.js framework configuration.
3. Add every required environment variable.
4. Generate and add `ORDER_ACCESS_SECRET`:

   ```bash
   openssl rand -hex 32
   ```

5. Apply Supabase migrations separately.
6. Promote at least one administrator.
7. Configure the PayU return URL and production credentials.
8. Create the restricted Shiprocket API user and add all `SHIPROCKET_*`
   variables if Shiprocket sync is enabled.
9. Configure Upstash for reliable multi-instance production rate limiting.
10. Deploy.
11. Run the post-deployment checks below.

`vercel.json` runs `npm run build` and applies baseline security headers.

### Post-deployment checklist

- Home page displays categories and active products.
- A product detail page loads and can add a selected size to the cart.
- Cart totals display shipping and tax settings.
- COD checkout creates one order and opens its success page.
- PayU test checkout confirms payment and opens its success page.
- Test COD and PayU orders appear once in the Shiprocket Orders panel with
  the correct address, payment mode, amount, pickup location, weight, and dimensions.
- A failed PayU payment restores stock.
- Tracking requires both the correct order number and phone.
- `/admin/login` accepts a promoted administrator.
- Admin analytics, orders, products, settings, invoices, and packing slips load.
- Image upload accepts a valid image and rejects invalid or oversized files.
- The PayU return route redirects a verified test payment to its success page.
- `ORDER_ACCESS_SECRET` is present in every Vercel environment used for checkout.

## Administrator operations

### Analytics

- Today and current-week totals use Asia/Kolkata timing.
- Cancelled orders are excluded from sales totals.
- Top products are ranked by item quantity across non-cancelled orders.
- Low-stock alerts include active products with stock of 5 or less.

### Orders

- Filter active, pending, confirmed, packed, shipped, delivered, or cancelled
  orders.
- View customer and delivery details.
- View immutable item and price snapshots.
- Apply only the next allowed status.
- Print an invoice with prices.
- Print a packing slip without prices.

### Products

- Product fields include name, slug, category, description, fabric, sizes,
  stock, price, discount, images, featured state, and active state.
- Slugs must contain lowercase letters, numbers, and single hyphen separators.
- Fabric supports up to 1,000 characters.
- Descriptions support 30–5,000 characters.
- Sizes are stored as an array of 1–20 values.
- Products require 1–12 images.
- Inactive products are hidden from the storefront.
- Featured products appear in the featured section.
- If an order references a product, deactivate it instead of deleting it.

### Settings

- Shipping is a fixed non-negative amount per order.
- Tax is a percentage of the discounted subtotal.
- COD can be enabled or disabled.
- Support numbers contain digits only and may include a country code.
- Settings changes revalidate affected storefront pages.

## Caching, SEO, and images

### Data caching

- Public catalog and settings queries use Next.js cache entries with a
  five-minute revalidation window.
- Product mutations revalidate catalog data and relevant routes.
- Settings mutations revalidate settings, cart, checkout, support, and admin
  routes.
- Admin pages are force-dynamic.

### SEO

- Canonical site origin comes from `NEXT_PUBLIC_SITE_URL`.
- Product pages generate product-specific metadata and Open Graph images.
- JSON-LD includes `ClothingStore`, `ItemList`, and `Product`.
- The sitemap includes public static pages and active products.
- Private and transactional pages are excluded from indexing.

### Images

- Next.js accepts Supabase public `product-images` URLs.
- Next.js can generate AVIF and WebP delivery formats.
- The Storage bucket is public-read and admin-write.
- Uploaded objects use immutable-style one-year cache control.
- Local brand icons and social assets live under `public`.

## Testing and release checks

Run before every release:

```bash
npm run typecheck
npm run build
npm audit
git diff --check
```

Database assertions are under `supabase/tests`:

- `bootstrap.sql` creates minimal Supabase-owned objects for disposable plain
  PostgreSQL testing.
- `phase_2_assertions.sql` verifies commerce migration, privileges, RLS behavior,
  order transitions, tracking privacy, Storage settings, and admin recognition.
- `phase_3_checkout_assertions.sql` verifies atomic totals, stock reservation,
  cancellation restoration, RPC privileges, and Razorpay legacy confirmation.
- `phase_6_payu_assertions.sql` verifies PayU reservation cancellation and
  idempotent server-side payment confirmation.
- `phase_5_promos_lifecycle_assertions.sql` verifies coupon/voucher math,
  redemption release, RPC privileges, and lifecycle maintenance.

Run database assertions only against a disposable test database prepared with
the expected fixtures and migrations.

## Troubleshooting

### `Order access security is not configured.`

`ORDER_ACCESS_SECRET` is missing in the running environment.

Generate a secret:

```bash
openssl rand -hex 32
```

Add it to `.env.local` or Vercel Environment Variables, then restart or
redeploy. The checkout route checks this before creating an order so missing
configuration does not reserve inventory or create a ghost order.

### Admin credentials work, then `The page could not be prepared.`

Check:

- `SUPABASE_SERVICE_ROLE_KEY` exists in the deployment.
- Commerce migrations are applied.
- The Auth UUID exists in `public.admin_users`.
- Products have valid category relationships.
- The `settings` singleton row with `id = true` exists.
- Vercel function logs for the exact Supabase query error.

### `This account is not authorized for store administration.`

The email/password may be valid, but the Auth user is not promoted. Insert the
user UUID into `public.admin_users` using the promotion procedure above.

### `Checkout is not configured.`

One or more of these server settings is missing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Also verify that Phase 2 and Phase 3 migrations are applied.

### `Online payment is not configured.`

Set these online-payment variables:

- `PAYU_KEY`
- `PAYU_SALT`
- `PAYU_ENVIRONMENT`

Then redeploy.

### Payment succeeded but confirmation is delayed

- Check the application log for the PayU verification API request.
- Confirm `PAYU_KEY`, `PAYU_SALT`, and `PAYU_ENVIRONMENT` match the same PayU account.
- Confirm `NEXT_PUBLIC_SITE_URL` is the deployed HTTPS origin.
- Check application logs for payment confirmation RPC errors.
- Retain the PayU transaction ID or payment ID when contacting support.

### Storefront products are empty

- Confirm products are active and have stock as expected.
- Confirm all migrations were applied in order.
- Confirm public Supabase URL and anon key are correct.
- Check server logs for catalog query errors.
- Verify every product has a valid `category_id`.

### Upload fails

- Use JPEG, PNG, or WebP.
- Keep the uploaded file at or below 2 MiB.
- Verify the `product-images` bucket and policies exist.
- Verify the user is promoted and currently signed in.

### Rate limiting is inconsistent across deployments

The in-memory fallback is instance-local. Configure both Upstash variables for
distributed production enforcement.

## Project structure

```text
app/
├── admin/                         Protected dashboard and print pages
├── api/
│   ├── account/                   Customer profile updates
│   ├── admin/                     Admin verification and mutations
│   ├── checkout/                  Order creation and reservation cancellation
│   ├── payments/payu/             Hosted-checkout return verification
│   └── track/                     Private-by-pair order tracking
├── cart/                          Guest cart page
├── checkout/                      Guest and account checkout page
├── design/[slug]/                 Product page
├── login/                         Customer account and order progress
├── order/success/                 Signed private order summary
├── support/                       Support contacts
├── track/                         Order tracking
└── privacy/, terms/               Legal pages

components/
├── account/                       Customer account profile and orders UI
├── admin/                         Analytics, orders, products, settings, print
├── cart/                          Cart provider and cart UI
├── checkout/                      Checkout and PayU hosted-payment redirect
├── layout/                        Shared site shell
├── order/                         Tracking and order status UI
├── product/                       Product image, gallery, and purchase UI
├── screens/                       Main page compositions
└── ui/                            Reusable interface primitives

config/
└── site.ts                        Brand, canonical URL, contact, price helpers

lib/
├── auth/                          Admin session and authorization helpers
├── data/                          Account, catalog, settings, orders, and admin queries
├── security/                      Origin checks, rate limits, signed tokens
├── supabase/                      Browser, server, and service-role clients
├── validation/                    Account, checkout, and admin Zod schemas
└── commerce.ts                    Pricing, phone, date, and delivery helpers

supabase/
├── migrations/                    Ordered production database changes
├── tests/                         Disposable PostgreSQL assertions
├── config.toml                    Local Supabase configuration
└── PHASE_2_SCHEMA.md              Commerce-schema notes

types/
├── admin.ts                       Admin dashboard data contracts
├── commerce.ts                    Storefront and order contracts
└── database.ts                    Database enum contracts
```

## Brand and operational defaults

- Public name: DARAJNI Designer House
- Short name: DARAJNI
- Slogan: Dont just wear Clothes. WEAR CONFIDENCE.
- Location: Bihar Sharif, Bihar 803111
- Delivery area: India
- Currency: INR
- Locale: `en-IN`
- Administration timezone for daily/weekly analytics: Asia/Kolkata
- WhatsApp policy: support only, never direct ordering
