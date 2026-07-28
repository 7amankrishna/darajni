import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acquireBackupLock, releaseBackupLock } from "@/lib/backup/lock";

const UP_URL = "https://upstash.example.com";
const UP_TOKEN = "upstash-token";

function clearUpstash() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

function setUpstash() {
  process.env.UPSTASH_REDIS_REST_URL = UP_URL;
  process.env.UPSTASH_REDIS_REST_TOKEN = UP_TOKEN;
}

function clearMemoryStore() {
  const g = globalThis as typeof globalThis & {
    __darajniBackupLocks?: Map<string, unknown>;
  };
  g.__darajniBackupLocks?.clear();
}

function fetchOk(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  clearUpstash();
  clearMemoryStore();
});

afterEach(() => {
  clearUpstash();
  clearMemoryStore();
  vi.unstubAllGlobals();
});

describe("in-memory fallback (Upstash not configured)", () => {
  it("acquires then blocks a second acquire, and release frees it", async () => {
    const a = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
    expect(a.token).toBeTruthy();

    const b = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(b.acquired).toBe(false);
    expect(b.token).toBeNull();

    const released = await releaseBackupLock({
      env: "production",
      token: a.token!,
    });
    expect(released).toBe(true);

    const c = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(c.acquired).toBe(true);
  });

  it("does not release with the wrong token", async () => {
    const a = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
    const released = await releaseBackupLock({
      env: "production",
      token: "not-the-token",
    });
    expect(released).toBe(false);
  });

  it("scopes locks by environment", async () => {
    const a = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
    const b = await acquireBackupLock({ env: "staging", ttlMs: 60_000 });
    expect(b.acquired).toBe(true);
  });

  it("allows re-acquire after the TTL has expired", async () => {
    const a = await acquireBackupLock({ env: "production", ttlMs: 5 });
    expect(a.acquired).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    const b = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(b.acquired).toBe(true);
  });
});

describe("Upstash distributed lock", () => {
  it("sends SET NX EX on acquire and reports acquired on OK", async () => {
    setUpstash();
    const fetchMock = vi.fn(async () => fetchOk([{ result: "OK" }]));
    vi.stubGlobal("fetch", fetchMock);

    const res = await acquireBackupLock({ env: "production", ttlMs: 61_000 });
    expect(res.acquired).toBe(true);
    expect(res.token).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe(`${UP_URL}/pipeline`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${UP_TOKEN}`);
    const body = JSON.parse(init.body) as string[][];
    expect(body[0][0]).toBe("SET");
    expect(body[0][1]).toBe("darajni:backup:lock:production");
    expect(body[0][2]).toBe(res.token);
    expect(body[0]).toContain("NX");
    expect(body[0]).toContain("EX");
    // ttlSeconds = ceil(61000/1000) = 61
    expect(body[0][body[0].length - 1]).toBe("61");
  });

  it("reports not acquired when SET returns null (lock held)", async () => {
    setUpstash();
    vi.stubGlobal("fetch", vi.fn(async () => fetchOk([{ result: null }])));
    const res = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(res.acquired).toBe(false);
    expect(res.token).toBeNull();
  });

  it("sends EVAL compare-and-delete on release and maps 1/0 to true/false", async () => {
    setUpstash();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fetchOk([{ result: 1 }]))
      .mockResolvedValueOnce(fetchOk([{ result: 0 }]));
    vi.stubGlobal("fetch", fetchMock);

    const ok = await releaseBackupLock({ env: "production", token: "tok" });
    expect(ok).toBe(true);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body,
    ) as string[][];
    expect(body[0][0]).toBe("EVAL");
    expect(body[0]).toContain("darajni:backup:lock:production");
    expect(body[0]).toContain("tok");

    const no = await releaseBackupLock({ env: "production", token: "tok" });
    expect(no).toBe(false);
  });

  it("falls back to memory when the Upstash call fails", async () => {
    setUpstash();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const a = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
    const b = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(b.acquired).toBe(false); // memory fallback held the lock
  });

  it("falls back to memory when Upstash returns a non-OK status", async () => {
    setUpstash();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => [] }) as Response),
    );
    const a = await acquireBackupLock({ env: "production", ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
  });
});
