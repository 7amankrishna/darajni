import type { Metadata } from "next";

import Collection from "@/components/Collection";
import { siteConfig } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import { getCatalog } from "@/lib/data/catalog";

type CollectionSearchParams = {
  category?: string;
  sale?: string;
  sort?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const { products, categories } = await getCatalog();
  const categorySlug = first(query.category);
  const category = categories.find(
    (item) =>
      item.slug === categorySlug &&
      products.some((product) => product.category.id === item.id),
  );
  const saleOnly = first(query.sale) === "true";
  const newest = first(query.sort) === "newest";
  const title = category
    ? `${category.name} Collection`
    : saleOnly
      ? "Sale Collection"
      : newest
        ? "New Arrivals"
        : "Indian Occasion Wear Collection";
  const description = category
    ? `Shop available DARAJNI ${category.name.toLowerCase()} designs with custom-size support, secure checkout and Pan-India delivery.`
    : "Shop DARAJNI's available Indian occasion-wear designs with custom-size support, secure checkout and Pan-India delivery.";
  const canonicalParams = new URLSearchParams();
  if (category) canonicalParams.set("category", category.slug);
  else if (saleOnly) canonicalParams.set("sale", "true");
  else if (newest) canonicalParams.set("sort", "newest");
  const canonicalQuery = canonicalParams.toString();
  const canonical = `/collection${canonicalQuery ? `?${canonicalQuery}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${siteConfig.shortName}`,
      description,
      url: `${siteConfig.siteUrl}${canonical}`,
      images: products[0]?.images[0] ? [products[0].images[0]] : ["/og-cover.svg"],
    },
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<CollectionSearchParams>;
}) {
  const query = await searchParams;
  const { products, categories } = await getCatalog();
  const requestedCategory = first(query.category);
  const initialCategory = categories.some(
    (category) =>
      category.slug === requestedCategory &&
      products.some((product) => product.category.id === category.id),
  )
    ? requestedCategory!
    : "all";
  const initialSort = ["newest", "price-low", "price-high"].includes(
    first(query.sort) || "",
  )
    ? (first(query.sort) as "newest" | "price-low" | "price-high")
    : "newest";
  const initialSale = first(query.sale) === "true";
  const visibleProducts = products
    .filter(
      (product) =>
        (initialCategory === "all" || product.category.slug === initialCategory) &&
        (!initialSale || product.discount > 0),
    )
    .sort((a, b) => {
      if (initialSort === "price-low") {
        return getProductPrice(a) - getProductPrice(b);
      }
      if (initialSort === "price-high") {
        return getProductPrice(b) - getProductPrice(a);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const structuredParams = new URLSearchParams();
  if (initialCategory !== "all") {
    structuredParams.set("category", initialCategory);
  } else if (initialSale) {
    structuredParams.set("sale", "true");
  } else if (first(query.sort)) {
    structuredParams.set("sort", initialSort);
  }
  const structuredQuery = structuredParams.toString();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name:
      initialCategory === "all"
        ? initialSale
          ? "DARAJNI sale collection"
          : "DARAJNI occasion-wear collection"
        : `${categories.find((category) => category.slug === initialCategory)?.name} collection`,
    url: `${siteConfig.siteUrl}/collection${structuredQuery ? `?${structuredQuery}` : ""}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: visibleProducts.length,
      itemListElement: visibleProducts.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: `${siteConfig.siteUrl}/design/${product.slug}`,
      })),
    },
  };

  return (
    <main className="bg-[#FFF8EF]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Collection
        key={`${initialCategory}:${initialSort}:${initialSale}`}
        products={products}
        categories={categories}
        mode="page"
        initialCategory={initialCategory}
        initialSort={initialSort}
        initialSortInUrl={Boolean(first(query.sort))}
        initialSale={initialSale}
      />
    </main>
  );
}
