// Admin API for the backup system.
//
//   GET  /api/admin/backup            -> configuration health + recent backups
//   POST /api/admin/backup {action}   -> "run" | "verify" | "delete"
//
// All actions require an authenticated admin session (middleware + session
// check), same-origin requests, and rate limiting. Responses never contain
// credentials, keys, or connection strings.

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getBackupDestinationCredentials,
  getBackupEncryptionKey,
  getBackupEnv,
  getRetentionDays,
  getSupabaseDbUrl,
  isDedicatedBackupDestination,
  MAX_RETENTION_DAYS,
} from "@/lib/backup/env";
import {
  getLatestBackupStatus,
  getLatestSuccessfulBackupStatus,
} from "@/lib/backup/firestore-status";
import {
  deleteBackupPair,
  listSuccessfulBackups,
  verifyBackupChecksum,
} from "@/lib/backup/list";
import { isPgDumpAvailable } from "@/lib/backup/pgdump";
import { runBackup } from "@/lib/backup/orchestrator";
import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 300;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("run") }),
  z.object({
    action: z.literal("verify"),
    objectName: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("delete"),
    objectName: z.string().min(1).max(500),
  }),
]);

export async function GET(request: Request) {
  const authorization = await authorizeAdminRequest(request, RATE_LIMITS.adminRead);
  if (authorization.response) return authorization.response;

  const env = getBackupEnv();
  try {
    const [latestRun, latestSuccessful, backups, pgDumpAvailable] = await Promise.all([
      getLatestBackupStatus(env),
      getLatestSuccessfulBackupStatus(env),
      listSuccessfulBackups(env).catch(() => []),
      isPgDumpAvailable(),
    ]);

    return NextResponse.json(
      {
        env,
        retentionDays: getRetentionDays(),
        maxRetentionDays: MAX_RETENTION_DAYS,
        pgDumpAvailable,
        configured: {
          database: getSupabaseDbUrl() !== null,
          encryptionKey: getBackupEncryptionKey() !== null,
          storage: getBackupDestinationCredentials() !== null,
        },
        // "separate-project" = dedicated backup Supabase project; otherwise
        // backups live in the app's own Supabase Storage.
        destination: isDedicatedBackupDestination() ? "separate-project" : "same-project",
        latestRun,
        latestSuccessful,
        backups: backups.slice(0, 60),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return internalApiError("admin-backup-status", error, "Backup status unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest(request, RATE_LIMITS.adminMutation);
  if (authorization.response) return authorization.response;

  const parsed = actionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  const env = getBackupEnv();
  const { action } = parsed.data;

  try {
    if (action === "run") {
      // One manual trigger per hour per client; scheduled backups continue
      // independently via Vercel Cron and GitHub Actions.
      const limit = await rateLimitRequest(request, RATE_LIMITS.adminBackupRun);
      if (!limit.success) return apiError("A backup was triggered recently. Try again later.", 429);

      const result = await runBackup({
        components: ["db", "storage", "retention"],
        env,
        dbDumpIfAvailable: true,
      });
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "verify") {
      const objectName = parsed.data.objectName;
      const prefix = `backups/${env}/`;
      if (!objectName.startsWith(prefix)) {
        return apiError("Unknown backup.", 404);
      }
      const result = await verifyBackupChecksum(objectName);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    // action === "delete"
    const objectName = parsed.data.objectName;
    const prefix = `backups/${env}/`;
    if (!objectName.startsWith(prefix)) {
      return apiError("Unknown backup.", 404);
    }
    await deleteBackupPair(env, objectName);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalApiError("admin-backup-action", error, "Backup action failed.", 500);
  }
}
