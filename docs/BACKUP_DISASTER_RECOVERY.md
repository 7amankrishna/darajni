# Backup & Disaster Recovery

Encrypted, verifiable, restorable backups of the Supabase PostgreSQL database
(and optionally Supabase Storage files) into Supabase Storage.

- **What is backed up:** the full Postgres database via `pg_dump -Fc` (custom
  compressed format), plus — when enabled — every object in Supabase Storage.
- **Where it goes:** Supabase Storage under `backups/{env}/...`.
- **How it is protected:** AES-256-GCM encryption before any byte leaves the
  host. The encryption key is **never** stored in Supabase Storage or alongside the
  archive.
- **How it is verified:** SHA-256 checksum of the ciphertext, the GCM auth tag,
  and an SDK-reported remote-size match. A separate restore-verification tool
  re-checks all three before any restore.

---

## 1. Architecture at a glance

```
┌─────────────────────┐   pg_dump -Fc (streamed)
│  Supabase Postgres  │ ───────────────────────────┐
└─────────────────────┘                            │
                                                   ▼
                              ┌────────────────────────────────────┐
                              │  AES-256-GCM cipher  (streamed)    │
                              │  HashingStream (SHA-256 + count)   │
                              └────────────────────────────────────┘
                                                   │  ciphertext → temp file
                                                   ▼
                              ┌────────────────────────────────────┐
                              │  Supabase Storage                 │
                              │  backups/{env}/{YYYY}/{MM}/{DD}/   │
                              │    supabase-<ISO>.dump.enc         │
                              │    supabase-<ISO>.dump.enc.        │
                              │      manifest.json                 │
                              │  backups/{env}/storage/{bucket}/…  │
                              │  backups/{env}/_status/*.json      │
                              └────────────────────────────────────┘
```

Nothing is buffered in memory: `pg_dump` stdout is piped through the cipher and
the hashing stream straight to a temp file, then uploaded. The temp file is
always deleted in a `finally`.

### The manifest

Every encrypted archive has a neighboring `*.manifest.json` holding everything
needed to verify and restore — **except the key**:

```json
{
  "backupVersion": 1,
  "encryption": { "algorithm": "aes-256-gcm", "ivBase64": "…", "authTagBase64": "…" },
  "integrity":  { "algorithm": "sha256", "checksum": "…" },
  "archive":    { "objectName": "…", "encryptedSize": 12345, "format": "pg_dump-custom-Fc-encrypted" },
  "versions":   { "pgDump": "pg_dump (PostgreSQL) 15.4", "pgDumpMajor": 15, "server": "15.x" },
  "status":     "success"
}
```

The IV, auth tag, checksum, sizes, and versions live here — never inside the
archive, never the key.

---

## 2. What runs where

Three entry points share **one** orchestrator (`lib/backup/orchestrator.ts`):

| Runner | Schedule | Where the DB dump happens |
|--------|----------|---------------------------|
| **GitHub Actions** (`.github/workflows/backup.yml`) | `0 2 * * *` UTC + manual | ✅ reliable (installs `postgresql-client-15`) |
| **Vercel Cron** (`/api/cron/backup`) | `0 2 * * *` UTC | attempted with `dbDumpIfAvailable`; skipped cleanly if `pg_dump` absent |
| **Manual CLI** (`scripts/backup-run.ts`) | on demand | ✅ if `pg_dump` installed locally |

The GitHub Actions workflow is the reliable, scheduled producer. The Vercel
Cron route also serves the **health view** (`?status=1`).

### Distributed lock

A lock (Upstash Redis `SET NX EX`, Lua compare-and-delete release; in-memory
`globalThis` fallback) guarantees only one backup runs at a time per
environment. If a run is already in progress the next one returns `skipped`.

---

## 3. Configuration

All values come from environment variables. Placeholders and malformed values
fail loudly; absent optional values simply disable that feature.

| Variable | Required | Notes |
|----------|:---:|-------|
| `SUPABASE_DB_URL` | for DB | Direct connection, **port 5432**. Pooler hosts (port 6543) are rejected. `sslmode=require` is forced for `*.supabase.co` hosts. |
| `BACKUP_ENCRYPTION_KEY` | for DB | 32-byte key, base64. Generate: `openssl rand -base64 32`. **Never committed or stored in Supabase Storage. Losing it makes every backup unreadable.** |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | for DB + storage | Service‑role credentials used as the upload destination. |
| `BACKUP_DEST_SUPABASE_URL` / `BACKUP_DEST_SERVICE_ROLE_KEY` | recommended | **Dedicated backup destination** — a DIFFERENT Supabase project/account, so backups survive even if the production project is lost. Set BOTH together; when set they take priority over the app's own project above. |
| `BACKUP_BUCKET` | — | Private Supabase Storage bucket in the destination project. Default `backups`; **created automatically on first run** if missing. |
| `CRON_SECRET` | for route | ≥32 chars; protects `/api/cron/backup` via constant-time compare. |
| `BACKUP_ENV` | — | Path segment, default `production`. |
| `BACKUP_RETENTION_DAYS` | — | Default `30`. Values above **30 are clamped to 30** (maximum retention is 30 days). |
| `BACKUP_DUMP_TIMEOUT_MS` | — | Default `600000` (10 min). |
| `BACKUP_DB_SCHEMAS` | — | Comma-separated schema allow-list; default all schemas. |
| `BACKUP_STORAGE_ENABLED` | for storage | `1/true/yes/on` to mirror Supabase Storage files into the backup destination. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | — | Distributed lock + rate limiting. |

