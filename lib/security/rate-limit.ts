import "server-only";

import { createHash } from "node:crypto";

import { getUpstashEnvironment } from "@/lib/config/server-env";
import { getClientIp } from "@/lib/security/request";

export interface RateLimitOptions {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitPolicy {
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  windowSeconds: number;
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

const MAX_MEMORY_ENTRIES = 10_000;

export const RATE_LIMITS = {
  accountProfile: { scope: "account-profile", limit: 20, windowSeconds: 15 * 60 },
  adminRead: { scope: "admin-read", limit: 120, windowSeconds: 15 * 60 },
  adminMutation: { scope: "admin-mutation", limit: 60, windowSeconds: 15 * 60 },
  adminUpload: { scope: "admin-upload", limit: 20, windowSeconds: 15 * 60 },
  adminBackupRun: { scope: "admin-backup-run", limit: 4, windowSeconds: 60 * 60 },
  adminRestoreRun: { scope: "admin-restore-run", limit: 3, windowSeconds: 60 * 60 },
  backup: { scope: "backup", limit: 6, windowSeconds: 60 * 60 },
  checkout: { scope: "checkout", limit: 5, windowSeconds: 15 * 60 },
  checkoutCancel: { scope: "checkout-cancel", limit: 20, windowSeconds: 15 * 60 },
  checkoutPromo: { scope: "checkout-promo", limit: 20, windowSeconds: 15 * 60 },
  maintenance: { scope: "maintenance", limit: 10, windowSeconds: 60 * 60 },
  paymentVerify: { scope: "payment-verify", limit: 10, windowSeconds: 15 * 60 },
  productReview: { scope: "product-review", limit: 8, windowSeconds: 15 * 60 },
  paymentWebhook: { scope: "payment-webhook", limit: 300, windowSeconds: 60 },
  requestedDressUpload: { scope: "requested-dress-upload", limit: 3, windowSeconds: 60 * 60 },
  shiprocketWebhook: { scope: "shiprocket-webhook", limit: 300, windowSeconds: 60 },
  tracking: { scope: "tracking", limit: 12, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimitPolicy>;

function rateLimitKey(scope: string, identifier: string) {
  const digest = createHash("sha256").update(identifier).digest("hex").slice(0, 32);
  return `darajni:rate-limit:${scope}:${digest}`;
}

async function upstashRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult | null> {
  const environment = getUpstashEnvironment();
  if (!environment) return null;

  try {
    const response = await fetch(`${environment.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds, "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;

    const result = (await response.json()) as Array<{ result?: number }>;
    const count = Number(result[0]?.result ?? 0);
    if (!Number.isFinite(count) || count < 1) return null;
    return {
      success: count <= limit,
      limit,
      windowSeconds,
      remaining: Math.max(0, limit - count),
      retryAfter: windowSeconds,
    };
  } catch (error) {
    console.error(
      "Managed rate limit failed",
      error instanceof Error ? error.message.slice(0, 300) : "Unknown error",
    );
    return null;
  }
}

export async function rateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const managed = await upstashRateLimit(options);
  if (managed) return managed;

  const now = Date.now();
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    for (const [key, value] of memoryStore) {
      if (value.resetAt <= now) memoryStore.delete(key);
    }
    while (memoryStore.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = memoryStore.keys().next().value as string | undefined;
      if (!oldestKey) break;
      memoryStore.delete(oldestKey);
    }
  }
  const existing = memoryStore.get(options.key);
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowSeconds * 1000 }
      : existing;
  entry.count += 1;
  memoryStore.set(options.key, entry);

  return {
    success: entry.count <= options.limit,
    limit: options.limit,
    windowSeconds: options.windowSeconds,
    remaining: Math.max(0, options.limit - entry.count),
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function rateLimitRequest(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string,
) {
  return rateLimit({
    ...policy,
    key: rateLimitKey(policy.scope, subject || getClientIp(request)),
  });
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.retryAfter),
    "RateLimit-Policy": `${result.limit};w=${result.windowSeconds}`,
    ...(result.success ? {} : { "Retry-After": String(result.retryAfter) }),
  };
}
