import "server-only";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number;
}

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __darajniRateLimits?: Map<string, MemoryEntry>;
};
const memoryStore =
  globalStore.__darajniRateLimits ??
  (globalStore.__darajniRateLimits = new Map<string, MemoryEntry>());

async function upstashRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds, "NX"],
      ]),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const result = (await response.json()) as Array<{ result?: number }>;
    const count = Number(result[0]?.result ?? 0);
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: windowSeconds,
    };
  } catch (error) {
    console.error("Managed rate limit failed", error);
    return null;
  }
}

export async function rateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const managed = await upstashRateLimit(options);
  if (managed) return managed;

  const now = Date.now();
  const existing = memoryStore.get(options.key);
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowSeconds * 1000 }
      : existing;
  entry.count += 1;
  memoryStore.set(options.key, entry);

  return {
    success: entry.count <= options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}
