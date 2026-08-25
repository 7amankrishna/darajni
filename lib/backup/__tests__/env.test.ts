import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BackupEnvError,
  describeSupabaseDb,
  getBackupBucket,
  getBackupDestinationCredentials,
  getBackupEncryptionKey,
  getBackupEnv,
  getDbSchemas,
  getDumpTimeoutMs,
  getRetentionDays,
  getSupabaseDbUrl,
  getSupabaseStorageCredentials,
  isDedicatedBackupDestination,
  isStorageBackupEnabled,
  parsePostgresUrl,
} from "@/lib/backup/env";

const MANAGED = [
  "BACKUP_ENCRYPTION_KEY",
  "BACKUP_BUCKET",
  "BACKUP_DEST_SUPABASE_URL",
  "BACKUP_DEST_SERVICE_ROLE_KEY",
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

describe("getBackupBucket", () => {
  it("defaults to 'backups' when unset", () => {
    expect(getBackupBucket()).toBe("backups");
  });

  it("throws on a placeholder", () => {
    process.env.BACKUP_BUCKET = "your_bucket";
    expect(() => getBackupBucket()).toThrow(/placeholder/);
  });

  it("throws on invalid bucket names", () => {
    process.env.BACKUP_BUCKET = "bad bucket";
    expect(() => getBackupBucket()).toThrow(/BACKUP_BUCKET/);
    process.env.BACKUP_BUCKET = "-bad";
    expect(() => getBackupBucket()).toThrow();
    process.env.BACKUP_BUCKET = "ab";
    expect(() => getBackupBucket()).toThrow();
  });

  it("returns a valid custom bucket name", () => {
    process.env.BACKUP_BUCKET = "darajni-backups-prod";
    expect(getBackupBucket()).toBe("darajni-backups-prod");
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

  it("rejects the transaction pooler (port 6543)", () => {
    process.env.SUPABASE_DB_URL =
      "postgresql://u:p@aws-0.pooler.supabase.com:6543/db";
    expect(() => getSupabaseDbUrl()).toThrow(/transaction pooler/i);
  });

  it("allows the session pooler (port 5432) and forces sslmode=require", () => {
    process.env.SUPABASE_DB_URL =
      "postgresql://postgres.proj:pw@aws-0.ap-south-1.pooler.supabase.com:5432/postgres";
    const conn = getSupabaseDbUrl();
    expect(conn).not.toBeNull();
    expect(conn!.host).toBe("aws-0.ap-south-1.pooler.supabase.com");
    expect(conn!.sslmode).toBe("require");
    expect(conn!.pgEnv.PGSSLMODE).toBe("require");
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

describe("getBackupDestinationCredentials", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://app.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "app-service-key";
  });

  it("falls back to the app's own project when no destination vars are set", () => {
    expect(getBackupDestinationCredentials()).toEqual({
      url: "https://app.supabase.co",
      serviceRoleKey: "app-service-key",
    });
    expect(isDedicatedBackupDestination()).toBe(false);
  });

  it("prefers the dedicated destination when both vars are set", () => {
    process.env.BACKUP_DEST_SUPABASE_URL = "https://backupvault.supabase.co";
    process.env.BACKUP_DEST_SERVICE_ROLE_KEY = "vault-service-key";
    expect(getBackupDestinationCredentials()).toEqual({
      url: "https://backupvault.supabase.co",
      serviceRoleKey: "vault-service-key",
    });
    expect(isDedicatedBackupDestination()).toBe(true);
  });

  it("throws when only one destination var is set", () => {
    process.env.BACKUP_DEST_SUPABASE_URL = "https://backupvault.supabase.co";
    expect(() => getBackupDestinationCredentials()).toThrow(/together/);
  });

  it("throws on placeholder or non-https URL values", () => {
    process.env.BACKUP_DEST_SUPABASE_URL = "your_backup_project_url";
    process.env.BACKUP_DEST_SERVICE_ROLE_KEY = "vault-service-key";
    expect(() => getBackupDestinationCredentials()).toThrow(/placeholder/i);
    process.env.BACKUP_DEST_SUPABASE_URL = "not-a-url";
    expect(() => getBackupDestinationCredentials()).toThrow(/project URL/);
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

  it("clamps values above the 30-day maximum", () => {
    process.env.BACKUP_RETENTION_DAYS = "90";
    expect(getRetentionDays()).toBe(30);
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
