import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getShiprocketWebhookToken } from "@/lib/config/server-env";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { OrderStatus } from "@/types/database";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

// Shiprocket reports free-form courier statuses. Only forward milestones that
// map cleanly onto the customer-facing order pipeline are acted on; everything
// else (label generated, RTO, NDR, etc.) is acknowledged as a no-op so
// Shiprocket does not retry.
function mapCourierStatus(status: string): OrderStatus | null {
  const normalized = status.trim().toUpperCase();
  if (normalized === "DELIVERED") return "delivered";
  const shippedLike = [
    "SHIPPED",
    "PICKED UP",
    "PICKUP DONE",
    "IN TRANSIT",
    "OUT FOR DELIVERY",
    "REACHED AT DESTINATION HUB",
    "REACHED DESTINATION",
  ];
  return shippedLike.includes(normalized) ? "shipped" : null;
}

function constantTimeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function asIdentifier(value: unknown) {
  const identifier = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,100}$/.test(identifier) ? identifier : null;
}

export async function POST(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.shiprocketWebhook);
  if (!limit.success) return rateLimitError(limit);

  const token = getShiprocketWebhookToken();
  // Shiprocket authenticates its webhook with a shared token in the x-api-key
  // header (its API has no HMAC signature for status webhooks).
  const provided = request.headers.get("x-api-key");
  if (!token || !provided || !constantTimeEquals(provided, token)) {
    return apiError("Invalid webhook token.", 401);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }

  let event: {
    current_status?: string;
    shipment_status?: string;
    order_id?: string | number;
    shipment_id?: string | number;
    awb?: string | number;
  };
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    // Shiprocket may deliver a single object or a one-item array.
    event = (Array.isArray(parsed) ? parsed[0] : parsed) as typeof event;
  } catch {
    return apiError("Invalid webhook payload.", 400);
  }
  if (!event || typeof event !== "object") {
    return NextResponse.json({ received: true });
  }

  const target = mapCourierStatus(
    String(event.current_status ?? event.shipment_status ?? ""),
  );
  if (!target) {
    // Acknowledge statuses we do not track so Shiprocket stops retrying.
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Webhook processing is temporarily unavailable.", 503);
  }

  // Resolve the local order from whichever Shiprocket identifier is present.
  // shipment_id is the most stable; the internal order_id is the fallback.
  const shipmentId = asIdentifier(event.shipment_id);
  const shiprocketOrderId = asIdentifier(event.order_id);
  if (!shipmentId && !shiprocketOrderId) {
    return NextResponse.json({ received: true });
  }

  let sync: { order_id: string } | null = null;
  if (shipmentId) {
    const { data, error } = await supabase
      .from("shiprocket_order_syncs")
      .select("order_id")
      .eq("shipment_id", shipmentId)
      .maybeSingle();
    if (error) {
      return internalApiError(
        "shiprocket-webhook-sync-read",
        error,
        "Webhook processing failed.",
        503,
      );
    }
    sync = data;
  }
  if (!sync && shiprocketOrderId) {
    const { data, error } = await supabase
      .from("shiprocket_order_syncs")
      .select("order_id")
      .eq("shiprocket_order_id", shiprocketOrderId)
      .maybeSingle();
    if (error) {
      return internalApiError(
        "shiprocket-webhook-sync-read",
        error,
        "Webhook processing failed.",
        503,
      );
    }
    sync = data;
  }

  if (!sync) {
    // Unknown shipment (e.g. an order created outside this store). No-op.
    return NextResponse.json({ received: true });
  }

  const { data: resulting, error: advanceError } = await supabase.rpc(
    "advance_order_status",
    { p_order_id: sync.order_id, p_target: target },
  );
  if (advanceError) {
    return internalApiError(
      "shiprocket-webhook-advance",
      advanceError,
      "Order status update failed.",
      409,
    );
  }

  // Record the courier milestone for support/audit visibility. A failure here
  // must not fail the webhook: the order status already advanced above.
  const awb = asIdentifier(event.awb);
  const { error: metadataError } = await supabase
    .from("shiprocket_order_syncs")
    .update({
      courier_status: String(
        event.current_status ?? event.shipment_status ?? "",
      ).slice(0, 100),
      courier_status_at: new Date().toISOString(),
      ...(awb ? { courier_awb: awb } : {}),
    })
    .eq("order_id", sync.order_id);
  if (metadataError) {
    console.error(
      "Shiprocket webhook metadata update failed",
      metadataError.message,
    );
  }

  // Surface the change in the admin order list. The customer dashboard updates
  // automatically through Supabase Realtime on the orders table.
  revalidatePath("/admin");

  return NextResponse.json({
    received: true,
    status: (resulting as OrderStatus | null) ?? undefined,
  });
}
