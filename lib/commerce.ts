import type { Product } from "@/types/commerce";

export function getDiscountedPrice(
  price: number,
  discount: number,
): number {
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function getProductPrice(product: Pick<Product, "price" | "discount">) {
  return getDiscountedPrice(product.price, product.discount);
}

export function isProductInformationUncertain(value: string) {
  return /\b(appears?|seems?|possibly|likely|style)\b|\bor\b|-style\b/i.test(
    value,
  );
}

export function normalizeIndianPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export function getEstimatedDelivery(createdAt: string) {
  const earliest = new Date(createdAt);
  const latest = new Date(createdAt);
  earliest.setDate(earliest.getDate() + 7);
  latest.setDate(latest.getDate() + 12);
  return { earliest, latest };
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}
