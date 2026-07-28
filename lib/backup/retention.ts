// Retention selection for backup objects.
//
// This is a PURE function: it decides which successful backups to delete but
// performs no I/O. The caller is responsible for listing objects only under
// the exact `backups/{env}/` prefix (so cleanup can never touch another
// environment or application) and for actually deleting the returned objects.
//
// Rules (from the disaster-recovery spec):
//   - Only consider successful backups.
//   - Never delete the newest successful backup.
//   - Always keep at least `minKeep` (default 7) successful backups regardless
//     of age.
//   - Beyond those, delete backups older than `retentionDays`.
//   - The caller runs this ONLY after the current backup has been verified
//     successful; never run retention cleanup when the current run failed.

export interface RetentionCandidate {
  /** The encrypted archive object name (e.g. .../supabase-....dump.enc). */
  objectName: string;
  /** The neighboring manifest object name. */
  manifestObjectName: string;
  /** Epoch milliseconds the backup was created. */
  timestamp: number;
}

export interface RetentionSelection {
  /** Candidates to delete, in arbitrary order. */
  toDelete: RetentionCandidate[];
  /** Number of successful backups that will remain after deletion. */
  keptCount: number;
}

export interface SelectObjectsToDeleteInput {
  allSuccessful: RetentionCandidate[];
  retentionDays: number;
  /** Epoch milliseconds representing "now"; defaults to the current time. */
  now?: number;
  /** Minimum successful backups to keep regardless of age. Default 7. */
  minKeep?: number;
}

const MS_PER_DAY = 86_400_000;

export function selectObjectsToDelete({
  allSuccessful,
  retentionDays,
  now,
  minKeep = 7,
}: SelectObjectsToDeleteInput): RetentionSelection {
  const referenceNow = now ?? Date.now();
  const cutoff = referenceNow - retentionDays * MS_PER_DAY;

  // Newest first. The newest successful backup (index 0) is always kept.
  const sorted = [...allSuccessful].sort((a, b) => b.timestamp - a.timestamp);

  const toDelete: RetentionCandidate[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    // Always keep the newest `minKeep` successful backups (this also guarantees
    // the single newest backup is never deleted, since it is index 0).
    if (index < minKeep) continue;
    const candidate = sorted[index];
    if (candidate.timestamp < cutoff) {
      toDelete.push(candidate);
    }
  }

  return { toDelete, keptCount: sorted.length - toDelete.length };
}
