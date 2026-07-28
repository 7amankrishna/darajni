import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock firebase-admin app + storage and the env getters.
vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(() => ({})),
  cert: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: vi.fn(),
}));

vi.mock("@/lib/backup/env", () => ({
  getFirebaseServiceAccount: vi.fn(() => ({
    projectId: "p",
    clientEmail: "sa@p.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
  })),
  getFirebaseStorageBucket: vi.fn(() => "bucket.appspot.com"),
}));

vi.mock("node:fs", () => ({
  statSync: vi.fn(() => ({ size: 100 })),
}));

import { getStorage } from "firebase-admin/storage";
import { statSync } from "node:fs";
import {
  uploadEncryptedArchive,
  uploadJson,
  downloadAsText,
  listObjects,
  deleteObject,
  objectExists,
} from "@/lib/backup/firebase-storage";

const getStorageMock = vi.mocked(getStorage);
const statSyncMock = vi.mocked(statSync);

// Build a fake bucket whose file() and methods we can interrogate.
function makeBucket() {
  const fileObj = {
    save: vi.fn(async () => {}),
    download: vi.fn(async () => [Buffer.from("hello")] as never),
    delete: vi.fn(async () => {}),
    exists: vi.fn(async () => [true] as never),
    getMetadata: vi.fn(async () => [{ size: 100, generation: "7" }] as never),
    name: "obj",
    metadata: {},
  };
  const bucket = {
    upload: vi.fn(async () => [fileObj] as never),
    file: vi.fn(() => fileObj),
    getFiles: vi.fn(async () => [[]] as never),
  };
  return { bucket, fileObj };
}

let bucket: ReturnType<typeof makeBucket>["bucket"];
let fileObj: ReturnType<typeof makeBucket>["fileObj"];

beforeEach(() => {
  vi.clearAllMocks();
  const made = makeBucket();
  bucket = made.bucket;
  fileObj = made.fileObj;
  getStorageMock.mockReturnValue({ bucket: () => bucket } as never);
  statSyncMock.mockReturnValue({ size: 100 } as never);
});

describe("uploadEncryptedArchive", () => {
  it("uploads resumable and verifies the remote size matches the local size", async () => {
    fileObj.getMetadata.mockResolvedValue([
      { size: 100, generation: "7" },
    ] as never);
    const res = await uploadEncryptedArchive({
      localPath: "/tmp/x.enc",
      objectName: "backups/production/x.enc",
      contentType: "application/octet-stream",
      metadata: { backupId: "id" },
    });
    expect(bucket.upload).toHaveBeenCalledWith(
      "/tmp/x.enc",
      expect.objectContaining({
        destination: "backups/production/x.enc",
        resumable: true,
      }),
    );
    expect(res.size).toBe(100);
    expect(res.generation).toBe("7");
  });

  it("throws when the remote size does not match the local size", async () => {
    fileObj.getMetadata.mockResolvedValue([{ size: 50 }] as never);
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
    fileObj.getMetadata.mockResolvedValue([{ size: 100 }] as never);
    bucket.upload
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce([fileObj] as never);
    await expect(
      uploadEncryptedArchive({
        localPath: "/tmp/x.enc",
        objectName: "o",
        contentType: "application/octet-stream",
        metadata: {},
      }),
    ).resolves.toBeTruthy();
    expect(bucket.upload).toHaveBeenCalledTimes(2);
  }, 15000);
});

describe("uploadJson", () => {
  it("saves the JSON string with an application/json content type", async () => {
    await uploadJson("o.manifest.json", "{\"a\":1}", { backupId: "id" });
    expect(fileObj.save).toHaveBeenCalledWith(
      Buffer.from("{\"a\":1}", "utf8"),
      expect.objectContaining({ contentType: "application/json" }),
    );
  });
});

describe("downloadAsText", () => {
  it("returns the object contents as utf8", async () => {
    fileObj.download.mockResolvedValue([Buffer.from("hello")] as never);
    await expect(downloadAsText("o")).resolves.toBe("hello");
  });
});

describe("listObjects", () => {
  it("maps files to ListedObject with parsed size and metadata", async () => {
    bucket.getFiles.mockResolvedValue([
      [
        {
          name: "backups/production/a.dump.enc",
          metadata: { size: "42", updated: "u", metadata: { k: "v" } },
        },
      ],
    ] as never);
    const out = await listObjects("backups/production/");
    expect(bucket.getFiles).toHaveBeenCalledWith({
      prefix: "backups/production/",
    });
    expect(out).toEqual([
      {
        name: "backups/production/a.dump.enc",
        size: 42,
        updated: "u",
        customMetadata: { k: "v" },
      },
    ]);
  });
});

describe("deleteObject / objectExists", () => {
  it("deletes the named object", async () => {
    await deleteObject("o");
    expect(bucket.file).toHaveBeenCalledWith("o");
    expect(fileObj.delete).toHaveBeenCalled();
  });

  it("reports existence", async () => {
    fileObj.exists.mockResolvedValue([true] as never);
    await expect(objectExists("o")).resolves.toBe(true);
  });
});
