import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Guest checkout",
  robots: { index: false, follow: false },
};

export default async function Page() {
  return <CheckoutForm settings={await getStoreSettings()} />;
}
