import { NextResponse } from "next/server";

import { apiError, rateLimitError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { getDeliveryEstimateForPincode } from "@/lib/shiprocket";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Reuses the tracking policy: a storefront visitor only needs a handful of
  // pincode checks per session, and the estimate itself is cached for a day.
  const limit = await rateLimitRequest(request, RATE_LIMITS.tracking);
  if (!limit.success) return rateLimitError(limit);

  const url = new URL(request.url);
  const pincode = (url.searchParams.get("pincode") || "").trim();

  if (!/^\d{6}$/.test(pincode)) {
    return apiError("Enter a valid 6-digit pincode.", 400);
  }

  const estimate = await getDeliveryEstimateForPincode(pincode);

  if (estimate.status === "unavailable") {
    return apiError("Delivery estimates are temporarily unavailable.", 503);
  }

  const response = NextResponse.json({ estimate });
  // Verdicts change as couriers update lanes; never let the browser cache one.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
