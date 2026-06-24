# DARAJNI Designer House

> Dont just wear Clothes. WEAR CONFIDENCE.

Production storefront for DARAJNI, based in Bihar Sharif, Bihar 803111, with Pan-India
delivery support.

## Features

- Responsive storefront with swipeable product-card galleries
- Database-backed fixed and administrator-created categories
- Supabase email/password authentication
- Customer profile editing: name, phone number and delivery address
- Separate customer and administrator dashboards
- Transparent ratings/reviews with pending, approved and rejected states
- User safety controls: private warning, review restriction and account blocking
- Server-enforced limit of three new reviews per account in 24 hours
- Admin user directory with contact/address details
- Product CRUD and automatic image resizing/WebP compression before Supabase Storage uploads
- Row Level Security for profiles, categories, products, reviews and images
- SEO metadata, JSON-LD, sitemap, robots file and legal pages
- Vercel SPA routing and security headers

## No local fallback data

The application has no local accounts, product records or review records. If Supabase
credentials are absent, it shows a deployment-configuration screen. All usable data must come
from a deployed Supabase project.

## Environment variables

```dotenv
VITE_SITE_URL=https://your-domain.example
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
VITE_WHATSAPP_NUMBER=91XXXXXXXXXX
VITE_CONTACT_EMAIL=hello@your-domain.example
```

Never put a Supabase service-role key in a `VITE_` variable.

## Supabase setup

For a new project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, run the migration files in timestamp order through Supabase SQL Editor:

1. `supabase/migrations/20260624000000_initial_schema.sql`
2. `supabase/migrations/20260625000000_live_accounts_categories.sql`
3. `supabase/migrations/20260625010000_optimized_product_images.sql`

The later migrations upgrade an earlier installation, remove the previously supplied sample
catalog records, add categories, profile details, user moderation and review rate limits, and
enforce the optimized product-image upload limit.

In **Authentication → URL Configuration**, set the production site URL and add:

- Your production URL
- `http://localhost:5173` when local development is required

Create the owner account through the site, then promote it:

```sql
update public.profiles
set role = 'admin'
where email = 'owner@example.com';
```

Sign out and back in. The account will then open the administrator dashboard.

## User moderation states

- `active`: normal account access
- `warned`: a private warning is shown; reviews remain enabled
- `restricted`: profile/dashboard remain available, but review creation and editing are disabled
- `blocked`: account dashboard access is disabled; public browsing remains possible

These rules are enforced in both the UI and Supabase RLS/triggers. An administrator must add a
private explanation when applying any state other than `active`.

## Categories

The database creates fixed categories: Lehenga, Anarkali, Saree, Gown, Sharara and Kurti.
Administrators can add custom categories. Fixed categories cannot be deleted. A custom category
cannot be deleted while products still use it.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add all environment variables from `.env.example`.
3. Deploy. Vercel uses `npm run build` and outputs `dist`.
4. Add the deployed URL to Supabase Authentication redirect URLs.
5. If using a custom domain:

   - Update `VITE_SITE_URL`
   - Replace the domain in `public/robots.txt` and `public/sitemap.xml`
   - Redeploy
   - Submit `/sitemap.xml` in Google Search Console

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run audit
```

The full architecture and maintenance guide is in [memory.md](./memory.md).
