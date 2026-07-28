// Optional Supabase Storage file backup.
//
// The database pg_dump does NOT include files stored in Supabase Storage. This
// job mirrors storage objects into Firebase Cloud Storage under
// `backups/{env}/storage/{bucket}/{objectPath}`, preserving bucket names, object
// paths, content types, and metadata. It uses the Supabase service-role key
// (server-only, never browser) via `@supabase/supabase-js` directly — not the
// server-only-tagged app service module — so it can run under tsx/CI.
//
// Objects are processed in bounded batches with pagination and a concurrency
// cap. The job is a no-op (returns `disabled`) unless BACKUP_STORAGE_ENABLED is
// on and the Supabase service-role key + Firebase storage are configured.
//
// Note: this mirror is stored unencrypted (the encrypted artifact is the
// database dump). Restrict the Firebase bucket to the backup service account.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseStorageCredentials, type SupabaseStorageCredentials } from "@/lib/backup/env";
import { storageObjectName } from "@/lib/backup/naming";
import { uploadBuffer } from "@/lib/backup/firebase-storage";

const CONCURRENCY = 3;
const PAGE_SIZE = 100;

export interface StorageBackupOutcome {
  status: "disabled" | "skipped" | "success" | "failed";
  reason?: string;
  bucketsProcessed: number;
  objectsBackedUp: number;
  bytesBackedUp: number;
  errors: string[];
  durationMs: number;
}

interface ListEntry {
  name: string;
  id: string | null;
  metadata?: { size?: number; mimetype?: string; [key: string]: unknown } | null;
}

function makeClient(credentials: SupabaseStorageCredentials): SupabaseClient {
  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
}

async function backupBucket(
  client: SupabaseClient,
  env: string,
  bucketId: string,
  errors: string[],
): Promise<{ objects: number; bytes: number }> {
  let objects = 0;
  let bytes = 0;
  const queue: string[] = [""];

  while (queue.length > 0) {
    const path = queue.shift() as string;
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await client.storage
        .from(bucketId)
        .list(path || undefined, { limit: PAGE_SIZE, offset });
      if (error) {
        errors.push(`list ${bucketId}/${path || "(root)"}: ${error.message}`);
        break;
      }
      const entries = (data ?? []) as ListEntry[];
      if (entries.length === 0) break;

      const files = entries.filter((entry) => entry.id !== null && entry.name);
      const folders = entries.filter((entry) => entry.id === null && entry.name);
      for (const folder of folders) {
        queue.push(path ? `${path}/${folder.name}` : folder.name);
      }

      await mapWithConcurrency(files, CONCURRENCY, async (file) => {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        try {
          const { data: downloaded, error: downloadError } = await client.storage
            .from(bucketId)
            .download(fullPath);
          if (downloadError || !downloaded) {
            errors.push(`download ${bucketId}/${fullPath}: ${downloadError?.message ?? "no data"}`);
            return;
          }
          const arrayBuffer = await downloaded.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = file.metadata?.mimetype ?? "application/octet-stream";
          const objectName = storageObjectName({ env, bucket: bucketId, objectPath: fullPath });
          await uploadBuffer({
            objectName,
            buffer,
            contentType,
            metadata: {
              sourceBucket: bucketId,
              sourcePath: fullPath,
              originalSize: String(file.metadata?.size ?? buffer.length),
              originalMimetype: contentType,
              backedUpAt: new Date().toISOString(),
            },
          });
          objects += 1;
          bytes += buffer.length;
        } catch (err) {
          errors.push(`mirror ${bucketId}/${fullPath}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      });

      if (entries.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return { objects, bytes };
}

/**
 * Run the optional Supabase Storage backup. Returns a `disabled` outcome when
 * the feature is off or its credentials are not configured.
 */
export async function runStorageBackup(
  enabled: boolean,
  storageCredentials: SupabaseStorageCredentials | null,
  firebaseAvailable: boolean,
  env: string,
): Promise<StorageBackupOutcome> {
  const startedAt = Date.now();
  const base: StorageBackupOutcome = {
    status: "disabled",
    bucketsProcessed: 0,
    objectsBackedUp: 0,
    bytesBackedUp: 0,
    errors: [],
    durationMs: 0,
  };

  if (!enabled) {
    return { ...base, status: "disabled", reason: "BACKUP_STORAGE_ENABLED is false", durationMs: Date.now() - startedAt };
  }
  if (!storageCredentials) {
    return { ...base, status: "skipped", reason: "Supabase service-role key / URL not configured", durationMs: Date.now() - startedAt };
  }
  if (!firebaseAvailable) {
    return { ...base, status: "skipped", reason: "Firebase storage not configured", durationMs: Date.now() - startedAt };
  }

  const client = makeClient(storageCredentials);
  const errors: string[] = [];
  let bucketsProcessed = 0;
  let objectsBackedUp = 0;
  let bytesBackedUp = 0;

  try {
    const { data: buckets, error: bucketError } = await client.storage.listBuckets();
    if (bucketError) {
      errors.push(`listBuckets: ${bucketError.message}`);
      return { ...base, status: "failed", reason: bucketError.message, errors, durationMs: Date.now() - startedAt };
    }
    for (const bucket of buckets ?? []) {
      const bucketId = bucket.id ?? bucket.name;
      if (!bucketId) continue;
      bucketsProcessed += 1;
      const result = await backupBucket(client, env, bucketId, errors);
      objectsBackedUp += result.objects;
      bytesBackedUp += result.bytes;
    }
    return {
      status: errors.length > 0 ? "failed" : "success",
      bucketsProcessed,
      objectsBackedUp,
      bytesBackedUp,
      errors,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "unknown error");
    return {
      status: "failed",
      bucketsProcessed,
      objectsBackedUp,
      bytesBackedUp,
      errors,
      durationMs: Date.now() - startedAt,
    };
  }
}
