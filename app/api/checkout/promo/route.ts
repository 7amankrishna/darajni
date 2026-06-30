import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { checkoutPromoSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

interface PromoQuoteRow {
  promo_code_id: string;
  code: string;
  code_type: "coupon" | "voucher";
  discount_type: "percentage" | "fixed_amount";
  discount_amount: number;
  discounted_subtotal: number;
  message: string;
}

function friendlyPromoError(message: string) {
  const knownMessages = [
    "Enter a coupon or voucher code",
    "Coupon or voucher",
    "coupon or voucher",
    "Cart subtotal is below",
    "This phone number has already used this code",
    "A cart product is no longer available",
    "Choose a valid size",
    "Cart must contain",
    "Item quantity must be",
  ];
  return knownMessages.some((known) => message.includes(known))
    ? message
    : "This coupon or voucher could not be applied.";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const parsed = checkoutPromoSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid promo details." },
      { status: 400 },
    );
  }

  const limit = await rateLimit({
    key: `checkout-promo:${getClientIp(request)}`,
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many coupon checks. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Coupon and voucher checks are not configured." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("quote_checkout_discount", {
    p_promo_code: parsed.data.promoCode,
    p_phone: parsed.data.phone || null,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      size: item.size,
      quantity: item.quantity,
    })),
  });

  if (error) {
    return NextResponse.json(
      { error: friendlyPromoError(error.message) },
      { status: 409 },
    );
  }

  const quote = (Array.isArray(data) ? data[0] : data) as
    | PromoQuoteRow
    | undefined;
  if (!quote) {
    return NextResponse.json(
      { error: "This coupon or voucher could not be applied." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    promoCodeId: quote.promo_code_id,
    code: quote.code,
    codeType: quote.code_type,
    discountType: quote.discount_type,
    discountAmount: Number(quote.discount_amount),
    discountedSubtotal: Number(quote.discounted_subtotal),
    message: quote.message,
  });
}
