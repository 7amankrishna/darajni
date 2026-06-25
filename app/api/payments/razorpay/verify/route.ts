import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { razorpayVerificationSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await rateLimit({
    key: `payment-verify:${getClientIp(request)}`,
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many verification attempts." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = razorpayVerificationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }

  const payload = verifyOrderAccessToken(parsed.data.token);
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!payload || !secret) {
    return NextResponse.json({ error: "Payment verification is unavailable." }, { status: 401 });
  }

  const expected = createHmac("sha256", secret)
    .update(
      `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`,
    )
    .digest("hex");
  const actualBuffer = Buffer.from(parsed.data.razorpaySignature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
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
    console.error("Payment confirmation failed", error.message);
    return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 409 });
  }

  return NextResponse.json({
    successUrl: `/order/success?token=${encodeURIComponent(parsed.data.token)}`,
  });
}
