import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BackupEnvError,
  describeSupabaseDb,
  getBackupEncryptionKey,
  getBackupEnv,
  getDbSchemas,
  getDumpTimeoutMs,
  getFirebaseServiceAccount,
  getFirebaseStorageBucket,
  getRetentionDays,
  getSupabaseDbUrl,
  getSupabaseStorageCredentials,
  isStorageBackupEnabled,
  normalizePrivateKey,
  parsePostgresUrl,
} from "@/lib/backup/env";

const MANAGED = [
  "BACKUP_ENCRYPTION_KEY",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
  "SUPABASE_DB_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BACKUP_ENV",
  "BACKUP_RETENTION_DAYS",
  "BACKUP_DUMP_TIMEOUT_MS",
  "BACKUP_DB_SCHEMAS",
  "BACKUP_STORAGE_ENABLED",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of MANAGED) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of MANAGED) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getBackupEncryptionKey", () => {
  it("returns null when unset", () => {
    expect(getBackupEncryptionKey()).toBeNull();
  });

  it("decodes a valid 32-byte base64 key (and tolerates whitespace)", () => {
    const key = Buffer.alloc(32, 7);
    process.env.BACKUP_ENCRYPTION_KEY = ` ${key.toString("base64")}\n`;
    const out = getBackupEncryptionKey();
    expect(out).not.toBeNull();
    expect(out!.length).toBe(32);
    expect(out!.equals(key)).toBe(true);
  });

  it("throws on non-base64 input", () => {
    process.env.BACKUP_ENCRYPTION_KEY = "!!!not-base64!!!";
    expect(() => getBackupEncryptionKey()).toThrow(BackupEnvError);
  });

  it("throws when the decoded key is not 32 bytes", () => {
    process.env.BACKUP_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => getBackupEncryptionKey()).toThrow(/32 bytes/);
  });
});

