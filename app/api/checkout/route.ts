import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import {
  getCustomerUser,
  saveCheckoutProfileForUser,
} from "@/lib/data/account";
import {
  getPayUEnvironment,
  getPublicSiteUrl,
} from "@/lib/config/server-env";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createPayURequestHash } from "@/lib/payu";
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
  const siteUrl = getPublicSiteUrl();
  if (
    paymentMethod === "payu" &&
    (!payuEnvironment || !siteUrl)
  ) {
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

  if (paymentMethod === "cod") {
    let token: string;
    try {
      token = createOrderAccessToken(order.order_id);
    } catch {
      return apiError("Checkout is temporarily unavailable.", 503);
    }
    // The customer order is committed before this side effect. Shiprocket
    // failures are retained for retry and never invalidate a completed order.
    after(() => syncShiprocketOrder(order.order_id));
    return NextResponse.json({
      mode: "cod",
      orderNumber: order.order_number,
      successUrl: `/order/success?token=${encodeURIComponent(token)}`,
    });
  }

  try {
    if (!payuEnvironment || !siteUrl) {
      throw new Error("PayU environment unavailable after validation.");
    }
    const payuTransactionId = `payu${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const amount = Number(order.total).toFixed(2);
    const paymentReturnUrl = `${siteUrl}/api/payments/payu/return`;
    const firstname = customer.customerName.trim().split(/\s+/)[0] || "Customer";
    const productinfo = `DARAJNI order ${order.order_number}`;
    const fields = {
      key: payuEnvironment.key,
      txnid: payuTransactionId,
      amount,
      productinfo,
      firstname,
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.replace(/\D/g, "").slice(-10),
      surl: paymentReturnUrl,
      furl: paymentReturnUrl,
      curl: paymentReturnUrl,
      udf1: order.order_id,
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
      address1: customer.address.trim(),
      city: customer.city.trim(),
      state: customer.state.trim(),
      country: "India",
      zipcode: customer.pincode.trim(),
    };
    const hash = createPayURequestHash(fields, payuEnvironment.salt);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ payu_txn_id: payuTransactionId })
      .eq("id", order.order_id)
      .eq("payment_method", "payu")
      .eq("status", "pending");
    if (updateError) throw updateError;

    return NextResponse.json({
      mode: "payu",
      payuEndpoint: payuEnvironment.paymentUrl,
      payuFields: { ...fields, hash },
    });
  } catch (payuError) {
    await cancelReservation(order.order_id);
    return internalApiError(
      "payu-payment-start",
      payuError,
      "Online payment could not be started. Please try again.",
      502,
    );
  }
}
