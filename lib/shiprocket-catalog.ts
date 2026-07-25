import "server-only";

import type { Category, Product } from "@/types/commerce";

import { toShiprocketVariantId } from "@/lib/shiprocket-checkout";

type Pagination = { page: number; limit: number };

export function shiprocketPagination(request: Request): Pagination {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "100");
  return {
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100,
  };
}

export function shiprocketPage<T>(items: T[], { page, limit }: Pagination) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: items.length,
      has_next_page: start + limit < items.length,
    },
  };
}

function absoluteImage(src: string, origin: string) {
  if (!src) return "";
  try {
    return new URL(src, origin).toString();
  } catch {
    return "";
  }
}

export function toShiprocketProduct(product: Product, origin: string) {
  const effectivePrice = Math.round(
    product.price * (1 - product.discount / 100) * 100,
  ) / 100;
  const image = absoluteImage(product.images[0] || "", origin);
  return {
    id: product.id,
    title: product.name,
    body_html: product.description,
    vendor: "DARAJNI",
    product_type: product.category.name,
    handle: product.slug,
    status: product.isActive ? "active" : "draft",
    updated_at: product.updatedAt,
    image: { src: image },
    variants: product.sizes.map((size) => ({
      id: toShiprocketVariantId(product.id, size),
      title: size,
      price: effectivePrice.toFixed(2),
      quantity: product.stock,
      sku: `DJ-${product.id.slice(0, 8)}-${size
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 12) || "STD"}`,
      updated_at: product.updatedAt,
      image: { src: image },
      weight: 0.5,
    })),
  };
}

export function toShiprocketCollection(category: Category, origin: string) {
  return {
    id: category.id,
    title: category.name,
    handle: category.slug,
    body_html: "",
    image: { src: `${origin}/logo.webp` },
  };
}
