// Distributed backup lock to prevent simultaneous backup jobs.
//
// When Upstash Redis REST is configured (UPSTASH_REDIS_REST_URL/TOKEN, the same
// credentials the rate limiter uses), the lock is distributed across instances
// via `SET key token NX EX ttl` to acquire and a Lua `EVAL` compare-and-delete
// to release (so only the token holder can release). When Upstash is not
// configured or a call fails, a per-instance in-memory lock on `globalThis` is
// used as a fallback — this prevents overlapping runs within one process but is
// not cross-instance, which is acceptable for a daily cron that fires once.
//
// Key prefix `darajni:` mirrors the rate limiter. No secret values are logged.

import { randomBytes } from "node:crypto";

const KEY_PREFIX = "darajni:backup:lock:";

interface MemoryLock {
  token: string;
  expiresAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __darajniBackupLocks?: Map<string, MemoryLock>;
};
const memoryStore =
  globalStore.__darajniBackupLocks ??
  (globalStore.__darajniBackupLocks = new Map<string, MemoryLock>());

interface UpstashEnv {
  url: string;
  token: string;
}

function getUpstash(): UpstashEnv | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export interface LockAcquireInput {
  env: string;
  /** How long to hold the lock, in milliseconds. */
  ttlMs: number;
}

export interface LockAcquireResult {
  acquired: boolean;
  /** The token needed to release the lock, or null when not acquired. */
  token: string | null;
}

export interface LockReleaseInput {
  env: string;
  token: string;
}

function lockKey(env: string): string {
  return `${KEY_PREFIX}${env}`;
}

async function upstashAcquire(key: string, token: string, ttlSeconds: number): Promise<boolean | null> {
  const upstash = getUpstash();
  if (!upstash) return null;
  try {
    const response = await fetch(`${upstash.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstash.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["SET", key, token, "NX", "EX", String(ttlSeconds)]]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as Array<{ result?: string | null }>;
    return result[0]?.result === "OK";
  } catch {
    return null;
  }
}

const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function upstashRelease(key: string, token: string): Promise<boolean | null> {
  const upstash = getUpstash();
  if (!upstash) return null;
  try {
    const response = await fetch(`${upstash.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstash.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["EVAL", RELEASE_SCRIPT, "1", key, token]]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as Array<{ result?: number }>;
    return Number(result[0]?.result ?? 0) === 1;
  } catch {
    return null;
  }
}

function memoryAcquire(key: string, token: string, ttlMs: number, now: number): boolean {
  const existing = memoryStore.get(key);
  if (existing && existing.expiresAt > now) return false;
  memoryStore.set(key, { token, expiresAt: now + ttlMs });
  return true;
}

function memoryRelease(key: string, token: string, now: number): boolean {
  const existing = memoryStore.get(key);
  if (!existing || existing.token !== token) return false;
  memoryStore.delete(key);
  return true;
}

/** Attempt to acquire the backup lock for an environment. */
export async function acquireBackupLock(input: LockAcquireInput): Promise<LockAcquireResult> {
  const key = lockKey(input.env);
  const token = randomBytes(16).toString("hex");
  const ttlSeconds = Math.max(1, Math.ceil(input.ttlMs / 1000));
  const now = Date.now();

  const upstash = await upstashAcquire(key, token, ttlSeconds);
  if (upstash !== null) {
    return upstash ? { acquired: true, token } : { acquired: false, token: null };
  }

  const acquired = memoryAcquire(key, token, input.ttlMs, now);
  return acquired ? { acquired: true, token } : { acquired: false, token: null };
}

/** Release the backup lock. Only the token holder can release. */
export async function releaseBackupLock(input: LockReleaseInput): Promise<boolean> {
  const key = lockKey(input.env);
  const now = Date.now();
  const upstash = await upstashRelease(key, input.token);
  if (upstash !== null) return upstash;
  return memoryRelease(key, input.token, now);
}
