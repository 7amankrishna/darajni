import { after, NextResponse } from "next/server";

import { getPayUEnvironment } from "@/lib/config/server-env";
import { verifyPayUResponseHash } from "@/lib/security/payu";
import { RATE_LIMITS, rateLimitRequest } from "@/lib/security/rate-limit";
import { syncShiprocketOrder } from "@/lib/shiprocket";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await rateLimitRequest(request, RATE_LIMITS.paymentWebhook);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const payuEnv = getPayUEnvironment();
  if (!payuEnv) {
    return NextResponse.json({ error: "PayU unavailable" }, { status: 503 });
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
    console.error("PayU webhook body parse error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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

  if (!txnid || !status || !hash) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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

  if (!isValidHash) {
    console.error("PayU webhook: Hash verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (status.toLowerCase() !== "success") {
    return NextResponse.json({ status: "ignored_unsuccessful_status" }, { status: 200 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("payu_txn_id", txnid)
    .maybeSingle();

  if (fetchError || !order) {
    console.error("PayU webhook: Order lookup failed", fetchError);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  const paymentId = mihpayid || payuMoneyId || txnid;
  const { error: confirmError } = await supabase.rpc("confirm_payu_payment", {
    p_order_id: order.id,
    p_payu_txn_id: txnid,
    p_payu_payment_id: paymentId,
  });

  if (confirmError) {
    console.error("PayU webhook: Confirm payment RPC error", confirmError);
    return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
  }

  after(() => syncShiprocketOrder(order.id));

  return NextResponse.json({ status: "success" }, { status: 200 });
}
