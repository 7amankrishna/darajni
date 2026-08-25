// Self-contained backup environment access.
//
// This module deliberately does NOT `import "server-only"` and does NOT import
// any module that does (such as `@/lib/config/server-env` or
// `@/lib/supabase/service`). The `server-only` marker package only resolves
// inside Next's bundler, so importing it here would break the standalone CLI
// scripts (`scripts/backup-run.ts`, `scripts/restore-verify.ts`) and the
// vitest unit tests, which all import this file directly under plain Node/tsx.
//
// Convention: getters return `null` when a value is simply not configured (so
// callers can decide to skip that feature), and throw `BackupEnvError` when a
// value is present but malformed (so a misconfigured deployment fails loudly
// instead of silently producing bad backups). No value is ever logged from
// this module — only the helper `describeSupabaseDb` exposes a redacted
// connection summary that is safe to log.

const PLACEHOLDER = /(?:^your_|your-domain|your_project|replace_|generate-|generate_|example\.com|changeme|x{8,})/i;

function env(name: string): string {
  const raw = process.env[name];
  if (raw == null) return "";
  return raw.trim();
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER.test(value);
}

function isTruthyFlag(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export class BackupEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupEnvError";
  }
}

export interface SupabaseDbConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  sslmode: string;
  // libpq connection environment passed to the `pg_dump` child process.
  // Credentials live ONLY here and are never logged; this object must not be
  // printed wholesale. Typed to allow merging over `process.env` (which has
  // `string | undefined` values) for the child-process env option.
  pgEnv: Record<string, string | undefined>;
}

export interface SupabaseStorageCredentials {
  url: string;
  serviceRoleKey: string;
}

/**
 * 32-byte AES-256 key, base64-decoded and length-validated. The placeholder
 * check is intentionally skipped because a real random base64 key may contain
 * character runs that resemble the placeholder patterns.
 */
export function getBackupEncryptionKey(): Buffer | null {
  const raw = env("BACKUP_ENCRYPTION_KEY");
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new BackupEnvError(
      "BACKUP_ENCRYPTION_KEY is not valid base64. Generate a 32-byte key with: openssl rand -base64 32",
    );
  }
  const decoded = Buffer.from(cleaned, "base64");
  if (decoded.length !== 32) {
    throw new BackupEnvError(
      `BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${decoded.length}). Generate with: openssl rand -base64 32`,
    );
  }
  return decoded;
}

/**
 * Parse a PostgreSQL connection URL into a redacted connection descriptor plus
 * the libpq child-process environment (PGHOST/PGPORT/PGDATABASE/PGUSER/
 * PGPASSWORD/PGSSLMODE) used to pass credentials to `pg_dump`/`pg_restore`
 * without ever placing them on the command line. Generic: applies no
 * Supabase-specific rules (no pooler rejection, no forced `sslmode=require`);
 * it respects an explicit `?sslmode=` and otherwise defaults to `prefer`.
 * Throws `BackupEnvError` on a malformed URL. Shared by `getSupabaseDbUrl`
 * (which layers Supabase rules on top) and `scripts/restore-verify.ts`
 * (`--target-db-url`, which may point at a local temp Postgres without TLS).
 */
