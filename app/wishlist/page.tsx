import type { Metadata } from "next";

import { WishlistPage } from "@/components/wishlist/wishlist-page";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const { products } = await getCatalog();

  return <WishlistPage products={products} />;
}
