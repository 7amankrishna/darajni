import { describe, expect, it } from "vitest";

import {
  selectObjectsToDelete,
  type RetentionCandidate,
} from "@/lib/backup/retention";

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 6, 15); // 2026-07-15

function candidate(daysAgo: number, id: string): RetentionCandidate {
  return {
    objectName: `backups/production/x-${id}.dump.enc`,
    manifestObjectName: `backups/production/x-${id}.dump.enc.manifest.json`,
    timestamp: NOW - daysAgo * DAY_MS,
  };
}

describe("selectObjectsToDelete", () => {
  it("keeps the newest minKeep regardless of age", () => {
    // All 10 are far older than retentionDays; only minKeep newest survive.
    const all = Array.from({ length: 10 }, (_, i) =>
      candidate(100 + i, `${i}`),
    );
    const { toDelete, keptCount } = selectObjectsToDelete({
      allSuccessful: all,
      retentionDays: 30,
      now: NOW,
      minKeep: 7,
    });
    expect(toDelete).toHaveLength(3);
    expect(keptCount).toBe(7);
    // The newest (100 days ago) must be kept; oldest three deleted.
    const deletedNames = toDelete.map((c) => c.objectName);
    expect(deletedNames).not.toContain("backups/production/x-0.dump.enc");
    expect(deletedNames).toContain("backups/production/x-7.dump.enc");
    expect(deletedNames).toContain("backups/production/x-9.dump.enc");
  });

  it("never deletes the single newest backup", () => {
    const { toDelete, keptCount } = selectObjectsToDelete({
      allSuccessful: [candidate(1000, "only")],
      retentionDays: 1,
      now: NOW,
      minKeep: 7,
    });
    expect(toDelete).toHaveLength(0);
    expect(keptCount).toBe(1);
  });

  it("deletes only backups beyond minKeep AND older than retentionDays", () => {
    // Sorted newest-first by timestamp, minKeep=7 protects the newest 7.
    // The 8th-newest (40d) is old -> deleted; the 9th-newest (50d) is old ->
    // deleted; a recent backup beyond minKeep would be kept. Build 9 entries
    // so exactly one beyond-minKeep backup is recent and kept.
    const all = [
      candidate(1, "n1"),
      candidate(2, "n2"),
      candidate(3, "n3"),
      candidate(4, "n4"),
      candidate(5, "n5"),
      candidate(6, "n6"),
      candidate(7, "n7"), // newest 7 all kept (minKeep)
      candidate(10, "recent-beyond-keep"), // index 7: recent -> kept
      candidate(40, "old-beyond-keep"), // index 8: old -> deleted
    ];
    const { toDelete, keptCount } = selectObjectsToDelete({
      allSuccessful: all,
      retentionDays: 30,
      now: NOW,
      minKeep: 7,
    });
    const names = toDelete.map((c) => c.objectName);
    expect(names).toEqual(["backups/production/x-old-beyond-keep.dump.enc"]);
    expect(keptCount).toBe(8);
  });

  it("sorts by timestamp so input order does not matter", () => {
    const all = [candidate(50, "old"), candidate(1, "new"), candidate(20, "mid")];
    const { toDelete, keptCount } = selectObjectsToDelete({
      allSuccessful: all,
      retentionDays: 30,
      now: NOW,
      minKeep: 1, // keep only newest 1
    });
    // Newest 1 kept; of the rest (20d, 50d), only 50d exceeds cutoff.
    const names = toDelete.map((c) => c.objectName);
    expect(names).toEqual(["backups/production/x-old.dump.enc"]);
    expect(keptCount).toBe(2);
  });

  it("does not mutate the input array", () => {
    const all = [candidate(1, "a"), candidate(2, "b"), candidate(3, "c")];
    const snapshot = [...all];
    selectObjectsToDelete({ allSuccessful: all, retentionDays: 30, now: NOW });
    expect(all).toEqual(snapshot);
  });

  it("returns empty for no candidates", () => {
    const { toDelete, keptCount } = selectObjectsToDelete({
      allSuccessful: [],
      retentionDays: 30,
      now: NOW,
    });
    expect(toDelete).toHaveLength(0);
    expect(keptCount).toBe(0);
  });

  it("defaults minKeep to 7", () => {
    const all = Array.from({ length: 8 }, (_, i) => candidate(40 + i, `${i}`));
    const { toDelete } = selectObjectsToDelete({
      allSuccessful: all,
      retentionDays: 30,
      now: NOW,
    });
    // minKeep 7 keeps newest 7 (indices 0-6), deletes index 7.
    expect(toDelete).toHaveLength(1);
    expect(toDelete[0].objectName).toBe("backups/production/x-7.dump.enc");
  });
});
