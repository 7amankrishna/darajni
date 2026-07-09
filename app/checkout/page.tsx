import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import {
  getCustomerUser,
  getOrCreateCustomerProfile,
} from "@/lib/data/account";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const settingsPromise = getStoreSettings();
  const user = await getCustomerUser();
  const customerProfile = user ? await getOrCreateCustomerProfile(user) : null;

  return (
    <CheckoutForm
      settings={await settingsPromise}
      customerProfile={customerProfile}
    />
  );
}
