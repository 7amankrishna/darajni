// Supabase Storage access for encrypted backups.
//
// This module mirrors the original `firebase-storage.ts` API but uses
// Supabase Storage (via `@supabase/supabase-js`) instead of Firebase. The
// functions retain the same signatures so the rest of the codebase can stay
// unchanged.

import { statSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBackupBucket, getBackupDestinationCredentials } from "@/lib/backup/env";

// All backup objects are stored under a single Supabase Storage bucket
// ("backups" by default, configurable via BACKUP_BUCKET) in the DESTINATION
// project — either a dedicated backup project (BACKUP_DEST_SUPABASE_URL +
// BACKUP_DEST_SERVICE_ROLE_KEY) or this app's own Supabase project. The bucket
// is private and is created automatically on first use if missing.
const SUPABASE_BUCKET = getBackupBucket();

let cachedClient: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const creds = getBackupDestinationCredentials();
  if (!creds) {
    throw new Error(
      "Backup storage is not configured. Set BACKUP_DEST_SUPABASE_URL and BACKUP_DEST_SERVICE_ROLE_KEY (a dedicated backup Supabase project), or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to store backups in the app's own project.",
    );
  }
  cachedClient = createClient(creds.url, creds.serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

/**
 * Ensure the backup bucket exists (idempotent, at most once per process).
 * Uses the service-role client, so creation succeeds even though the bucket is
 * private. A benign race (two processes creating simultaneously) is tolerated.
 */
async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const client = getClient();
      const { data: buckets, error: listErr } = await client.storage.listBuckets();
      if (listErr) throw listErr;
      if ((buckets ?? []).some((b) => b.name === SUPABASE_BUCKET)) return;
      const { error } = await client.storage.createBucket(SUPABASE_BUCKET, {
        public: false,
        fileSizeLimit: "52428800000", // 50 GiB, generous headroom for dumps
      });
      // Another worker may have created it concurrently; ignore that error.
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((err) => {
      bucketReady = null;
      throw err;
    });
  }
  return bucketReady;
}

/** Run an async operation with bounded exponential backoff for transient errors. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts - 1) break;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export interface ArchiveUploadInput {
  localPath: string;
  objectName: string;
  contentType: string;
  /** Small string fields attached as custom object metadata. */
  metadata: Record<string, string>;
}

export interface ArchiveUploadResult {
  objectName: string;
  size: number;
  generation: string | undefined;
}

/** Upload an encrypted archive to Supabase Storage and verify size. */
export async function uploadEncryptedArchive(input: ArchiveUploadInput): Promise<ArchiveUploadResult> {
  const client = getClient();
  await ensureBucket();
  const localSize = statSync(input.localPath).size;
  const buffer = await import("fs/promises").then((m) => m.readFile(input.localPath));
  await withRetry(async () => {
    const { data, error } = await client.storage.from(SUPABASE_BUCKET).upload(input.objectName, buffer, {
      contentType: input.contentType,
      upsert: false,
      // Supabase does not support custom metadata directly on upload; store it
      // later via `update` if needed. For our use‑case the backup metadata
      // lives in the neighboring manifest JSON, so we ignore `input.metadata`.
    });
    if (error) throw error;
    return data;
  });
  // Verify remote size via head request.
  const { data: meta, error: metaErr } = await client.storage.from(SUPABASE_BUCKET).download(input.objectName);
  if (metaErr) throw metaErr;
  const remoteSize = meta.size;
  if (remoteSize !== localSize) {
    throw new Error(
      `Upload integrity check failed: local archive is ${localSize} bytes but the stored object is ${remoteSize} bytes.`,
    );
  }
  return { objectName: input.objectName, size: remoteSize, generation: undefined };
}

export interface BufferUploadInput {
  objectName: string;
  buffer: Buffer;
  contentType: string;
  metadata: Record<string, string>;
}

/** Upload an in‑memory buffer (used by the optional Supabase Storage mirror). */
export async function uploadBuffer(input: BufferUploadInput): Promise<void> {
  const client = getClient();
  await ensureBucket();
  await withRetry(async () => {
    const { error } = await client.storage.from(SUPABASE_BUCKET).upload(input.objectName, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    });
    if (error) throw error;
  });
}

/** Upload a small JSON string (e.g. a manifest) as a neighboring object. */
export async function uploadJson(objectName: string, json: string, metadata?: Record<string, string>): Promise<void> {
  const client = getClient();
  await ensureBucket();
  const buffer = Buffer.from(json, "utf8");
  await withRetry(async () => {
    const { error } = await client.storage.from(SUPABASE_BUCKET).upload(objectName, buffer, {
      contentType: "application/json",
      upsert: false,
    });
    if (error) throw error;
  });
}

/** Download an object to a local file path. */
export async function downloadToFile(objectName: string, localPath: string): Promise<void> {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  const fs = await import("fs/promises");
  await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
}

/** Download an object and return its contents as a UTF‑8 string (for manifests). */
export async function downloadAsText(objectName: string): Promise<string> {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer()).toString("utf8");
}

/** Download an object and return its raw bytes (integrity verification). */
export async function downloadAsBuffer(objectName: string): Promise<Buffer> {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export interface ListedObject {
  name: string;
  size: number;
  // Supabase may return null for updated_at when unknown.
  updated: string | null | undefined;
  customMetadata: Record<string, string> | undefined;
}

/** List object names under a prefix with basic metadata. */
export async function listObjects(prefix: string): Promise<ListedObject[]> {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  return (data ?? []).map((obj) => ({
    name: obj.name,
    size: obj.metadata?.size ? Number(obj.metadata.size) : 0,
    updated: obj.updated_at,
    // Supabase does not expose arbitrary custom metadata on list; leave undefined.
    customMetadata: undefined,
  }));
}

/** Delete a single object. */
export async function deleteObject(objectName: string): Promise<void> {
  const client = getClient();
  await ensureBucket();
  const { error } = await client.storage.from(SUPABASE_BUCKET).remove([objectName]);
  if (error) throw error;
}

/** Whether an object exists. */
export async function objectExists(objectName: string): Promise<boolean> {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).list(objectName);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Fetch full object metadata. */
export async function getObjectMetadata(objectName: string) {
  const client = getClient();
  await ensureBucket();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  // Supabase returns a Blob; we expose size and updated_at.
  return { size: data.size, updated_at: (data as any).lastModified };
}
