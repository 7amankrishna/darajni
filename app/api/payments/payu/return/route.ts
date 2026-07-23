import { after, NextResponse } from "next/server";

import { getPayUEnvironment } from "@/lib/config/server-env";
import {
  verifyPayUPayment,
  verifyPayUResponseHash,
} from "@/lib/payu";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createOrderAccessToken } from "@/lib/security/order-token";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024;

type PayUReturnFields = Record<string, string | undefined>;

function checkoutRedirect(request: Request, payment: string) {
  const url = new URL("/checkout", request.url);
  url.searchParams.set("payment", payment);
  return NextResponse.redirect(url, 303);
}

function successRedirect(request: Request, token: string) {
  const url = new URL("/order/success", request.url);
  url.searchParams.set("token", token);
  return NextResponse.redirect(url, 303);
}

async function readPayUForm(request: Request): Promise<PayUReturnFields | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) return null;

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return null;

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return null;

  const values: PayUReturnFields = {};
  for (const [key, value] of new URLSearchParams(body)) {
    if (key.length <= 80 && value.length <= 8_192 && values[key] === undefined) {
      values[key] = value;
    }
  }
  return values;
}

function isMatchingAmount(value: string | null | undefined, total: unknown) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return false;
  const parsed = Number(value);
  const expected = Number(total);
  return (
    Number.isFinite(parsed) &&
    Number.isFinite(expected) &&
    Math.round(parsed * 100) === Math.round(expected * 100)
  );
}

function isPaymentId(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{1,100}$/.test(value));
}

async function cancelFailedReservation(orderId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("cancel_order_reservation", {
    p_order_id: orderId,
    p_payment_failed: true,
  });
  if (error) {
    console.error("PayU failed-reservation cancellation could not complete", {
      code: error.code,
    });
  }
}

export async function POST(request: Request) {
  const fields = await readPayUForm(request);
  const transactionId = fields?.txnid;
  const limit = await rateLimitRequest(
    request,
    RATE_LIMITS.paymentVerify,
    transactionId ? `payu:${transactionId}` : undefined,
  );
  if (!limit.success) return checkoutRedirect(request, "confirmation-pending");

  const environment = getPayUEnvironment();
  if (
    !fields ||
    !environment ||
    !transactionId ||
    !/^payu[a-f0-9]{20}$/.test(transactionId) ||
    fields.key !== environment.key ||
    !verifyPayUResponseHash(fields, environment.salt)
  ) {
    return checkoutRedirect(request, "verification-failed");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return checkoutRedirect(request, "confirmation-pending");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, payment_method, payu_txn_id")
    .eq("payu_txn_id", transactionId)
    .maybeSingle();
  if (
    orderError ||
    !order ||
    order.payment_method !== "payu" ||
    order.payu_txn_id !== transactionId ||
    fields.udf1 !== order.id ||
    !isMatchingAmount(fields.amount, order.total)
  ) {
    return checkoutRedirect(request, "verification-failed");
  }

  const verification = await verifyPayUPayment(environment, transactionId);
  if (verification.outcome === "unavailable") {
    return checkoutRedirect(request, "confirmation-pending");
  }

  const callbackPaymentId = fields.mihpayid;
  const paymentWasVerified =
    verification.status === "success" &&
    verification.transactionId === transactionId &&
    isMatchingAmount(verification.amount, order.total) &&
    isPaymentId(verification.paymentId) &&
    (!callbackPaymentId || callbackPaymentId === verification.paymentId);

  if (paymentWasVerified) {
    const paymentId = verification.paymentId;
    if (!paymentId) return checkoutRedirect(request, "confirmation-pending");
    const { error } = await supabase.rpc("confirm_payu_payment", {
      p_order_id: order.id,
      p_payu_txn_id: transactionId,
      p_payu_payment_id: paymentId,
    });
    if (error) return checkoutRedirect(request, "confirmation-pending");

    after(() => syncShiprocketOrder(order.id));

    try {
      return successRedirect(request, createOrderAccessToken(order.id));
    } catch {
      return checkoutRedirect(request, "confirmation-pending");
    }
  }

  if (verification.status === "failure") {
    await cancelFailedReservation(order.id);
    return checkoutRedirect(request, "failed");
  }

  return checkoutRedirect(request, "confirmation-pending");
}
