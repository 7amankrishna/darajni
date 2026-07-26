import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { homepageSlideInputSchema } from "@/lib/validation/admin";

function revalidateHomepageSlides() {
  revalidateTag("homepage-slides");
  revalidatePath("/");
  revalidatePath("/admin");
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

  const { id } = await params;
  const slide = parsed.data;
  const { error } = await supabase
    .from("homepage_slides")
    .update({
      title: slide.title,
      eyebrow: slide.eyebrow || null,
      description: slide.description || null,
      image_url: slide.imageUrl,
      video_url: slide.videoUrl || null,
      link_url: slide.linkUrl,
      cta_label: slide.ctaLabel,
      sort_order: slide.sortOrder,
      starts_at: slide.startsAt || null,
      ends_at: slide.endsAt || null,
      is_active: slide.isActive,
    })
    .eq("id", id);
  if (error) {
    return internalApiError(
      "admin-homepage-slide-update",
      error,
      "The homepage slide could not be updated.",
      409,
    );
  }

  revalidateHomepageSlides();
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

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Homepage launch management is temporarily unavailable.", 503);
  }

  const { id } = await params;
  const { error } = await supabase.from("homepage_slides").delete().eq("id", id);
  if (error) {
    return internalApiError(
      "admin-homepage-slide-delete",
      error,
      "The homepage slide could not be deleted.",
      409,
    );
  }

  revalidateHomepageSlides();
  return NextResponse.json({ deleted: true });
}
