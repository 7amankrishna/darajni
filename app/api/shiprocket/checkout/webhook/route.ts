import { after } from "next/server";
import { NextResponse } from "next/server";

import {
  fromShiprocketVariantId,
  hasValidShiprocketCheckoutSignature,
} from "@/lib/shiprocket-checkout";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { apiError, internalApiError } from "@/lib/security/api-response";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function customerFromPayload(payload: RecordValue) {
  const customer = asRecord(payload.customer) ?? {};
  const shipping =
    asRecord(payload.shipping_address) ??
    asRecord(payload.shippingAddress) ??
    asRecord(customer.shipping_address) ??
    customer;
  const firstName = firstText(
    shipping.first_name,
    shipping.firstName,
    payload.first_name,
    payload.firstName,
    customer.first_name,
  );
  const lastName = firstText(
    shipping.last_name,
    shipping.lastName,
    payload.last_name,
    payload.lastName,
    customer.last_name,
  );
  const customerName = firstText(
    shipping.name,
    shipping.customer_name,
    payload.customer_name,
    customer.name,
    [firstName, lastName].filter(Boolean).join(" "),
  );
  const address = firstText(
    [
      firstText(shipping.address, shipping.address1, shipping.line1),
      firstText(shipping.address2, shipping.line2),
    ]
      .filter(Boolean)
      .join(", "),
    payload.address,
  );
  const phone = firstText(shipping.phone, payload.phone, customer.phone);
  const email = firstText(shipping.email, payload.email, customer.email);
  const city = firstText(shipping.city, payload.city, customer.city);
  const state = firstText(
    shipping.state,
    shipping.province,
    payload.state,
    customer.state,
  );
  const pincode = firstText(
    shipping.pincode,
    shipping.zip,
    shipping.postal_code,
    payload.pincode,
    customer.pincode,
  );
  const landmark = firstText(shipping.landmark, payload.landmark);

  return { customerName, address, phone, email, city, state, pincode, landmark };
}

function validCustomer(customer: ReturnType<typeof customerFromPayload>) {
  return (
    customer.customerName.length >= 2 &&
    customer.address.length >= 10 &&
    customer.city.length >= 2 &&
    customer.state.length >= 2 &&
    /^[1-9][0-9]{5}$/.test(customer.pincode) &&
    customer.phone.replace(/\D/g, "").slice(-10).length === 10 &&
    (!customer.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
  );
}

function itemsFromPayload(payload: RecordValue) {
  const cartData = asRecord(payload.cart_data) ?? asRecord(payload.cartData) ?? {};
  const source = Array.isArray(cartData.items)
    ? cartData.items
    : Array.isArray(payload.items)
      ? payload.items
      : [];
  const items = source.flatMap((value) => {
    const item = asRecord(value);
    const variant = fromShiprocketVariantId(item?.variant_id ?? item?.variantId);
    const quantity = Number(item?.quantity);
    if (!variant || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return [];
    }
    return [{ product_id: variant.productId, size: variant.size, quantity }];
  });
  return items.length === source.length && items.length > 0 ? items : null;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return apiError("Webhook payload is too large.", 413);
  }
  if (
    !hasValidShiprocketCheckoutSignature(
      rawBody,
      request.headers.get("x-api-hmac-sha256"),
    )
  ) {
    return apiError("Invalid Shiprocket Checkout webhook signature.", 401);
  }

  let payload: RecordValue | null = null;
  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return apiError("Invalid webhook payload.", 400);
  }
  if (!payload) return apiError("Invalid webhook payload.", 400);

  const remoteOrderId = firstText(payload.order_id, payload.orderId);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(remoteOrderId)) {
    return apiError("Invalid Shiprocket Checkout order ID.", 400);
  }
  if (firstText(payload.status).toUpperCase() !== "SUCCESS") {
    return NextResponse.json({ received: true });
  }

  const customer = customerFromPayload(payload);
  const items = itemsFromPayload(payload);
  if (!validCustomer(customer) || !items) {
    return apiError("Webhook is missing customer or cart details.", 422);
  }

  const isCod =
    firstText(payload.payment_type, payload.paymentType).toUpperCase() ===
    "CASH_ON_DELIVERY";
  const supabase = createSupabaseServiceClient();
  if (!supabase) return apiError("Webhook processing is unavailable.", 503);

  const { data, error } = await supabase.rpc(
    "create_shiprocket_checkout_order",
    {
      p_remote_order_id: remoteOrderId,
      p_customer: {
        customer_name: customer.customerName,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        landmark: customer.landmark,
        email: customer.email,
      },
      p_items: items,
      p_payment_method: isCod ? "cod" : "shiprocket",
    },
  );
  const order = Array.isArray(data) ? data[0] : data;
  if (error || !order) {
    return internalApiError(
      "shiprocket-checkout-order-create",
      error ?? new Error("Checkout order RPC returned no order."),
      "Webhook processing failed.",
      409,
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: isCod ? "pending" : "paid",
      status: "confirmed",
    })
    .eq("id", order.order_id);
  if (updateError) {
    return internalApiError(
      "shiprocket-checkout-order-confirm",
      updateError,
      "Webhook processing failed.",
      503,
    );
  }

  // Existing shipping sync remains independent of the Checkout product. A
  // temporary shipping API outage must never invalidate a paid order.
  after(() => syncShiprocketOrder(order.order_id));
  return NextResponse.json({ received: true });
}
