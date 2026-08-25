import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { mapProductReview } from "@/lib/data/reviews";
import { apiError, internalApiError, rateLimitError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);

  const limit = await rateLimitRequest(request, RATE_LIMITS.productReview);
  if (!limit.success) return rateLimitError(limit);

  // Only registered DARAJNI accounts can post reviews.
  const authClient = await createSupabaseServerClient();
  if (!authClient) return apiError("Authentication service is unavailable.", 503);

  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || user.is_anonymous) {
    return apiError(
      "Only registered DARAJNI accounts can post a review. Please sign in or create an account.",
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("The request body must be valid JSON.", 400);
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const productId = typeof payload.productId === "string" ? payload.productId : "";
  const rating = Number(payload.rating);
  const commentValue = typeof payload.comment === "string" ? payload.comment.trim() : "";

  if (!UUID_PATTERN.test(productId)) {
    return apiError("A valid product is required.", 400);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return apiError("Choose a rating between 1 and 5 stars.", 400);
  }
  if (commentValue.length > 600) {
    return apiError("Keep your review within 600 characters.", 400);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return apiError("Reviews are temporarily unavailable.", 503);

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return apiError("This design no longer exists.", 404);

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const userEmail = (profile?.email || user.email || "").toLowerCase();
  const userName =
    sanitizeName(profile?.full_name || "") ||
    sanitizeName(
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    ) ||
    sanitizeName(userEmail.split("@")[0].replace(/[._-]+/g, " ")) ||
    "DARAJNI Customer";

  const { data, error } = await supabase
    .from("product_reviews")
    .upsert(
      {
        product_id: productId,
        user_id: user.id,
        user_name: userName,
        rating,
        comment: commentValue || null,
        status: "published",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,user_id" },
    )
    .select("id, product_id, user_name, rating, comment, created_at")
    .single();

  if (error || !data) {
    return internalApiError("product-review-create", error, "The review could not be saved.");
  }

  revalidateTag("product-reviews");

  return NextResponse.json(
    { review: mapProductReview(data as unknown as Record<string, unknown>) },
    { status: 201 },
  );
}
