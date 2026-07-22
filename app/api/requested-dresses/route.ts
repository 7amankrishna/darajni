import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { mapRequestedDress } from "@/lib/data/requested-dresses";
import { apiError, internalApiError, rateLimitError } from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const allowed = new Map([
  ["image/jpeg", { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] }],
  ["image/png", { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47]] }],
  ["image/webp", { extension: "webp", signatures: [[0x52, 0x49, 0x46, 0x46]] }],
]);

function hasSignature(bytes: Uint8Array, signatures: number[][]) {
  return signatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value),
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("Forbidden.", 403);

  const limit = await rateLimitRequest(request, RATE_LIMITS.requestedDressUpload);
  if (!limit.success) return rateLimitError(limit);

  // Authenticate the user before allowing upload
  const authClient = await createSupabaseServerClient();
  if (!authClient) return apiError("Authentication service is unavailable.", 503);

  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || user.is_anonymous) {
    return apiError("Only registered DARAJNI accounts can upload dress requests. Please sign in or register an account.", 401);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 2.25 * 1024 * 1024) {
    return apiError("The upload is too large.", 413);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const descriptionValue = formData.get("description");
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  if (
    formData.get("publicConsent") !== "true" ||
    formData.get("termsAccepted") !== "true"
  ) {
    return apiError("Public display consent and the Terms of use are required.", 400);
  }
  if (description.length > 160) {
    return apiError("Keep your request note within 160 characters.", 400);
  }
  if (!(file instanceof File)) return apiError("Choose a dress image.", 400);

  const definition = allowed.get(file.type);
  if (!definition || file.size < 12 || file.size > MAX_UPLOAD_BYTES) {
    return apiError("Use a compressed JPG, PNG, or WebP image up to 2 MB.", 400);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasSignature(buffer, definition.signatures)) {
    return apiError("The image contents are invalid.", 400);
  }
  if (
    file.type === "image/webp" &&
    String.fromCharCode(...buffer.slice(8, 12)) !== "WEBP"
  ) {
    return apiError("The WebP image is invalid.", 400);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return apiError("Dress requests are temporarily unavailable.", 503);

  // Fetch profile for additional user details (full_name, phone)
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("full_name, phone, email")
    .eq("id", user.id)
    .maybeSingle();

  const userEmail = (profile?.email || user.email || "").toLowerCase();
  const userName =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    userEmail.split("@")[0] ||
    "Customer";
  const userPhone =
    profile?.phone ||
    (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "") ||
    null;

  const now = new Date();
  const storagePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${definition.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("requested-dresses")
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) {
    return internalApiError(
      "requested-dress-image-upload",
      uploadError,
      "The dress image could not be uploaded.",
      409,
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("requested-dresses")
    .getPublicUrl(storagePath);

  const { data, error: insertError } = await supabase
    .from("requested_dresses")
    .insert({
      image_url: publicUrlData.publicUrl,
      storage_path: storagePath,
      description: description || null,
      status: "pending",
      consented_at: now.toISOString(),
      user_id: user.id,
      user_email: userEmail || null,
      user_name: userName || null,
      user_phone: userPhone || null,
    })
    .select("id, image_url, description, created_at")
    .single();

  if (insertError || !data) {
    await supabase.storage.from("requested-dresses").remove([storagePath]);
    return internalApiError(
      "requested-dress-create",
      insertError,
      "The dress request could not be posted.",
    );
  }

  revalidateTag("requested-dresses");
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json(
    { request: mapRequestedDress(data as unknown as Record<string, unknown>) },
    { status: 201 },
  );
}
