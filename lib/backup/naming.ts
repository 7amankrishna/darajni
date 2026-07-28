// Backup object naming and path construction for Firebase Cloud Storage.
//
// All backups live under the `backups/` prefix, scoped by environment so that
// retention cleanup only ever touches the exact prefix for this application and
// environment: `backups/{env}/...`. Timestamps are derived from UTC so object
// paths are stable across regions and the documented cron is UTC.

export interface BackupNameInput {
  env: string;
  timestamp: Date;
}

export interface StorageNameInput {
  env: string;
  bucket: string;
  objectPath: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * `backups/{env}/{YYYY}/{MM}/{DD}/supabase-{ISO_TS}.dump.enc` where ISO_TS is a
 * filename-safe ISO 8601 timestamp (colons and dots replaced with dashes).
 */
export function backupObjectName({ env, timestamp }: BackupNameInput): string {
  const iso = timestamp.toISOString();
  const safeTimestamp = iso.replace(/[:.]/g, "-");
  const yyyy = String(timestamp.getUTCFullYear());
  const mm = pad(timestamp.getUTCMonth() + 1);
  const dd = pad(timestamp.getUTCDate());
  return `backups/${env}/${yyyy}/${mm}/${dd}/supabase-${safeTimestamp}.dump.enc`;
}

/** The neighboring manifest object name for a given dump object name. */
export function manifestObjectName(dumpObjectName: string): string {
  return `${dumpObjectName}.manifest.json`;
}

/**
 * `backups/{env}/storage/{bucket}/{objectPath}` for the optional Supabase
 * Storage file backup. Leading slashes on the object path are stripped.
 */
export function storageObjectName({ env, bucket, objectPath }: StorageNameInput): string {
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `backups/${env}/storage/${bucket}/${cleanPath}`;
}

/**
 * The exact prefix that scopes every object for this application environment.
 * Retention cleanup lists and deletes only under this prefix.
 */
export function backupPrefix(env: string): string {
  return `backups/${env}/`;
}
