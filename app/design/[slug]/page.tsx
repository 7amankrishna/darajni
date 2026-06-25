import type { Metadata } from "next";

import ProductPage from "@/components/screens/ProductPage";

export const metadata: Metadata = {
  title: "Design details",
  description: "View fabric, pricing, images, and customer reviews for this DARAJNI design.",
};

export default async function DesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductPage slug={slug} />;
}
