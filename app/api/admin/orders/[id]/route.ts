import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Permanently remove an order only after it has been cancelled. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;

  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Order management is temporarily unavailable.", 503);
  }

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled orders can be permanently deleted." },
      { status: 409 },
    );
  }

  // order_items and Shiprocket sync records reference orders with ON DELETE
  // CASCADE. Promo redemptions were released when the order was cancelled.
  const { error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .eq("status", "cancelled");
  if (deleteError) {
    return internalApiError(
      "admin-order-delete",
      deleteError,
      "The cancelled order could not be deleted.",
      409,
    );
  }

  revalidatePath("/admin");
  return NextResponse.json({ deleted: true });
}
