import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

interface OrderTokenPayload {
  orderId: string;
  exp: number;
}

function getSecret() {
  return (
    process.env.ORDER_ACCESS_SECRET ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    null
  );
}

export function isOrderAccessConfigured() {
  return Boolean(getSecret());
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createOrderAccessToken(
  orderId: string,
  lifetimeSeconds = 60 * 60 * 24,
) {
  const secret = getSecret();
  if (!secret) throw new Error("ORDER_ACCESS_SECRET is not configured.");

  const payload: OrderTokenPayload = {
    orderId,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyOrderAccessToken(token: string): OrderTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as OrderTokenPayload;
    if (
      typeof payload.orderId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
