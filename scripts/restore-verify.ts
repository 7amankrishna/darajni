// Manual restore-verification tool (run via tsx, no `server-only`).
//
//   npm run backup:restore-verify -- --latest            # list + verify newest
//   npm run backup:restore-verify -- --backup <name>      # verify a chosen backup
//   npm run backup:restore-verify -- --latest \
//       --target-db-url postgresql://... --confirm        # actually restore
//
// Intentionally manual and non-destructive by default. The default flow:
//   1. list encrypted backups under backups/{env}/ (via their manifests),
//   2. download the SELECTED backup (never auto-picks without --latest/--backup),
//   3. verify the downloaded ciphertext size + SHA-256 against the manifest,
//   4. decrypt locally to a temp .dump file (AES-256-GCM auth-tag verified),
//   5. print the exact `pg_restore` command and stop.
//
// An actual restore into a database requires BOTH `--target-db-url` AND
// `--confirm`, plus a final "yes" typed on stdin. It NEVER auto-overwrites
// production: the operator names the target explicitly. Temp files are removed
// in a `finally` after success or failure.

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import {
  BackupEnvError,
  getBackupEncryptionKey,
  getBackupEnv,
  parsePostgresUrl,
  type SupabaseDbConnection,
} from "@/lib/backup/env";
import { createDecryptStream } from "@/lib/backup/crypto";
import { createHash } from "node:crypto";
import {
  downloadAsText,
  downloadToFile,
  listObjects,
} from "@/lib/backup/firebase-storage";
import { backupPrefix } from "@/lib/backup/naming";

// Minimal view of the manifest object written by the orchestrator. Kept local
// so this disaster-recovery tool depends only on the on-disk format, not on the
// orchestrator module (fewer runtime imports, easier to run standalone).
interface RestoreManifest {
  backupVersion: number;
  backupId: string;
  createdAt: string;
  createdAtEpochMs: number;
  env: string;
  status: string;
  archive: {
    objectName: string;
    manifestObjectName: string;
    format: string;
    encryptedSize: number;
    contentType: string;
  };
  encryption: {
    algorithm: string;
    ivBase64: string;
    authTagBase64: string;
  };
  integrity: {
    algorithm: string;
    checksum: string;
  };
}

interface ParsedArgs {
  latest: boolean;
  backup: string | undefined;
  targetDbUrl: string | undefined;
  confirm: boolean;
  env: string | undefined;
  help: boolean;
}

const HELP = `Usage: restore-verify [options]

Selection (one required unless listing):
  --latest                 Verify the most recent successful backup.
  --backup <objectName>    Verify a specific backup by its encrypted object
                           name or manifest object name.

Restore (optional, destructive — requires explicit confirmation):
  --target-db-url <url>    Postgres URL to restore into (NOT auto-applied).
  --confirm                Acknowledge you want to actually run pg_restore.
                           Even with --confirm you must type "yes" on stdin.

Other:
  --env <name>             Backup path environment segment (default: production).
  --help, -h               Show this help and exit.

Without --latest/--backup this lists available backups and exits.`;

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    latest: false,
    backup: undefined,
    targetDbUrl: undefined,
    confirm: false,
    env: undefined,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--latest") args.latest = true;
    else if (arg === "--confirm") args.confirm = true;
    else if (arg === "--backup") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) throw new Error("--backup requires an object name.");
      args.backup = next;
      i += 1;
    } else if (arg.startsWith("--backup=")) {
      args.backup = arg.slice("--backup=".length);
    } else if (arg === "--target-db-url") {
      const next = argv[i + 1];
      if (!next || next.startsWith("----")) throw new Error("--target-db-url requires a URL.");
      args.targetDbUrl = next;
      i += 1;
    } else if (arg.startsWith("--target-db-url=")) {
      args.targetDbUrl = arg.slice("--target-db-url=".length);
    } else if (arg === "--env") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) throw new Error("--env requires a value.");
      args.env = next;
      i += 1;
    } else if (arg.startsWith("--env=")) {
      args.env = arg.slice("--env=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}\n\n${HELP}`);
    }
  }
  if (args.targetDbUrl && !args.confirm) {
    throw new Error("--target-db-url requires --confirm to actually restore.");
  }
  if (args.latest && args.backup) {
    throw new Error("--latest and --backup are mutually exclusive.");
  }
  return args;
}

