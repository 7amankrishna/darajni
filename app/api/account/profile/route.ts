import { NextResponse } from "next/server";

import { getCustomerUser, saveCustomerProfile } from "@/lib/data/account";
import { apiError, rateLimitError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { customerProfileSchema } from "@/lib/validation/account";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("Forbidden.", 403);
  }

  const user = await getCustomerUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to update your details." }, { status: 401 });
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.accountProfile, user.id);
  if (!limit.success) return rateLimitError(limit);

  const parsed = customerProfileSchema.safeParse(
    await readJsonBody(request),
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
