import { NextResponse } from "next/server";

import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
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
  return knownMessages.some((known) => message.includes(known)) ? message : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("Forbidden.", 403);
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.checkoutPromo);
  if (!limit.success) return rateLimitError(limit);

  const parsed = checkoutPromoSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid promo details." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Coupon and voucher checks are temporarily unavailable.", 503);
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
    const friendly = friendlyPromoError(error.message);
    return friendly
      ? apiError(friendly, 409)
      : internalApiError(
          "checkout-promo-quote",
          error,
          "This coupon or voucher could not be applied.",
          409,
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
