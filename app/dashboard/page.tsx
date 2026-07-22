import type { Metadata } from "next";

import { CustomerAccountPage } from "@/components/account/customer-account-page";
import { getCustomerAccountData } from "@/lib/data/account";

export const metadata: Metadata = {
  title: "Your dashboard",
  description:
    "Track the live progress of your DARAJNI orders from placement to delivery.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return <CustomerAccountPage initialAccount={await getCustomerAccountData()} />;
}
