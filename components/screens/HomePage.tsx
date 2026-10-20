import {
  ArrowRight,
  HeartHandshake,
  type LucideIcon,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Truck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { CustomCoutureBanner, ShopByOccasion, AtelierStory } from "@/components/home-editorials";
import { curatedProducts } from "@/lib/storefront";
import DressShowcase from "@/components/DressShowcase";
import { FeaturedProductsSlider } from "@/components/featured-products-slider";
import Hero from "@/components/Hero";
import { HomepageLaunchSliderLazy } from "@/components/homepage-launch-slider-lazy";
import { RequestedDressesHomepageTeaser } from "@/components/requested-dresses-homepage-teaser";
import { EventsSlider } from "@/components/events-slider";
import { siteConfig } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Product, Category } from "@/types/commerce";
import { getActiveHomepageSlides } from "@/lib/data/homepage-slides";
import { getActiveEventBanners } from "@/lib/data/events";
import { getRequestedDresses } from "@/lib/data/requested-dresses";
import { getCatalog, getStoreSettings } from "@/lib/data/catalog";

function PolicyPreview() {
  const policies: Array<[string, string, string, LucideIcon]> = [
    ["Shipping", "Pan-India delivery with tracking updates.", "/shipping-policy", Truck],
    ["Exchange", "Eligibility and custom-size rules explained.", "/returns-exchange", HeartHandshake],
    ["Custom Size", "Measurements are collected and confirmed.", "/size-guide", Ruler],
    ["Payment Safety", "Payment options are shown at checkout.", "/terms", ShieldCheck],
  ];

  return (
    <section data-reveal className="atelier-policies bg-surface-alt py-20 sm:py-24">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Before you order</p>
            <h2 className="font-display mt-4 text-5xl leading-none text-text-primary">
              Clear policies, easy support.
            </h2>
          </div>
          <Link href="/support" className="secondary-button w-fit">
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </Link>
        </div>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {policies.map(([title, text, href, Icon]) => (
            <Link
              key={title}
              href={href}
              className="group/card rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[var(--shadow-luxe-sm)]"
            >
              <span className="icon-medallion">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display mt-5 text-2xl text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--gold-dark)] transition-all duration-300 group-hover/card:gap-2.5">
                View policy
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section data-reveal className="atelier-closing bg-surface px-4 py-16 sm:py-20">
      <div className="section-shell closing-cta overflow-hidden rounded-[2rem] border border-accent/35 px-6 py-12 sm:px-10 lg:px-14">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-surface/82 px-3 py-2 text-[0.68rem] font-extrabold uppercase text-primary">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Your occasion, your fit
            </span>
            <h2 className="font-display mt-5 text-5xl leading-none text-text-primary sm:text-6xl">
              Find a design you love. We&apos;ll help with the fit.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary">
              Explore the live collection, check every product closely, and
              order with sizing support from a real DARAJNI team member.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/collection" className="primary-button min-w-52">
              Explore the collection
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/support" className="secondary-button min-w-52">
              <MessageCircle className="h-4 w-4" />
              Talk to support
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [{ products, categories }, homepageSlides, eventBanners, requestedDresses, settings] = await Promise.all([
    getCatalog(),
    getActiveHomepageSlides(),
    getActiveEventBanners(),
    getRequestedDresses(),
    getStoreSettings(),
  ]);
  const availableCategories = categories.filter((category: Category) =>
    products.some((product: Product) => product.category.id === category.id),
  );
  const dbFeatured = products.filter((product: Product) => product.isFeatured && product.isActive);
  const featured = (dbFeatured.length > 0 ? dbFeatured : curatedProducts(products)).slice(0, 10);
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
      priceRange: "INR",
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "DARAJNI designer collection",
      url: siteConfig.siteUrl,
      description:
        `A live catalog of DARAJNI ${availableCategories
          .map((category: Category) => category.name.toLowerCase())
          .join(", ") || "designer occasion wear"}.`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product: Product, index: number) => ({
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
      itemListElement: products.map((product: Product, index: number) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.siteUrl}/design/${product.slug}`,
        name: product.name,
        item: {
          "@type": "Product",
          name: product.name,
          image: product.images,
          description: isProductInformationUncertain(product.description)
            ? `${product.name} by DARAJNI Designer House.`
            : product.description,
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
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main id="main-content" className="atelier-home">
        <Hero products={products} settings={settings} />
        {/* Collection Section ID anchor */}
        <div id="collection-preview" />
        <DressShowcase products={products} categories={availableCategories} />

        {/* New Launches Slider */}
        <HomepageLaunchSliderLazy slides={homepageSlides} />

        {/* Featured Products / New Arrivals */}
        {featured.length > 0 && (
          <section data-reveal className="bg-background py-16 sm:py-24">
            <div className="section-shell">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="font-display text-4xl sm:text-6xl text-text-primary">
                  The Curated Edit
                </h2>
                <div className="h-px flex-1 bg-accent/25" />
                <Link
                  href="/collection?sort=newest"
                  className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--gold-dark)] transition-colors hover:text-text-primary whitespace-nowrap"
                  aria-label="View new arrivals"
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <FeaturedProductsSlider products={featured} />
            </div>
          </section>
        )}

        <CustomCoutureBanner products={products} />
        <ShopByOccasion products={products} />
        <EventsSlider eventBanners={eventBanners} />
        <AtelierStory products={products} />
        <RequestedDressesHomepageTeaser requests={requestedDresses} />
        <PolicyPreview />
        <ClosingCta />
      </main>
    </>
  );
}
