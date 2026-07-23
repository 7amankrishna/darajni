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

  return (
    crypto.timingSafeEqual(
      Buffer.from(calculatedHash.toLowerCase()),
      Buffer.from(hash.toLowerCase()),
    )
  );
}
