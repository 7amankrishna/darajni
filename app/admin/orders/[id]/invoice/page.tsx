import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintDocument } from "@/components/admin/print-document";
import { getAdminOrder } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Print invoice",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  return <PrintDocument order={order} type="invoice" />;
}
