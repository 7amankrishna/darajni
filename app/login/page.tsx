import type { Metadata } from "next";

import { CustomerAccountPage } from "@/components/account/customer-account-page";
import { getCustomerAccountData } from "@/lib/data/account";

export const metadata: Metadata = {
  title: "Customer account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <CustomerAccountPage initialAccount={await getCustomerAccountData()} />;
}
