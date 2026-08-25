// Backup orchestrator: ties the core modules into a single, reusable service.
//
// Three entry points share this: the Vercel Cron route, the tsx CLI
// (scripts/backup-run.ts), and the GitHub Actions workflow. It never imports
// `server-only`, so it runs under tsx/vitest.
//
// DB backup pipeline (all streamed, nothing buffered):
//   pg_dump -Fc stdout  ->  AES-256-GCM cipher  ->  HashingStream  ->  temp file
// The HashingStream counts ciphertext bytes and computes the SHA-256 of the
// ciphertext (the stored artifact). A zero byte count throws DumpEmpty so an
// empty dump is never reported as success. After upload, the SDK-reported
// object size is compared to the local encrypted size inside
// `uploadEncryptedArchive`. The IV, auth tag, checksum, sizes, and versions go
// into a neighboring *.manifest.json object and a few small string fields go
// onto the object metadata. The encryption key is never stored anywhere.
//
// Logging prints only stage, timestamps, backup id, byte counts, object names,
// and statuses — never credentials, URLs, keys, dump bytes, or archive contents.
// Temporary files are removed in a `finally` block on success or failure.

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

import {
  loadBackupConfig,
  describeSupabaseDb,
  type BackupConfig,
} from "@/lib/backup/env";
import { createEncryptStream, HashingStream } from "@/lib/backup/crypto";
import {
  backupObjectName,
  manifestObjectName,
  backupPrefix,
} from "@/lib/backup/naming";
import {
  runPgDump,
  probeServerVersion,
  PgDumpNotFound,
  PgDumpError,
  DumpEmpty,
  type RunPgDumpSuccess,
} from "@/lib/backup/pgdump";
import {
  uploadEncryptedArchive,
  uploadJson,
  listObjects,
  downloadAsText,
  deleteObject,
} from "@/lib/backup/firebase-storage";
import { acquireBackupLock, releaseBackupLock } from "@/lib/backup/lock";
import {
  selectObjectsToDelete,
  type RetentionCandidate,
} from "@/lib/backup/retention";
import {
  recordBackupStatus,
  type BackupStatusRecord,
} from "@/lib/backup/firestore-status";
import {
  runStorageBackup,
  type StorageBackupOutcome,
} from "@/lib/backup/storage-backup";

export type BackupComponent = "db" | "storage" | "retention";

export interface RunBackupInput {
  components: BackupComponent[];
  /** Override the BACKUP_ENV segment. */
  env?: string;
  /** Skip uploads and deletion; verify the dump path only. */
  dryRun?: boolean;
  /**
   * When true, a missing pg_dump binary is reported as `skipped` rather than
   * `failed` (used by the Vercel Cron route, which may not have pg_dump). Other
   * dump failures still fail.
   */
  dbDumpIfAvailable?: boolean;
  /** Inject config (tests). */
  config?: BackupConfig;
  /** Inject "now" (tests). */
  now?: number;
}

export interface DbDumpResult {
  status: "success" | "skipped" | "failed";
  reason?: string;
  error?: string;
  objectName?: string;
  manifestObjectName?: string;
  createdAt?: string;
  createdAtEpochMs?: number;
  /** Encrypted archive size in bytes. */
  bytes?: number;
  checksum?: string;
  pgDumpVersion?: string;
  pgDumpMajor?: number;
  serverVersion?: string;
  durationMs?: number;
}

export interface RetentionOutcome {
  status: "success" | "skipped" | "failed";
  deletedCount: number;
  keptCount: number;
  /** Set in dry-run: how many would be deleted. */
  wouldDelete?: number;
  error?: string;
}

export interface BackupResult {
  backupId: string;
  status: "success" | "partial" | "failed" | "skipped";
  env: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  components: BackupComponent[];
  dbDump?: DbDumpResult;
  storageBackup?: StorageBackupOutcome;
  retention?: RetentionOutcome;
  error?: string;
}

