import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { productInputSchema } from "@/lib/validation/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Product management is temporarily unavailable.", 503);
  }
  const product = parsed.data;
  const { error } = await supabase
    .from("products")
    .update({
      name: product.name,
      slug: product.slug,
      description: product.description,
      fabric: product.fabric,
      size: product.sizes,
      stock: product.stock,
      price: product.price,
      discount: product.discount,
      images: product.images,
      category_id: product.categoryId,
      is_featured: product.isFeatured,
      is_active: product.isActive,
    })
    .eq("id", id);
  if (error) {
    return internalApiError(
      "admin-product-update",
      error,
      "The product could not be updated. Check that its slug and category are valid.",
      409,
    );
  }

  revalidateTag("catalog");
  revalidatePath("/admin");
  revalidatePath(`/design/${product.slug}`);
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
    return apiError("Product management is temporarily unavailable.", 503);
  }
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      {
        error:
          "This product may be referenced by an order. Mark it inactive instead of deleting it.",
      },
      { status: 409 },
    );
  }

  revalidateTag("catalog");
  revalidatePath("/admin");
  return NextResponse.json({ deleted: true });
}
