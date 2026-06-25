import type { Metadata } from "next";

import { CartPage } from "@/components/cart/cart-page";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Shopping cart",
  robots: { index: false, follow: false },
};

export default async function Page() {
  return <CartPage settings={await getStoreSettings()} />;
}
