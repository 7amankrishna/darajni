# DARAJNI Designer House

> Dont just wear Clothes. WEAR CONFIDENCE.

Production e-commerce storefront built with Next.js 15, TypeScript, Tailwind
CSS, shadcn/ui, Supabase PostgreSQL, Supabase Storage, and Razorpay.

## Implemented

- Server-rendered, cached storefront catalog
- Featured products, categories, new arrivals, search, filters, and sorting
- Product galleries with zoom, sizing, inventory, discounts, and related items
- Persistent guest cart and authoritative server-side checkout totals
- Cash on delivery and signed Razorpay payment confirmation
- Order success details and delivery estimate
- Rate-limited order tracking using order ID plus phone number
- Separate website and dress-designer support contacts
- WhatsApp restricted to support; ordering happens only through checkout
- Product-image-only Supabase Storage policies

## Architecture

```text
app/
  api/checkout/          Rate-limited order creation and cancellation
  api/payments/          Razorpay verification and webhook
  api/track/             Rate-limited tracking endpoint
  cart/ checkout/        Guest purchase flow
  design/[slug]/         Server-rendered product details
  order/success/         Signed private order summary
  support/ track/        Customer support and tracking

components/
  cart/ checkout/        Client cart state and checkout UI
  order/ product/        Commerce UI modules
  layout/ ui/            Shared shell and shadcn primitives

lib/
  data/                  Cached server queries
  security/              Rate limits, request checks, signed order tokens
  supabase/              Browser, server, and service-role clients
  validation/            Zod request schemas

supabase/
  migrations/            Reviewed database changes
  tests/                 PostgreSQL integration assertions
```

## Environment

Copy `.env.example` to `.env.local`. Required production secrets include:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET
ORDER_ACCESS_SECRET=generate-a-long-random-secret

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Never expose service-role, payment, webhook, Redis, or order-signing secrets
through `NEXT_PUBLIC_` variables.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
npm run audit
```

## Database migrations

Migrations are never applied automatically. Review and explicitly approve them
before running:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The Phase 2 and Phase 3 commerce migrations must be applied before the new
storefront can read products or accept orders.

## Razorpay webhook

Configure the production webhook URL:

```text
https://your-domain.example/api/payments/razorpay/webhook
```

Enable at least `payment.captured` and `order.paid`, and use the same secret as
`RAZORPAY_WEBHOOK_SECRET`.

## Deployment

1. Import the repository into Vercel.
2. Add every required environment variable.
3. Apply the approved Supabase migrations.
4. Configure the Razorpay webhook.
5. Configure managed Redis for distributed checkout/tracking rate limits.
6. Deploy with the detected Next.js settings.
