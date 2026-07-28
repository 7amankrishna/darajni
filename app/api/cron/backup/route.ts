// Cron endpoint for the backup system.
//
// Mirrors app/api/cron/store-maintenance/route.ts: rate-limited, CRON_SECRET
// protected via constant-time comparison, runtime nodejs. Two modes:
//   GET /api/cron/backup?status=1  -> health view (most recent backup metadata,
//                                     no contents, keys, or connection strings)
//   GET /api/cron/backup           -> run the backup (db + storage + retention)
// The DB dump is attempted with `dbDumpIfAvailable`, so on hosts without pg_dump
// (e.g. Vercel serverless) it is skipped with a clear reason rather than failing;
// the reliable DB dump runs from the GitHub Actions workflow. Firebase Admin SDK
// is used server-side only; no credentials reach the browser.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getBackupEnv } from "@/lib/backup/env";
import {
  getLatestBackupStatus,
  getLatestSuccessfulBackupStatus,
  type BackupStatusRecord,
} from "@/lib/backup/firestore-status";
import { runBackup } from "@/lib/backup/orchestrator";
import { getCronSecret } from "@/lib/config/server-env";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.backup);
  if (!limit.success) return rateLimitError(limit);

  const cronSecret = getCronSecret();
  const authorization = request.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${cronSecret || ""}`);
  const supplied = Buffer.from(authorization || "");
  if (
    !cronSecret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return apiError("Unauthorized.", 401);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("status") === "1") {
    return healthView();
  }

  try {
    const result = await runBackup({
      components: ["db", "storage", "retention"],
      dbDumpIfAvailable: true,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return internalApiError("backup", error, "Backup failed.", 500);
  }
}

/**
 * Most-recent-backup health view. Exposes only non-sensitive metadata: no
 * object contents, no keys, no connection strings, no checksum values, no
 * object paths. The latest run (any status) and the most recent successful
 * backup are both surfaced so an operator can both confirm a recent success
 * and see if the latest run failed.
 */
async function healthView(): Promise<Response> {
  const env = getBackupEnv();
  const [latestRun, latestSuccessful] = await Promise.all([
    getLatestBackupStatus(env),
    getLatestSuccessfulBackupStatus(env),
  ]);

  return NextResponse.json(
    {
      env,
      latestRun: sanitizeStatus(latestRun),
      latestSuccessful: sanitizeStatus(latestSuccessful),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function sanitizeStatus(record: BackupStatusRecord | null) {
  if (!record) return null;
  const base = {
    backupId: record.backupId,
    status: record.status,
    env: record.env,
    timestamp: record.timestamp,
    encryptedSize: record.encryptedSize,
    checksumAlgorithm: record.checksumAlgorithm,
  };
  if (record.status !== "success" && record.error) {
    // Truncate as a safety net; orchestrator error messages are already
    // secret-free, but keep the health view bounded.
    return { ...base, error: record.error.slice(0, 300) };
  }
  return base;
}