### First-time setup (step by step)

1. **Get the direct database URL** — Supabase Dashboard (of your WORKING
   project) → Project Settings → Database → Connection string → URI → choose
   the **Direct** one (port 5432). It looks like
   `postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres`.
2. **(Recommended) Prepare a separate backup project** — create/choose a
   DIFFERENT Supabase project (e.g. under another account), open its Dashboard
   → Project Settings → API, and copy its **Project URL** and **service_role**
   key. These become `BACKUP_DEST_SUPABASE_URL` and
   `BACKUP_DEST_SERVICE_ROLE_KEY`. Nothing else is needed there — the private
   `backups` bucket is created automatically on first upload.
3. **Generate the encryption key** — run `openssl rand -base64 32` once, save
   the output somewhere safe (password manager). This is `BACKUP_ENCRYPTION_KEY`.
4. **Set the environment variables**:
   - Locally: copy `.env.example` → `.env.local` and fill in `SUPABASE_DB_URL`,
     `BACKUP_ENCRYPTION_KEY`, `BACKUP_DEST_SUPABASE_URL`,
     `BACKUP_DEST_SERVICE_ROLE_KEY`, plus your existing
     `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
   - GitHub repo: Settings → Secrets and variables → Actions → add
     `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`,
     `BACKUP_DEST_SUPABASE_URL`, `BACKUP_DEST_SERVICE_ROLE_KEY`
     (these power the scheduled nightly dump into the backup project).
   - Vercel: Project Settings → Environment Variables → add `CRON_SECRET`
     (≥32 chars) and, for admin-panel runs, the same destination pair.
5. **Validate**: `npm run validate:env` — backup problems appear as warnings
   until configured, then as errors when malformed.
6. **Do a dry run locally**: `npm run backup:run -- --dry-run` (verifies the
   dump path without uploading), then a real run: `npm run backup:run`.

No manual bucket creation is needed: the private `backups` bucket is created
automatically in Supabase Storage on the first upload.

Generate a key and validate the whole configuration:

```bash
openssl rand -base64 32          # new BACKUP_ENCRYPTION_KEY
node scripts/validate-env.mjs    # validate all backup env vars
```

---

## 4. Running a backup

### Scheduled (automatic)

Nothing to do — GitHub Actions runs at 02:00 UTC daily. Check the Actions tab
or the health view.

### Manual

```bash
npm run backup:run                    # db + storage + retention
npm run backup:run -- --db-only       # database only (+ retention)
npm run backup:run -- --storage-only  # storage mirror only (+ retention)
npm run backup:run -- --dry-run       # verify the dump path, no upload/delete
npm run backup:run -- --env staging   # override the environment segment
npm run backup:run -- --status        # print the health view
```

Exit codes: `0` success/partial, `1` failed, `2` skipped.

### Health view (HTTP)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-domain>/api/cron/backup?status=1"
```

Returns the latest run and latest successful run. **No checksum values, object
paths, keys, or connection strings are exposed** — only non-sensitive metadata.

### Admin panel (Dashboard → Backups tab)

Signed-in admins get a **Backups** tab in the store dashboard
(`/admin` → Backups) backed by `/api/admin/backup`:

- **Status at a glance:** configuration health (database URL / encryption key /
  storage configured), latest run, latest success, and whether this host can
  produce dumps.
- **Back up now:** triggers the same orchestrator (db + storage + retention).
  On Vercel serverless there is no `pg_dump`, so the dump part is skipped there;
  use GitHub Actions for full dumps.
- **Verify:** re-computes the SHA-256 of a stored archive and compares it with
  its manifest — detects corrupted/truncated backups.
- **Delete:** removes one backup (archive + manifest pair), strictly scoped to
  the current environment's `backups/{env}/` prefix.

Restores are intentionally **not** performed from the browser: `pg_restore` is
not available on serverless and an accidental overwrite would be destructive.
Follow the restore procedure below from a trusted machine instead.

---

## 5. Restoring (disaster recovery)

