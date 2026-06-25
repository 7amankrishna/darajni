import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { settingsInputSchema } from "@/lib/validation/admin";

export async function PUT(request: Request) {
  if (!isSameOrigin(request) || !(await requireAdminApi())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const parsed = settingsInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings." },
      { status: 400 },
    );
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  revalidateTag("settings");
  revalidatePath("/admin");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/support");
  return NextResponse.json({ updated: true });
}
