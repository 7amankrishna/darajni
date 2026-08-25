# Architecture

## High-level shape

```
Browser (React 19 client islands)
   │  fetch (same-origin, JSON)
   ▼
Next.js App Router (Vercel)
   ├─ Server Components ── unstable_cache ──┐
   ├─ Route Handlers (/api/*)               │
   │     ├─ zod validation                  │
   │     ├─ security guards                 │
   │     ▼                                  ▼
   │  Supabase (Postgres+RLS, Auth,      Data cache tags
   │  Storage, Realtime)  ◄── service    (catalog, settings,
   │       ▲            role client        product-reviews…)
   │       └─ anon client (read-only)
   ├─ External: ShipRocket (auth/orders/serviceability),
   │            Razorpay / PayU (payments), India Post API,
   │            Upstash Redis (rate limits), SMTP
   └─ Cron (/api/cron/* w/ CRON_SECRET)
```

## Rendering & data strategy

- **Storefront pages are cached server components.** All reads go through
  `lib/data/*` wrappers using `unstable_cache` with revalidate windows (60s–30d)
  and tags; mutations call `revalidateTag`/`revalidatePath`.
- **Client islands only where interaction demands it**: cart, wishlist,
  checkout, gallery, quick view, review form, pincode checker, admin tabs.
- `/design/[slug]`, `/collection`, `/checkout`, `/dashboard`, `/admin` are
  dynamic (cookies/auth); marketing/legal/policy routes are static or ISR.

## Layering rules

```
components → lib/data/* → supabase clients
           → lib/security/* (guards before any side effect)
           → lib/shiprocket|email|storage (side effects)
config/server-env.ts is the ONLY env reader on the server.
types/{commerce,admin,database}.ts are hand-mapped (no codegen) — a DB column
change must update mapper + type together (see mapOrder/mapProduct).
```

## Security model

1. **Origin**: mutating routes require same-origin (`lib/security/request.ts`).
2. **Rate limits**: every route picks a policy from `RATE_LIMITS`; Upstash
   pipeline INCR/EXPIRE with in-memory fallback keyed by hashed IP.
3. **AuthN**: Supabase sessions via SSR cookies; middleware refreshes and gates
   `/admin`. Customer-gated writes reject `user.is_anonymous`.
4. **AuthZ**: admin = `is_admin` RPC (middleware + handler double-check);
   public tables are RLS SELECT-only — all writes use service role inside
   guarded handlers.
5. **Secrets**: single getter module filters placeholders, enforces lengths,
   detects duplicate secrets across providers.
6. **Error hygiene**: `internalApiError(stage, err, publicMsg)` logs sanitized
   server context; clients only ever see curated messages.
7. **Uploads**: extension + magic-byte + size checks before storage write;
   failed DB insert rolls back the stored object.

## Integration contracts

| System | Inbound | Outbound | Failure posture |
|---|---|---|---|
| ShipRocket | status webhooks (token) | auth/login, orders/adhoc, serviceability, hosted checkout | outbox retries w/ backoff; estimates degrade to "unavailable" |
| Razorpay | webhook (secret) + verify route | orders create | reservation cancel on failure |
| PayU | callback surl/furl + webhook (salt verify) | hashed form POST | reservation cancel on failure |
| India Post API | GET pincode directory | — | treated as "valid" on outage (ShipRocket verdict stands) |
| Upstash | REST pipeline | — | memory fallback |
| SMTP | — | order/status mails | failures logged, never block checkout |

## Concurrency & stock

Stock reservation + pricing live in Postgres RPCs (`create_checkout_order`,
`cancel_order_reservation`, promo redemption functions) — the Next layer never
mutates stock directly. Online-payment reservations expire via cron +
`delete_expired_online_reservations`.

## Performance notes

- First-load JS budget ~103 kB shared; homepage ~152 kB total.
- Images via `next/image` through `ProductImage` wrapper (remote patterns for
  `files.darajni.in`); admin uploads pre-compressed (`lib/imageCompression.ts`).
- Hero slider images are `priority`; everything below folds lazily.
- Long lists paginate/slice server-side (reviews ≤50, requested ≤12, related ≤3).

## Observability

- `console.error` with sanitized messages is the current standard; Vercel logs.
- ShipRocket sync health queryable via `shiprocket_order_syncs` table.
- Backup status surfaced in admin Backup tab + GH workflow
  (.github/workflows/backup.yml).
