# Directory Map

Root: `C:\Users\Aman Krishna\Desktop\darajni` (repo `7amankrishna/darajni`, branch `main`).

## Top level

| Path | Purpose |
|---|---|
| `AGENTS.md` | Agent/developer entry point, golden rules |
| `memory.md` | Brand voice + project memory rules |
| `README.md` | Product overview |
| `.env.example` | Canonical env var names |
| `middleware.ts` | Supabase session refresh + `/admin` & `/api/admin` guard (`is_admin` RPC) |
| `next.config.ts`, `postcss.config.mjs` (`@tailwindcss/postcss`), `tsconfig.json`, `vitest.config.ts` | Toolchain |
| `components.json` | shadcn config (new-york / neutral) |
| `logo.webp`, `public/` | Static assets (`og-cover.svg`, favicon) |

## `app/` — routes (App Router)

System files: `layout.tsx` (fonts + `<SiteShell>`), `template.tsx`
(`.page-enter` wrapper), `globals.css` (just imports brand.css), `loading.tsx`,
`error.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`.

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` → `components/screens/HomePage.tsx` | Server component; fetches catalog+slides+banners+requests+settings in parallel |
| `/collection` | `app/collection/page.tsx` → `components/Collection.tsx` | Filters, sort; mobile filter chip uses espresso `#241B12` |
| `/design/[slug]` | `app/design/[slug]/page.tsx` | Fetches product, reviews, auth state; builds Product JSON-LD **with aggregateRating**; renders `components/screens/ProductPage.tsx` |
| `/cart`, `/checkout`, `/order/success` | respective `page.tsx` | Checkout is client-heavy (`components/cart/*`, `components/checkout/*`) |
| `/dashboard`, `/wishlist`, `/login`, `/forgot-password`, `/reset-password` | respective `page.tsx` | Account area (`lib/data/account.ts`) |
| `/about`, `/support`, `/size-guide`, `/track` | respective `page.tsx` | Token-based styling; size-guide uses `MeasurementGuideFigure` |
| `/shipping-policy`, `/returns-exchange` | respective `page.tsx` | Dynamic shipping copy from settings |
| `/terms`, `/privacy` | thin wrappers → `components/screens/LegalPage.tsx` | Correct per-type headings/content (rewritten 2026-08) |
| `/request-dress`, `/requested-dresses` | respective `page.tsx` | Upload form + public gallery |
| `/admin` (+`/admin/login`) | `app/admin/page.tsx` etc. | Dashboard shell → `components/admin/admin-dashboard.tsx` tabs |
| `/admin/orders/[id]/invoice`, `/packing-slip` | print pages (`@media print` in brand.css) | |
| `/shiprocket/complete` | `app/shiprocket/complete/page.tsx` | ShipRocket checkout return |

## `app/api/` — route handlers

See `docs/API_ROUTES.md` for the full table. Layout mirrors this tree.

## `components/`

| Path | Purpose |
|---|---|
| `Navbar.tsx` | Fixed header + top strip + portaled mobile drawer + WhatsApp float + mobile bottom nav. Scroll lock = `<html>` overflow. Badges use `var(--maroon)` |
| `Footer.tsx` | Espresso footer (`.site-footer`), gold hairline via `::before` |
| `Hero.tsx` | Auto-rotating featured slider; loads Great_Vibes/Playfair/Cinzel/Montserrat for admin hero settings; medallion trust banner |
| `DesignCard.tsx` | Product card (espresso-glass fabric chip, luxe hover) |
| `DressShowcase.tsx`, `Collection.tsx` | Category depth cards + runway grid / full collection grid |
| `events-slider.tsx`, `homepage-launch-slider(-lazy).tsx`, `requested-dresses-homepage-teaser.tsx`, `requested-dresses-section.tsx` | Admin-managed homepage content |
| `screens/HomePage.tsx` | Section order: Hero → EventsSlider → LaunchSlider → CustomCoutureBanner → ShopByOccasion → DressShowcase → New Arrivals → RequestedTeaser → PolicyPreview → ClosingCta |
| `screens/ProductPage.tsx` | Gallery/info/purchase grid + facts + info tabs + sticky help panel (**PincodeChecker** lives in Delivery card) + **ProductReviews** + related |
| `screens/LegalPage.tsx` | Privacy vs Terms content components |
| `BrandLogo.tsx`, `ThemeToggle.tsx`, `ScrollReveal.tsx`, `providers.tsx`, `About.tsx` *(unused legacy — do not import)* | |
| `product/product-gallery.tsx`, `product-info-tabs.tsx`, `product-purchase.tsx`, `quick-view-trigger.tsx`, `product-image.tsx` | PDP building blocks |
| `product/product-reviews.tsx` (server) + `review-form.tsx` (client) + `pincode-checker.tsx` (client) | 2026-08 features |
| `cart/cart-provider.tsx`, `cart-page.tsx`; `wishlist/wishlist-provider.tsx`, `wishlist-button.tsx`; `checkout/checkout-form.tsx` | Commerce client logic; Razorpay theme color `#B8893B` set here |
| `account/customer-account-page.tsx`, `*password-form.tsx` | Auth UI |
| `admin/admin-dashboard.tsx` + `product-management.tsx`, `order-management.tsx` (**DeliverabilityBadge**), `promo-management.tsx`, `events-management.tsx`, `homepage-slide-management.tsx`, `settings-panel.tsx`, `analytics-panel.tsx`, `approvals-management.tsx`, `backup-management.tsx`, `admin-login-form.tsx` | Admin tabs |

