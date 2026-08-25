# AGENTS.md — Start Here

> **For any AI agent or developer touching this repo:** read this file first,
> then jump to the specific doc you need. Everything has a path — never guess.

## What this project is

**DARAJNI Designer House** (`darajni.in`) — production e-commerce store for
made-to-order Indian occasion wear. Guest-first checkout, Pan-India delivery,
COD + Razorpay + PayU payments, ShipRocket logistics, admin operations panel.

## Stack (do not introduce alternatives without asking)

| Layer | Tech |
|---|---|
| Framework | Next.js 15.5 App Router, React 19.2, TypeScript 5.9 (strict) |
| Styling | Tailwind CSS **v4 CSS-first** (`app/brand.css`, NO tailwind.config.js), custom token system |
| UI primitives | shadcn/ui (new-york) in `components/ui/*`, lucide-react icons |
| Fonts | Inter (body) + Cormorant Garamond (display) via `app/layout.tsx`; Hero loads 4 admin-selectable Google fonts itself |
| DB/Auth | Supabase (Postgres + RLS + Auth). Server: service-role client; browser: anon client |
| State | Cart/Wishlist via React context providers; no global store |
| Animations | Pure CSS only (brand.css). **No framer-motion** |
| Mail | Nodemailer (`lib/email.ts`) |
| Rate limiting | Upstash Redis w/ in-memory fallback (`lib/security/rate-limit.ts`) |

## Commands

```bash
npm run dev          # dev server
npm run typecheck    # tsc --noEmit  ← run after EVERY change
npm run build        # typecheck + next build (needs valid env)
npm run test         # vitest
npm run validate:env # scripts/validate-env.mjs
```

There is **no separate lint script** — typecheck + build is the gate.

## Golden rules (violating these broke things before)

1. **Never delete UI elements/content when restyling.** Restyle in place.
2. **All colors go through tokens** in `app/brand.css` (`--background`,
   `--surface`, `--border`, `--text-primary/secondary`, `--accent`, `--gold*`,
   `--maroon`, `--shadow-luxe*`). Hardcoded hexes caused dark-mode breakage —
   see `docs/DESIGN_SYSTEM.md`.
3. **Server-only secrets** via `lib/config/server-env.ts` getters — they filter
   placeholders and detect cross-secret collisions. Never read `process.env`
   directly in routes when a getter exists.
4. **Every public mutating API route**: same-origin check → rate limit → auth
   (if needed) → validate → service-role client. Copy the shape of
   `app/api/requested-dresses/route.ts` or `app/api/reviews/route.ts`.
5. **Writes never happen from the anon client.** RLS grants SELECT-only to
   anon/authenticated; inserts/updates use `createSupabaseServiceClient()`
   inside route handlers.
6. **Mobile header/drawer invariants**: header is always `position: fixed`
   with a spacer div; drawer is portaled to `document.body`; scroll lock sets
   `<html>` overflow (NOT body position:fixed — it dragged the sticky… fixed
   header context before). See `components/Navbar.tsx` comments.
7. **Pincode validation is two-layer**: India Post existence check FIRST
   (`getPostalPincodeInfo`), then ShipRocket reach. ShipRocket alone returns
   false positives on made-up pincodes.
8. Run `npm run typecheck` before claiming done.

## Doc map

| Need | Read |
|---|---|
| Where is any file/folder | `docs/DIRECTORY_MAP.md` |
| System design & integrations | `docs/ARCHITECTURE.md` |
| Every API route | `docs/API_ROUTES.md` |
| Tables, migrations, RLS | `docs/DATABASE.md` |
| Tokens/classes/components | `docs/DESIGN_SYSTEM.md` |
| Step-by-step runtime flows | `docs/FLOWS.md` |
| Env variables | `docs/ENVIRONMENT.md` + `.env.example` |
| Backup/restore ops | `docs/BACKUP_DISASTER_RECOVERY.md` |
| Brand voice/rules | `memory.md` (root) |
