import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isAllowedOrderTransition,
  orderStatusSchema,
} from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;

  const parsed = orderStatusSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Order management is temporarily unavailable.", 503);
  }

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("status, payment_method, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (readError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.payment_method !== "cod" && order.payment_status !== "paid") {
    return NextResponse.json(
      { error: "An online order can be processed only after payment is verified." },
      { status: 409 },
    );
  }
  if (
    order.status !== parsed.data.currentStatus ||
    !isAllowedOrderTransition(order.status, parsed.data.status)
  ) {
    return NextResponse.json(
      { error: "This order changed or the requested transition is not allowed." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .eq("status", parsed.data.currentStatus);
  if (error) {
    return internalApiError(
      "admin-order-status-update",
      error,
      "The order status could not be updated.",
      409,
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${id}/invoice`);
  revalidatePath(`/admin/orders/${id}/packing-slip`);
  return NextResponse.json({ status: parsed.data.status });
}