Restore is **manual and non-destructive by default**. It never auto-overwrites
production.

### Step 1 — list backups

```bash
npm run backup:restore-verify
```

### Step 2 — verify a backup (no restore)

```bash
npm run backup:restore-verify -- --latest
# or a specific one:
npm run backup:restore-verify -- --backup "backups/production/…/supabase-….dump.enc"
```

This downloads the archive, re-checks the **size**, the **SHA-256 checksum**,
and the **AES-256-GCM auth tag**, decrypts to a temp `.dump`, and prints the
exact `pg_restore` command — then stops. Always do this first.

### Step 3 — restore into a database

Requires **both** `--target-db-url` and `--confirm`, plus typing `yes`:

```bash
npm run backup:restore-verify -- --latest \
  --target-db-url "postgresql://user:pass@host:5432/dbname" --confirm
```

> **Warning:** this runs `pg_restore` against the named database and is
> destructive to its current contents. Test into a throwaway database first.
> Never point `--target-db-url` at production unless you intend to overwrite it.
> Credentials reach `pg_restore` only via the `PG*` process environment, never
> on the command line.

### Restore from the admin panel (one-click, guarded)

The Backups tab has a **Restore** button per backup. The flow is designed so a
bad restore can never strand you:

1. You type `RESTORE` to confirm (plus admin login, same-origin, rate limit 3/hour).
2. The panel dispatches the guarded **"Restore Database Backup"** GitHub
   Actions workflow — restores NEVER run on serverless.
3. The workflow FIRST takes a fresh safety backup of the current state, then
   verifies + decrypts the selected backup and runs
   `pg_restore --clean --if-exists` limited to the **public** schema.
4. Progress and the final result appear in the Backups tab; an email is sent
   on completion or failure. Supabase logins (auth schema) are not touched.

One-time setup: create a fine-grained GitHub token (github.com/settings/tokens →
Only select repository `darajni` → Permissions → Actions: Read & Write) and add
it to Vercel as `BACKUP_RESTORE_GH_TOKEN`.

### Restore prerequisites

- `pg_restore` installed, matching the server's major version (Postgres 15).
- `BACKUP_ENCRYPTION_KEY` set (the key is required to decrypt and is not stored
  with the backup).

---

## 6. Retention

Automated cleanup runs **only after a verified-successful backup**, and **only**
under the exact `backups/{env}/` prefix (never another environment or app).

Rules:
- Only successful backups are considered.
- The newest successful backup is never deleted.
- Always keep at least the newest **7** successful backups (safety net for
  outage periods; with a healthy daily schedule they are always within 30 days).
- Beyond those, delete backups older than `BACKUP_RETENTION_DAYS` — **capped at
  30 days maximum** (configured values above 30 are clamped to 30).

Retention deletes both the archive and its manifest as a pair. In `--dry-run`
it reports `wouldDelete` without deleting.

---

## 7. Security properties

- **Encryption at rest:** AES-256-GCM before upload; key never in Supabase Storage.
- **Integrity:** SHA-256 of ciphertext + GCM auth tag + remote-size match.
- **Credential hygiene:** DB credentials reach `pg_dump`/`pg_restore` only via
  the libpq `PG*` environment — never on the command line, never in process
  listings, never logged.
- **Redaction:** `pg_dump` stderr is redacted (URLs, `password=`, `PGPASSWORD`)
  before any line leaves the module.
- **Least exposure:** the HTTP health view omits checksums and object paths;
  logs contain only stages, sizes, names, and statuses.
- **Connection safety:** Supabase pooler rejected; `sslmode=require` forced for
  Supabase hosts.
- **Blast radius:** retention scoped to the exact environment prefix, and only
  after a verified success.

---

## 8. Operational runbook

**Backup failing?**

1. `npm run backup:run -- --status` — see the latest error (truncated,
   secret-free).
2. Common causes: `pg_dump` not installed (use the GitHub runner),
   `pg_dump-version-mismatch` (install matching client major version),
   malformed `SUPABASE_DB_URL` (use direct port 5432, not the pooler), or a
   missing/incorrect `BACKUP_ENCRYPTION_KEY`.
3. `node scripts/validate-env.mjs` to check configuration.

**Verifying backups are healthy (no alert needed):**

Run the restore-verification tool weekly against `--latest`. A clean
"Integrity verified: checksum + AES-256-GCM auth tag OK" means the backup is
decryptable and intact.

**RPO / RTO:** daily schedule → RPO ≤ 24 h. RTO = time to download, verify,
decrypt, and `pg_restore` (typically minutes for small/medium databases).

---

## 9. Testing...

```bash
npx vitest run lib/backup/__tests__   # unit tests
npm run typecheck                     # tsc --noEmit
npm run build                         # typecheck + next build
```
