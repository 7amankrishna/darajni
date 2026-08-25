import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";

import { runBackup } from "@/lib/backup/orchestrator";
import type { BackupConfig } from "@/lib/backup/env";
import { PgDumpNotFound } from "@/lib/backup/pgdump";

// ---- Mocks ----
vi.mock("@/lib/backup/pgdump", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/backup/pgdump")>();
  return {
    ...orig,
    runPgDump: vi.fn(),
    probeServerVersion: vi.fn(async () => "15.4"),
  };
});

vi.mock("@/lib/backup/firebase-storage", () => ({
  uploadEncryptedArchive: vi.fn(async () => ({})),
  uploadJson: vi.fn(async () => ({})),
  listObjects: vi.fn(async () => []),
  downloadAsText: vi.fn(async () => ""),
  deleteObject: vi.fn(async () => {}),
}));

vi.mock("@/lib/backup/lock", () => ({
  acquireBackupLock: vi.fn(async () => ({ acquired: true, token: "tok" })),
  releaseBackupLock: vi.fn(async () => true),
}));

vi.mock("@/lib/backup/firestore-status", () => ({
  recordBackupStatus: vi.fn(async () => {}),
}));

vi.mock("@/lib/backup/storage-backup", () => ({
  runStorageBackup: vi.fn(async () => ({
    status: "disabled",
    reason: "off",
    bucketsProcessed: 0,
    objectsBackedUp: 0,
    bytesBackedUp: 0,
    errors: [],
    durationMs: 1,
  })),
}));

import { runPgDump } from "@/lib/backup/pgdump";
import {
  uploadEncryptedArchive,
  uploadJson,
  listObjects,
  downloadAsText,
  deleteObject,
} from "@/lib/backup/firebase-storage";
import { acquireBackupLock, releaseBackupLock } from "@/lib/backup/lock";
import { recordBackupStatus } from "@/lib/backup/firestore-status";

const runPgDumpMock = vi.mocked(runPgDump);
const uploadArchiveMock = vi.mocked(uploadEncryptedArchive);
const uploadJsonMock = vi.mocked(uploadJson);
const listObjectsMock = vi.mocked(listObjects);
const downloadAsTextMock = vi.mocked(downloadAsText);
const deleteObjectMock = vi.mocked(deleteObject);
const acquireLockMock = vi.mocked(acquireBackupLock);
const releaseLockMock = vi.mocked(releaseBackupLock);
const recordStatusMock = vi.mocked(recordBackupStatus);

function baseConfig(overrides: Partial<BackupConfig> = {}): BackupConfig {
  return {
    env: "production",
    retentionDays: 30,
    dumpTimeoutMs: 60_000,
    dbSchemas: null,
    storageBackupEnabled: false,
    schedule: "0 2 * * *",
    storageBucket: "backups",
    encryptionKey: Buffer.alloc(32, 9),
    supabaseDb: {
      host: "db.x.supabase.co",
      port: 5432,
      database: "postgres",
      user: "u",
      sslmode: "require",
      pgEnv: {
        PGHOST: "db.x.supabase.co",
        PGPORT: "5432",
        PGDATABASE: "postgres",
        PGUSER: "u",
        PGPASSWORD: "pw",
        PGSSLMODE: "require",
      },
    },
    supabaseStorage: {
      url: "https://x.supabase.co",
      serviceRoleKey: "service-key",
    },
    ...overrides,
  };
}

