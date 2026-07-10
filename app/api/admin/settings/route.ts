import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { settingsInputSchema } from "@/lib/validation/admin";

export async function PUT(request: Request) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;
  const parsed = settingsInputSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings." },
      { status: 400 },
    );
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Store settings are temporarily unavailable.", 503);
  }
  const value = parsed.data;
  const { error } = await supabase
    .from("settings")
    .update({
      shipping_charge: value.shippingCharge,
      cod_enabled: value.codEnabled,
      tax_rate: value.taxRate,
      developer_support_number: value.developerSupportNumber,
      designer_support_number: value.designerSupportNumber,
    })
    .eq("id", true);
  if (error) {
    return internalApiError(
      "admin-settings-update",
      error,
      "Store settings could not be updated.",
      409,
    );
  }

  revalidateTag("settings");
  revalidatePath("/admin");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/support");
  return NextResponse.json({ updated: true });
}
