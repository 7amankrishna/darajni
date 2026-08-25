# Environment Variables

Canonical list: `.env.example`. Server getters with placeholder filtering +
collision detection: `lib/config/server-env.ts`. Local dev uses `.env.local`
(gitignored). Vercel mirrors these.

## Public (NEXT_PUBLIC_*)

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical URLs, PayU callbacks, JSON-LD | fallback `https://www.darajni.in`; must be https |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all Supabase clients | anon key is public by design; RLS protects writes |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | checkout Razorpay open | must match `rzp_test_\|rzp_live_…` pattern w/ secret |
| `NEXT_PUBLIC_DESIGNER_SUPPORT_WHATSAPP` | siteConfig → navbar/footer/support links | digits only |
| `NEXT_PUBLIC_DEVELOPER_SUPPORT_WHATSAPP` | fallback support number | digits only |
| `NEXT_PUBLIC_CONTACT_EMAIL` | siteConfig.email fallback `darajni.in@gmail.com` | |

## Payments

| Var | Purpose |
|---|---|
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | order create + signature verify (dedicatedSecret ≥16, collision-checked) |
| `PAYU_KEY` (or `PAYU_MERCHANT_KEY`), `PAYU_SALT` (or `PAYU_MERCHANT_SALT`) | request hash + verify (`getPayUEnvironment`) |
| `PAYU_ENVIRONMENT` | `test` \| `production` → picks action/verify URLs |

## Logistics

| Var | Purpose |
|---|---|
| `SHIPROCKET_API_EMAIL`, `SHIPROCKET_API_PASSWORD` | adhoc order sync + serviceability auth (password ≥8, dedicated) |
| `SHIPROCKET_PICKUP_LOCATION` | named pickup in ShipRocket dashboard |
| `SHIPROCKET_DEFAULT_WEIGHT_KG`, `_LENGTH_CM`, `_BREADTH_CM`, `_HEIGHT_CM` | default parcel for sync + serviceability weight (>0) |
| `SHIPROCKET_API_KEY`, `SHIPROCKET_SECRET_KEY` | hosted-checkout channel only (secret ≥16, unique) |
| `SHIPROCKET_WEBHOOK_TOKEN` | shared-secret on logistics/status webhooks |

## Platform

| Var | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | service client (≥32, dedicated) |
| `ORDER_ACCESS_SECRET` | guest order-view tokens (≥32, dedicated) |
| `CRON_SECRET` | `/api/cron/*` bearer |
| `UPSTASH_REDIS_REST_URL`/`_TOKEN` | managed rate limiting (falls back to memory) |
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | Nodemailer SMTP |
| `SUPABASE_DB_URL` | pg_dump connection for backups |

## Backup subsystem (`BACKUP_*`)

`BACKUP_ENCRYPTION_KEY`, `BACKUP_BUCKET`, `BACKUP_DEST_SUPABASE_URL`,
`BACKUP_DEST_SERVICE_ROLE_KEY`, `BACKUP_RETENTION_DAYS`, `BACKUP_SCHEDULE`,
`BACKUP_ENV`, `BACKUP_DB_SCHEMAS`, `BACKUP_DUMP_TIMEOUT_MS`,
`BACKUP_STORAGE_ENABLED`, `BACKUP_RESTORE_GH_TOKEN`, `BACKUP_GITHUB_REPO`.
Details: `docs/BACKUP_DISASTER_RECOVERY.md`.

## CI/Vercel-injected (present in exports, do not set manually)

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_*`, `VERCEL_OIDC_TOKEN`,
`TURBO_*`, `NX_DAEMON`, plus legacy `VITE_SITE_URL`, `VITE_CONTACT_EMAIL`,
`VITE_WHATSAPP_NUMBER` (unused by Next app — kept for reference only).

## Validation rules to remember

1. Placeholder patterns (`your_…`, `example.com`, `changeme`, `xxxx…`) make a
   value count as MISSING — features degrade gracefully (e.g. estimates
   return "unavailable") rather than crashing.
2. Dedicated secrets must not equal any other known secret.
3. URLs must parse and honor protocol allowlists (https except localhost).
