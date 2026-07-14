import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { categoryInputSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;

  const parsed = categoryInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid category." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Category management is temporarily unavailable.", 503);
  }

  const category = parsed.data;
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: category.name,
      slug: category.slug,
      is_system: false,
    })
    .select("id, name, slug, is_system")
    .single();
  if (error) {
    return internalApiError(
      "admin-category-create",
      error,
      "The category could not be created. Its name and slug must be unique.",
      409,
    );
  }

  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/admin");
  return NextResponse.json({ category: data }, { status: 201 });
}
