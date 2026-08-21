import { after, NextResponse } from "next/server";

import { getPayUEnvironment } from "@/lib/config/server-env";
import { verifyOrderAccessToken } from "@/lib/security/order-token";
import { verifyPayUPayment, verifyPayUResponseHash } from "@/lib/security/payu";
import { createOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  sendOrderNotification,
  sendCustomerOrderPlacedEmail,
} from "@/lib/email";

export const runtime = "nodejs";

type PayUFields = Record<string, string>;

function redirectToCheckout(request: Request, error: string) {
  const url = new URL("/checkout", new URL(request.url).origin);
  url.searchParams.set("payment", error);
  return NextResponse.redirect(url, 303);
}

function redirectToSuccess(request: Request, token: string) {
  const url = new URL("/order/success", new URL(request.url).origin);
  url.searchParams.set("token", token);
  return NextResponse.redirect(url, 303);
}

async function processPayUReturn(request: Request, body: PayUFields) {
  const txnid = body.txnid || "";
  const limit = await rateLimitRequest(
    request,
    RATE_LIMITS.paymentVerify,
    txnid ? `payu:${txnid}` : undefined,
  );
  if (!limit.success) return redirectToCheckout(request, "confirmation-pending");

  const payuEnv = getPayUEnvironment();
  if (!payuEnv || !txnid) {
    return redirectToCheckout(request, "verification-failed");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return redirectToCheckout(request, "confirmation-pending");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, total, payment_method, payment_status, payu_txn_id, customer_name, email, phone, city, state")
    .eq("payu_txn_id", txnid)
    .maybeSingle();
  if (
    orderError ||
    !order ||
    order.payment_method !== "payu" ||
    order.payu_txn_id !== txnid ||
    (body.udf1 && order.id !== body.udf1)
  ) {
    return redirectToCheckout(request, "verification-failed");
  }

  // New checkout attempts include the short-lived signed access token in
  // udf2. Older attempts are accepted only when their signed PayU return
  // hash is valid, so an order number alone cannot trigger confirmation.
  const accessToken = verifyOrderAccessToken(body.udf2 || "");
  const hasValidAccessToken = accessToken?.orderId === order.id;
  const hasValidReturnHash =
    Boolean(body.hash && body.key === payuEnv.key) &&
    verifyPayUResponseHash({
      key: body.key,
      txnid,
      amount: body.amount || "",
      productinfo: body.productinfo || "",
      firstname: body.firstname || "",
      email: body.email || "",
      status: body.status || "",
      hash: body.hash,
      salt: payuEnv.salt,
      udf1: body.udf1 || "",
      udf2: body.udf2 || "",
      udf3: body.udf3 || "",
      udf4: body.udf4 || "",
      udf5: body.udf5 || "",
      additionalCharges: body.additional_charges || body.additionalCharges || "",
    });
  if (!hasValidAccessToken && !hasValidReturnHash) {
    return redirectToCheckout(request, "verification-failed");
  }

  // The browser callback only identifies the reserved order. PayU's
  // server-to-server Verify Payment response is the authority for status,
  // amount, and payment ID below.
  const verification = await verifyPayUPayment(payuEnv, txnid);
  if (verification.outcome === "unavailable") {
    return redirectToCheckout(request, "confirmation-pending");
  }

  if (verification.status === "failure") {
    if (order.payment_status === "pending") {
      await supabase.rpc("cancel_order_reservation", {
        p_order_id: order.id,
        p_payment_failed: true,
      });
    }
    return redirectToCheckout(request, "failed");
  }

  if (
    verification.status !== "success" ||
    verification.transactionId !== txnid ||
    !verification.amount ||
    Math.round(Number(order.total) * 100) !==
      Math.round(Number(verification.amount) * 100) ||
    !verification.paymentId ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(verification.paymentId)
  ) {
    return redirectToCheckout(request, "confirmation-pending");
  }

  if (order.payment_status !== "paid") {
    const { error: confirmError } = await supabase.rpc("confirm_payu_payment", {
      p_order_id: order.id,
      p_payu_txn_id: txnid,
      p_payu_payment_id: verification.paymentId,
    });
    if (confirmError) return redirectToCheckout(request, "confirmation-pending");
  }

  after(async () => {
    await syncShiprocketOrder(order.id);
    if (order.payment_status !== "paid") {
      await sendOrderNotification(order.order_number, order.total, {
        name: order.customer_name,
        email: order.email || "",
        phone: order.phone,
        city: order.city,
        state: order.state,
      });
      await sendCustomerOrderPlacedEmail(order.id);
    }
  });
  try {
    return redirectToSuccess(request, createOrderAccessToken(order.id));
  } catch {
    return redirectToCheckout(request, "confirmation-pending");
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return redirectToCheckout(request, "verification-failed");
  }
  const body = Object.fromEntries(await request.formData()) as PayUFields;
  return processPayUReturn(request, body);
}

export async function GET(request: Request) {
  // Directly opening this endpoint is harmless. Some PayU integrations also
  // return signed fields in the query string, which are verified identically.
  const body = Object.fromEntries(new URL(request.url).searchParams);
  return processPayUReturn(request, body);
}
