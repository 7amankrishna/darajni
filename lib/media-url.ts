const legacyFilesOrigin = "http://files.darajni.in";
const secureFilesOrigin = "https://files.darajni.in";

/**
 * Storage buckets whose objects are owned by the app and safe to delete. Kept
 * in sync with lib/storage.ts; duplicated here so this module stays client-safe
 * (lib/storage.ts is server-only).
 */
const MANAGED_BUCKETS = new Set([
  "product-images",
  "product-videos",
  "requested-dresses",
]);

const STORAGE_PUBLIC_PATH = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

export function normalizeMediaUrl(value: string | null | undefined) {
  if (!value) return null;
  return value.startsWith(legacyFilesOrigin)
    ? `${secureFilesOrigin}${value.slice(legacyFilesOrigin.length)}`
    : value;
}

/**
 * True when `value` is an absolute URL pointing at a public object in one of
 * the app-managed storage buckets (works for both the Supabase project origin
 * and a custom CDN origin such as files.darajni.in). Used by admin editors to
 * decide whether a removed upload should be deleted from the bucket via the
 * DELETE /api/admin/uploads endpoint — external pasted URLs return false and
 * are left alone.
 */
export function isManagedStorageUrl(value: string | null | undefined) {
  if (!value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const match = STORAGE_PUBLIC_PATH.exec(parsed.pathname);
  if (!match) return false;
  return MANAGED_BUCKETS.has(match[1]);
}
