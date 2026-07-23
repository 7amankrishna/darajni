import { after, NextResponse } from "next/server";

import { getPayUEnvironment } from "@/lib/config/server-env";
import { verifyPayUResponseHash } from "@/lib/security/payu";
import { createOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.paymentVerify);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!limit.success) {
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Too many payment verification requests.")}`,
      303,
    );
  }

  const payuEnv = getPayUEnvironment();
  if (!payuEnv) {
    console.error("PayU callback error: PayU environment is not configured.");
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Payment processing is unavailable.")}`,
      303,
    );
  }

  let body: Record<string, string> = {};
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = typeof value === "string" ? value : value.name;
      });
    } else {
      body = await request.json();
    }
  } catch (err) {
    console.error("PayU callback parsing error:", err);
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Invalid payment callback data.")}`,
      303,
    );
  }

  const {
    key = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    status = "",
    hash = "",
    mihpayid = "",
    payuMoneyId = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    additionalCharges = "",
  } = body;

  const paymentId = mihpayid || payuMoneyId || txnid;
  const orderId = udf1;

  const isValidHash = verifyPayUResponseHash({
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    status,
    hash,
    salt: payuEnv.salt,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    additionalCharges,
  });

  const supabase = createSupabaseServiceClient();

  if (!isValidHash || status.toLowerCase() !== "success") {
    console.error(`PayU payment failed or hash invalid. Status: ${status}, HashValid: ${isValidHash}`);
    if (orderId && supabase) {
      await supabase.rpc("cancel_order_reservation", {
        p_order_id: orderId,
        p_payment_failed: true,
      });
    }
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Payment was not completed or signature verification failed.")}`,
      303,
    );
  }

  if (!supabase) {
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Database service unavailable.")}`,
      303,
    );
  }

  try {
    const { data: orderData, error: fetchError } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("payu_txn_id", txnid)
      .maybeSingle();

    if (fetchError || !orderData) {
      console.error("PayU callback: Order not found for txnid", txnid, fetchError);
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=${encodeURIComponent("Order not found.")}`,
        303,
      );
    }

    if (orderData.payment_status === "paid") {
      const token = createOrderAccessToken(orderData.id);
      return NextResponse.redirect(
        `${siteUrl}/order/success?token=${encodeURIComponent(token)}`,
        303,
      );
    }

    const { error: confirmError } = await supabase.rpc("confirm_payu_payment", {
      p_order_id: orderData.id,
      p_payu_txn_id: txnid,
      p_payu_payment_id: paymentId,
    });

    if (confirmError) {
      console.error("PayU payment confirmation error:", confirmError);
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=${encodeURIComponent("Failed to update order status.")}`,
        303,
      );
    }

    after(() => syncShiprocketOrder(orderData.id));

    const token = createOrderAccessToken(orderData.id);
    return NextResponse.redirect(
      `${siteUrl}/order/success?token=${encodeURIComponent(token)}`,
      303,
    );
  } catch (confirmErr) {
    console.error("PayU callback confirmation exception:", confirmErr);
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=${encodeURIComponent("Payment processing failed.")}`,
      303,
    );
  }
}
