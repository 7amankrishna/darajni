// Firebase Cloud Storage access for encrypted backups.
//
// Uses the Firebase Admin SDK (server-only). The service account private key is
// normalized at load time in `lib/backup/env.ts` and is never logged here. Only
// small string metadata fields are attached to objects; the encryption key, IV,
// and auth tag are stored in the neighboring manifest object, never inside the
// archive and never in Firebase Realtime Database/Firestore.
//
// Uploads are resumable where supported and retried with bounded exponential
// backoff for transient failures. Success is reported only after the SDK-reported
// object size matches the local encrypted file size (integrity guard).
//
// This module does not import `server-only` so it can run under tsx. The Admin
// SDK is imported lazily is not possible at top level for types, but
// initialization is lazy (only when a storage method is first called).

import { statSync } from "node:fs";
import { initializeApp, cert, getApps, type App, type ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseServiceAccount, getFirebaseStorageBucket } from "@/lib/backup/env";

let cachedApp: App | null = null;

function getApp(): App {
  if (cachedApp && getApps().length > 0) return cachedApp;
  const serviceAccount = getFirebaseServiceAccount();
  const bucket = getFirebaseStorageBucket();
  if (!serviceAccount || !bucket) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET to use backup storage.",
    );
  }
  // firebase-admin's `cert` accepts the { projectId, clientEmail, privateKey } shape.
  const credential = cert(serviceAccount as ServiceAccount);
  cachedApp = initializeApp({ credential, storageBucket: bucket });
  return cachedApp;
}

function getBucket() {
  return getStorage(getApp()).bucket();
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

/** Resumable upload of an encrypted archive, with size verification on success. */
export async function uploadEncryptedArchive(input: ArchiveUploadInput): Promise<ArchiveUploadResult> {
  const bucket = getBucket();
  const localSize = statSync(input.localPath).size;

  const file = await withRetry(async () => {
    const [uploaded] = await bucket.upload(input.localPath, {
      destination: input.objectName,
      resumable: true,
      contentType: input.contentType,
      metadata: { metadata: input.metadata },
    });
    return uploaded;
  });

  const [remoteMeta] = await file.getMetadata();
  const remoteSize = Number(remoteMeta.size ?? 0);
  if (remoteSize !== localSize) {
    throw new Error(
      `Upload integrity check failed: local archive is ${localSize} bytes but the stored object is ${remoteSize} bytes.`,
    );
  }

  const generation =
    remoteMeta.generation === undefined || remoteMeta.generation === null
      ? undefined
      : String(remoteMeta.generation);
  return { objectName: input.objectName, size: remoteSize, generation };
}

export interface BufferUploadInput {
  objectName: string;
  buffer: Buffer;
  contentType: string;
  metadata: Record<string, string>;
}

/** Upload an in-memory buffer (used by the optional Supabase Storage mirror). */
export async function uploadBuffer(input: BufferUploadInput): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(input.objectName);
  await withRetry(async () => {
    await file.save(input.buffer, {
      contentType: input.contentType,
      resumable: false,
      metadata: { metadata: input.metadata },
    });
  });
}

/** Upload a small JSON string (e.g. a manifest) as a neighboring object. */
export async function uploadJson(objectName: string, json: string, metadata?: Record<string, string>): Promise<void> {
  const bucket = getBucket();
  const buffer = Buffer.from(json, "utf8");
  const file = bucket.file(objectName);
  await withRetry(async () => {
    await file.save(buffer, {
      contentType: "application/json",
      resumable: false,
      metadata: metadata ? { metadata } : undefined,
    });
  });
}

/** Download an object to a local file path. */
export async function downloadToFile(objectName: string, localPath: string): Promise<void> {
  const bucket = getBucket();
  await withRetry(async () => {
    await bucket.file(objectName).download({ destination: localPath });
  });
}

/** Download an object and return its contents as a UTF-8 string (for manifests). */
export async function downloadAsText(objectName: string): Promise<string> {
  const bucket = getBucket();
  const [buffer] = await withRetry(async () => bucket.file(objectName).download());
  return buffer.toString("utf8");
}

export interface ListedObject {
  name: string;
  size: number;
  updated: string | undefined;
  customMetadata: Record<string, string> | undefined;
}

/** List object names under a prefix with basic metadata. */
export async function listObjects(prefix: string): Promise<ListedObject[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix });
  return files.map((file) => {
    const meta = file.metadata as
      | { size?: string; updated?: string; metadata?: Record<string, string> }
      | undefined;
    return {
      name: file.name,
      size: Number(meta?.size ?? 0),
      updated: meta?.updated,
      customMetadata: meta?.metadata,
    };
  });
}

/** Delete a single object. */
export async function deleteObject(objectName: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(objectName).delete();
}

/** Whether an object exists. */
export async function objectExists(objectName: string): Promise<boolean> {
  const bucket = getBucket();
  const [exists] = await bucket.file(objectName).exists();
  return exists;
}

/** Fetch full object metadata. */
export async function getObjectMetadata(objectName: string) {
  const bucket = getBucket();
  const [meta] = await bucket.file(objectName).getMetadata();
  return meta;
}
