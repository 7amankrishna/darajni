import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getShiprocketCheckoutEnvironment } from "@/lib/config/server-env";

export const SHIPROCKET_CHECKOUT_BASE_URL =
  "https://checkout-api.shiprocket.com";

const VARIANT_SEPARATOR = "--sr-size--";

export function createShiprocketCheckoutSignature(body: string) {
  const environment = getShiprocketCheckoutEnvironment();
  if (!environment) return null;
  return createHmac("sha256", environment.secretKey)
    .update(body, "utf8")
    .digest("base64");
}

export function hasValidShiprocketCheckoutSignature(
  body: string,
  received: string | null,
) {
  const expected = createShiprocketCheckoutSignature(body);
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getShiprocketCheckoutCredentials() {
  return getShiprocketCheckoutEnvironment();
}

// Shiprocket Checkout returns the exact variant_id supplied at token creation.
// Encoding the selected size keeps the existing product-and-size inventory model.
export function toShiprocketVariantId(productId: string, size: string) {
  return `${productId}${VARIANT_SEPARATOR}${Buffer.from(size, "utf8").toString(
    "base64url",
  )}`;
}

export function fromShiprocketVariantId(value: unknown) {
  const variantId = String(value ?? "");
  const marker = variantId.indexOf(VARIANT_SEPARATOR);
  if (marker < 1) return null;

  const productId = variantId.slice(0, marker);
  const encodedSize = variantId.slice(marker + VARIANT_SEPARATOR.length);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    ) ||
    !/^[A-Za-z0-9_-]{2,80}$/.test(encodedSize)
  ) {
    return null;
  }

  try {
    const size = Buffer.from(encodedSize, "base64url").toString("utf8").trim();
    return size.length > 0 && size.length <= 40 ? { productId, size } : null;
  } catch {
    return null;
  }
}
