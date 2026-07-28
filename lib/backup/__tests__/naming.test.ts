import { describe, expect, it } from "vitest";

import {
  backupObjectName,
  backupPrefix,
  manifestObjectName,
  storageObjectName,
} from "@/lib/backup/naming";

describe("backupObjectName", () => {
  it("builds a UTC date-segmented path with a filename-safe ISO timestamp", () => {
    const ts = new Date(Date.UTC(2026, 0, 2, 3, 4, 5, 678));
    expect(backupObjectName({ env: "production", timestamp: ts })).toBe(
      "backups/production/2026/01/02/supabase-2026-01-02T03-04-05-678Z.dump.enc",
    );
  });

  it("replaces colons and dots with dashes in the timestamp", () => {
    const ts = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999));
    const name = backupObjectName({ env: "staging", timestamp: ts });
    expect(name).not.toMatch(/:/);
    expect(name).toContain("supabase-2025-12-31T23-59-59-999Z");
  });

  it("zero-pads month and day", () => {
    const ts = new Date(Date.UTC(2026, 5, 9, 0, 0, 0, 0)); // June 9
    expect(backupObjectName({ env: "production", timestamp: ts })).toContain(
      "backups/production/2026/06/09/",
    );
  });

  it("derives the path from UTC, not local time", () => {
    const ts = new Date(Date.UTC(2026, 6, 15, 1, 30, 0, 0));
    expect(backupObjectName({ env: "production", timestamp: ts })).toContain(
      "/2026/07/15/",
    );
  });
});

describe("manifestObjectName", () => {
  it("appends the manifest suffix", () => {
    expect(manifestObjectName("backups/production/x.dump.enc")).toBe(
      "backups/production/x.dump.enc.manifest.json",
    );
  });
});

describe("storageObjectName", () => {
  it("builds the storage mirror path", () => {
    expect(
      storageObjectName({ env: "production", bucket: "public", objectPath: "a/b.png" }),
    ).toBe("backups/production/storage/public/a/b.png");
  });

  it("strips leading slashes from the object path", () => {
    expect(
      storageObjectName({ env: "production", bucket: "b", objectPath: "//a.png" }),
    ).toBe("backups/production/storage/b/a.png");
  });
});

describe("backupPrefix", () => {
  it("returns the scoped prefix with a trailing slash", () => {
    expect(backupPrefix("production")).toBe("backups/production/");
  });
});
