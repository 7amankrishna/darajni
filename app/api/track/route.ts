import { NextResponse } from "next/server";

import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { trackingSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("Forbidden.", 403);
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.tracking);
  if (!limit.success) return rateLimitError(limit);

  const parsed = trackingSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid tracking details." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Tracking is temporarily unavailable.", 503);
  }

  const { data, error } = await supabase.rpc("track_order", {
    p_order_reference: parsed.data.orderReference,
    p_phone: parsed.data.phone,
  });
  if (error) {
    return internalApiError(
      "order-tracking",
      error,
      "Tracking is temporarily unavailable.",
      503,
    );
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return NextResponse.json(
      { error: "No order matched that order ID and phone number." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    order: {
      orderId: row.order_id,
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}
