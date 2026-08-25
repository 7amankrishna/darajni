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

/**
 * On Supabase, pg_restore always reports hundreds of benign errors (ownership/
 * ACL statements on system schemas it refuses to touch). Exit codes therefore
 * cannot decide success. Instead verify the restored CONTENT: every core app
 * table must exist and be readable after the restore.
 */
function verifyRestoredContent(target: NonNullable<ReturnType<typeof getSupabaseDbUrl>>): Promise<boolean> {
  const query =
    "SELECT (to_regclass('public.products') IS NOT NULL)" +
    " AND (to_regclass('public.orders') IS NOT NULL)" +
    " AND (to_regclass('public.order_items') IS NOT NULL)" +
    " AND (to_regclass('public.settings') IS NOT NULL)" +
    " AND (to_regclass('public.categories') IS NOT NULL)" +
    " AND (to_regclass('public.customer_profiles') IS NOT NULL) AS ok;";
  return new Promise((resolve) => {
    const child = spawn("psql", ["--no-password", "-tAc", query], {
      stdio: ["ignore", "pipe", "inherit"],
      env: { ...process.env, ...target.pgEnv },
    });
    let out = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", () => resolve(false));
    child.on("close", () => resolve(out.trim() === "t"));
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
    // Exit code is intentionally ignored: on Supabase it is always 1 due to
    // benign system-schema errors. Content verification decides success.
    try {
      await runPgRestore(recovered.dumpPath, target);
    } finally {
      try {
        unlinkSync(recovered.dumpPath);
      } catch {
        // Best-effort cleanup.
      }
    }

    const contentOk = await verifyRestoredContent(target);
    if (!contentOk) {
      throw new Error(
        "Post-restore verification failed: core application tables are missing or unreadable after pg_restore. Check the Actions log; the pre-restore safety backup can be restored to recover.",
      );
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
