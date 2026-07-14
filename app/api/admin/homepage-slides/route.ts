import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { homepageSlideInputSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminMutation,
  );
  if (authorization.response) return authorization.response;

  const parsed = homepageSlideInputSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid homepage slide." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Homepage launch management is temporarily unavailable.", 503);
  }

  const slide = parsed.data;
  const { data, error } = await supabase
    .from("homepage_slides")
    .insert({
      title: slide.title,
      eyebrow: slide.eyebrow || null,
      description: slide.description || null,
      image_url: slide.imageUrl,
      link_url: slide.linkUrl,
      cta_label: slide.ctaLabel,
      sort_order: slide.sortOrder,
      starts_at: slide.startsAt || null,
      ends_at: slide.endsAt || null,
      is_active: slide.isActive,
    })
    .select("id")
    .single();
  if (error) {
    return internalApiError(
      "admin-homepage-slide-create",
      error,
      "The homepage slide could not be created.",
      409,
    );
  }

  revalidateTag("homepage-slides");
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ id: data.id }, { status: 201 });
}