// Mock a pg_dump that emits some plaintext on stdout then closes cleanly.
function mockDumpEmits(plaintext: string) {
  runPgDumpMock.mockImplementation(() => {
    const stdout = Readable.from([Buffer.from(plaintext)]);
    return {
      stdout,
      done: Promise.resolve({
        pgDumpVersion: "pg_dump (PostgreSQL) 15.4",
        pgDumpMajor: 15,
        exitCode: 0,
      }),
    } as ReturnType<typeof runPgDump>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  acquireLockMock.mockResolvedValue({ acquired: true, token: "tok" });
  releaseLockMock.mockResolvedValue(true);
  mockDumpEmits("PGDMP-fake-dump-bytes");
});

describe("runBackup locking", () => {
  it("returns skipped and runs nothing when the lock is not acquired", async () => {
    acquireLockMock.mockResolvedValue({ acquired: false, token: null });
    const result = await runBackup({
      components: ["db", "storage", "retention"],
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.status).toBe("skipped");
    expect(result.error).toMatch(/already running/);
    expect(runPgDumpMock).not.toHaveBeenCalled();
    expect(recordStatusMock).not.toHaveBeenCalled();
  });

  it("releases the lock after a run", async () => {
    await runBackup({
      components: ["db"],
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(releaseLockMock).toHaveBeenCalledWith({
      env: "production",
      token: "tok",
    });
  });
});

describe("runBackup db component", () => {
  it("runs dump, uploads archive + manifest, records status, and succeeds", async () => {
    const result = await runBackup({
      components: ["db"],
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.status).toBe("success");
    expect(result.dbDump?.status).toBe("success");
    expect(uploadArchiveMock).toHaveBeenCalledTimes(1);
    expect(uploadJsonMock).toHaveBeenCalledTimes(1);

    // Manifest must contain encryption + integrity fields but never the key.
    const manifestJson = uploadJsonMock.mock.calls[0][1] as string;
    const manifest = JSON.parse(manifestJson);
    expect(manifest.encryption.algorithm).toBe("aes-256-gcm");
    expect(manifest.integrity.algorithm).toBe("sha256");
    expect(manifest.encryption.ivBase64).toBeTruthy();
    expect(manifest.encryption.authTagBase64).toBeTruthy();
    expect(manifestJson).not.toContain(Buffer.alloc(32, 9).toString("base64"));

    // Upload metadata carries iv/authTag/checksum, not the key.
    const uploadMeta = uploadArchiveMock.mock.calls[0][0].metadata;
    expect(uploadMeta.iv).toBe(manifest.encryption.ivBase64);
    expect(uploadMeta.checksum).toBe(manifest.integrity.checksum);

    expect(recordStatusMock).toHaveBeenCalledTimes(1);
    expect(recordStatusMock.mock.calls[0][1].status).toBe("success");
  });

  it("skips db when supabaseDb is not configured", async () => {
    const result = await runBackup({
      components: ["db"],
      config: baseConfig({ supabaseDb: null }),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("skipped");
    expect(result.dbDump?.reason).toBe("supabase-db-not-configured");
    expect(result.status).toBe("skipped");
  });

  it("skips db when the encryption key is not configured", async () => {
    const result = await runBackup({
      components: ["db"],
      config: baseConfig({ encryptionKey: null }),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.reason).toBe("encryption-key-not-configured");
  });

  it("skips db when supabase storage is not configured", async () => {
    const result = await runBackup({
      components: ["db"],
      config: baseConfig({ supabaseStorage: null }),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.reason).toBe("supabase-storage-not-configured");
  });

  it("reports skipped (not failed) when pg_dump is missing and dbDumpIfAvailable is set", async () => {
    runPgDumpMock.mockImplementation(() => {
      throw new PgDumpNotFound();
    });
    const result = await runBackup({
      components: ["db"],
      dbDumpIfAvailable: true,
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("skipped");
    expect(result.dbDump?.reason).toBe("pg_dump-unavailable");
  });

  it("reports failed when pg_dump errors and dbDumpIfAvailable is false", async () => {
    runPgDumpMock.mockImplementation(() => {
      throw new PgDumpNotFound();
    });
    const result = await runBackup({
      components: ["db"],
      dbDumpIfAvailable: false,
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("failed");
    expect(result.status).toBe("failed");
  });

  it("does not upload in dry-run", async () => {
    const result = await runBackup({
      components: ["db"],
      dryRun: true,
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("success");
    expect(result.dbDump?.reason).toMatch(/dry-run/);
    expect(uploadArchiveMock).not.toHaveBeenCalled();
    expect(uploadJsonMock).not.toHaveBeenCalled();
  });
});

describe("runBackup retention component", () => {
  function manifestFor(daysAgo: number, id: string) {
    const created = Date.UTC(2026, 6, 15) - daysAgo * 86_400_000;
    return JSON.stringify({
      backupVersion: 1,
      status: "success",
      createdAtEpochMs: created,
      archive: {
        objectName: `backups/production/x-${id}.dump.enc`,
        manifestObjectName: `backups/production/x-${id}.dump.enc.manifest.json`,
      },
    });
  }

  it("deletes old successful backups beyond minKeep after a success", async () => {
    // 9 old backups -> with default minKeep 7, the 2 oldest are deleted.
    const names = Array.from({ length: 9 }, (_, i) => ({
      name: `backups/production/x-${i}.dump.enc.manifest.json`,
      size: 1,
      updated: "",
      customMetadata: undefined,
    }));
    listObjectsMock.mockResolvedValue(names);
    downloadAsTextMock.mockImplementation(async (name: string) => {
      const id = /x-(\d+)\.dump/.exec(name)![1];
      return manifestFor(40 + Number(id), id);
    });

    const result = await runBackup({
      components: ["db", "retention"],
      config: baseConfig({ retentionDays: 30 }),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("success");
    expect(result.retention?.status).toBe("success");
    expect(result.retention?.deletedCount).toBe(2);
    // Each delete removes archive + manifest -> 4 deleteObject calls.
    expect(deleteObjectMock).toHaveBeenCalledTimes(4);
  });

  it("skips retention when the db backup failed", async () => {
    runPgDumpMock.mockImplementation(() => {
      throw new PgDumpNotFound();
    });
    const result = await runBackup({
      components: ["db", "retention"],
      dbDumpIfAvailable: false,
      config: baseConfig(),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.dbDump?.status).toBe("failed");
    expect(result.retention?.status).toBe("skipped");
    expect(result.retention?.error).toMatch(/no successful backup/);
    expect(listObjectsMock).not.toHaveBeenCalled();
  });

  it("dry-run retention reports wouldDelete without deleting", async () => {
    const names = Array.from({ length: 9 }, (_, i) => ({
      name: `backups/production/x-${i}.dump.enc.manifest.json`,
      size: 1,
      updated: "",
      customMetadata: undefined,
    }));
    listObjectsMock.mockResolvedValue(names);
    downloadAsTextMock.mockImplementation(async (name: string) => {
      const id = /x-(\d+)\.dump/.exec(name)![1];
      return manifestFor(40 + Number(id), id);
    });

    const result = await runBackup({
      components: ["db", "retention"],
      dryRun: true,
      config: baseConfig({ retentionDays: 30 }),
      now: Date.UTC(2026, 6, 15),
    });
    expect(result.retention?.status).toBe("skipped");
    expect(result.retention?.wouldDelete).toBe(2);
    expect(deleteObjectMock).not.toHaveBeenCalled();
  });
});
