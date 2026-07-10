import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getRazorpayWebhookSecret } from "@/lib/config/server-env";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.paymentWebhook);
  if (!limit.success) return rateLimitError(limit);

  const secret = getRazorpayWebhookSecret();
  const signature = request.headers.get("x-razorpay-signature");
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return apiError("Invalid webhook signature.", 401);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }
  const expected = createHmac("sha256", secret).update(body).digest();
  const actualBuffer = Buffer.from(signature, "hex");
  if (
    actualBuffer.length !== expected.length ||
    !timingSafeEqual(actualBuffer, expected)
  ) {
    return apiError("Invalid webhook signature.", 401);
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return apiError("Invalid webhook payload.", 400);
  }
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
    return apiError("Webhook processing is temporarily unavailable.", 503);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (orderError) {
    return internalApiError(
      "razorpay-webhook-order-read",
      orderError,
      "Webhook processing failed.",
      503,
    );
  }
  if (!order || order.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  const { error } = await supabase.rpc("confirm_razorpay_payment", {
    p_order_id: order.id,
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId,
  });
  if (error) {
    return internalApiError(
      "razorpay-webhook-confirm",
      error,
      "Confirmation failed.",
      409,
    );
  }

  return NextResponse.json({ received: true });
}
