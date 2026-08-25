# API Routes

All handlers are Next.js App Router route files (`route.ts`), `runtime =
"nodejs"` unless noted. Standard guard order for mutating routes:
`isSameOrigin` → `rateLimitRequest` → auth → zod/validate → service client.

## Rate limit policies (`lib/security/rate-limit.ts` — RATE_LIMITS)

| Key | Scope | Limit |
|---|---|---|
| checkout | checkout | 5 / 15min |
| paymentVerify | payment-verify | 10 / 15min |
| productReview | product-review | 8 / 15min |
| requestedDressUpload | requested-dress-upload | 3 / 1h |
| tracking | tracking | 12 / 15min |
| accountProfile | account-profile | 20 / 15min |
| adminRead / adminMutation / adminUpload | admin-* | 120/60/20 per 15min |
| backup, maintenance | | 6/h, 10/h |
| paymentWebhook, shiprocketWebhook | *-webhook | 300/min |

## Storefront

| Method | Route | Auth | Purpose / notes |
|---|---|---|---|
| POST | `/api/reviews` | Customer (non-anon) | Create/update own product review (upsert on product+user). Validates uuid product, rating 1–5, comment ≤600. Name from customer_profiles. `revalidateTag("product-reviews")`. File: `app/api/reviews/route.ts` |
| GET | `/api/shiprocket/serviceability?pincode=` | public (rate-limited as `tracking`) | Two-layer estimate: India Post existence gate → ShipRocket reach. Returns `{estimate: serviceable{fastestDays,slowestDays,codAvailable,fastestCourier,district,state} \| not-serviceable}`; 503 when unavailable. `Cache-Control: no-store`. Logic in `lib/shiprocket.ts → getDeliveryEstimateForPincode` (24h cache/pincode) |
| POST | `/api/requested-dresses` | Customer (non-anon) | Public dress-reference upload: magic-byte image check (jpeg/png/webp ≤2MB), storage bucket `requested-dresses`, row status `pending` (admin approves). Consent + terms flags required |
| POST | `/api/checkout` | public (+optional customer session) | THE order creation route. zod `checkoutSchema`; RPC `create_checkout_order`; branches: **cod** (immediate success + `after()` side effects), **payu** (hash + form params), **razorpay** (order create). Also: links customer_id, saves profile, and fires `after()` deliverability assessment. Order access token returned for guest success page |
| POST | `/api/checkout/cancel` | token/order scope | Cancels pending reservation (`cancel_order_reservation`) |
| POST | `/api/checkout/promo` | public | Promo quote validation |
| GET/POST | `/api/account/profile` | Customer | Profile read/save (`lib/data/account.ts`) |
| POST | `/api/payments/payu/callback` | PayU redirect | Verifies hash/salt; confirms order; surl/furl both land here |
| POST | `/api/payments/payu/webhook` | HMAC-ish salt verify | Server-to-server confirmation |
| POST | `/api/payments/razorpay/verify` | public + order token | Signature verify via `RAZORPAY_WEBHOOK_SECRET`/key secret |
| POST | `/api/payments/razorpay/webhook` | `RAZORPAY_WEBHOOK_SECRET` | Redundant confirmation channel |
| POST | `/api/track` | public (`tracking` limit) | Order ID + phone lookup → TrackingResult |
| POST | `/api/logistics/updates` | ShipRocket (`SHIPROCKET_WEBHOOK_TOKEN`) | Status sync from courier updates → orders.status transitions |

## ShipRocket sub-routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/shiprocket/checkout` | Creates ShipRocket hosted-checkout order (API-key pair via `resolveShiprocketCheckoutEnvironment`) |
| POST | `/api/shiprocket/checkout/webhook` | Hosted checkout completion callback |
| POST | `/api/shiprocket/webhook` | Legacy/status webhook (token) |
| GET | `/api/shiprocket/catalog/collections` \| `/collection-products` \| `/products` | Catalog pull from ShipRocket for admin import tools |

## Admin (ALL guarded twice: middleware `is_admin` RPC + handler checks)

Base: `/api/admin/*` with `adminMutation`/`adminRead` limits.
`categories`, `products` (+`[id]`), `event-banners` (+`[id]`),
`homepage-slides` (+`[id]`), `promos` (+`[id]`), `settings`,
`orders/[id]`, `orders/[id]/status`, `me`, `uploads` (image pipeline:
compression → storage), `backup` (run/status; uses lib/backup orchestrator).

## Cron

| Route | Guard | Does |
|---|---|---|
| POST `/api/cron/backup` | `CRON_SECRET` | Triggers backup run |
| POST/GET `/api/cron/store-maintenance` | `CRON_SECRET` | Retries ShipRocket syncs (`retryShiprocketOrderSyncs`), expires stale reservations, retention cleanup |

## Response conventions

- Errors: `{ error: string }` via `apiError(msg, status)`; unexpected →
  `internalApiError(stage, err, publicMessage, status?)` which logs sanitized
  server-side. Rate-limited → `rateLimitError(limit)` sets Retry-After.
- Success payloads are minimal camelCase objects mapped by `lib/data/*`
  mappers — never raw rows.
