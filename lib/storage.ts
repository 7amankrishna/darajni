import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage buckets we manage through the admin uploader. Only objects in these
 * buckets are ever deleted by deleteMediaUrls; anything else (external pasted
 * URLs, unknown buckets) is left untouched.
 */
const MANAGED_BUCKETS = new Set([
  "product-images",
  "product-videos",
  "requested-dresses",
]);

/**
 * Matches the public storage path for any host (Supabase project origin or a
 * custom CDN origin such as files.darajni.in). Captures the bucket id and the
 * full object key (which may contain slashes).
 */
const STORAGE_PUBLIC_PATH = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

export interface StorageRef {
  bucket: string;
  path: string;
}

/**
 * Derive the { bucket, path } storage reference from a public media URL.
 * Returns null for external URLs, relative paths, or URLs that do not point at
 * a public storage object. The path is URL-decoded back to the raw object key
 * so it can be passed straight to storage.remove().
 */
export function extractStorageRef(url: string | null | undefined): StorageRef | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = STORAGE_PUBLIC_PATH.exec(parsed.pathname);
  if (!match) return null;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  if (!bucket || !path) return null;
  return { bucket, path };
}

/**
 * Best-effort deletion of every managed storage object referenced by `urls`.
 * Objects are grouped by bucket and removed in one call per bucket. Unknown
 * buckets and external URLs are skipped. Storage errors are logged and never
 * thrown — orphaned files are a storage-cost problem, while raising here would
 * risk breaking a successful database mutation.
 */
export async function deleteMediaUrls(
  supabase: SupabaseClient,
  urls: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const grouped = new Map<string, Set<string>>();
  for (const url of urls) {
    const ref = extractStorageRef(url);
    if (!ref || !MANAGED_BUCKETS.has(ref.bucket)) continue;
    const paths = grouped.get(ref.bucket) ?? new Set<string>();
    paths.add(ref.path);
    grouped.set(ref.bucket, paths);
  }

  for (const [bucket, paths] of grouped) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([...paths]);
    if (error) {
      console.error(
        `Failed to delete ${paths.size} object(s) from storage bucket "${bucket}":`,
        error.message,
      );
    }
  }
}