/** The neighboring manifest stored alongside each encrypted archive. */
export interface BackupManifest {
  backupVersion: 1;
  backupId: string;
  createdAt: string;
  createdAtEpochMs: number;
  env: string;
  source: {
    type: "supabase-postgres";
    host: string;
    database: string;
    sslmode: string;
  };
  archive: {
    objectName: string;
    manifestObjectName: string;
    format: string;
    encryptedSize: number;
    contentType: string;
    /** Present when the archive is stored as multiple ordered chunked parts. */
    parts?: Array<{ objectName: string; size: number }>;
  };
  encryption: {
    algorithm: "aes-256-gcm";
    ivBase64: string;
    authTagBase64: string;
  };
  integrity: {
    algorithm: "sha256";
    checksum: string;
  };
  versions: {
    pgDump: string;
    pgDumpMajor: number;
    server: string;
  };
  status: "success";
}

type Logger = (stage: string, message: string) => void;

function makeLogger(backupId: string): Logger {
  return (stage, message) => {
    // No secrets reach this sink: callers pass only stages, sizes, names,
    // statuses, and redacted pg_dump stderr lines.
    console.log(JSON.stringify({ ts: new Date().toISOString(), backupId, stage, message }));
  };
}

function computeOverallStatus(parts: {
  dbDump?: DbDumpResult;
  storageBackup?: StorageBackupOutcome;
  retention?: RetentionOutcome;
  fatalError?: string;
  dbRequested: boolean;
  storageRequested: boolean;
}): BackupResult["status"] {
  if (parts.fatalError) {
    const anySuccess = parts.dbDump?.status === "success" || parts.storageBackup?.status === "success";
    return anySuccess ? "partial" : "failed";
  }
  let successes = 0;
  let failures = 0;
  if (parts.dbRequested) {
    if (parts.dbDump?.status === "success") successes += 1;
    else if (parts.dbDump?.status === "failed") failures += 1;
  }
  if (parts.storageRequested) {
    if (parts.storageBackup?.status === "success") successes += 1;
    else if (parts.storageBackup?.status === "failed") failures += 1;
  }
  if (failures > 0 && successes > 0) return "partial";
  if (failures > 0) return "failed";
  if (successes > 0) return "success";
  return "skipped";
}

function buildStatusRecord(
  backupId: string,
  status: BackupResult["status"],
  env: string,
  dbDump: DbDumpResult | undefined,
  startedAtMs: number,
  error?: string,
): Omit<BackupStatusRecord, "recordedAt"> {
  return {
    backupId,
    status,
    env,
    timestamp: dbDump?.createdAt ?? new Date(startedAtMs).toISOString(),
    timestampEpochMs: dbDump?.createdAtEpochMs ?? startedAtMs,
    encryptedSize: dbDump?.bytes,
    checksum: dbDump?.checksum,
    checksumAlgorithm: dbDump?.checksum ? "sha256" : undefined,
    objectName: dbDump?.objectName,
    error: status === "failed" ? error : undefined,
  };
}

interface RunDbDumpArgs {
  config: BackupConfig;
  env: string;
  backupId: string;
  dryRun: boolean;
  dbDumpIfAvailable: boolean;
  log: Logger;
}

