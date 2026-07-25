import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data/catalog";
import {
  shiprocketPage,
  shiprocketPagination,
  toShiprocketProduct,
} from "@/lib/shiprocket-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { products } = await getCatalog();
  const page = shiprocketPage(
    products.map((product) => toShiprocketProduct(product, new URL(request.url).origin)),
    shiprocketPagination(request),
  );
  return NextResponse.json({ products: page.data, pagination: page.pagination });
}