function tempPath(suffix: string): string {
  const id = randomBytes(8).toString("hex");
  return join(tmpdir(), `darajni-restore-${id}.${suffix}`);
}

function safeUnlink(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // Best-effort cleanup; ignore missing-file errors.
  }
}

async function loadManifests(env: string): Promise<{ manifest: RestoreManifest; objectName: string }[]> {
  const prefix = backupPrefix(env);
  const objects = await listObjects(prefix);
  const manifests: { manifest: RestoreManifest; objectName: string }[] = [];
  for (const obj of objects) {
    if (!obj.name.endsWith(".manifest.json")) continue;
    try {
      const text = await downloadAsText(obj.name);
      const parsed = JSON.parse(text) as RestoreManifest;
      if (parsed && parsed.archive && parsed.encryption && parsed.integrity) {
        manifests.push({ manifest: parsed, objectName: obj.name });
      }
    } catch {
      // Skip unreadable manifests; do not abort the whole listing.
    }
  }
  manifests.sort((a, b) => b.manifest.createdAtEpochMs - a.manifest.createdAtEpochMs);
  return manifests;
}

function listBackups(manifests: { manifest: RestoreManifest; objectName: string }[]): void {
  if (manifests.length === 0) {
    console.log("No backups found.");
    return;
  }
  console.log("Available backups (newest first):\n");
  for (const { manifest, objectName } of manifests) {
    const sizeKb = Math.round(manifest.archive.encryptedSize / 1024);
    console.log(
      `  ${manifest.createdAt}  status=${manifest.status}  ${sizeKb}KB  backupId=${manifest.backupId}`,
    );
    console.log(`    archive: ${manifest.archive.objectName}`);
    console.log(`    manifest: ${objectName}\n`);
  }
  console.log("Re-run with --latest or --backup <objectName> to verify one.");
}

function pickBackup(
  manifests: { manifest: RestoreManifest; objectName: string }[],
  args: ParsedArgs,
): RestoreManifest | undefined {
  if (args.latest) {
    const successful = manifests.filter((m) => m.manifest.status === "success");
    return successful[0]?.manifest;
  }
  if (args.backup) {
    return manifests.find(
      (m) =>
        m.manifest.archive.objectName === args.backup ||
        m.manifest.archive.manifestObjectName === args.backup ||
        m.objectName === args.backup,
    )?.manifest;
  }
  return undefined;
}

async function verifyAndDecrypt(
  manifest: RestoreManifest,
  key: Buffer,
): Promise<{ dumpPath: string }> {
  const encPath = tempPath("dump.enc");
  const dumpPath = tempPath("dump");
  // Encrypted archive temp file is removed here; the decrypted dump temp file is
  // removed by the caller's finally so the operator's printed pg_restore command
  // stays valid until the script exits.
  try {
    await downloadToFile(manifest.archive.objectName, encPath);

    const localSize = statSync(encPath).size;
    if (localSize !== manifest.archive.encryptedSize) {
      throw new Error(
        `Downloaded archive size ${localSize} does not match manifest size ${manifest.archive.encryptedSize}.`,
      );
    }

    // Integrity: SHA-256 of the downloaded ciphertext must match the manifest.
    // Streamed chunk-by-chunk so large dumps are not buffered in memory.
    const hasher = createHash("sha256");
    for await (const chunk of createReadStream(encPath)) {
      hasher.update(chunk);
    }
    const checksum = hasher.digest("hex");
    if (checksum !== manifest.integrity.checksum) {
      throw new Error(
        `Checksum mismatch: downloaded ciphertext SHA-256 ${checksum} does not match manifest ${manifest.integrity.checksum}.`,
      );
    }

    // Decrypt: GCM auth-tag verification happens on stream finalization; a
    // tampered ciphertext or tag makes pipeline reject.
    const iv = Buffer.from(manifest.encryption.ivBase64, "base64");
    const authTag = Buffer.from(manifest.encryption.authTagBase64, "base64");
    const decipher = createDecryptStream(key, iv, authTag);
    await pipeline(createReadStream(encPath), decipher, createWriteStream(dumpPath));

    return { dumpPath };
  } finally {
    safeUnlink(encPath);
  }
}

