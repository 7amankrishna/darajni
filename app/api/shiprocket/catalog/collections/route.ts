import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data/catalog";
import {
  shiprocketPage,
  shiprocketPagination,
  toShiprocketCollection,
} from "@/lib/shiprocket-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { categories } = await getCatalog();
  const page = shiprocketPage(
    categories.map((category) =>
      toShiprocketCollection(category, new URL(request.url).origin),
    ),
    shiprocketPagination(request),
  );
  return NextResponse.json({ collections: page.data, pagination: page.pagination });
}