async function runDbDump(args: RunDbDumpArgs): Promise<DbDumpResult> {
  const { config, env, backupId, dryRun, dbDumpIfAvailable, log } = args;
  const startedAt = Date.now();
  const notConfigured = (reason: string): DbDumpResult => ({
    status: "skipped",
    reason,
    durationMs: Date.now() - startedAt,
  });

  if (!config.supabaseDb) return notConfigured("supabase-db-not-configured");
  if (!config.encryptionKey) return notConfigured("encryption-key-not-configured");
  if (!config.supabaseStorage) return notConfigured("supabase-storage-not-configured");

  log("db", `starting pg_dump from ${describeSupabaseDb(config.supabaseDb)}`);
  const timestamp = new Date();
  const objectName = backupObjectName({ env, timestamp });
  const manifestName = manifestObjectName(objectName);
  const tempFile = join(tmpdir(), `darajni-backup-${backupId}.dump.enc`);
  let writeStream: ReturnType<typeof createWriteStream> | null = null;

  let pgDumpVersion = "unknown";
  let pgDumpMajor = 0;

  try {
    const { stdout, done } = runPgDump({
      connection: config.supabaseDb,
      schemas: config.dbSchemas,
      timeoutMs: config.dumpTimeoutMs,
      onLog: (line) => log("pgdump", line),
    });

    const { cipher, iv, getAuthTag } = createEncryptStream(config.encryptionKey);
    const hasher = new HashingStream();
    writeStream = createWriteStream(tempFile);

    // Both promises are made non-rejecting so Promise.all never throws an
    // unhandled rejection from the slower one; we rethrow the preferred error
    // below (a typed PgDumpError wins over a generic stream error).
    let streamError: unknown = null;
    let procError: unknown = null;
    const streamDone = pipeline(stdout, cipher, hasher, writeStream).catch(
      (err: Error) => {
        streamError = err;
      },
    );
    const procDone = done.then(
      (res: RunPgDumpSuccess) => {
        pgDumpVersion = res.pgDumpVersion;
        pgDumpMajor = res.pgDumpMajor;
      },
      (err: Error) => {
        procError = err;
      },
    );

    await Promise.all([streamDone, procDone]);

    if (procError instanceof PgDumpError) throw procError;
    if (streamError) throw streamError;
    if (procError) throw procError;

    const encryptedBytes = hasher.getBytes();
    if (encryptedBytes === 0) throw new DumpEmpty();

    const authTag = getAuthTag();
    const checksum = hasher.getHash();
    const ivBase64 = iv.toString("base64");
    const authTagBase64 = authTag.toString("base64");
    const createdAt = timestamp.toISOString();
    const createdAtEpochMs = timestamp.getTime();
    const serverVersion = await probeServerVersion(config.supabaseDb);

    if (dryRun) {
      log("db", `dry-run: dump verified (${hasher.getBytes()} encrypted bytes) — not uploaded`);
      return {
        status: "success",
        reason: "dry-run: not uploaded",
        objectName,
        manifestObjectName: manifestName,
        createdAt,
        createdAtEpochMs,
        bytes: encryptedBytes,
        checksum,
        pgDumpVersion,
        pgDumpMajor,
        serverVersion: serverVersion ?? "unknown",
        durationMs: Date.now() - startedAt,
      };
    }

    const uploadResult = await uploadEncryptedArchive({
      localPath: tempFile,
      objectName,
      contentType: "application/octet-stream",
      metadata: {
        backupId,
        env,
        createdAt,
        algorithm: "aes-256-gcm",
        iv: ivBase64,
        authTag: authTagBase64,
        checksum,
        encryptedSize: String(encryptedBytes),
        pgDumpVersion,
      },
    });
    log(
      "db",
      uploadResult.parts
        ? `uploaded ${encryptedBytes} encrypted bytes as ${uploadResult.parts.length} parts to ${objectName}`
        : `uploaded ${encryptedBytes} encrypted bytes to ${objectName}`,
    );

    const manifest: BackupManifest = {
      backupVersion: 1,
      backupId,
      createdAt,
      createdAtEpochMs,
      env,
      source: {
        type: "supabase-postgres",
        host: config.supabaseDb.host,
        database: config.supabaseDb.database,
        sslmode: config.supabaseDb.sslmode,
      },
      archive: {
        objectName,
        manifestObjectName: manifestName,
        format: "pg_dump-custom-Fc-encrypted",
        encryptedSize: encryptedBytes,
        contentType: "application/octet-stream",
        ...(uploadResult.parts ? { parts: uploadResult.parts } : {}),
      },
      encryption: { algorithm: "aes-256-gcm", ivBase64, authTagBase64 },
      integrity: { algorithm: "sha256", checksum },
      versions: { pgDump: pgDumpVersion, pgDumpMajor, server: serverVersion ?? "unknown" },
      status: "success",
    };

    await uploadJson(manifestName, JSON.stringify(manifest, null, 2), {
      backupId,
      status: "success",
      env,
    });
    log("db", `manifest written to ${manifestName}`);

    return {
      status: "success",
      objectName,
      manifestObjectName: manifestName,
      createdAt,
      createdAtEpochMs,
      bytes: encryptedBytes,
      checksum,
      pgDumpVersion,
      pgDumpMajor,
      serverVersion: serverVersion ?? "unknown",
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (err instanceof PgDumpNotFound && dbDumpIfAvailable) {
      log("db", "pg_dump not available on this host — skipping DB dump");
      return { status: "skipped", reason: "pg_dump-unavailable", durationMs: Date.now() - startedAt };
    }
    const code = err instanceof PgDumpError ? err.code : "unknown";
    const message = err instanceof Error ? err.message : "unknown error";
    log("db", `failed (${code}): ${message}`);
    return { status: "failed", reason: code, error: message, durationMs: Date.now() - startedAt };
  } finally {
    if (writeStream) {
      try {
        writeStream.destroy();
      } catch {
        // Ignore — stream may already be closed.
      }
    }
    try {
      await unlink(tempFile);
    } catch (err) {
      // Missing temp file is fine (e.g. dump never started); other errors are logged.
      if (err instanceof Error && err.message !== "ENOENT" && !/ENOENT/.test(err.message)) {
        log("db", `temp cleanup note: ${err.message}`);
      }
    }
  }
}

interface RunRetentionArgs {
  config: BackupConfig;
  env: string;
  dryRun: boolean;
  log: Logger;
}

async function runRetention(args: RunRetentionArgs): Promise<RetentionOutcome> {
  const { config, env, dryRun, log } = args;
  const prefix = backupPrefix(env);
  try {
    const listed = await listObjects(prefix);
    const manifests = listed.filter((o) => o.name.endsWith(".manifest.json"));
    const candidates: RetentionCandidate[] = [];
    for (const entry of manifests) {
      try {
        const manifest = JSON.parse(await downloadAsText(entry.name)) as BackupManifest;
        if (manifest.status === "success" && manifest.archive?.objectName) {
          candidates.push({
            objectName: manifest.archive.objectName,
            manifestObjectName: entry.name,
            timestamp: manifest.createdAtEpochMs,
          });
        }
      } catch {
        // Skip unreadable/invalid manifests rather than aborting retention.
      }
    }
    log("retention", `${candidates.length} successful backups under ${prefix}`);

    const selection = selectObjectsToDelete({
      allSuccessful: candidates,
      retentionDays: config.retentionDays,
    });

    if (dryRun) {
      log("retention", `dry-run: would delete ${selection.toDelete.length}, keep ${selection.keptCount}`);
      return {
        status: "skipped",
        deletedCount: 0,
        keptCount: selection.keptCount,
        wouldDelete: selection.toDelete.length,
      };
    }

    let deleted = 0;
    for (const candidate of selection.toDelete) {
      try {
        await deleteObject(candidate.objectName);
        // Chunked archives have no single base object; remove their parts.
        const partNames = listed
          .map((o) => o.name)
          .filter((name) => name.startsWith(`${candidate.objectName}.part-`));
        for (const partName of partNames) {
          await deleteObject(partName);
        }
        await deleteObject(candidate.manifestObjectName);
        deleted += 1;
        log("retention", `deleted ${candidate.objectName}`);
      } catch (err) {
        log(
          "retention",
          `delete failed for ${candidate.objectName}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
    log("retention", `deleted ${deleted}, kept ${selection.keptCount}`);
    return { status: "success", deletedCount: deleted, keptCount: selection.keptCount };
  } catch (err) {
    return {
      status: "failed",
      deletedCount: 0,
      keptCount: 0,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Run a backup. Acquires a distributed lock, runs the requested components,
 * records status, runs retention only after a verified success, and releases
 * the lock. Returns a structured result; never throws for expected failures
 * (those are captured in the result). A thrown error here indicates an
 * unexpected internal failure and is included as `error`.
 */
export async function runBackup(input: RunBackupInput): Promise<BackupResult> {
  const config = input.config ?? loadBackupConfig();
  const env = input.env ?? config.env;
  const startedAt = input.now ?? Date.now();
  const backupId = randomUUID();
  const log = makeLogger(backupId);

  const components = input.components;
  const dbRequested = components.includes("db");
  const storageRequested = components.includes("storage");
  const retentionRequested = components.includes("retention");

  const dbReady = !!(
    config.supabaseDb &&
    config.encryptionKey &&
    config.supabaseStorage
  );

  const lockTtlMs = (dbRequested && dbReady ? config.dumpTimeoutMs : 0) + 15 * 60 * 1000;
  const lock = await acquireBackupLock({ env, ttlMs: lockTtlMs });
  if (!lock.acquired || !lock.token) {
    log("lock", "another backup is already running; skipping");
    return {
      backupId,
      status: "skipped",
      env,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      components,
      error: "another backup is already running",
    };
  }
  const lockToken = lock.token;
  log("lock", "acquired");

  let dbDump: DbDumpResult | undefined;
  let storageBackup: StorageBackupOutcome | undefined;
  let retention: RetentionOutcome | undefined;
  let fatalError: string | undefined;

  try {
    if (dbRequested) {
      dbDump = await runDbDump({
        config,
        env,
        backupId,
        dryRun: Boolean(input.dryRun),
        dbDumpIfAvailable: input.dbDumpIfAvailable ?? false,
        log,
      });
      log("db", `component status=${dbDump.status}${dbDump.reason ? ` reason=${dbDump.reason}` : ""}`);
    }

    if (storageRequested) {
    const firebaseAvailable = !!config.supabaseStorage;
      storageBackup = await runStorageBackup(
        config.storageBackupEnabled,
        config.supabaseStorage,
        firebaseAvailable,
        env,
      );
      log(
        "storage",
        `component status=${storageBackup.status}: ${storageBackup.objectsBackedUp} objects, ${storageBackup.bytesBackedUp} bytes`,
      );
    }

    const anySuccess = dbDump?.status === "success" || storageBackup?.status === "success";
    if (retentionRequested) {
      if (anySuccess) {
        retention = await runRetention({ config, env, dryRun: Boolean(input.dryRun), log });
      } else {
        retention = {
          status: "skipped",
          deletedCount: 0,
          keptCount: 0,
          error: "no successful backup this run; retention not run",
        };
        log("retention", "skipped (no successful backup this run)");
      }
    }
  } catch (err) {
    fatalError = err instanceof Error ? err.message : "unknown error";
    log("error", fatalError);
  } finally {
    const released = await releaseBackupLock({ env, token: lockToken });
    if (!released) {
      log("lock", "release did not confirm (lock will expire by TTL)");
    }
  }

  const endedAt = Date.now();
  const status = computeOverallStatus({
    dbDump,
    storageBackup,
    retention,
    fatalError,
    dbRequested,
    storageRequested,
  });

  // Best-effort status record (manifests remain the source of truth).
  if (dbDump || storageBackup) {
    await recordBackupStatus(
      env,
      buildStatusRecord(backupId, status, env, dbDump, startedAt, fatalError),
    );
  }

  log("done", `status=${status} durationMs=${endedAt - startedAt}`);

  return {
    backupId,
    status,
    env,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs: endedAt - startedAt,
    components,
    dbDump,
    storageBackup,
    retention,
    error: fatalError,
  };
}