export function parsePostgresUrl(raw: string): SupabaseDbConnection {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new BackupEnvError(
      "PostgreSQL connection URL is malformed. Expected postgresql://user:pass@host:5432/database.",
    );
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new BackupEnvError("Connection URL must use the postgresql:// (or postgres://) scheme.");
  }

  const host = parsed.hostname;
  if (!host) {
    throw new BackupEnvError("Connection URL is missing a database host.");
  }

  const port = parsed.port ? Number(parsed.port) : 5432;
  if (!Number.isInteger(port) || port <= 0) {
    throw new BackupEnvError("Connection URL has an invalid port.");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) {
    throw new BackupEnvError("Connection URL is missing a database name in the path.");
  }
  const user = parsed.username ? decodeURIComponent(parsed.username) : "";
  if (!user) {
    throw new BackupEnvError("Connection URL is missing a database user.");
  }
  const password = parsed.password ? decodeURIComponent(parsed.password) : "";
  if (!password) {
    throw new BackupEnvError("Connection URL is missing a database password.");
  }

  const explicitSslmode = parsed.searchParams.get("sslmode");
  const sslmode = explicitSslmode || "prefer";

  // Credentials are placed ONLY in the child-process environment (libpq reads
  // PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE) and are never placed
  // on the pg_dump/pg_restore command line, so they never appear in process
  // listings. This object must not be printed wholesale.
  const pgEnv: Record<string, string | undefined> = {
    PGHOST: host,
    PGPORT: String(port),
    PGDATABASE: database,
    PGUSER: user,
    PGPASSWORD: password,
    PGSSLMODE: sslmode,
  };

  return { host, port, database, user, sslmode, pgEnv };
}

export function getSupabaseDbUrl(): SupabaseDbConnection | null {
  const raw = env("SUPABASE_DB_URL");
  if (!raw) return null;
  if (isPlaceholder(raw)) {
    throw new BackupEnvError("SUPABASE_DB_URL is still a placeholder.");
  }

  const conn = parsePostgresUrl(raw);

  if (/pooler\.supabase\.(com|co)/i.test(conn.host)) {
    if (conn.port === 6543) {
      throw new BackupEnvError(
        "SUPABASE_DB_URL points to the transaction pooler (port 6543), which cannot run pg_dump. Use port 5432 (session pooler or direct connection).",
      );
    }
    // Session pooler (port 5432) is allowed: it is IPv4-reachable (needed for
    // hosts without IPv6, e.g. CI runners) and supports pg_dump/pg_restore.
  }

  const isSupabaseHost =
    /\.supabase\.(co|com)$/i.test(conn.host) || /supabase\.(co|com)$/i.test(conn.host);
  if (isSupabaseHost) {
    // Supabase direct connections require TLS; never allow a weaker mode.
    conn.sslmode = "require";
    conn.pgEnv.PGSSLMODE = "require";
  }

  return conn;
}

export function getSupabaseStorageCredentials(): SupabaseStorageCredentials | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/**
 * Credentials of the DESTINATION where encrypted backups are uploaded.
 *
 * Prefer a DEDICATED destination project via BACKUP_DEST_SUPABASE_URL +
 * BACKUP_DEST_SERVICE_ROLE_KEY (e.g. a different Supabase project/account, so
 * backups survive even if the production project is deleted). When those are
 * absent, fall back to this app's own Supabase project
 * (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
export function getBackupDestinationCredentials(): SupabaseStorageCredentials | null {
  const url = env("BACKUP_DEST_SUPABASE_URL");
  const serviceRoleKey = env("BACKUP_DEST_SERVICE_ROLE_KEY");

  if (!url && !serviceRoleKey) return getSupabaseStorageCredentials();

  if (!url || !serviceRoleKey) {
    throw new BackupEnvError(
      "BACKUP_DEST_SUPABASE_URL and BACKUP_DEST_SERVICE_ROLE_KEY must be set together (or set neither to store backups in this app's own Supabase project).",
    );
  }
  if (isPlaceholder(url) || isPlaceholder(serviceRoleKey)) {
    throw new BackupEnvError(
      "BACKUP_DEST_SUPABASE_URL / BACKUP_DEST_SERVICE_ROLE_KEY contain placeholder values.",
    );
  }
  if (!/^https:\/\/.+/.test(url)) {
    throw new BackupEnvError(
      "BACKUP_DEST_SUPABASE_URL must be the project URL, e.g. https://<project-ref>.supabase.co",
    );
  }
  return { url, serviceRoleKey };
}

/** True when backups target a dedicated (different) Supabase project. */
export function isDedicatedBackupDestination(): boolean {
  return Boolean(env("BACKUP_DEST_SUPABASE_URL") || env("BACKUP_DEST_SERVICE_ROLE_KEY"));
}

