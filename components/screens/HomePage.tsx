import Link from "next/link";

import About from "@/components/About";
import AnimatedSection from "@/components/AnimatedSection";
import Card3DReveal from "@/components/Card3DReveal";
import Collection from "@/components/Collection";
import DesignCard from "@/components/DesignCard";
import DressShowcase from "@/components/DressShowcase";
import Hero from "@/components/Hero";
import { siteConfig } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import { getCatalog } from "@/lib/data/catalog";

export default async function HomePage() {
  const { products, categories } = await getCatalog();
  const featured = products.filter((product) => product.isFeatured).slice(0, 3);
  const newArrivals = products.slice(0, 3);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ClothingStore",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
      description: siteConfig.description,
      email: siteConfig.email,
      address: {
        "@type": "PostalAddress",
        addressLocality: siteConfig.locality,
        addressRegion: siteConfig.region,
        postalCode: siteConfig.postalCode,
        addressCountry: "IN",
      },
      areaServed: { "@type": "Country", name: "India" },
      priceRange: "₹₹",
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "DARAJNI interactive dress showcase",
      url: siteConfig.siteUrl,
      description:
        "A live catalog of DARAJNI designer lehengas, sarees, anarkalis and gowns.",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteConfig.siteUrl}/design/${product.slug}`,
          name: product.name,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "DARAJNI collection",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.siteUrl}/design/${product.slug}`,
        name: product.name,
        item: {
          "@type": "Product",
          name: product.name,
          image: product.images,
          description: product.description,
          category: product.category.name,
          brand: { "@type": "Brand", name: siteConfig.shortName },
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: getProductPrice(product),
            availability:
              product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: `${siteConfig.siteUrl}/design/${product.slug}`,
          },
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteConfig.siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Collection",
          item: `${siteConfig.siteUrl}/#collection`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Hero products={products} categoryCount={categories.length} />

      <AnimatedSection>
        <DressShowcase products={products} categories={categories} />
      </AnimatedSection>

      {featured.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="section-shell">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Selected for you</p>
                <h2 className="font-display mt-4 text-5xl leading-none sm:text-6xl">
                  Featured pieces in depth.
                </h2>
              </div>
              <Link href="/#collection" className="secondary-button w-fit">
                View all dresses
              </Link>
            </div>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product, index) => (
                <Card3DReveal key={product.id} index={index}>
                  <DesignCard product={product} />
                </Card3DReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="showcase-band border-y border-white/8 py-20 sm:py-28">
          <div className="section-shell">
            <p className="eyebrow">Fresh from the studio</p>
            <h2 className="font-display mt-4 text-5xl leading-none sm:text-6xl">
              New arrivals with real product detail.
            </h2>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {newArrivals.map((product, index) => (
                <Card3DReveal key={product.id} index={index}>
                  <DesignCard product={product} />
                </Card3DReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <AnimatedSection>
        <Collection products={products} categories={categories} />
      </AnimatedSection>

      <AnimatedSection>
        <About />
      </AnimatedSection>
    </>
  );
}
