import type { Metadata } from "next";

import HomePage from "@/components/screens/HomePage";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/data/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { products, categories } = await getCatalog();
  const categoryNames = categories.map((category) => category.name);
  const productNames = products.slice(0, 8).map((product) => product.name);
  const description = products.length
    ? `Explore ${products.length} DARAJNI designer dresses, including ${categoryNames
        .slice(0, 4)
        .join(", ")}, with secure checkout and Pan-India delivery.`
    : siteConfig.description;

  return {
    title: "DARAJNI Designer House | Custom Indian Occasion Wear",
    description,
    alternates: { canonical: "/" },
    keywords: [
      "DARAJNI Designer House",
      "designer dresses Bihar Sharif",
      "Indian occasion wear",
      "lehenga online India",
      "saree online India",
      "anarkali dress",
      "gown designer house",
      ...categoryNames,
      ...productNames,
    ],
    openGraph: {
      title: "DARAJNI Designer House | Custom Indian Occasion Wear",
      description,
      url: siteConfig.siteUrl,
      images: products[0]?.images[0] ? [products[0].images[0]] : ["/og-cover.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: "DARAJNI Designer House",
      description,
      images: products[0]?.images[0] ? [products[0].images[0]] : ["/og-cover.svg"],
    },
  };
}

export default function Page() {
  return <HomePage />;
}