export function getBackupEnv(): string {
  const raw = env("BACKUP_ENV");
  if (!raw) return "production";
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "production";
}

/**
 * Maximum retention window allowed by policy: backups are never kept longer
 * than 30 days. Larger configured values are clamped to this cap.
 */
export const MAX_RETENTION_DAYS = 30;

export function getRetentionDays(): number {
  const raw = env("BACKUP_RETENTION_DAYS");
  if (!raw) return MAX_RETENTION_DAYS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new BackupEnvError("BACKUP_RETENTION_DAYS must be a positive integer.");
  }
  return Math.min(n, MAX_RETENTION_DAYS);
}

/**
 * Supabase Storage bucket that holds all backup objects. Defaults to the
 * conventional "backups" bucket (created automatically on first use).
 */
export function getBackupBucket(): string {
  const raw = env("BACKUP_BUCKET");
  if (!raw) return "backups";
  if (isPlaceholder(raw)) {
    throw new BackupEnvError("BACKUP_BUCKET is still a placeholder.");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,62}$/.test(raw)) {
    throw new BackupEnvError(
      "BACKUP_BUCKET must be 3-63 characters: letters, digits, dots, dashes, or underscores, starting with a letter or digit.",
    );
  }
  return raw;
}

export function getDumpTimeoutMs(): number {
  const raw = env("BACKUP_DUMP_TIMEOUT_MS");
  if (!raw) return 10 * 60 * 1000;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1000) {
    throw new BackupEnvError("BACKUP_DUMP_TIMEOUT_MS must be a positive integer number of milliseconds.");
  }
  return n;
}

export function getDbSchemas(): string[] | null {
  const raw = env("BACKUP_DB_SCHEMAS");
  if (!raw) return null;
  const schemas = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (schemas.length === 0) return null;
  for (const schema of schemas) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new BackupEnvError(`BACKUP_DB_SCHEMAS contains an invalid schema name: "${schema}".`);
    }
  }
  return schemas;
}

export function isStorageBackupEnabled(): boolean {
  const raw = env("BACKUP_STORAGE_ENABLED");
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (!["1", "true", "yes", "on", "0", "false", "no", "off"].includes(lower)) {
    throw new BackupEnvError('BACKUP_STORAGE_ENABLED must be a boolean flag (1/0, true/false, yes/no, on/off).');
  }
  return isTruthyFlag(raw);
}

/** Documented schedule only; the real schedule lives in vercel.json and the workflow (UTC). */
export function getBackupSchedule(): string {
  const raw = env("BACKUP_SCHEDULE");
  return raw || "0 2 * * *";
}

export interface BackupConfig {
  env: string;
  retentionDays: number;
  dumpTimeoutMs: number;
  dbSchemas: string[] | null;
  storageBackupEnabled: boolean;
  schedule: string;
  storageBucket: string;
  encryptionKey: Buffer | null;
  supabaseDb: SupabaseDbConnection | null;
  supabaseStorage: SupabaseStorageCredentials | null;
}

export function loadBackupConfig(): BackupConfig {
  return {
    env: getBackupEnv(),
    retentionDays: getRetentionDays(),
    dumpTimeoutMs: getDumpTimeoutMs(),
    dbSchemas: getDbSchemas(),
    storageBackupEnabled: isStorageBackupEnabled(),
    schedule: getBackupSchedule(),
    storageBucket: getBackupBucket(),
    encryptionKey: getBackupEncryptionKey(),
    supabaseDb: getSupabaseDbUrl(),
    supabaseStorage: getSupabaseStorageCredentials(),
  };
}

/** Redacted, log-safe summary of a Supabase DB connection (no credentials). */
export function describeSupabaseDb(conn: SupabaseDbConnection): string {
  return `${conn.host}:${conn.port}/${conn.database} (sslmode=${conn.sslmode})`;
}
