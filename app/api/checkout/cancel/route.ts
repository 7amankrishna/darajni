import { NextResponse } from "next/server";

import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { cancellationSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const parsed = cancellationSchema.safeParse(
    await request.json().catch(() => null),
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
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
  }

  const { error } = await supabase.rpc("cancel_order_reservation", {
    p_order_id: payload.orderId,
    p_payment_failed: parsed.data.paymentFailed,
  });

  if (error) {
    return NextResponse.json({ error: "The reservation could not be cancelled." }, { status: 409 });
  }
  return NextResponse.json({ cancelled: true });
}
