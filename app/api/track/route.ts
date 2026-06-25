import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { trackingSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await rateLimit({
    key: `tracking:${getClientIp(request)}`,
    limit: 12,
    windowSeconds: 15 * 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many tracking attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = trackingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid tracking details." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Tracking is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("track_order", {
    p_order_reference: parsed.data.orderReference,
    p_phone: parsed.data.phone,
  });
  if (error) {
    console.error("Tracking RPC failed", error.message);
    return NextResponse.json({ error: "Tracking is temporarily unavailable." }, { status: 503 });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return NextResponse.json(
      { error: "No order matched that order ID and phone number." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    order: {
      orderId: row.order_id,
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}
