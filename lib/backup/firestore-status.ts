// Backup status record (health view).
//
// The disaster-recovery spec allows a small status record in Firestore only if
// Firestore is already configured; otherwise status lives in Cloud Storage.
// This app uses Supabase (not Firestore) for its data, so status is kept in
// Cloud Storage as a small `latest.json` pointer under the environment prefix.
// The neighboring manifest objects remain the source of truth; this record only
// summarizes the most recent run for the health/status view and never contains
// file contents, secrets, keys, or connection strings.

import { uploadJson, downloadAsText, objectExists } from "@/lib/backup/firebase-storage";
import { backupPrefix } from "@/lib/backup/naming";

export interface BackupStatusRecord {
  backupId: string;
  status: string;
  env: string;
  /** ISO timestamp of the backup itself. */
  timestamp: string;
  timestampEpochMs: number;
  encryptedSize?: number;
  checksum?: string;
  checksumAlgorithm?: string;
  objectName?: string;
  error?: string;
  /** ISO timestamp when this status record was written. */
  recordedAt: string;
}

function statusObjectName(env: string): string {
  return `${backupPrefix(env)}_status/latest.json`;
}

function successObjectName(env: string): string {
  return `${backupPrefix(env)}_status/latest-success.json`;
}

/**
 * Best-effort status recording. Failures are swallowed (manifests are
 * authoritative). The latest run is always written to `latest.json`; a
 * separate `latest-success.json` pointer is written only on success so the
 * health view can report the most recent *successful* backup even after a
 * later failed run overwrites `latest.json`.
 */
export async function recordBackupStatus(
  env: string,
  record: Omit<BackupStatusRecord, "recordedAt">,
): Promise<void> {
  try {
    const full: BackupStatusRecord = { ...record, recordedAt: new Date().toISOString() };
    const payload = JSON.stringify(full, null, 2);
    const metadata = { backupId: record.backupId, status: record.status, env: record.env };
    await uploadJson(statusObjectName(env), payload, metadata);
    if (record.status === "success") {
      await uploadJson(successObjectName(env), payload, metadata);
    }
  } catch {
    // Non-fatal: the manifest in Cloud Storage is the source of truth.
  }
}

/** Read the most recent backup status record (any status), or null if none. */
export async function getLatestBackupStatus(env: string): Promise<BackupStatusRecord | null> {
  try {
    const name = statusObjectName(env);
    if (!(await objectExists(name))) return null;
    const text = await downloadAsText(name);
    return JSON.parse(text) as BackupStatusRecord;
  } catch {
    return null;
  }
}

/** Read the most recent *successful* backup status record, or null if none. */
export async function getLatestSuccessfulBackupStatus(
  env: string,
): Promise<BackupStatusRecord | null> {
  try {
    const name = successObjectName(env);
    if (!(await objectExists(name))) return null;
    const text = await downloadAsText(name);
    return JSON.parse(text) as BackupStatusRecord;
  } catch {
    return null;
  }
}
