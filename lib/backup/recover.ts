// Recovery primitives shared by the CI restore runner and admin tooling.
//
// A "recoverable backup" is an encrypted archive plus its neighboring
// manifest. This module finds manifests, verifies integrity (size, SHA-256 of
// ciphertext, AES-256-GCM auth tag during decryption), and produces a local
// plaintext pg_dump file that `pg_restore` can consume. Chunked archives
// (.part-NNNN objects) are reassembled in order automatically.

import { createReadStream, createWriteStream, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createHash, randomBytes } from "node:crypto";

import { getBackupEncryptionKey } from "@/lib/backup/env";
import { createDecryptStream } from "@/lib/backup/crypto";
import { downloadAsText, downloadToFile, listObjects } from "@/lib/backup/firebase-storage";
import { backupPrefix } from "@/lib/backup/naming";

export interface RecoverableManifest {
  backupId: string;
  createdAt: string;
  createdAtEpochMs: number;
  env: string;
  status: string;
  archive: {
    objectName: string;
    encryptedSize: number;
    parts?: Array<{ objectName: string; size: number }>;
  };
  encryption: { ivBase64: string; authTagBase64: string };
  integrity: { checksum: string };
}

export interface RecoverableBackup {
  manifest: RecoverableManifest;
  /** Full manifest object name inside the bucket. */
  manifestObjectName: string;
}

/** List every successful, restorable backup for the environment (newest first). */
export async function findRecoverableBackups(
  env: string,
): Promise<RecoverableBackup[]> {
  const prefix = backupPrefix(env);
  const listed = await listObjects(prefix);
  const out: RecoverableBackup[] = [];
  for (const entry of listed) {
    if (!entry.name.endsWith(".manifest.json")) continue;
    try {
      const manifest = JSON.parse(await downloadAsText(entry.name)) as RecoverableManifest;
      if (manifest.status === "success" && manifest.archive?.objectName && manifest.encryption && manifest.integrity) {
        out.push({ manifest, manifestObjectName: entry.name });
      }
    } catch {
      // Skip unreadable manifests rather than failing discovery.
    }
  }
  return out.sort((a, b) => b.manifest.createdAtEpochMs - a.manifest.createdAtEpochMs);
}

/** Pick a backup by exact archive object name, or the newest successful one when omitted. */
export async function pickRecoverableBackup(
  env: string,
  objectName?: string,
): Promise<RecoverableBackup | null> {
  const all = await findRecoverableBackups(env);
  if (!objectName || objectName === "latest") return all[0] ?? null;
  return (
    all.find(
      (b) =>
        b.manifest.archive.objectName === objectName ||
        b.manifestObjectName === objectName ||
        b.manifest.backupId === objectName,
    ) ?? null
  );
}

function tempPath(suffix: string): string {
  return join(tmpdir(), `darajni-restore-${randomBytes(8).toString("hex")}.${suffix}`);
}

function safeUnlink(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // Best-effort cleanup.
  }
}

export interface RecoveredDump {
  /** Local decrypted pg_dump custom-format file ready for pg_restore. */
  dumpPath: string;
  manifest: RecoverableManifest;
}

/**
 * Download (rejoining parts when chunked), verify size + SHA-256 against the
 * manifest, then decrypt to a temp dump file. Throws on ANY integrity failure.
 * The caller owns cleanup of dumpPath.
 */
export async function recoverToDumpFile(backup: RecoverableBackup): Promise<RecoveredDump> {
  const key = getBackupEncryptionKey();
  if (!key) throw new Error("BACKUP_ENCRYPTION_KEY is not set; cannot decrypt backups.");
  const manifest = backup.manifest;

  const encPath = tempPath("dump.enc");
  const dumpPath = tempPath("dump");
  try {
    if (manifest.archive.parts?.length) {
      const parts = [...manifest.archive.parts].sort((a, b) =>
        a.objectName.localeCompare(b.objectName),
      );
      let first = true;
      for (const part of parts) {
        const partPath = tempPath("part");
        try {
          await downloadToFile(part.objectName, partPath);
          const downloaded = statSync(partPath).size;
          if (downloaded !== part.size) {
            throw new Error(
              `Part ${part.objectName} is ${downloaded} bytes but the manifest says ${part.size}.`,
            );
          }
          await pipeline(
            createReadStream(partPath),
            createWriteStream(encPath, { flags: first ? "w" : "a" }),
          );
          first = false;
        } finally {
          safeUnlink(partPath);
        }
      }
    } else {
      await downloadToFile(manifest.archive.objectName, encPath);
    }

    const localSize = statSync(encPath).size;
    if (localSize !== manifest.archive.encryptedSize) {
      throw new Error(
        `Downloaded archive is ${localSize} bytes but the manifest records ${manifest.archive.encryptedSize}.`,
      );
    }

    const hasher = createHash("sha256");
    for await (const chunk of createReadStream(encPath)) hasher.update(chunk);
    const checksum = hasher.digest("hex");
    if (checksum !== manifest.integrity.checksum) {
      throw new Error(
        `Checksum mismatch: SHA-256 ${checksum} does not match manifest ${manifest.integrity.checksum}.`,
      );
    }

    // GCM auth-tag verification happens on stream finalization; a tampered or
    // wrong-key ciphertext rejects here.
    await pipeline(
      createReadStream(encPath),
      createDecryptStream(
        key,
        Buffer.from(manifest.encryption.ivBase64, "base64"),
        Buffer.from(manifest.encryption.authTagBase64, "base64"),
      ),
      createWriteStream(dumpPath),
    );

    return { dumpPath, manifest };
  } finally {
    safeUnlink(encPath);
  }
}
