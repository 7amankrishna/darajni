// Read-only helpers for enumerating and verifying stored backups.
//
// Manifest objects (`*.manifest.json` written next to each encrypted archive)
// are the source of truth. These helpers never expose credentials, keys, or
// object contents — only manifest metadata. Shared by the admin API routes.

import { createHash } from "node:crypto";

import {
  deleteObject,
  downloadAsBuffer,
  downloadAsText,
  listObjects,
} from "@/lib/backup/firebase-storage";
import { backupPrefix } from "@/lib/backup/naming";
import type { BackupManifest } from "@/lib/backup/orchestrator";

export interface BackupSummary {
  backupId: string;
  env: string;
  createdAt: string;
  createdAtEpochMs: number;
  /** Encrypted archive object path (inside the backup bucket). */
  objectName: string;
  manifestObjectName: string;
  encryptedSize: number;
  checksum: string;
  pgDumpVersion: string;
  serverVersion: string;
}

/** List successful backups (newest first) parsed from their manifests. */
export async function listSuccessfulBackups(env: string): Promise<BackupSummary[]> {
  const prefix = backupPrefix(env);
  const listed = await listObjects(prefix);
  const manifestNames = listed
    .filter((o) => o.name.endsWith(".manifest.json"))
    .map((o) => o.name);

  const summaries: BackupSummary[] = [];
  for (const name of manifestNames) {
    try {
      const manifest = JSON.parse(await downloadAsText(name)) as BackupManifest;
      if (manifest.status !== "success" || !manifest.archive?.objectName) continue;
      summaries.push({
        backupId: manifest.backupId,
        env: manifest.env,
        createdAt: manifest.createdAt,
        createdAtEpochMs: manifest.createdAtEpochMs,
        objectName: manifest.archive.objectName,
        manifestObjectName: name,
        encryptedSize: manifest.archive.encryptedSize,
        checksum: manifest.integrity?.checksum ?? "",
        pgDumpVersion: manifest.versions?.pgDump ?? "unknown",
        serverVersion: manifest.versions?.server ?? "unknown",
      });
    } catch {
      // Skip unreadable/invalid manifests rather than failing the whole list.
    }
  }
  return summaries.sort((a, b) => b.createdAtEpochMs - a.createdAtEpochMs);
}

export interface VerifyResult {
  ok: boolean;
  expectedChecksum?: string;
  actualChecksum?: string;
  size: number;
  error?: string;
}

/**
 * Verify a stored archive's integrity by re-computing its SHA-256 checksum.
 * The hash covers the ciphertext exactly as uploaded, matching the value in
 * the manifest at write time. Detects corrupted/truncated storage objects.
 */
export async function verifyBackupChecksum(objectName: string): Promise<VerifyResult> {
  try {
    const bytes = await downloadAsBuffer(objectName);
    const actual = createHash("sha256").update(bytes).digest("hex");
    let expected = "";
    try {
      const manifest = JSON.parse(
        await downloadAsText(`${objectName}.manifest.json`),
      ) as BackupManifest;
      expected = manifest.integrity?.checksum ?? "";
    } catch {
      return { ok: false, actualChecksum: actual, size: bytes.length, error: "manifest-unreadable" };
    }
    return {
      ok: expected.length > 0 && actual === expected,
      expectedChecksum: expected,
      actualChecksum: actual,
      size: bytes.length,
    };
  } catch (err) {
    return {
      ok: false,
      size: 0,
      error: err instanceof Error ? err.message : "download-failed",
    };
  }
}

/**
 * Delete one backup (archive + manifest). Refuses any path that is not inside
 * this application's `backups/{env}/` namespace, so a compromised admin session
 * can only ever remove backups, never other storage content.
 */
export async function deleteBackupPair(env: string, objectName: string): Promise<void> {
  const prefix = backupPrefix(env);
  if (!objectName.startsWith(prefix) || objectName.includes("..")) {
    throw new Error("Refusing to delete: object is outside the backup namespace.");
  }
  await deleteObject(objectName);
  if (objectName.endsWith(".dump.enc")) {
    await deleteObject(`${objectName}.manifest.json`);
  }
}