## `lib/`

| File | Purpose |
|---|---|
| `config/server-env.ts` | All server env getters; placeholder filtering; secret-collision detection |
| `shiprocket.ts` | Auth token cache, order sync + retries, **courier serviceability** (India Post gate + ShipRocket reach), `assessOrderDeliverability` |
| `shiprocket-checkout.ts`, `shiprocket-catalog.ts` | API-key based checkout channel + catalog sync |
| `data/catalog.ts` | `getCatalog`, `getProductBySlug`, `getStoreSettings` (unstable_cache, tag `catalog`/`settings`, revalidate 300s) |
| `data/reviews.ts`, `data/requested-dresses.ts`, `data/events.ts`, `data/homepage-slides.ts`, `data/orders.ts`, `data/account.ts`, `data/admin.ts` | Read layers (all cached w/ tags) |
| `security/rate-limit.ts` | `RATE_LIMITS` table + Upstash/memory limiter |
| `security/api-response.ts` | `apiError`, `internalApiError`, `rateLimitError` (never leak internals) |
| `security/request.ts` | `isSameOrigin`, `readJsonBody`, `getClientIp` |
| `security/order-token.ts` | Signed order-access token for guest success page |
| `security/payu.ts` | PayU hash gen/verify |
| `auth/admin.ts` | `requireAdminPage` |
| `supabase/client.ts` (browser anon) / `server.ts` (cookie SSR client) / `service.ts` (service role) | The only 3 clients allowed |
| `validation/*.ts` | zod schemas: checkout, account, admin |
| `email.ts` | Nodemailer templates (order notify, customer confirm, status update) |
| `imageCompression.ts`, `media-url.ts`, `storage.ts` | Upload pipeline helpers |
| `backup/*` | Backup orchestrator (see `docs/BACKUP_DISASTER_RECOVERY.md`) — actively being extended in parallel work |

## `supabase/migrations/` (run manually; newest last)

```
20260624000000_initial_schema            products/categories base
20260625000000_live_accounts_categories  ecommerce rework
20260625010000_optimized_product_images
20260625020000_ecommerce_core            orders/order_items/promos
20260625030000_checkout_functions        create_checkout_order RPC etc.
20260625040000_promos_lifecycle
20260709000000_customer_accounts         customer_profiles
20260711000000_shiprocket_order_sync     shiprocket_order_syncs + claim RPC
20260714000000_homepage_launch_slides
20260721000000_requested_dresses         + storage bucket
20260722000000_requested_dresses_and_comments
20260723000000_requested_dresses_user_info
20260724000000_orders_realtime
20260724010000_shiprocket_status_webhook
20260724020000_payu_integration
20260724030000_secure_payu_confirmation
20260724040000_reconcile_verified_payu_payments
20260724050000_delete_expired_online_reservations
20260725000000_shiprocket_checkout
20260726000000_product_and_homepage_videos
20260821000000_event_banners
20260822000000_hero_settings
20260825000000_product_reviews           ← NEW (reviews feature)
20260825010000_order_deliverability      ← NEW (deliverability badges)
```

## `types/`

`commerce.ts` (storefront domain), `admin.ts` (AdminOrder + OrderDeliverabilityStatus),
`database.ts` (DB enums). Types are hand-mapped in `lib/data/*` mappers — new DB
columns must be added to both mapper and type.
