import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
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
  if (message.includes("duplicate key")) {
    return "A coupon or voucher with this code already exists.";
  }
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;

  const parsed = promoInputSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid promo code." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Promotion management is temporarily unavailable.", 503);
  }

  const { error } = await supabase
    .from("promo_codes")
    .update(promoPayload(parsed.data))
    .eq("id", id);

  if (error) {
    const friendly = friendlyPromoAdminError(error.message);
    return friendly
      ? apiError(friendly, 409)
      : internalApiError(
          "admin-promo-update",
          error,
          "The coupon or voucher could not be updated.",
          409,
        );
  }

  revalidatePath("/admin");
  revalidatePath("/checkout");
  return NextResponse.json({ updated: true });
}

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
    return apiError("Promotion management is temporarily unavailable.", 503);
  }

  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return internalApiError(
      "admin-promo-deactivate",
      error,
      "The coupon or voucher could not be deactivated.",
      409,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/checkout");
  return NextResponse.json({ deactivated: true });
}
