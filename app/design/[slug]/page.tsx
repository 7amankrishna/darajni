import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPage from "@/components/screens/ProductPage";
import { siteConfig } from "@/config/site";
import { getCatalog, getProductBySlug } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found", robots: { index: false } };

  return {
    title: `${product.name} – ${product.category.name}`,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/design/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      url: `${siteConfig.siteUrl}/design/${product.slug}`,
      images: product.images[0] ? [product.images[0]] : ["/og-cover.svg"],
    },
  };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, catalog] = await Promise.all([
    getProductBySlug(slug),
    getCatalog(),
  ]);
  if (!product) notFound();

  const related = catalog.products
    .filter(
      (item) =>
        item.id !== product.id && item.category.id === product.category.id,
    )
    .slice(0, 3);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.id,
    category: product.category.name,
    brand: { "@type": "Brand", name: siteConfig.shortName },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price * (1 - product.discount / 100),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteConfig.siteUrl}/design/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <ProductPage product={product} related={related} />
    </>
  );
}