describe("normalizePrivateKey", () => {
  it("decodes escaped newlines and strips surrounding quotes", () => {
    const raw = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"';
    const out = normalizePrivateKey(raw);
    expect(out.startsWith('"')).toBe(false);
    expect(out).toContain("\n");
    expect(out).not.toContain("\\n");
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizePrivateKey("a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("getFirebaseServiceAccount", () => {
  const PEM =
    "-----BEGIN PRIVATE KEY-----\nMII\n-----END PRIVATE KEY-----\n";

  it("returns null when nothing is set", () => {
    expect(getFirebaseServiceAccount()).toBeNull();
  });

  it("throws when partially configured", () => {
    process.env.FIREBASE_PROJECT_ID = "proj";
    expect(() => getFirebaseServiceAccount()).toThrow(/partially configured/);
  });

  it("throws on an invalid client email", () => {
    process.env.FIREBASE_PROJECT_ID = "proj";
    process.env.FIREBASE_CLIENT_EMAIL = "not-an-email";
    process.env.FIREBASE_PRIVATE_KEY = PEM;
    expect(() => getFirebaseServiceAccount()).toThrow(/email/);
  });

  it("throws when the private key lacks PEM markers", () => {
    process.env.FIREBASE_PROJECT_ID = "proj";
    process.env.FIREBASE_CLIENT_EMAIL = "sa@proj.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = "no markers here";
    expect(() => getFirebaseServiceAccount()).toThrow(/BEGIN PRIVATE KEY/);
  });

  it("returns the normalized account", () => {
    process.env.FIREBASE_PROJECT_ID = "proj";
    process.env.FIREBASE_CLIENT_EMAIL = "sa@proj.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = PEM.replace(/\n/g, "\\n");
    const acct = getFirebaseServiceAccount();
    expect(acct).not.toBeNull();
    expect(acct!.projectId).toBe("proj");
    expect(acct!.privateKey).toContain("\n");
  });
});

describe("getFirebaseStorageBucket", () => {
  it("returns null when unset", () => {
    expect(getFirebaseStorageBucket()).toBeNull();
  });

  it("throws on a placeholder", () => {
    process.env.FIREBASE_STORAGE_BUCKET = "your_bucket";
    expect(() => getFirebaseStorageBucket()).toThrow(/placeholder/);
  });

  it("throws on spaces or slashes", () => {
    process.env.FIREBASE_STORAGE_BUCKET = "bad bucket";
    expect(() => getFirebaseStorageBucket()).toThrow();
    process.env.FIREBASE_STORAGE_BUCKET = "bad/bucket";
    expect(() => getFirebaseStorageBucket()).toThrow();
  });

  it("returns a valid bucket name", () => {
    process.env.FIREBASE_STORAGE_BUCKET = "my-project.appspot.com";
    expect(getFirebaseStorageBucket()).toBe("my-project.appspot.com");
  });
});

describe("parsePostgresUrl", () => {
  it("parses a full URL into a redacted descriptor plus libpq env", () => {
    const conn = parsePostgresUrl(
      "postgresql://alice:s3cret@db.example.com:5433/mydb",
    );
    expect(conn.host).toBe("db.example.com");
    expect(conn.port).toBe(5433);
    expect(conn.database).toBe("mydb");
    expect(conn.user).toBe("alice");
    expect(conn.sslmode).toBe("prefer");
    expect(conn.pgEnv).toEqual({
      PGHOST: "db.example.com",
      PGPORT: "5433",
      PGDATABASE: "mydb",
      PGUSER: "alice",
      PGPASSWORD: "s3cret",
      PGSSLMODE: "prefer",
    });
  });

  it("defaults the port to 5432 and respects explicit sslmode", () => {
    const conn = parsePostgresUrl(
      "postgres://u:p@h/db?sslmode=verify-full",
    );
    expect(conn.port).toBe(5432);
    expect(conn.sslmode).toBe("verify-full");
    expect(conn.pgEnv.PGSSLMODE).toBe("verify-full");
  });

  it("decodes percent-encoded credentials", () => {
    const conn = parsePostgresUrl(
      "postgresql://u%40x:p%40ss@h/db",
    );
    expect(conn.user).toBe("u@x");
    expect(conn.pgEnv.PGPASSWORD).toBe("p@ss");
  });

  it("throws on a malformed URL", () => {
    expect(() => parsePostgresUrl("not a url")).toThrow(BackupEnvError);
  });

  it("throws on a wrong scheme", () => {
    expect(() => parsePostgresUrl("https://u:p@h/db")).toThrow(/scheme/);
  });

  it("throws when missing host, database, user, or password", () => {
    expect(() => parsePostgresUrl("postgresql://u:p@:5432/db")).toThrow(/host/);
    expect(() => parsePostgresUrl("postgresql://u:p@h/")).toThrow(/database/);
    expect(() => parsePostgresUrl("postgresql://:p@h/db")).toThrow(/user/);
    expect(() => parsePostgresUrl("postgresql://u@h/db")).toThrow(/password/);
  });
});

describe("getSupabaseDbUrl", () => {
  it("returns null when unset", () => {
    expect(getSupabaseDbUrl()).toBeNull();
  });

  it("throws on a placeholder", () => {
    process.env.SUPABASE_DB_URL = "your_supabase_db_url";
    expect(() => getSupabaseDbUrl()).toThrow(/placeholder/);
  });

  it("rejects the Supabase pooler host", () => {
    process.env.SUPABASE_DB_URL =
      "postgresql://u:p@aws-0.pooler.supabase.com:6543/db";
    expect(() => getSupabaseDbUrl()).toThrow(/pooler/i);
  });

  it("forces sslmode=require for supabase hosts", () => {
    process.env.SUPABASE_DB_URL =
      "postgresql://u:p@db.abcdef.supabase.co:5432/postgres";
    const conn = getSupabaseDbUrl();
    expect(conn).not.toBeNull();
    expect(conn!.sslmode).toBe("require");
    expect(conn!.pgEnv.PGSSLMODE).toBe("require");
  });

  it("leaves sslmode=prefer for non-supabase hosts", () => {
    process.env.SUPABASE_DB_URL = "postgresql://u:p@db.mycompany.internal:5432/postgres";
    expect(getSupabaseDbUrl()!.sslmode).toBe("prefer");
  });
});

describe("getSupabaseStorageCredentials", () => {
  it("returns null unless both are set", () => {
    expect(getSupabaseStorageCredentials()).toBeNull();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    expect(getSupabaseStorageCredentials()).toBeNull();
  });

  it("returns both when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    expect(getSupabaseStorageCredentials()).toEqual({
      url: "https://x.supabase.co",
      serviceRoleKey: "service-key",
    });
  });
});

