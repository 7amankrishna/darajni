// CI restore runner (executed ONLY inside the "Restore Database Backup"
// GitHub Actions workflow; never exposed to serverless).
//
//   npx tsx scripts/restore-run.ts --backup <objectName|backupId|latest> [--env production]
//
// Safety model:
//   - The workflow ALWAYS takes a fresh safety backup of the CURRENT database
//     before this script runs (see .github/workflows/restore.yml).
//   - Only the `public` schema (application data) is restored, with
//     --clean --if-exists: tables are recreated exactly as captured in the
//     backup. Supabase system schemas (auth/storage/realtime) are untouched.
//   - Any integrity failure aborts BEFORE pg_restore runs.
//   - A status record + email notification are always written/sent.

import { spawn } from "node:child_process";
import { unlinkSync } from "node:fs";

import {
  getBackupEnv,
  getSupabaseDbUrl,
} from "@/lib/backup/env";
import { pickRecoverableBackup, recoverToDumpFile } from "@/lib/backup/recover";
import { recordRestoreStatus } from "@/lib/backup/firestore-status";
import { sendBackupNotification } from "@/lib/backup/notify";

interface ParsedArgs {
  backup: string | undefined;
  env: string | undefined;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { backup: undefined, env: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--backup") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) throw new Error("--backup requires an object name or 'latest'.");
      args.backup = next;
      i += 1;
    } else if (arg.startsWith("--backup=")) {
      args.backup = arg.slice("--backup=".length);
    } else if (arg === "--env") {
      args.env = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--env=")) {
      args.env = arg.slice("--env=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function runPgRestore(dumpPath: string, target: NonNullable<ReturnType<typeof getSupabaseDbUrl>>): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pg_restore",
      [
        "--no-password",
        "--no-owner",
        "--if-exists",
        "--clean",
        "--dbname=" + target.database,
        dumpPath,
      ],
      { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, ...target.pgEnv } },
    );
    child.on("error", (err) => reject(new Error(`Could not run pg_restore: ${err.message}`)));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = args.env ?? getBackupEnv();
  const startedAt = new Date().toISOString();

  const target = getSupabaseDbUrl();
  if (!target) throw new Error("SUPABASE_DB_URL is not set in this environment; refusing to restore.");

  await recordRestoreStatus(env, {
    status: "running",
    env,
    objectName: args.backup ?? "latest",
    startedAt,
    runUrl: process.env.GH_RUN_URL,
  });

  try {
    const backup = await pickRecoverableBackup(env, args.backup);
    if (!backup) throw new Error(`No restorable backup matched "${args.backup ?? "latest"}".`);

    console.log(
      `Restoring backup ${backup.manifest.backupId} (${backup.manifest.createdAt}) into ${target.host}:${target.port}/${target.database}.`,
    );

    const recovered = await recoverToDumpFile(backup);
    let exitCode = 1;
    try {
      exitCode = await runPgRestore(recovered.dumpPath, target);
    } finally {
      try {
        unlinkSync(recovered.dumpPath);
      } catch {
        // Best-effort cleanup.
      }
    }
    if (exitCode !== 0) {
      throw new Error(`pg_restore exited with code ${exitCode}. See the Actions log above.`);
    }

    const finishedAt = new Date().toISOString();
    await recordRestoreStatus(env, {
      status: "success",
      env,
      objectName: backup.manifest.archive.objectName,
      backupId: backup.manifest.backupId,
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      runUrl: process.env.GH_RUN_URL,
    });
    await sendBackupNotification({
      status: "success",
      env,
      startedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      dump: { bytes: backup.manifest.archive.encryptedSize, objectName: backup.manifest.archive.objectName },
    });
    console.log("Restore completed successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 400) : "unknown error";
    await recordRestoreStatus(env, {
      status: "failed",
      env,
      objectName: args.backup ?? "latest",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: message,
      runUrl: process.env.GH_RUN_URL,
    });
    await sendBackupNotification({ status: "failed", env, error: `Restore failed: ${message}`, startedAt });
    console.error(JSON.stringify({ status: "error", error: message }));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ status: "error", error: message.slice(0, 500) }));
  process.exitCode = 1;
});
