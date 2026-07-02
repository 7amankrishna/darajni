import Link from "next/link";
import dynamic from "next/dynamic";

import About from "@/components/About";
import Collection from "@/components/Collection";
import DesignCard from "@/components/DesignCard";
import Hero from "@/components/Hero";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/data/catalog";
import { useInView } from "@/lib/useInView";
import { useEffect, useState } from "react";

const DynamicCollection = dynamic(() => import("@/components/Collection"), {
  loading: () => <p className="text-center py-8">Loading collection...</p>,
});

const DynamicAbout = dynamic(() => import("@/components/About"), {
  loading: () => <p className="text-center py-8">Loading about...</p>,
});

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
      "@type": "ItemList",
      name: "DARAJNI collection",
      itemListElement: products.slice(0, 12).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.siteUrl}/design/${product.slug}`,
        name: product.name,
      })),
    },
  ];

  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const [collectionObserverRef, isCollectionVisible] = useInView<HTMLDivElement>({
    threshold: 0.1,
  });
  const [aboutObserverRef, isAboutVisible] = useInView<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Hero />

      <section className="border-y border-white/8 bg-[#0d0d0c] py-16">
        <div className="section-shell">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="eyebrow">Shop by category</p>
              <h2 className="font-display mt-3 text-4xl sm:text-5xl">
                Choose your occasion
              </h2>
            </div>
            <Link
              href="/#collection"
              className="hidden text-xs font-bold uppercase tracking-wider text-[#d7b979] sm:block"
            >
              View all products →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/#collection`}
                className="group relative min-h-32 overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top,rgba(202,170,112,.15),transparent_70%)] p-4 transition hover:border-[#caaa70]/45"
              >
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/28">
                  0{index + 1}
                </span>
                <p className="font-display absolute inset-x-4 bottom-4 text-2xl text-[#e1c68f]">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="section-shell">
            <p className="eyebrow">Selected for you</p>
            <h2 className="font-display mt-4 text-5xl sm:text-6xl">
              Featured pieces
            </h2>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <DesignCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="border-y border-white/8 bg-[#0d0d0c] py-20 sm:py-28">
          <div className="section-shell">
            <p className="eyebrow">Fresh from the studio</p>
            <h2 className="font-display mt-4 text-5xl sm:text-6xl">
              New arrivals
            </h2>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {newArrivals.map((product) => (
                <DesignCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collection section with animation and dynamic import */}
      <div
        ref={collectionObserverRef}
        className={`${reduceMotion || isCollectionVisible ? "animate-fade-up visible" : "animate-fade-up"}`}
      >
        <DynamicCollection products={products} categories={categories} />
      </div>

      {/* About section with animation and dynamic import */}
      <div
        ref={aboutObserverRef}
        className={`${reduceMotion || isAboutVisible ? "animate-fade-up visible" : "animate-fade-up"}`}
      >
        <DynamicAbout />
      </div>
    </>
  );
}