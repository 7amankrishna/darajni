import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { measurementStatusSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(request, RATE_LIMITS.adminMutation);
  if (authorization.response) return authorization.response;

  const parsed = measurementStatusSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid measurement status." },
      { status: 400 },
    );
  }

  const { id: orderId } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return apiError("Order management is temporarily unavailable.", 503);

  const { data, error } = await supabase
    .from("order_items")
    .update({ measurement_status: parsed.data.status })
    .eq("id", parsed.data.itemId)
    .eq("order_id", orderId)
    .not("measurements", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return internalApiError(
      "admin-measurement-status",
      error,
      "The measurement review could not be updated.",
      500,
    );
  }
  if (!data) return apiError("Order item measurements were not found.", 404);
  return NextResponse.json({ updated: true, status: parsed.data.status });
}
