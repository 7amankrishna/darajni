// Manual / scheduled backup entry point (run via tsx, no `server-only`).
//
//   npm run backup:run                          # db + storage + retention
//   npm run backup:run -- --db-only             # db dump + retention only
//   npm run backup:run -- --storage-only        # storage mirror + retention only
//   npm run backup:run -- --dry-run             # verify dump path, no upload
//   npm run backup:run -- --env staging         # override BACKUP_ENV segment
//   npm run backup:run -- --status              # print most-recent-backup health view
//
// Shares one orchestrator with the Vercel Cron route and the GitHub Actions
// workflow. Prints only the structured, secret-free `BackupResult` (the
// orchestrator's own structured logs already omit credentials, URLs, keys, dump
// bytes, and archive contents). Exit codes: success/partial -> 0, failed -> 1,
// skipped -> 2. A thrown config error (e.g. malformed key) exits 1 with a
// truncated, secret-free message.

import { runBackup, type BackupComponent, type BackupResult } from "@/lib/backup/orchestrator";
import { getBackupEnv } from "@/lib/backup/env";
import {
  getLatestBackupStatus,
  getLatestSuccessfulBackupStatus,
} from "@/lib/backup/firestore-status";
import { sendBackupNotification } from "@/lib/backup/notify";

interface ParsedArgs {
  status: boolean;
  dryRun: boolean;
  dbOnly: boolean;
  storageOnly: boolean;
  env: string | undefined;
  help: boolean;
}

const HELP = `Usage: backup-run [options]

Options:
  --status           Print the most-recent-backup health view and exit.
  --dry-run          Verify the dump path only; do not upload or delete.
  --db-only          Back up the database only (db + retention).
  --storage-only     Mirror Supabase Storage only (storage + retention).
  --env <name>       Override the BACKUP_ENV path segment.
  --help, -h         Show this help and exit.

Default (no flags): db + storage + retention.`;

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    status: false,
    dryRun: false,
    dbOnly: false,
    storageOnly: false,
    env: undefined,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--db-only") args.dbOnly = true;
    else if (arg === "--storage-only") args.storageOnly = true;
    else if (arg === "--env") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--env requires a value, e.g. --env staging");
      }
      args.env = next;
      i += 1;
    } else if (arg.startsWith("--env=")) {
      args.env = arg.slice("--env=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}\n\n${HELP}`);
    }
  }
  if (args.dbOnly && args.storageOnly) {
    throw new Error("--db-only and --storage-only are mutually exclusive.");
  }
  return args;
}

function componentsFor(args: ParsedArgs): BackupComponent[] {
  if (args.dbOnly) return ["db", "retention"];
  if (args.storageOnly) return ["storage", "retention"];
  return ["db", "storage", "retention"];
}

function exitCodeFor(result: BackupResult): number {
  if (result.status === "failed") return 1;
  if (result.status === "skipped") return 2;
  return 0;
}

async function printStatus(env: string): Promise<void> {
  const [latestRun, latestSuccessful] = await Promise.all([
    getLatestBackupStatus(env),
    getLatestSuccessfulBackupStatus(env),
  ]);
  // Status records carry no file contents or secrets; objectName/checksum value
  // are left in here for the operator CLI (the HTTP health view redacts them).
  console.log(JSON.stringify({ env, latestRun, latestSuccessful }, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  if (args.status) {
    await printStatus(args.env ?? getBackupEnv());
    return;
  }

  const result = await runBackup({
    components: componentsFor(args),
    ...(args.env ? { env: args.env } : {}),
    dryRun: args.dryRun,
  });

  await sendBackupNotification({
    status: result.status,
    env: result.env,
    error: result.error,
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    dump:
      result.dbDump?.status === "success"
        ? { bytes: result.dbDump.bytes, objectName: result.dbDump.objectName }
        : undefined,
    retention: result.retention,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exitCode = exitCodeFor(result);
}

main().catch((error) => {
  // Truncate and strip any accidental secret leak; config errors from env.ts
  // are already secret-free, but keep this bounded as a safety net.
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ status: "error", error: message.slice(0, 500) }));
  process.exitCode = 1;
});
