import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductPage from "@/components/screens/ProductPage";
import { siteConfig } from "@/config/site";
import { isProductInformationUncertain } from "@/lib/commerce";
import { getCatalog, getProductBySlug, getStoreSettings } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = isProductInformationUncertain(product.description)
    ? `View ${product.name} from DARAJNI Designer House with size support, secure checkout and Pan-India delivery.`
    : product.description.slice(0, 155);

  return {
    title: `${product.name} – ${product.category.name}`,
    description,
    alternates: { canonical: `/design/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
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
  const [product, catalog, settings] = await Promise.all([
    getProductBySlug(slug),
    getCatalog(),
    getStoreSettings(),
  ]);
  if (!product) notFound();

  const related = catalog.products
    .filter(
      (item) =>
        item.id !== product.id && item.category.id === product.category.id,
    )
    .slice(0, 3);
  const structuredDescription = isProductInformationUncertain(product.description)
    ? `${product.name} by DARAJNI Designer House.`
    : product.description;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: structuredDescription,
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
      <ProductPage
        product={product}
        related={related}
        supportNumber={settings.designerSupportNumber || settings.developerSupportNumber}
        settings={settings}
      />
    </>
  );
}
