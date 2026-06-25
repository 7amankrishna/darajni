import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { productInputSchema } from "@/lib/validation/admin";

async function authorize(request: Request) {
  return isSameOrigin(request) && Boolean(await requireAdminApi());
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const parsed = productInputSchema.safeParse(
    await request.json().catch(() => null),
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
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: error.message }, { status: 409 });
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
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
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
