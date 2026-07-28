import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase client and the Firebase uploader.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/backup/firebase-storage", () => ({
  uploadBuffer: vi.fn(async () => {}),
}));

vi.mock("@/lib/backup/env", () => ({
  getSupabaseStorageCredentials: vi.fn(() => null),
}));

import { createClient } from "@supabase/supabase-js";
import { uploadBuffer } from "@/lib/backup/firebase-storage";
import { runStorageBackup } from "@/lib/backup/storage-backup";

const createClientMock = vi.mocked(createClient);
const uploadBufferMock = vi.mocked(uploadBuffer);

const creds = { url: "https://x.supabase.co", serviceRoleKey: "key" };

function blobOf(text: string) {
  return { arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

// Build a fake supabase client over a simple {bucket: {path: content}} store.
function makeClient(store: Record<string, Record<string, string>>) {
  return {
    storage: {
      listBuckets: vi.fn(async () => ({
        data: Object.keys(store).map((id) => ({ id, name: id })),
        error: null,
      })),
      from: (bucketId: string) => ({
        list: vi.fn(async (path?: string) => {
          const objects = store[bucketId] ?? {};
          const prefix = path ? `${path}/` : "";
          const data = Object.keys(objects)
            .filter((p) => (path ? p.startsWith(prefix) : !p.includes("/")))
            .map((p) => {
              const name = path ? p.slice(prefix.length) : p;
              return {
                name,
                id: `id-${p}`,
                metadata: {
                  size: objects[p].length,
                  mimetype: "application/octet-stream",
                },
              };
            });
          return { data, error: null };
        }),
        download: vi.fn(async (fullPath: string) => {
          const content = store[bucketId]?.[fullPath];
          if (content === undefined) {
            return { data: null, error: { message: "not found" } };
          }
          return { data: blobOf(content), error: null };
        }),
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runStorageBackup gating", () => {
  it("returns disabled when the feature is off", async () => {
    const out = await runStorageBackup(false, creds, true, "production");
    expect(out.status).toBe("disabled");
    expect(out.reason).toMatch(/BACKUP_STORAGE_ENABLED/);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns skipped when credentials are missing", async () => {
    const out = await runStorageBackup(true, null, true, "production");
    expect(out.status).toBe("skipped");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns skipped when firebase is unavailable", async () => {
    const out = await runStorageBackup(true, creds, false, "production");
    expect(out.status).toBe("skipped");
    expect(out.reason).toMatch(/Firebase/);
  });
});

describe("runStorageBackup mirroring", () => {
  it("mirrors every object into backups/{env}/storage/{bucket}/{path}", async () => {
    createClientMock.mockReturnValue(
      makeClient({ public: { "a.png": "AAA", "b.png": "BBBB" } }) as never,
    );
    const out = await runStorageBackup(true, creds, true, "production");
    expect(out.status).toBe("success");
    expect(out.bucketsProcessed).toBe(1);
    expect(out.objectsBackedUp).toBe(2);
    expect(out.bytesBackedUp).toBe(3 + 4);

    const names = uploadBufferMock.mock.calls.map(
      (c) => (c[0] as { objectName: string }).objectName,
    );
    expect(names).toContain("backups/production/storage/public/a.png");
    expect(names).toContain("backups/production/storage/public/b.png");

    // Buffers carry the right bytes + content type + source metadata.
    const callA = uploadBufferMock.mock.calls.find(
      (c) => (c[0] as { objectName: string }).objectName.endsWith("a.png"),
    )![0] as {
      buffer: Buffer;
      contentType: string;
      metadata: Record<string, string>;
    };
    expect(callA.buffer.toString()).toBe("AAA");
    expect(callA.contentType).toBe("application/octet-stream");
    expect(callA.metadata.sourceBucket).toBe("public");
    expect(callA.metadata.sourcePath).toBe("a.png");
  });

  it("returns failed when listBuckets errors", async () => {
    createClientMock.mockReturnValue({
      storage: {
        listBuckets: vi.fn(async () => ({
          data: null,
          error: { message: "permission denied" },
        })),
      },
    } as never);
    const out = await runStorageBackup(true, creds, true, "production");
    expect(out.status).toBe("failed");
    expect(out.errors.join(" ")).toContain("permission denied");
  });

  it("returns failed when an object download fails", async () => {
    createClientMock.mockReturnValue(
      makeClient({ public: { "missing.png": "" } }) as never,
    );
    // Force the download to fail by removing the object server-side.
    const client = makeClient({ public: {} });
    client.storage.from = () => ({
      list: vi.fn(async () => ({
        data: [
          {
            name: "x.png",
            id: "id-x",
            metadata: { size: 1, mimetype: "image/png" },
          },
        ],
        error: null,
      })),
      download: vi.fn(async () => ({ data: null, error: { message: "gone" } })),
    });
    createClientMock.mockReturnValue(client as never);

    const out = await runStorageBackup(true, creds, true, "production");
    expect(out.status).toBe("failed");
    expect(out.objectsBackedUp).toBe(0);
    expect(uploadBufferMock).not.toHaveBeenCalled();
  });
});
