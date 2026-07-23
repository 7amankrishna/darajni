import crypto from "node:crypto";

export interface PayUHashParams {
  key: string;
  txnid: string;
  amount: string | number;
  productinfo: string;
  firstname: string;
  email: string;
  salt: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export interface PayUResponseParams {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  hash: string;
  salt: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  additionalCharges?: string;
}

export interface PayUVerificationEnvironment {
  key: string;
  salt: string;
  verificationUrl: string;
}

export type PayUVerificationResult =
  | { outcome: "unavailable" }
  | {
      outcome: "result";
      status: "success" | "failure" | "pending" | "unknown";
      transactionId: string | null;
      amount: string | null;
      paymentId: string | null;
    };

export function generatePayURequestHash(params: PayUHashParams): string {
  const formattedAmount =
    typeof params.amount === "number"
      ? params.amount.toFixed(2)
      : params.amount;

  const hashString = [
    params.key,
    params.txnid,
    formattedAmount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 || "",
    params.udf2 || "",
    params.udf3 || "",
    params.udf4 || "",
    params.udf5 || "",
    "", // empty UDF 6-10
    "",
    "",
    "",
    "",
    params.salt,
  ].join("|");

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

export function verifyPayUResponseHash(params: PayUResponseParams): boolean {
  const {
    salt,
    status,
    udf5 = "",
    udf4 = "",
    udf3 = "",
    udf2 = "",
    udf1 = "",
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
    additionalCharges,
    hash,
  } = params;

  let hashSequence = [
    salt,
    status,
    "", // UDF 10 down to 6
    "",
    "",
    "",
    "",
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    key,
  ].join("|");

  if (additionalCharges) {
    hashSequence = `${additionalCharges}|${hashSequence}`;
  }

  const calculatedHash = crypto
    .createHash("sha512")
    .update(hashSequence)
    .digest("hex");

  const expected = Buffer.from(calculatedHash, "utf8");
  const received = Buffer.from(hash.toLowerCase(), "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text || null;
}

/**
 * Queries PayU's server-to-server Verify Payment API. Browser return data is
 * useful for routing the customer back to the store, but this result is the
 * source of truth before an order is marked paid or failed.
 */
export async function verifyPayUPayment(
  environment: PayUVerificationEnvironment,
  transactionId: string,
): Promise<PayUVerificationResult> {
  const command = "verify_payment";
  const hash = crypto
    .createHash("sha512")
    .update(`${environment.key}|${command}|${transactionId}|${environment.salt}`)
    .digest("hex");

  try {
    const response = await fetch(environment.verificationUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: environment.key,
        command,
        var1: transactionId,
        hash,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { outcome: "unavailable" };

    const payload = asRecord(await response.json());
    const details = asRecord(payload?.transaction_details);
    const transaction = asRecord(details?.[transactionId]);
    if (!transaction) {
      return {
        outcome: "result",
        status: "unknown",
        transactionId: null,
        amount: null,
        paymentId: null,
      };
    }

    const rawStatus = asText(transaction.status)?.toLowerCase();
    const status =
      rawStatus === "success"
        ? "success"
        : rawStatus === "failure" || rawStatus === "failed"
          ? "failure"
          : rawStatus === "pending" || rawStatus === "in progress"
            ? "pending"
            : "unknown";

    return {
      outcome: "result",
      status,
      transactionId: asText(transaction.txnid) || transactionId,
      amount:
        asText(transaction.amt) ||
        asText(transaction.transaction_amount) ||
        asText(transaction.amount),
      paymentId:
        asText(transaction.mihpayid) ||
        asText(transaction.payuMoneyId) ||
        asText(transaction.payu_payment_id),
    };
  } catch {
    return { outcome: "unavailable" };
  }
}
