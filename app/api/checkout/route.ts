import { NextResponse } from "next/server";

import {
  createOrderAccessToken,
  isOrderAccessConfigured,
} from "@/lib/security/order-token";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { checkoutSchema } from "@/lib/validation/checkout";

export const runtime = "nodejs";

interface CheckoutRow {
  order_id: string;
  order_number: string;
  subtotal: number;
  discount_amount: number;
  promo_code: string | null;
  shipping_fee: number;
  tax_amount: number;
  total: number;
  status: string;
}

function friendlyCheckoutError(message: string) {
  const knownMessages = [
    "Cash on delivery is currently unavailable",
    "A cart product is no longer available",
    "Choose a valid size",
    "Insufficient stock",
    "Cart must contain",
    "Item quantity must be",
    "Coupon or voucher",
    "coupon or voucher",
    "Cart subtotal is below",
    "This phone number has already used this code",
  ];
  return knownMessages.some((known) => message.includes(known))
    ? message
    : "The order could not be created. Please review your cart and try again.";
}

async function cancelReservation(orderId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;
  await supabase.rpc("cancel_order_reservation", {
    p_order_id: orderId,
    p_payment_failed: true,
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!isOrderAccessConfigured()) {
    console.error("Checkout blocked: ORDER_ACCESS_SECRET is not configured.");
    return NextResponse.json(
      { error: "Order access security is not configured." },
      { status: 503 },
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid checkout details." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Checkout is not configured." },
      { status: 503 },
    );
  }

  const { customer, items, paymentMethod, promoCode } = parsed.data;
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (
    paymentMethod === "razorpay" &&
    (!razorpayKeyId || !razorpaySecret)
  ) {
    return NextResponse.json(
      { error: "Online payment is not configured." },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const limit = await rateLimit({
    key: `checkout:v2:${ip}`,
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
    );
  }

  const { data, error } = await supabase.rpc("create_checkout_order", {
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
    p_items: items.map((item) => ({
      product_id: item.productId,
      size: item.size,
      quantity: item.quantity,
    })),
    p_payment_method: paymentMethod,
    p_promo_code: promoCode || null,
  });

  if (error) {
    console.error("Checkout RPC failed", error.message);
    return NextResponse.json(
      { error: friendlyCheckoutError(error.message) },
      { status: 409 },
    );
  }

  const order = (Array.isArray(data) ? data[0] : data) as
    | CheckoutRow
    | undefined;
  if (!order) {
    return NextResponse.json(
      { error: "The order could not be created." },
      { status: 500 },
    );
  }

  let token: string;
  try {
    token = createOrderAccessToken(order.order_id);
  } catch {
    await cancelReservation(order.order_id);
    return NextResponse.json(
      { error: "Order access security is not configured." },
      { status: 503 },
    );
  }

  if (paymentMethod === "cod") {
    return NextResponse.json({
      mode: "cod",
      orderNumber: order.order_number,
      successUrl: `/order/success?token=${encodeURIComponent(token)}`,
    });
  }

  try {
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${razorpayKeyId}:${razorpaySecret}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(Number(order.total) * 100),
        currency: "INR",
        receipt: order.order_number,
        notes: { order_id: order.order_id },
      }),
      cache: "no-store",
    });

    const razorpayOrder = (await razorpayResponse.json()) as {
      id?: string;
      error?: { description?: string };
    };
    if (!razorpayResponse.ok || !razorpayOrder.id) {
      throw new Error(
        razorpayOrder.error?.description || "Razorpay order creation failed.",
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", order.order_id)
      .eq("status", "pending");
    if (updateError) throw updateError;

    return NextResponse.json({
      mode: "razorpay",
      keyId: razorpayKeyId,
      razorpayOrderId: razorpayOrder.id,
      amount: Math.round(Number(order.total) * 100),
      currency: "INR",
      storeName: "DARAJNI Designer House",
      description: `Order ${order.order_number}`,
      customer: {
        name: customer.customerName,
        email: customer.email,
        phone: customer.phone,
      },
      token,
    });
  } catch (razorpayError) {
    console.error("Razorpay setup failed", razorpayError);
    await cancelReservation(order.order_id);
    return NextResponse.json(
      { error: "Online payment could not be started. Please try again." },
      { status: 502 },
    );
  }
}
