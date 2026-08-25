import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the env getters BEFORE importing the module under test (the bucket
// name is resolved at module load time).
vi.mock("@/lib/backup/env", () => ({
  getBackupDestinationCredentials: vi.fn(() => ({
    url: "https://x.supabase.co",
    serviceRoleKey: "service-key",
  })),
  getBackupBucket: vi.fn(() => "backups"),
}));

// In-memory fake of the Supabase Storage API surface used by the module.
const storageState = {
  buckets: [] as string[],
  objects: new Map<string, Buffer>(),
};

function makeFromMock() {
  return {
    upload: vi.fn(async (objectName: string, buffer: Buffer) => {
      if (storageState.objects.has(objectName)) {
        return { data: null, error: { message: "Duplicate" } };
      }
      storageState.objects.set(objectName, buffer);
      return { data: { path: objectName }, error: null };
    }),
    download: vi.fn(async (objectName: string) => {
      const bytes = storageState.objects.get(objectName);
      if (!bytes) return { data: null, error: { message: "Object not found" } };
      const copy = new Uint8Array(bytes);
      return {
        data: {
          size: copy.byteLength,
          arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
        },
        error: null,
      };
    }),
    list: vi.fn(async () => ({ data: [], error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
  };
}

type FromMock = ReturnType<typeof makeFromMock>;

const fromMock: FromMock = makeFromMock();

const storageClient = {
  storage: {
    listBuckets: vi.fn(async () => ({ data: storageState.buckets.map((name) => ({ name })), error: null })),
    createBucket: vi.fn(async (name: string) => {
      if (storageState.buckets.includes(name)) {
        return { data: null, error: { message: "The requested bucket already exists" } };
      }
      storageState.buckets.push(name);
      return { data: { name }, error: null };
    }),
    from: vi.fn(() => fromMock),
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => storageClient),
}));

vi.mock("node:fs", () => ({
  statSync: vi.fn(() => ({ size: 100 })),
}));

vi.mock("fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.alloc(100, 1)),
  writeFile: vi.fn(async () => {}),
}));

import { statSync } from "node:fs";
import {
  uploadEncryptedArchive,
  uploadJson,
  downloadAsText,
  deleteObject,
} from "@/lib/backup/firebase-storage";

const statSyncMock = vi.mocked(statSync);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the fake backend and the per-process bucket cache between tests.
  storageState.buckets.length = 0;
  storageState.objects.clear();
  Object.assign(fromMock, makeFromMock());
  statSyncMock.mockReturnValue({ size: 100 } as never);
});

describe("uploadEncryptedArchive", () => {
  it("creates the backup bucket once and uploads + verifies size", async () => {
    const payload = Buffer.alloc(100, 1);
    fromMock.upload.mockImplementation(async (_name: string, buffer: Buffer) => {
      storageState.objects.set(_name, buffer);
      return { data: { path: _name }, error: null };
    });
    fromMock.download.mockImplementation(async (objectName: string) => {
      const bytes = storageState.objects.get(objectName)!;
      const copy = new Uint8Array(bytes);
      return {
        data: {
          size: copy.byteLength,
          arrayBuffer: async () =>
            copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
        },
        error: null,
      };
    });

    await expect(
      uploadEncryptedArchive({
        localPath: "/tmp/x.enc",
        objectName: "backups/production/x.enc",
        contentType: "application/octet-stream",
        metadata: {},
      }),
    ).resolves.toEqual({
      objectName: "backups/production/x.enc",
      size: 100,
      generation: undefined,
    });

    expect(storageClient.storage.from).toHaveBeenCalledWith("backups");
    expect(storageClient.storage.createBucket).toHaveBeenCalledTimes(1);

    // A second operation must NOT try to create the bucket again.
    await uploadJson("o.manifest.json", "{}");
    expect(storageClient.storage.createBucket).toHaveBeenCalledTimes(1);
  });

  it("throws when the remote size does not match the local size", async () => {
    fromMock.upload.mockResolvedValue({ data: { path: "o" }, error: null });
    fromMock.download.mockImplementation(async () => {
      const bytes = new Uint8Array(50);
      return {
        data: {
          size: bytes.byteLength,
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        },
        error: null,
      };
    });
    statSyncMock.mockReturnValue({ size: 100 } as never);
    await expect(
      uploadEncryptedArchive({
        localPath: "/tmp/x.enc",
        objectName: "o",
        contentType: "application/octet-stream",
        metadata: {},
      }),
    ).rejects.toThrow(/integrity check failed/i);
  });

  it("retries a transient upload failure then succeeds", async () => {
    fromMock.upload
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ data: { path: "o" }, error: null });
    fromMock.download.mockImplementation(async (objectName: string) => ({
      data: { size: 100, arrayBuffer: async () => new ArrayBuffer(100) },
      error: null,
    }));
    await expect(
      uploadEncryptedArchive({
        localPath: "/tmp/x.enc",
        objectName: "o",
        contentType: "application/octet-stream",
        metadata: {},
      }),
    ).resolves.toBeTruthy();
    expect(fromMock.upload).toHaveBeenCalledTimes(2);
  }, 15000);
});

describe("uploadJson", () => {
  it("uploads the JSON string with an application/json content type", async () => {
    fromMock.upload.mockResolvedValue({ data: { path: "o" }, error: null });
    await uploadJson("o.manifest.json", "{\"a\":1}");
    expect(fromMock.upload).toHaveBeenCalledWith(
      "o.manifest.json",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "application/json" }),
    );
  });
});

describe("downloadAsText", () => {
  it("returns the object contents as utf8", async () => {
    const text = "hello manifest";
    fromMock.download.mockImplementation(async () => {
      const bytes = new Uint8Array(Buffer.from(text, "utf8"));
      return {
        data: {
          size: bytes.byteLength,
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        },
        error: null,
      };
    });
    await expect(downloadAsText("o")).resolves.toBe(text);
  });
});

describe("deleteObject", () => {
  it("deletes the named object", async () => {
    fromMock.remove.mockResolvedValue({ data: [], error: null });
    await deleteObject("backups/production/o.dump.enc");
    expect(fromMock.remove).toHaveBeenCalledWith(["backups/production/o.dump.enc"]);
  });
});