function maskedRestoreCommand(dumpPath: string, target: SupabaseDbConnection): string {
  // Credentials are shown masked; the real values reach pg_restore via PG* env,
  // never on the command line.
  return `PGPASSWORD=*** pg_restore --no-password --no-owner --dbname="${target.database}" "${dumpPath}"`;
}

async function confirmRestore(target: SupabaseDbConnection): Promise<boolean> {
  console.log(`\nAbout to restore into database "${target.database}" on ${target.host}:${target.port}.`);
  console.log('Type "yes" to proceed, anything else to cancel:');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("> ", (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

function runPgRestore(dumpPath: string, target: SupabaseDbConnection): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pg_restore",
      ["--no-password", "--no-owner", `--dbname=${target.database}`, dumpPath],
      {
        stdio: "inherit",
        env: { ...process.env, ...target.pgEnv },
      },
    );
    child.on("error", (err) => {
      // ENOENT means pg_restore is not installed.
      reject(
        new Error(
          `Could not run pg_restore: ${err.message}. Install PostgreSQL client tools (matching server major version) first.`,
        ),
      );
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const key = getBackupEncryptionKey();
  if (!key) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY is not set. The key is required to decrypt backups and is never stored in Supabase Storage.",
    );
  }

  const env = args.env ?? getBackupEnv();
  const manifests = await loadManifests(env);

  const selected = pickBackup(manifests, args);
  if (!selected) {
    listBackups(manifests);
    if (args.latest || args.backup) {
      console.error("\nNo matching backup found for the given selection.");
      process.exitCode = 1;
    }
    return;
  }

  console.log(`Verifying backup ${selected.backupId} (${selected.createdAt}).`);
  let dumpPath: string | undefined;
  try {
    const { dumpPath: resolved } = await verifyAndDecrypt(selected, key);
    dumpPath = resolved;

    console.log("\nIntegrity verified: checksum + AES-256-GCM auth tag OK.");
    console.log(`Decrypted dump (temp): ${dumpPath}\n`);

    if (!args.targetDbUrl || !args.confirm) {
      // Non-destructive mode: print the command, do not run it.
      console.log("Restoration is NOT automatic. To restore, run pg_restore yourself, e.g.:");
      console.log(`  pg_restore --no-password --no-owner --dbname="<target-db>" "${dumpPath}"\n`);
      console.log("Or re-run this tool with --target-db-url and --confirm to restore directly.");
      console.log("Always test a restore into a throwaway database first; never overwrite production blindly.");
      return;
    }

    const target = parsePostgresUrl(args.targetDbUrl);
    console.log(maskedRestoreCommand(dumpPath, target));
    const ok = await confirmRestore(target);
    if (!ok) {
      console.log("Restore cancelled. No database was touched.");
      return;
    }
    const code = await runPgRestore(dumpPath, target);
    if (code === 0) {
      console.log("\npg_restore completed. Verify the restored data before trusting it.");
    } else {
      console.error(`\npg_restore exited with code ${code}.`);
      process.exitCode = 1;
    }
  } finally {
    if (dumpPath) safeUnlink(dumpPath);
  }
}

main().catch((error) => {
  const message =
    error instanceof BackupEnvError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(JSON.stringify({ status: "error", error: message.slice(0, 500) }));
  process.exitCode = 1;
});
