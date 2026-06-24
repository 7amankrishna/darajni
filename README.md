# Darjana Designer House

Production-ready React storefront for a new occasion-wear brand based in Bihar Sharif, Bihar
803111, with Pan-India delivery support.

The application includes:

- Responsive storefront and indexable product pages
- Search, category filters, starting prices and WhatsApp enquiries
- Supabase email/password authentication
- Separate customer and administrator dashboards
- One rating/review per customer per product
- Transparent review states: `pending`, `approved`, and `rejected`
- Private moderator notes shown to the review author
- Admin product CRUD and Supabase Storage image uploads
- Row Level Security (RLS) policies for products, profiles, reviews and images
- SEO metadata, JSON-LD, sitemap, robots file, social card and legal pages
- Vercel SPA routing, security headers and immutable asset caching
- Browser-only demo mode when Supabase credentials are not configured

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

Without Supabase environment variables, the app starts in local demo mode:

- Admin: `admin@darjana.local`
- Password: `admin123`
- Customer accounts may be created with any test email.

Demo data is stored only in the current browser's `localStorage`. The demo admin password is
not used when Supabase is configured.

## Environment variables

Copy `.env.example` and provide:

```dotenv
VITE_SITE_URL=https://your-domain.example
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
VITE_WHATSAPP_NUMBER=91XXXXXXXXXX
VITE_CONTACT_EMAIL=hello@your-domain.example
```

`VITE_WHATSAPP_NUMBER` must contain digits only, including country code. Never expose a
Supabase service-role key in a `VITE_` variable or in the browser.

## Supabase production setup

1. Create a Supabase project.
2. Run [the initial migration](./supabase/migrations/20260624000000_initial_schema.sql):

   - Dashboard option: open **SQL Editor**, paste the file, and run it.
   - CLI option:

     ```bash
     supabase login
     supabase link --project-ref YOUR_PROJECT_REF
     supabase db push
     ```

3. In **Authentication → URL Configuration**, set:

   - Site URL: the final Vercel/custom-domain URL
   - Redirect URLs: the production URL and `http://localhost:5173`

4. Add the project URL and publishable/anon key to `.env.local`.
5. Start the app, create the first account, then promote it from Supabase SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'owner@example.com';
   ```

6. Sign out and back in. The account will now open `/admin`.

The migration creates:

- `profiles`, `products`, and `reviews` tables
- User-role and review-status enum types
- New-user profile and timestamp triggers
- Review-author and customer-update protection triggers
- Product/review indexes
- RLS policies
- Public `product-images` Storage bucket with admin-only writes
- Starter catalog records

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel will detect Vite. The included `vercel.json` sets:

   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA route rewrites
   - Security and cache headers

4. Add all variables from `.env.example` under **Project Settings → Environment Variables**.
5. Deploy.
6. Add the deployed URL to Supabase Authentication redirect URLs.
7. If using a custom domain:

   - Set `VITE_SITE_URL` to that domain and redeploy.
   - Replace `https://darjana.vercel.app` in `public/robots.txt` and
     `public/sitemap.xml`.
   - Submit `/sitemap.xml` in Google Search Console.

## Commands

```bash
npm run dev        # Local Vite development server
npm run typecheck  # TypeScript validation
npm run build      # Typecheck + production build
npm run preview    # Preview dist locally
npm run audit      # Dependency vulnerability audit
```

## Important launch values

The application intentionally does not invent business contact details. Before launch, set:

- Actual WhatsApp number
- Actual public support email
- Final Vercel/custom domain
- Final product names, prices, descriptions and owned/licensed images
- Supabase email templates and production redirect URLs

See [memory.md](./memory.md) for the complete architecture and file-by-file maintenance guide.
