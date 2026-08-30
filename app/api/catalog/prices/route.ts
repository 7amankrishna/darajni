import { NextResponse } from "next/server";

import { getProductPrice } from "@/lib/commerce";
import { getCatalog } from "@/lib/data/catalog";
import { isSameOrigin, readJsonBody } from "@/lib/security/request";

export const runtime = "nodejs";

// Live pricing for cart reconciliation. The cart persists in localStorage and
// can hold prices captured days ago; this endpoint lets the client refresh each
// item against the authoritative catalog so what the cart shows always matches
// what checkout will charge.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await readJsonBody(request)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? Array.from(
        new Set(
          body.ids.filter((value): value is string => typeof value === "string"),
        ),
      ).slice(0, 100)
    : [];

  if (!ids.length) {
    return NextResponse.json({ products: [] });
  }

  const { products } = await getCatalog();
  const wanted = new Set(ids);
  const result = products
    .filter((product) => wanted.has(product.id))
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || "/logo.webp",
      unitPrice: getProductPrice(product),
      stock: product.stock,
    }));

  const response = NextResponse.json({ products: result });
  // Prices and stock move independently of the page cache; never serve a stale
  // reconciliation from the browser cache.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
