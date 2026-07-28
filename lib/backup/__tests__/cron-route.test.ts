import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock every server-side dependency of the cron route.
vi.mock("@/lib/config/server-env", () => ({
  getCronSecret: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  RATE_LIMITS: { backup: { limit: 5, windowMs: 60_000 } },
  rateLimitRequest: vi.fn(),
}));

vi.mock("@/lib/security/api-response", () => ({
  apiError: vi.fn((msg: string, status: number) =>
    Response.json({ error: msg }, { status }),
  ),
  internalApiError: vi.fn((_ctx: string, _e: unknown, msg: string, status: number) =>
    Response.json({ error: msg }, { status }),
  ),
  rateLimitError: vi.fn(() =>
    Response.json({ error: "Too many requests." }, { status: 429 }),
  ),
}));

vi.mock("@/lib/backup/orchestrator", () => ({
  runBackup: vi.fn(),
}));

vi.mock("@/lib/backup/firestore-status", () => ({
  getLatestBackupStatus: vi.fn(),
  getLatestSuccessfulBackupStatus: vi.fn(),
}));

vi.mock("@/lib/backup/env", () => ({
  getBackupEnv: vi.fn(() => "production"),
}));

import { GET } from "@/app/api/cron/backup/route";
import { getCronSecret } from "@/lib/config/server-env";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { runBackup } from "@/lib/backup/orchestrator";
import {
  getLatestBackupStatus,
  getLatestSuccessfulBackupStatus,
} from "@/lib/backup/firestore-status";

const getCronSecretMock = vi.mocked(getCronSecret);
const rateLimitMock = vi.mocked(rateLimitRequest);
const runBackupMock = vi.mocked(runBackup);
const latestMock = vi.mocked(getLatestBackupStatus);
const latestSuccessMock = vi.mocked(getLatestSuccessfulBackupStatus);

const SECRET = "a".repeat(40); // >= 32 chars

function request(auth?: string, url = "https://x.test/api/cron/backup"): Request {
  const headers = new Headers();
  if (auth) headers.set("authorization", auth);
  return new Request(url, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60_000,
  } as never);
  getCronSecretMock.mockReturnValue(SECRET);
  runBackupMock.mockResolvedValue({
    backupId: "id",
    status: "success",
    env: "production",
  } as never);
  latestMock.mockResolvedValue(null);
  latestSuccessMock.mockResolvedValue(null);
});

describe("cron backup route auth", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("returns 401 when the secret is wrong", async () => {
    const res = await GET(request(`Bearer ${"b".repeat(40)}`));
    expect(res.status).toBe(401);
    expect(runBackupMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no CRON_SECRET is configured", async () => {
    getCronSecretMock.mockReturnValue(null);
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the length differs (timing-safe guard)", async () => {
    const res = await GET(request(`Bearer ${SECRET}x`));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited, before auth", async () => {
    rateLimitMock.mockResolvedValue({ success: false } as never);
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(429);
    expect(runBackupMock).not.toHaveBeenCalled();
  });
});

describe("cron backup route run", () => {
  it("runs the backup on a valid Bearer token", async () => {
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(runBackupMock).toHaveBeenCalledWith({
      components: ["db", "storage", "retention"],
      dbDumpIfAvailable: true,
    });
    const body = await res.json();
    expect(body.status).toBe("success");
  });

  it("returns 500 when the backup throws", async () => {
    runBackupMock.mockRejectedValue(new Error("boom"));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
  });
});

describe("cron backup health view", () => {
  it("returns sanitized status without checksum or objectName", async () => {
    latestMock.mockResolvedValue({
      backupId: "id1",
      status: "success",
      env: "production",
      timestamp: "2026-07-15T02:00:00.000Z",
      timestampEpochMs: 1,
      encryptedSize: 123,
      checksum: "super-secret-checksum",
      checksumAlgorithm: "sha256",
      objectName: "backups/production/x.dump.enc",
      recordedAt: "2026-07-15T02:01:00.000Z",
    } as never);

    const res = await GET(
      request(`Bearer ${SECRET}`, "https://x.test/api/cron/backup?status=1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.env).toBe("production");
    expect(body.latestRun.backupId).toBe("id1");
    expect(body.latestRun.encryptedSize).toBe(123);
    // Must NOT leak checksum value or object path.
    expect(body.latestRun.checksum).toBeUndefined();
    expect(body.latestRun.objectName).toBeUndefined();
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("super-secret-checksum");
    expect(raw).not.toContain("backups/production/x.dump.enc");
    expect(runBackupMock).not.toHaveBeenCalled();
  });

  it("includes a truncated error only for failed runs", async () => {
    latestMock.mockResolvedValue({
      backupId: "id2",
      status: "failed",
      env: "production",
      timestamp: "t",
      timestampEpochMs: 1,
      error: "x".repeat(500),
      recordedAt: "r",
    } as never);
    const res = await GET(
      request(`Bearer ${SECRET}`, "https://x.test/api/cron/backup?status=1"),
    );
    const body = await res.json();
    expect(body.latestRun.error).toHaveLength(300);
  });

  it("returns nulls when no status records exist", async () => {
    const res = await GET(
      request(`Bearer ${SECRET}`, "https://x.test/api/cron/backup?status=1"),
    );
    const body = await res.json();
    expect(body.latestRun).toBeNull();
    expect(body.latestSuccessful).toBeNull();
  });
});
