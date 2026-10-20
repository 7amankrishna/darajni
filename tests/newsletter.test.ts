import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert, rateLimit, client } = vi.hoisted(() => ({
  upsert: vi.fn(),
  rateLimit: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/security/rate-limit")>(),
  rateLimitRequest: rateLimit,
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: client }));
import { POST } from "@/app/api/newsletter/route";

function request(body: unknown, origin = "https://www.darajni.in") {
  return new Request("https://www.darajni.in/api/newsletter", {
    method: "POST",
    headers: { origin, host: "www.darajni.in", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  rateLimit.mockResolvedValue({ success: true });
  upsert.mockResolvedValue({ error: null });
  client.mockReturnValue({ from: () => ({ upsert }) });
});

describe("newsletter subscriptions", () => {
  it("rejects cross-origin requests before touching storage", async () => {
    expect((await POST(request({ email: "a@example.com", consent: true }, "https://other.example"))).status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });
  it.each([{ email: "bad", consent: true }, { email: "a@example.com", consent: false }, { email: "a@example.com" }])("requires a valid email and explicit consent", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("normalises email and accepts duplicate requests without disclosing membership", async () => {
    expect((await POST(request({ email: " A@Example.com ", consent: true }))).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      { email: "a@example.com", consented_at: expect.any(String) },
      { onConflict: "email", ignoreDuplicates: true },
    );
  });
  it("does not claim success when storage is unavailable", async () => {
    client.mockReturnValue(null);
    expect((await POST(request({ email: "a@example.com", consent: true }))).status).toBe(503);
  });
  it("enforces rate limits", async () => {
    rateLimit.mockResolvedValue({ success: false, limit: 3, remaining: 0, retryAfter: 60 });
    expect((await POST(request({ email: "a@example.com", consent: true }))).status).toBe(429);
    expect(upsert).not.toHaveBeenCalled();
  });
});
