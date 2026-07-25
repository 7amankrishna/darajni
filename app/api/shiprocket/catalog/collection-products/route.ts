import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data/catalog";
import {
  shiprocketPage,
  shiprocketPagination,
  toShiprocketProduct,
} from "@/lib/shiprocket-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collection_id")?.trim();
  if (!collectionId) {
    return NextResponse.json({ error: "collection_id is required." }, { status: 400 });
  }

  const { products } = await getCatalog();
  const filtered = products.filter((product) => product.category.id === collectionId);
  const page = shiprocketPage(
    filtered.map((product) => toShiprocketProduct(product, url.origin)),
    shiprocketPagination(request),
  );
  return NextResponse.json({ products: page.data, pagination: page.pagination });
}
