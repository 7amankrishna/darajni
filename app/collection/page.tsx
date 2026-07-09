import type { Metadata } from "next";

import Collection from "@/components/Collection";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Collection",
  description:
    "Explore DARAJNI lehengas, gowns, sarees and occasion wear available for custom-size ordering.",
};

export default async function Page() {
  const { products, categories } = await getCatalog();

  return (
    <main className="bg-[#FFF8EF]">
      <Collection products={products} categories={categories} mode="page" />
    </main>
  );
}
