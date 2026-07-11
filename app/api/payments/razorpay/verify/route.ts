import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";

import { getRazorpayKeySecret } from "@/lib/config/server-env";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { razorpayVerificationSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("Forbidden.", 403);
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.paymentVerify);
  if (!limit.success) return rateLimitError(limit);

  const parsed = razorpayVerificationSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }

  const payload = verifyOrderAccessToken(parsed.data.token);
  const secret = getRazorpayKeySecret();
  if (!payload || !secret) {
    return apiError("Payment verification is unavailable.", 401);
  }

  const expected = createHmac("sha256", secret)
    .update(
      `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`,
    )
    .digest();
  const actualBuffer = Buffer.from(parsed.data.razorpaySignature, "hex");
  if (
    actualBuffer.length !== expected.length ||
    !timingSafeEqual(actualBuffer, expected)
  ) {
    return NextResponse.json({ error: "Payment signature is invalid." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Payment verification is unavailable." }, { status: 503 });
  }

  const { error } = await supabase.rpc("confirm_razorpay_payment", {
    p_order_id: payload.orderId,
    p_razorpay_order_id: parsed.data.razorpayOrderId,
    p_razorpay_payment_id: parsed.data.razorpayPaymentId,
  });
  if (error) {
    return internalApiError(
      "razorpay-payment-confirm",
      error,
      "Payment could not be confirmed.",
      409,
    );
  }

  after(() => syncShiprocketOrder(payload.orderId));

  return NextResponse.json({
    successUrl: `/order/success?token=${encodeURIComponent(parsed.data.token)}`,
  });
}
