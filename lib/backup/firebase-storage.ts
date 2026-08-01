// Supabase Storage access for encrypted backups.
//
// This module mirrors the original `firebase-storage.ts` API but uses
// Supabase Storage (via `@supabase/supabase-js`) instead of Firebase. The
// functions retain the same signatures so the rest of the codebase can stay
// unchanged.

import { statSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseStorageCredentials } from "@/lib/backup/env";

// All backup objects are stored under a single Supabase bucket named "backups".
// This matches the naming conventions used throughout the code (`backupObjectName`
// generates a path like `backups/{env}/…`).
const SUPABASE_BUCKET = "backups";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const creds = getSupabaseStorageCredentials();
  if (!creds) {
    throw new Error(
      "Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable backup storage.",
    );
  }
  cachedClient = createClient(creds.url, creds.serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
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
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  const fs = await import("fs/promises");
  await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
}

/** Download an object and return its contents as a UTF‑8 string (for manifests). */
export async function downloadAsText(objectName: string): Promise<string> {
  const client = getClient();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer()).toString("utf8");
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
  const { error } = await client.storage.from(SUPABASE_BUCKET).remove([objectName]);
  if (error) throw error;
}

/** Whether an object exists. */
export async function objectExists(objectName: string): Promise<boolean> {
  const client = getClient();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).list(objectName);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Fetch full object metadata. */
export async function getObjectMetadata(objectName: string) {
  const client = getClient();
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(objectName);
  if (error) throw error;
  // Supabase returns a Blob; we expose size and updated_at.
  return { size: data.size, updated_at: (data as any).lastModified };
}
