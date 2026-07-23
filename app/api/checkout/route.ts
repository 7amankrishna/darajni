import { after, NextResponse } from "next/server";

import {
  getCustomerUser,
  saveCheckoutProfileForUser,
} from "@/lib/data/account";
import {
  getPayUEnvironment,
  getRazorpayOrderEnvironment,
} from "@/lib/config/server-env";
import { generatePayURequestHash } from "@/lib/security/payu";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import {
  apiError,
  internalApiError,
  rateLimitError,
} from "@/lib/security/api-response";
import {
  createOrderAccessToken,
  isOrderAccessConfigured,
} from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";
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
  return knownMessages.some((known) => message.includes(known)) ? message : null;
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
    return apiError("Forbidden.", 403);
  }

  const limit = await rateLimitRequest(request, RATE_LIMITS.checkout);
  if (!limit.success) return rateLimitError(limit);

  if (!isOrderAccessConfigured()) {
    console.error("Checkout blocked: ORDER_ACCESS_SECRET is not configured.");
    return apiError("Checkout is temporarily unavailable.", 503);
  }

  const parsed = checkoutSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid checkout details." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return apiError("Checkout is temporarily unavailable.", 503);
  }

  const { customer, items, paymentMethod, promoCode } = parsed.data;
  const customerUser = await getCustomerUser();
  const payuEnvironment = getPayUEnvironment();
  // PayU must return to the same canonical host where checkout started. The
  // request origin avoids a cross-host redirect when domain configuration is
  // changed between www and non-www.
  const siteUrl = new URL(request.url).origin;
  const razorpayEnvironment = getRazorpayOrderEnvironment();

  if (paymentMethod === "payu" && !payuEnvironment) {
    return apiError("PayU online payment is temporarily unavailable.", 503);
  }

  if (paymentMethod === "razorpay" && !razorpayEnvironment) {
    return apiError("Online payment is temporarily unavailable.", 503);
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
    const friendly = friendlyCheckoutError(error.message);
    return friendly
      ? apiError(friendly, 409)
      : internalApiError(
          "checkout-order-create",
          error,
          "The order could not be created. Please review your cart and try again.",
          409,
        );
  }

  const order = (Array.isArray(data) ? data[0] : data) as
    | CheckoutRow
    | undefined;
  if (!order) {
    return internalApiError(
      "checkout-order-empty-result",
      new Error("Checkout RPC returned no order row."),
      "The order could not be created.",
      500,
    );
  }

  if (customerUser) {
    const profile = await saveCheckoutProfileForUser(customerUser, customer);
    if (!profile) {
      console.error("Checkout profile sync failed for user", customerUser.id);
    }

    const { error: linkError } = await supabase
      .from("orders")
      .update({ customer_id: customerUser.id })
      .eq("id", order.order_id);

    if (linkError) {
      console.error("Checkout order account link failed", linkError.message);
    }
  }

  let token: string;
  try {
    token = createOrderAccessToken(order.order_id);
  } catch {
    await cancelReservation(order.order_id);
    return apiError("Checkout is temporarily unavailable.", 503);
  }

  if (paymentMethod === "cod") {
    // The customer order is committed before this side effect. Shiprocket
    // failures are retained for retry and never invalidate a completed order.
    after(() => syncShiprocketOrder(order.order_id));
    return NextResponse.json({
      mode: "cod",
      orderNumber: order.order_number,
      successUrl: `/order/success?token=${encodeURIComponent(token)}`,
    });
  }

  if (paymentMethod === "payu") {
    try {
      if (!payuEnvironment) {
        throw new Error("PayU environment unavailable after validation.");
      }

      const txnid = order.order_number;
      const firstname = customer.customerName.trim().split(" ")[0] || "Customer";
      const email = customer.email || "customer@darjani.com";
      const formattedAmount = Number(order.total).toFixed(2);
      const productinfo = `Order ${order.order_number}`;

      const hash = generatePayURequestHash({
        key: payuEnvironment.key,
        txnid,
        amount: formattedAmount,
        productinfo,
        firstname,
        email,
        salt: payuEnvironment.salt,
        udf1: order.order_id,
        udf2: token,
      });

      const { error: updateError } = await supabase
        .from("orders")
        .update({ payu_txn_id: txnid })
        .eq("id", order.order_id)
        .eq("status", "pending");
      if (updateError) throw updateError;

      const paymentFields = {
        key: payuEnvironment.key,
        txnid,
        amount: formattedAmount,
        productinfo,
        firstname,
        email,
        phone: customer.phone.replace(/\D/g, "").slice(-10),
        surl: `${siteUrl}/api/payments/payu/callback`,
        furl: `${siteUrl}/api/payments/payu/callback`,
        curl: `${siteUrl}/api/payments/payu/callback`,
        address1: customer.address.trim(),
        city: customer.city.trim(),
        state: customer.state.trim(),
        country: "India",
        zipcode: customer.pincode.trim(),
        hash,
        udf1: order.order_id,
        // PayU hashes all five UDF positions. Send the blank positions as
        // explicit fields too, so the payload exactly matches the sequence
        // used to generate the server-side hash.
        udf2: token,
        udf3: "",
        udf4: "",
        udf5: "",
      };
      return NextResponse.json({
        mode: "payu",
        actionUrl: payuEnvironment.actionUrl,
        params: paymentFields,
        token,
      });
    } catch (payuError) {
      await cancelReservation(order.order_id);
      return internalApiError(
        "payu-order-create",
        payuError,
        "Online payment could not be started. Please try again.",
        502,
      );
    }
  }

  try {
    if (!razorpayEnvironment) {
      throw new Error("Razorpay environment unavailable after validation.");
    }
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${razorpayEnvironment.keyId}:${razorpayEnvironment.keySecret}`,
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
      signal: AbortSignal.timeout(10_000),
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
      keyId: razorpayEnvironment.keyId,
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
    await cancelReservation(order.order_id);
    return internalApiError(
      "razorpay-order-create",
      razorpayError,
      "Online payment could not be started. Please try again.",
      502,
    );
  }
}
