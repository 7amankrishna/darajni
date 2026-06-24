# Darjana project memory

This file is the persistent technical map for the repository. Read it before changing
architecture, authentication, reviews, deployment or SEO.

## 1. Product identity and non-negotiable facts

- Public brand name: **Darjana Designer House**
- Repository name: `darjani` (the repo spelling differs from the public brand)
- Base location: Bihar Sharif, Bihar, India
- Postal code: 803111
- Delivery scope: Pan India
- Brand stage: new brand
- Do not add unverified claims such as years in business, customer counts, artisan counts,
  delivery times or response times.
- Prices are presented as starting prices. The final quote is confirmed after sizing and
  customisation.
- The actual WhatsApp number, support email and final domain are deployment configuration,
  not hardcoded business claims.

## 2. Technology

- React 19
- TypeScript with strict checking
- Vite 7
- Tailwind CSS 4 through `@tailwindcss/vite`
- React Router for public and protected routes
- React Helmet Async for route metadata and JSON-LD
- Supabase Auth, Postgres, Row Level Security and Storage
- Vercel static deployment with SPA rewrites

No server-role credential is used in the frontend. The browser uses only the Supabase
publishable/anon key and relies on RLS for authorization.

## 3. Repository structure

```text
.
├── .env.example
│   └── Template for all public Vite environment variables.
├── .gitignore
│   └── Excludes dependencies, builds, secrets, Vercel state and logs.
├── README.md
│   └── Setup, Supabase migration, administrator creation and Vercel deployment.
├── memory.md
│   └── This complete maintenance map.
├── index.html
│   └── Static fallback title/meta, social tags, fonts, favicon and web manifest.
├── package.json
│   └── Scripts, runtime packages, build packages and secure esbuild override.
├── package-lock.json
│   └── Reproducible npm dependency lock.
├── tsconfig.json
│   └── Strict browser TypeScript configuration and `@/*` alias.
├── vercel.json
│   ├── Vite build/output settings
│   ├── SPA route fallback to `index.html`
│   ├── Security headers
│   └── Immutable cache headers for built assets
├── vite.config.ts
│   ├── React and Tailwind plugins
│   ├── `@` path alias
│   └── Separate React, Supabase and SEO vendor chunks
├── public/
│   ├── favicon.svg
│   │   └── Gold-on-black Darjana “D” favicon.
│   ├── og-cover.svg
│   │   └── 1200×630 social sharing artwork.
│   ├── robots.txt
│   │   └── Allows public pages and blocks login/dashboard/admin crawling.
│   ├── site.webmanifest
│   │   └── Installable-site name, colors and icon.
│   └── sitemap.xml
│       └── Home, legal and starter product URLs.
├── supabase/
│   ├── config.toml
│   │   └── Local Supabase ports, auth URLs and 5 MB Storage limit.
│   └── migrations/
│       └── 20260624000000_initial_schema.sql
│           ├── Database enum types and tables
│           ├── Triggers and helper functions
│           ├── RLS policies and grants
│           ├── Storage bucket and policies
│           └── Starter products
└── src/
    ├── main.tsx
    │   └── React DOM entry point with StrictMode.
    ├── App.tsx
    │   ├── Provider order
    │   ├── BrowserRouter and route table
    │   ├── Shared navbar/footer/WhatsApp button
    │   └── Hash and route scroll handling
    ├── index.css
    │   ├── Tailwind import
    │   ├── Color/font tokens
    │   ├── Reusable buttons, fields, panels and status pills
    │   ├── Responsive shell sizing
    │   └── Reduced-motion accessibility behavior
    ├── vite-env.d.ts
    │   └── Type declarations for all `VITE_*` values.
    ├── config/
    │   └── site.ts
    │       ├── Central brand/location/contact configuration
    │       ├── Indian currency formatting
    │       └── Safe WhatsApp-link generation
    ├── lib/
    │   └── supabase.ts
    │       ├── Detects whether Supabase variables exist
    │       └── Creates the persistent browser client only when configured
    ├── types/
    │   └── index.ts
    │       └── Profile, Design, Review, status, role and input contracts.
    ├── data/
    │   └── designs.ts
    │       ├── Browser demo-mode starter products
    │       └── Product category list
    ├── context/
    │   ├── AuthContext.tsx
    │   │   ├── Supabase session/profile lifecycle
    │   │   ├── Sign in, sign up and sign out
    │   │   ├── Role derivation
    │   │   └── Browser-only demo account/session fallback
    │   ├── CatalogContext.tsx
    │   │   ├── Public product loading
    │   │   ├── Admin create/update/delete
    │   │   ├── Supabase row mapping
    │   │   ├── Storage image upload
    │   │   └── Browser localStorage fallback
    │   └── ReviewContext.tsx
    │       ├── Approved public review loading
    │       ├── Current user's review loading
    │       ├── Administrator review queue loading
    │       ├── Submit/edit/delete actions
    │       ├── Approve/reject moderation actions
    │       └── Browser localStorage fallback
    ├── components/
    │   ├── About.tsx
    │   │   └── Honest new-brand story, location and trust principles.
    │   ├── Collection.tsx
    │   │   └── Search, category filtering, loading/error/empty states and grid.
    │   ├── Contact.tsx
    │   │   └── Location, delivery scope, contact values and WhatsApp intents.
    │   ├── DesignCard.tsx
    │   │   └── Product image, price, approved rating, detail link and enquiry.
    │   ├── Footer.tsx
    │   │   └── Brand summary, route links, contact and legal links.
    │   ├── Hero.tsx
    │   │   └── Mobile-first opening, Bihar Sharif message and primary actions.
    │   ├── Navbar.tsx
    │   │   └── Responsive navigation and role-aware account destination.
    │   ├── ProtectedRoute.tsx
    │   │   └── Authentication gate plus optional administrator-role gate.
    │   ├── RatingStars.tsx
    │   │   └── Read-only or interactive accessible 1–5 star control.
    │   ├── ReviewSection.tsx
    │   │   ├── Approved review list
    │   │   ├── Sign-in prompt
    │   │   ├── One-review-per-product handling
    │   │   └── Pending-moderation explanation and form
    │   ├── Seo.tsx
    │   │   └── Route title, description, canonical, robots, social tags and JSON-LD.
    │   └── WhatsAppFloat.tsx
    │       └── Appears only when a WhatsApp number is configured.
    └── pages/
        ├── HomePage.tsx
        │   ├── Storefront section composition
        │   ├── ClothingStore structured data
        │   └── Product ItemList structured data
        ├── ProductPage.tsx
        │   ├── Indexable `/design/:slug` detail route
        │   ├── Product/Offer/AggregateRating JSON-LD
        │   ├── Gallery, product details and enquiry
        │   └── Product review section
        ├── AuthPage.tsx
        │   └── Customer registration/sign-in and demo credentials.
        ├── UserDashboard.tsx
        │   ├── Review totals
        │   ├── Pending/approved/rejected visibility
        │   ├── Moderator-note visibility
        │   ├── Edit unpublished reviews
        │   └── Delete own reviews
        ├── AdminDashboard.tsx
        │   ├── Product and review statistics
        │   ├── Product table and editor
        │   ├── Image URL and Storage uploads
        │   ├── Review queue and status filters
        │   ├── Approval/rejection with moderation notes
        │   └── Permanent review deletion
        ├── LegalPage.tsx
        │   └── Privacy and terms content.
        └── NotFoundPage.tsx
            └── Branded 404 route.
```

## 4. Route map

| Route | Audience | Search indexing | Purpose |
|---|---|---:|---|
| `/` | Public | Yes | Storefront, collection, brand story and contact |
| `/design/:slug` | Public | Yes | Individual product landing and reviews |
| `/login` | Public | No | Registration and sign-in |
| `/dashboard` | Authenticated customer | No | Own review history and moderation transparency |
| `/admin` | Administrator only | No | Product management and review moderation |
| `/privacy` | Public | Yes | Privacy information |
| `/terms` | Public | Yes | Use, product and review terms |
| `*` | Public | No | Not-found response |

Protected routes do not provide authorization by themselves. Supabase RLS remains the actual
data security boundary.

## 5. Provider and data flow

Provider order in `App.tsx` is important:

1. `AuthProvider` creates the user/profile/role state.
2. `CatalogProvider` loads products independently of sign-in.
3. `ReviewProvider` consumes both auth and catalog state.
4. Router pages consume all three.

Changing this order can break review ownership, demo product names or administrator loading.

### Product flow

1. Public browser loads `products` ordered by featured status and creation time.
2. If Supabase is unavailable because variables are absent, the demo seed is read from
   `localStorage`, then from `src/data/designs.ts`.
3. Admin create/update/delete calls RLS-protected Supabase operations.
4. Uploads go to the public `product-images` bucket. Only admins may write.
5. Public product cards link to stable slug pages.

### Review flow

1. Signed-in customer submits rating + comment.
2. Database default and policy force `pending`.
3. Public queries can see only `approved` reviews.
4. The author can see their own review in any state.
5. Admin can see all reviews.
6. Approval publishes the review.
7. Rejection requires a useful note in the UI; the note remains private to owner/admin under
   RLS because rejected reviews are not public.
8. Editing a rejected or pending review resets it to `pending` and clears the old note.
9. Approved reviews are immutable to the customer in the UI and policy, but can be deleted.
10. Unique `(product_id, user_id)` prevents duplicate reviews for one product.

## 6. Database details and security invariants

### `profiles`

- Primary key equals `auth.users.id`.
- Created automatically after account creation.
- Stores email, full name and `user`/`admin` role.
- Customer may read/update their profile; admin may read/update all.
- `protect_profile_role` blocks non-admin role escalation.

### `products`

- UUID primary key and unique SEO slug.
- Positive numeric INR starting price.
- At least one image.
- Publicly readable.
- Insert/update/delete restricted to `is_admin()`.

### `reviews`

- UUID primary key.
- Cascades when product or profile is deleted.
- Rating constrained to 1–5.
- Comment constrained to 10–1000 characters.
- Moderation note constrained to 500 characters.
- Author name is copied by a trigger from the profile, preventing browser spoofing.
- Customer-update trigger protects owner/product/author fields, forces pending and clears the
  prior moderation note.

### Storage

- Bucket: `product-images`
- Public reads
- Admin-only inserts, updates and deletes
- Maximum file size: 5 MB
- Allowed types: JPEG, PNG, WebP and GIF

## 7. Demo mode

Demo mode is active only when either Supabase URL or anon key is missing.

Local storage keys:

- `darjana_demo_accounts`
- `darjana_demo_session`
- `darjana_demo_products`
- `darjana_demo_reviews`

Built-in demo admin:

- Email: `admin@darjana.local`
- Password: `admin123`

This is intentionally a local testing convenience, not production authentication. Once both
Supabase variables exist, demo mode and its credentials are ignored.

## 8. Environment configuration

| Variable | Required in production | Usage |
|---|---:|---|
| `VITE_SITE_URL` | Yes | Canonicals, structured-data URLs and brand base URL |
| `VITE_SUPABASE_URL` | Yes | Supabase browser client |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase key governed by RLS |
| `VITE_WHATSAPP_NUMBER` | Recommended | Digits-only WhatsApp enquiry links |
| `VITE_CONTACT_EMAIL` | Yes | Footer, contact and legal support address |

All `VITE_*` values are public at build time. Never place secret/service credentials there.

## 9. SEO implementation

- Static fallback metadata exists in `index.html`.
- Route-specific metadata is generated by `Seo.tsx`.
- Canonical URLs use `VITE_SITE_URL`.
- Home emits `ClothingStore` and `ItemList` JSON-LD.
- Product pages emit `Product` and `Offer` JSON-LD.
- `AggregateRating` is emitted only when actual approved reviews exist.
- Location is represented as Bihar Sharif, Bihar 803111, India.
- `robots.txt` blocks private utility routes.
- `sitemap.xml` contains public starter routes.
- Admin-created products immediately receive indexable page URLs and internal links, but their
  slugs should also be added to the static sitemap until sitemap generation is automated.
- If the domain changes, update `VITE_SITE_URL`, `robots.txt`, and every `<loc>` in
  `sitemap.xml`.
- The social preview is currently SVG. A final owned 1200×630 JPG/PNG can replace it for
  maximum social-platform compatibility.

## 10. Responsive and accessibility behavior

- Layout shell narrows from 32 px total side space to 20 px on small screens.
- Navbar collapses below the medium breakpoint.
- Category filters horizontally scroll instead of wrapping into cramped rows.
- Catalog moves from one to two to three columns.
- Product and dashboard layouts stack on mobile.
- Buttons and inputs use roughly 44–46 px minimum touch targets.
- Product dialogs were replaced by full routes, avoiding cramped mobile overlays.
- Focus-visible outlines are globally enabled.
- Images have product-oriented alternative text; decorative thumbnails use empty alt text.
- Reduced-motion preference disables long transitions and smooth scrolling.
- Color is not the only review-status signal; text labels remain visible.

## 11. Deployment sequence

1. Create Supabase project.
2. Run the SQL migration.
3. Configure Supabase Site URL and redirect URLs.
4. Add local environment values.
5. Register the owner account.
6. Promote the owner profile to admin with SQL.
7. Verify product create/edit/delete, image upload and review moderation.
8. Import GitHub repository into Vercel.
9. Add Vercel environment variables.
10. Deploy.
11. Add the deployed domain to Supabase redirect URLs.
12. Update sitemap/robots if the final domain differs from `darjana.vercel.app`.
13. Submit sitemap to Google Search Console.

## 12. Checks before every release

```bash
npm install
npm run typecheck
npm run build
npm audit
git diff --check
```

Manual production checks:

- Registration confirmation email and redirect
- Customer login/logout
- Admin login/logout and role protection
- Product CRUD
- Image upload under and over 5 MB
- One-review-per-product enforcement
- Pending review hidden publicly
- Approval visible publicly
- Rejection note visible only to reviewer/admin
- Customer edit returns review to pending
- Product URL works on direct refresh
- WhatsApp opens the configured number
- Mobile navbar, filters, tables and product page at 320–390 px width
- Canonical URL and JSON-LD use the final domain

## 13. Known launch-time tasks

- Replace placeholder support email.
- Add the real WhatsApp number.
- Confirm the final brand spelling before printing or domain purchase.
- Replace stock/demo product images with owned or properly licensed brand photography.
- Confirm all prices, fabrics and descriptions.
- Replace static social SVG with final campaign artwork if desired.
- Update sitemap whenever new products are created, until automated sitemap generation is
  added.
- Review privacy/terms text with appropriate legal counsel for the actual sales process.
