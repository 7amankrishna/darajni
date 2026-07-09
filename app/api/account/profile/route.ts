import { NextResponse } from "next/server";

import { getCustomerUser, saveCustomerProfile } from "@/lib/data/account";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { customerProfileSchema } from "@/lib/validation/account";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getCustomerUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to update your details." }, { status: 401 });
  }

  const limit = await rateLimit({
    key: `account-profile:${user.id}:${getClientIp(request)}`,
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many profile updates. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = customerProfileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid profile details." },
      { status: 400 },
    );
  }

  const profile = await saveCustomerProfile(user, parsed.data);
  if (!profile) {
    return NextResponse.json(
      { error: "Your details could not be saved right now." },
      { status: 503 },
    );
  }

  return NextResponse.json({ profile });
}
