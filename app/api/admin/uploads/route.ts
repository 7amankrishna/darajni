import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const allowed = new Map([
  ["image/jpeg", { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] }],
  ["image/png", { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47]] }],
  [
    "image/webp",
    {
      extension: "webp",
      signatures: [[0x52, 0x49, 0x46, 0x46]],
    },
  ],
]);
const videoTypes = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
]);
const maxVideoBytes = 25 * 1024 * 1024;

function hasSignature(bytes: Uint8Array, signatures: number[][]) {
  return signatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value),
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest(
    request,
    RATE_LIMITS.adminUpload,
  );
  if (authorization.response) return authorization.response;
  const kind = new URL(request.url).searchParams.get("kind");
  const isVideo = kind === "video";
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > (isVideo ? maxVideoBytes + 1024 * 1024 : 2.5 * 1024 * 1024)) {
    return apiError("The upload is too large.", 413);
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: `Choose a ${isVideo ? "video" : "image"} file.` }, { status: 400 });
  }
  if (isVideo) {
    const extension = videoTypes.get(file.type);
    const buffer = new Uint8Array(await file.arrayBuffer());
    const isMp4 = file.type === "video/mp4" && String.fromCharCode(...buffer.slice(4, 8)) === "ftyp";
    const isWebm = file.type === "video/webm" && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    if (!extension || file.size < 12 || file.size > maxVideoBytes || (!isMp4 && !isWebm)) {
      return NextResponse.json({ error: "Use a valid MP4 or WebM video up to 25 MiB." }, { status: 400 });
    }
    const supabase = createSupabaseServiceClient();
    if (!supabase) return apiError("Video uploads are temporarily unavailable.", 503);
    const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("product-videos").upload(path, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return internalApiError("admin-product-video-upload", error, "The video could not be uploaded.", 409);
    const { data } = supabase.storage.from("product-videos").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  }
  const definition = allowed.get(file.type);
  if (!definition || file.size < 12 || file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG or WebP image up to 2 MiB." },
      { status: 400 },
    );
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasSignature(buffer, definition.signatures)) {
    return NextResponse.json({ error: "The image contents are invalid." }, { status: 400 });
  }
  if (
    file.type === "image/webp" &&
    String.fromCharCode(...buffer.slice(8, 12)) !== "WEBP"
  ) {
    return NextResponse.json({ error: "The WebP image is invalid." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Image uploads are temporarily unavailable.", 503);
  }
  const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${definition.extension}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    return internalApiError(
      "admin-product-image-upload",
      error,
      "The image could not be uploaded.",
      409,
    );
  }
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
