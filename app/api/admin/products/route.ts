import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { productInputSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;
  const parsed = productInputSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid product." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Product management is temporarily unavailable.", 503);
  }
  const product = parsed.data;
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: product.name,
      slug: product.slug,
      description: product.description,
      fabric: product.fabric,
      colour: product.colour,
      included_pieces: product.includedPieces,
      work_details: product.workDetails,
      lining: product.lining,
      care_instructions: product.careInstructions,
      size: ["Custom Size"],
      stock: product.stock,
      price: product.price,
      discount: product.discount,
      images: product.images,
      category_id: product.categoryId,
      is_featured: product.isFeatured,
      is_active: product.isActive,
    })
    .select("id")
    .single();
  if (error) {
    return internalApiError(
      "admin-product-create",
      error,
      "The product could not be created. Check that its slug and category are valid.",
      409,
    );
  }

  revalidateTag("catalog");
  revalidatePath("/admin");
  return NextResponse.json({ id: data.id }, { status: 201 });
}