describe("getBackupEnv", () => {
  it("defaults to production", () => {
    expect(getBackupEnv()).toBe("production");
  });

  it("strips characters outside [a-zA-Z0-9_-]", () => {
    process.env.BACKUP_ENV = "staging.east!1";
    expect(getBackupEnv()).toBe("stagingeast1");
  });

  it("falls back to production if everything is stripped", () => {
    process.env.BACKUP_ENV = "!!!";
    expect(getBackupEnv()).toBe("production");
  });
});

describe("getRetentionDays", () => {
  it("defaults to 30", () => {
    expect(getRetentionDays()).toBe(30);
  });

  it("parses a valid integer", () => {
    process.env.BACKUP_RETENTION_DAYS = "14";
    expect(getRetentionDays()).toBe(14);
  });

  it("throws on a non-positive or non-integer", () => {
    process.env.BACKUP_RETENTION_DAYS = "0";
    expect(() => getRetentionDays()).toThrow(BackupEnvError);
    process.env.BACKUP_RETENTION_DAYS = "1.5";
    expect(() => getRetentionDays()).toThrow(BackupEnvError);
  });
});

describe("getDumpTimeoutMs", () => {
  it("defaults to 10 minutes", () => {
    expect(getDumpTimeoutMs()).toBe(600_000);
  });

  it("throws below 1000ms", () => {
    process.env.BACKUP_DUMP_TIMEOUT_MS = "500";
    expect(() => getDumpTimeoutMs()).toThrow(BackupEnvError);
  });
});

describe("getDbSchemas", () => {
  it("returns null when unset or empty", () => {
    expect(getDbSchemas()).toBeNull();
    process.env.BACKUP_DB_SCHEMAS = "  , ,";
    expect(getDbSchemas()).toBeNull();
  });

  it("parses a comma-separated list", () => {
    process.env.BACKUP_DB_SCHEMAS = " public , auth ";
    expect(getDbSchemas()).toEqual(["public", "auth"]);
  });

  it("throws on an invalid schema name", () => {
    process.env.BACKUP_DB_SCHEMAS = "public,1bad";
    expect(() => getDbSchemas()).toThrow(/invalid schema/);
  });
});

describe("isStorageBackupEnabled", () => {
  it("defaults to false", () => {
    expect(isStorageBackupEnabled()).toBe(false);
  });

  it("parses truthy and falsy flags", () => {
    process.env.BACKUP_STORAGE_ENABLED = "true";
    expect(isStorageBackupEnabled()).toBe(true);
    process.env.BACKUP_STORAGE_ENABLED = "0";
    expect(isStorageBackupEnabled()).toBe(false);
  });

  it("throws on a non-boolean value", () => {
    process.env.BACKUP_STORAGE_ENABLED = "maybe";
    expect(() => isStorageBackupEnabled()).toThrow(BackupEnvError);
  });
});

describe("describeSupabaseDb", () => {
  it("redacts credentials from the summary", () => {
    const conn = parsePostgresUrl("postgresql://alice:s3cret@h:5432/db");
    const summary = describeSupabaseDb(conn);
    expect(summary).toBe("h:5432/db (sslmode=prefer)");
    expect(summary).not.toContain("s3cret");
    expect(summary).not.toContain("alice");
  });
});
