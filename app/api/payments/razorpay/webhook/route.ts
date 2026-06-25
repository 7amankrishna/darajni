import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 401 });
  }

  const body = await request.text();
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: { id?: string; order_id?: string };
      };
    };
  };
  if (!["payment.captured", "order.paid"].includes(event.event || "")) {
    return NextResponse.json({ received: true });
  }

  const razorpayOrderId = event.payload?.payment?.entity?.order_id;
  const razorpayPaymentId = event.payload?.payment?.entity?.id;
  if (!razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (!order || order.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  const { error } = await supabase.rpc("confirm_razorpay_payment", {
    p_order_id: order.id,
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId,
  });
  if (error) {
    console.error("Webhook payment confirmation failed", error.message);
    return NextResponse.json({ error: "Confirmation failed." }, { status: 409 });
  }

  return NextResponse.json({ received: true });
}
