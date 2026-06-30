import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { promoInputSchema } from "@/lib/validation/admin";

type PromoInput = z.infer<typeof promoInputSchema>;

function promoPayload(value: PromoInput) {
  return {
    code: value.code,
    title: value.title,
    description: value.description || null,
    code_type: value.codeType,
    discount_type: value.discountType,
    discount_value: value.discountValue,
    minimum_subtotal: value.minimumSubtotal,
    maximum_discount: value.maximumDiscount ?? null,
    usage_limit: value.usageLimit ?? null,
    per_phone_limit: value.perPhoneLimit,
    starts_at: value.startsAt ?? null,
    ends_at: value.endsAt ?? null,
    is_active: value.isActive,
  };
}

function friendlyPromoAdminError(message: string) {
  if (message.includes("promo_codes")) {
    return "Run the Stage 5 SQL migration before managing coupons and vouchers.";
  }
  if (message.includes("duplicate key")) {
    return "A coupon or voucher with this code already exists.";
  }
  return message;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request) || !(await requireAdminApi())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const parsed = promoInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid promo code." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { error } = await supabase
    .from("promo_codes")
    .insert(promoPayload(parsed.data));

  if (error) {
    return NextResponse.json(
      { error: friendlyPromoAdminError(error.message) },
      { status: 409 },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/checkout");
  return NextResponse.json({ created: true });
}
