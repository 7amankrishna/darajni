import { NextResponse } from "next/server";
import { z } from "zod";

import { getStoreSettings } from "@/lib/data/catalog";
import { apiError, rateLimitError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";

const pincodeSchema = z.object({
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);
  const limit = await rateLimitRequest(request, RATE_LIMITS.checkout);
  if (!limit.success) return rateLimitError(limit);

  const parsed = pincodeSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return apiError("Enter a valid 6-digit Indian pincode.", 400);
  }

  const settings = await getStoreSettings();
  return NextResponse.json({
    pincode: parsed.data.pincode,
    serviceable: true,
    codEligible: settings.codEnabled,
    deliveryEstimate: "7–12 calendar days",
    message:
      "Pincode accepted for Pan-India delivery. Final courier reach is confirmed before dispatch.",
  });
}
