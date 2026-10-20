import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, internalApiError, rateLimitError } from "@/lib/security/api-response";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const subscription = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);
  const limit = await rateLimitRequest(request, { scope: "newsletter", limit: 3, windowSeconds: 60 * 60 });
  if (!limit.success) return rateLimitError(limit);
  const parsed = subscription.safeParse(await readJsonBody(request, 2048));
  if (!parsed.success) return apiError("Enter a valid email and agree to receive updates.", 400);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return apiError("Signups are temporarily unavailable. Please try again later.", 503);
  const { error } = await supabase.from("newsletter_subscribers").upsert(
    { email: parsed.data.email, consented_at: new Date().toISOString() },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (error) return internalApiError("newsletter-subscribe", error, "Signups are temporarily unavailable. Please try again later.", 503);
  return NextResponse.json({ success: true });
}
