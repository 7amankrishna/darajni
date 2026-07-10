import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getCronSecret } from "@/lib/config/server-env";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.maintenance);
  if (!limit.success) return rateLimitError(limit);

  const cronSecret = getCronSecret();
  const authorization = request.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${cronSecret || ""}`);
  const supplied = Buffer.from(authorization || "");
  if (
    !cronSecret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return apiError("Unauthorized.", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Maintenance is temporarily unavailable.", 503);
  }

  const { data, error } = await supabase.rpc("run_store_maintenance");
  if (error) {
    return internalApiError(
      "store-maintenance",
      error,
      "Maintenance failed.",
      500,
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    archivedOrders: Number(result?.archived_orders ?? 0),
    deletedArchives: Number(result?.deleted_archives ?? 0),
    cancelledExpiredRazorpay: Number(result?.cancelled_expired_razorpay ?? 0),
  });
}
