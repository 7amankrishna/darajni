import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isAllowedOrderTransition,
  orderStatusSchema,
} from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const parsed = orderStatusSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
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
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${id}/invoice`);
  revalidatePath(`/admin/orders/${id}/packing-slip`);
  return NextResponse.json({ status: parsed.data.status });
}
