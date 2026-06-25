# DARAJNI Designer House

> Dont just wear Clothes. WEAR CONFIDENCE.

DARAJNI is being rebuilt as a production e-commerce platform using Next.js 15,
TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Current milestone

Phase 1 is complete:

- Next.js 15 App Router replaces the previous Vite SPA entrypoint
- TypeScript and Tailwind CSS 4 are configured
- shadcn/ui aliases and core primitives are installed
- Supabase browser and server client boundaries are available
- App Router metadata, loading, error, and not-found states are configured
- Vercel is configured for the Next.js framework
- Environment placeholders cover Supabase, Razorpay, rate limiting, and support

The existing catalog, authentication, reviews, and admin UI remain available as
client-side feature modules while later phases replace the data model and ordering
flow. WhatsApp ordering will be removed during the storefront and checkout phases.

The Phase 2 commerce migration has been generated and locally validated:

- Normalized categories and products with inventory, sizes, discounts, and images
- Guest orders, immutable order items, archive records, admins, and store settings
- No customer profile or avatar table
- Admin-only order access and public tracking through an order ID plus phone RPC
- Product-image-only storage with administrator writes

The migration is not applied automatically. Review
`supabase/PHASE_2_SCHEMA.md` and explicitly approve execution first.

## Directory structure

```text
app/
  admin/                 Admin route
  dashboard/             Customer account route
  design/[slug]/         Product route
  login/                 Authentication route
  privacy/ and terms/    Legal routes
  layout.tsx             Root metadata and site shell
  loading.tsx            Route loading state
  error.tsx              Recoverable error boundary

actions/                 Server Actions, grouped by feature
components/
  layout/                Shared application shell
  ui/                    shadcn/ui primitives
lib/
  supabase/client.ts     Browser Supabase client
  supabase/server.ts     Cookie-aware server client
  utils.ts               Shared class-name helper
types/                   Shared domain types
components/screens/      Existing feature screens retained during phased migration
context/                 Client-side auth, catalog, and review providers
supabase/                 Local Supabase config and SQL migrations
public/                   Static brand and metadata assets
```

## Environment

Copy `.env.example` to `.env.local` and add project credentials.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or webhook
secrets through a `NEXT_PUBLIC_` variable.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
npm run audit
```

Local development runs at `http://localhost:3000`.

## Supabase

No database migration is run automatically by the application setup. Migration
files in `supabase/migrations` must be reviewed and explicitly approved before
being applied.

When a schema is approved:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Deployment

1. Import the repository into Vercel.
2. Add the variables from `.env.example`.
3. Deploy using the detected Next.js framework settings.
4. Add the production and preview domains to Supabase Auth redirect URLs.
