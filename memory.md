# DARAJNI project memory

## Brand facts

- Public name: **DARAJNI Designer House**
- Slogan: **Dont just wear Clothes. WEAR CONFIDENCE.**
- Location: Bihar Sharif, Bihar 803111
- Delivery: Pan India
- Logo source: `public/logo.webp`, rendered by `BrandLogo.tsx`
- Do not add unverified customer counts, years, delivery times or response times.

## Runtime rule

There is no local account, product or review fallback. `components/layout/site-shell.tsx`
checks `isSupabaseConfigured`; without both public Supabase environment variables,
only `ConfigurationRequired.tsx` is rendered.

## Stack

- Next.js 15 App Router, React 19, TypeScript and Tailwind CSS 4
- shadcn/ui primitives, Radix UI and next-themes
- Supabase Auth, Postgres, RLS and Storage
- Vercel Next.js deployment

## Important files

```text
public/logo.webp
  Optimized custom DARAJNI sewing emblem.

app/layout.tsx
  Root metadata and shared site shell.

config/site.ts
  Brand, slogan, Bihar Sharif location, public URL, email and WhatsApp configuration.

context/AuthContext.tsx
  Supabase session/profile loading, profile updates, admin user directory and account moderation.

context/CatalogContext.tsx
  Products, database categories, product CRUD, category CRUD and image uploads.

context/ReviewContext.tsx
  Public/owner/admin review queries and review/moderation actions.

lib/supabase/client.ts and lib/supabase/server.ts
  Browser and cookie-aware server Supabase clients.

components/BrandLogo.tsx
  Displays the public logo asset through Next Image.

components/AccountNotice.tsx
  Shows private warning, restriction or block messages to the signed-in user.

components/ConfigurationRequired.tsx
  The only rendered screen when Supabase deployment variables are missing.

components/DesignCard.tsx
  Product summary with touch swipe, arrows and image dots on the storefront.

components/ReviewSection.tsx
  Published reviews and the account-status-aware review form.

components/screens/UserDashboard.tsx
  Customer profile editor, moderation notice and review history.

components/screens/AdminDashboard.tsx
  Reviews, products, categories and users tabs.

supabase/migrations/20260624000000_initial_schema.sql
  Complete schema for new deployments.

supabase/migrations/20260625000000_live_accounts_categories.sql
  Upgrade path for an installation created from the earlier schema.
```

## Provider order

1. `AuthProvider`
2. `CatalogProvider`
3. `ReviewProvider`

`ReviewProvider` depends on authenticated profile status. Do not reorder these providers.

## Database

### `profiles`

Stores:

- Identity: email, full name and role
- Contact: phone
- Address: two address lines, city, state and postal code
- Moderation: `account_status`, private message, moderator and moderation timestamp

Account statuses:

- `active`
- `warned`
- `restricted`
- `blocked`

Customers can update only their own basic details. A trigger prevents changes to email, role and
moderation fields. Blocked customers cannot update their profile.

### `categories`

- Fixed categories are inserted by migration.
- Admins may create custom categories.
- Fixed categories are protected from deletion.
- Used custom categories are protected from deletion.
- Product inserts/updates must reference an existing category name.

### `products`

- Publicly readable
- Admin-only create/update/delete
- Positive starting price
- At least one image
- Unique SEO slug

### `reviews`

- One review per user/product
- Rating 1–5
- Comment length 10–1000
- Public sees only approved reviews
- Owner sees all of their own reviews
- Admin sees all reviews
- Editing returns a review to pending and clears the old moderation note
- `restricted` and `blocked` users cannot insert or edit reviews
- New review insert trigger allows no more than three reviews per user in 24 hours

### Storage

- Bucket: `product-images`
- Public reads
- Admin-only writes
- 2 MiB maximum
- JPEG, PNG and WebP

## Admin user moderation

The Users tab displays profile, phone and address data. Admin actions:

- Private warning: changes status to `warned` and displays the message throughout the account UI
- Restrict: changes status to `restricted`; RLS disables review insert/update
- Block: changes status to `blocked`; protected customer dashboard is replaced by a blocked screen
- Restore: changes status to `active` and clears the private message

Administrator accounts cannot be moderated from the UI.

## Categories in the UI

- `Collection.tsx` loads fixed and custom categories from Supabase.
- `AdminDashboard.tsx` provides category creation/deletion.
- Product forms use the same database category list.
- A category must exist before a product can be created.

## Product image behavior

- Admin can add multiple image URLs or upload multiple files one at a time.
- Product cards support touch swipe, previous/next arrows and direct image dots.
- Clicking the image or Details link still opens the product route.
- Product pages keep the full thumbnail gallery.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Storefront |
| `/design/[slug]` | Public | Product details and reviews |
| `/login` | Public | Account sign-in/registration |
| `/dashboard` | Customer | Profile and reviews; blocked users see block screen |
| `/admin` | Admin | Products, categories, reviews and users |
| `/privacy` | Public | Privacy policy |
| `/terms` | Public | Terms |

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical and structured-data base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key governed by RLS |
| `NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP` | Dress designer support number |
| `NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP` | Website support number |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public support email |

All `NEXT_PUBLIC_*` values are public. Never expose service-role or payment secrets.

## SEO

- Route metadata: native App Router `metadata` exports
- Home: ClothingStore and ItemList JSON-LD
- Product routes: Product/Offer and real AggregateRating JSON-LD
- Private routes are noindex and disallowed in `robots.txt`
- Static sitemap contains home and legal pages only.
- Product URLs are generated from database slugs. Add an automated sitemap endpoint if all
  product URLs need automatic sitemap inclusion.
- Update sitemap/robots when the final domain changes.

## Release checks

```bash
npm install
npm run typecheck
npm run build
npm audit
git diff --check
```

Manual checks:

- Missing Supabase variables show only the configuration screen
- Registration, confirmation, sign-in and sign-out
- Profile update
- Admin user directory and all four account statuses
- Restricted user cannot create or edit reviews
- Fourth new review within 24 hours is rejected by the database
- Fixed/custom category behavior
- Product CRUD and multi-image upload
- Card arrows, dots and touch swipe
- Direct product-route refresh
- Mobile layouts at 320–390 px
