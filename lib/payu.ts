import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export interface PayUEnvironment {
  key: string;
  salt: string;
  paymentUrl: "https://test.payu.in/_payment" | "https://secure.payu.in/_payment";
  verificationUrl:
    | "https://test.payu.in/merchant/postservice.php?form=2"
    | "https://info.payu.in/merchant/postservice.php?form=2";
}

export interface PayUCheckoutRequest {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

type PayUResponseFields = Record<string, string | undefined>;

const RESPONSE_LIMIT_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

function sha512(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

function field(fields: PayUResponseFields, name: string) {
  return fields[name] ?? "";
}

function equalHash(actual: string | undefined, expected: string) {
  if (!actual || !/^[a-f0-9]{128}$/i.test(actual)) return false;
  const supplied = Buffer.from(actual, "hex");
  const calculated = Buffer.from(expected, "hex");
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated);
}

export function createPayURequestHash(
  request: PayUCheckoutRequest,
  salt: string,
) {
  const value = [
    request.key,
    request.txnid,
    request.amount,
    request.productinfo,
    request.firstname,
    request.email,
    request.udf1,
    request.udf2 ?? "",
    request.udf3 ?? "",
    request.udf4 ?? "",
    request.udf5 ?? "",
    "",
    "",
    "",
    "",
    "",
    salt,
  ].join("|");
  return sha512(value);
}

export function verifyPayUResponseHash(
  fields: PayUResponseFields,
  salt: string,
) {
  const reverseFields = [
    field(fields, "status"),
    "",
    "",
    "",
    "",
    "",
    field(fields, "udf5"),
    field(fields, "udf4"),
    field(fields, "udf3"),
    field(fields, "udf2"),
    field(fields, "udf1"),
    field(fields, "email"),
    field(fields, "firstname"),
    field(fields, "productinfo"),
    field(fields, "amount"),
    field(fields, "txnid"),
    field(fields, "key"),
  ];
  const additionalCharges = field(fields, "additional_charges");
  const signed = additionalCharges
    ? [additionalCharges, salt, ...reverseFields].join("|")
    : [salt, ...reverseFields].join("|");
  return equalHash(fields.hash, sha512(signed));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeString(value: unknown, maximumLength = 200) {
  return typeof value === "string" && value.length <= maximumLength ? value : null;
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

export async function verifyPayUPayment(
  environment: PayUEnvironment,
  transactionId: string,
): Promise<PayUVerificationResult> {
  const command = "verify_payment";
  const hash = sha512(
    [environment.key, command, transactionId, environment.salt].join("|"),
  );

  let response: Response;
  try {
    response = await fetch(environment.verificationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: environment.key,
        command,
        var1: transactionId,
        hash,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { outcome: "unavailable" };
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > RESPONSE_LIMIT_BYTES) return { outcome: "unavailable" };

  const body = await response.text();
  if (!response.ok || Buffer.byteLength(body, "utf8") > RESPONSE_LIMIT_BYTES) {
    return { outcome: "unavailable" };
  }

  let data: Record<string, unknown> | null;
  try {
    data = asRecord(JSON.parse(body));
  } catch {
    return { outcome: "unavailable" };
  }
  const details = asRecord(data?.transaction_details);
  const transaction = details ? asRecord(details[transactionId]) : null;
  if (!transaction) {
    return {
      outcome: "result",
      status: "unknown",
      transactionId: null,
      amount: null,
      paymentId: null,
    };
  }

  const status = safeString(transaction.status)?.toLowerCase();
  return {
    outcome: "result",
    status:
      status === "success" || status === "failure" || status === "pending"
        ? status
        : "unknown",
    transactionId: safeString(transaction.txnid),
    amount:
      safeString(transaction.amount) ||
      safeString(transaction.transaction_amount) ||
      safeString(transaction.amt),
    paymentId: safeString(transaction.mihpayid),
  };
}
