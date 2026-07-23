import { after, NextResponse } from "next/server";

import { getPayUEnvironment, getPublicSiteUrl } from "@/lib/config/server-env";
import { verifyPayUResponseHash } from "@/lib/security/payu";
import { createOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type PayUFields = Record<string, string>;

function redirectToCheckout(request: Request, error: string) {
  const url = new URL("/checkout", getPublicSiteUrl() || request.url);
  url.searchParams.set("payment", error);
  return NextResponse.redirect(url, 303);
}

function redirectToSuccess(request: Request, token: string) {
  const url = new URL("/order/success", getPublicSiteUrl() || request.url);
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
  if (!payuEnv || !txnid || !body.hash || body.key !== payuEnv.key) {
    return redirectToCheckout(request, "verification-failed");
  }

  const isValidHash = verifyPayUResponseHash({
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

  const supabase = createSupabaseServiceClient();
  if (!isValidHash || body.status.toLowerCase() !== "success") {
    if (body.udf1 && supabase) {
      await supabase.rpc("cancel_order_reservation", {
        p_order_id: body.udf1,
        p_payment_failed: true,
      });
    }
    return redirectToCheckout(request, "failed");
  }

  if (!supabase) return redirectToCheckout(request, "confirmation-pending");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, payment_method, payment_status, payu_txn_id")
    .eq("payu_txn_id", txnid)
    .maybeSingle();
  if (
    orderError ||
    !order ||
    order.payment_method !== "payu" ||
    order.payu_txn_id !== txnid ||
    order.id !== body.udf1 ||
    Math.round(Number(order.total) * 100) !== Math.round(Number(body.amount) * 100)
  ) {
    return redirectToCheckout(request, "verification-failed");
  }

  const paymentId = body.mihpayid || body.payuMoneyId;
  if (!paymentId || !/^[A-Za-z0-9_-]{1,100}$/.test(paymentId)) {
    return redirectToCheckout(request, "confirmation-pending");
  }

  const { error: confirmError } = await supabase.rpc("confirm_payu_payment", {
    p_order_id: order.id,
    p_payu_txn_id: txnid,
    p_payu_payment_id: paymentId,
  });
  if (confirmError) return redirectToCheckout(request, "confirmation-pending");

  after(() => syncShiprocketOrder(order.id));
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
