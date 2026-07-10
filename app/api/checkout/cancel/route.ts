import { NextResponse } from "next/server";

import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { cancellationSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("Forbidden.", 403);
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.checkoutCancel);
  if (!limit.success) return rateLimitError(limit);

  const parsed = cancellationSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 });
  }

  const payload = verifyOrderAccessToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json({ error: "This order link has expired." }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Checkout is temporarily unavailable.", 503);
  }

  const { error } = await supabase.rpc("cancel_order_reservation", {
    p_order_id: payload.orderId,
    p_payment_failed: parsed.data.paymentFailed,
  });

  if (error) {
    return internalApiError(
      "checkout-reservation-cancel",
      error,
      "The reservation could not be cancelled.",
      409,
    );
  }
  return NextResponse.json({ cancelled: true });
}
