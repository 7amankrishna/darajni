import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";
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

function hasSignature(bytes: Uint8Array, signatures: number[][]) {
  return signatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value),
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request) || !(await requireAdminApi())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
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
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
