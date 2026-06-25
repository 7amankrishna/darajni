import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { productInputSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!(await requireAdminApi())) {
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

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  const product = parsed.data;
  const { data, error } = await supabase
    .from("products")
    .insert({
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
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  revalidateTag("catalog");
  revalidatePath("/admin");
  return NextResponse.json({ id: data.id }, { status: 201 });
}
