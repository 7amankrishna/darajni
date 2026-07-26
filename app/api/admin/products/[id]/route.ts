import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { deleteMediaUrls } from "@/lib/storage";
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

  // Fetch the existing media before the update so we can delete any objects that
  // were removed from the product (best-effort, after the DB row is written).
  const { data: existing } = await supabase
    .from("products")
    .select("images, video_url")
    .eq("id", id)
    .maybeSingle();
  const previousImages = Array.isArray(existing?.images)
    ? (existing!.images as string[])
    : [];
  const previousVideo =
    typeof existing?.video_url === "string" ? existing.video_url : null;

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
      video_url: product.videoUrl || null,
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

  // Compute which managed-storage objects are no longer referenced and delete
  // them. Objects that were never saved (session uploads removed client-side)
  // are already deleted by the DELETE /api/admin/uploads call from the editor,
  // so this only catches originals dropped from the saved set on save.
  const remainingImages = new Set(product.images);
  const removedImages = previousImages.filter(
    (url) => !remainingImages.has(url),
  );
  const removedVideo =
    previousVideo && previousVideo !== product.videoUrl
      ? [previousVideo]
      : [];
  if (removedImages.length > 0 || removedVideo.length > 0) {
    await deleteMediaUrls(supabase, [...removedImages, ...removedVideo]);
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

  // Capture the product's media before the row is deleted so the objects can be
  // removed from storage afterwards (best-effort).
  const { data: existing } = await supabase
    .from("products")
    .select("images, video_url")
    .eq("id", id)
    .maybeSingle();
  const images = Array.isArray(existing?.images)
    ? (existing!.images as string[])
    : [];
  const videoUrl =
    typeof existing?.video_url === "string" ? existing.video_url : null;

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

  if (images.length > 0 || videoUrl) {
    await deleteMediaUrls(supabase, [...images, videoUrl]);
  }

  revalidateTag("catalog");
  revalidatePath("/admin");
  return NextResponse.json({ deleted: true });
}
