import {
  ArrowRight,
  HeartHandshake,
  type LucideIcon,
  MessageCircle,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Truck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import About from "@/components/About";
import DesignCard from "@/components/DesignCard";
import DressShowcase from "@/components/DressShowcase";
import Hero from "@/components/Hero";
import { HomepageLaunchSliderLazy } from "@/components/homepage-launch-slider-lazy";
import { MeasurementGuideFigure } from "@/components/measurement-guide-figure";
import { ProductImage } from "@/components/product/product-image";
import { RequestedDressesHomepageTeaser } from "@/components/requested-dresses-homepage-teaser";
import { siteConfig } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import { getCatalog } from "@/lib/data/catalog";
import { getActiveHomepageSlides } from "@/lib/data/homepage-slides";
import { getRequestedDresses } from "@/lib/data/requested-dresses";

function CustomFitSection() {
  const steps = [
    ["Choose your outfit", "Pick a live DARAJNI design from the collection."],
    ["Share your measurements", "Use the guide or get help on WhatsApp after ordering."],
    ["We prepare your custom fit", "Our team confirms details before dispatch."],
  ];

  return (
    <section data-reveal className="bg-surface-alt py-24 sm:py-32">
      <div className="section-shell grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="eyebrow">Custom size ordering</p>
          <h2 className="font-display mt-4 text-5xl leading-none text-text-primary sm:text-6xl">
            Your size. Your fit. Made just for you.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary">
            Most DARAJNI pieces are prepared around your measurements, so the
            order feels personal instead of guessing from standard sizes.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map(([title, text], index) => (
              <article key={title} className="rounded-2xl border border-border bg-surface p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-surface">
                  {index + 1}
                </span>
                <h3 className="font-display mt-5 text-2xl leading-none text-text-primary">
                  {title}
                </h3>
                <p className="mt-3 text-xs leading-6 text-text-secondary">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/size-guide" className="primary-button">
              <Ruler className="h-4 w-4" />
              View Size Guide
            </Link>
            <Link href="/support" className="secondary-button">
              <MessageCircle className="h-4 w-4" />
              Get Measurement Help
            </Link>
          </div>
        </div>

        <MeasurementGuideFigure
          labels={[
            ["Shoulder", "measure-shoulder"],
            ["Bust", "measure-bust"],
            ["Waist", "measure-waist"],
            ["Hip", "measure-hip"],
            ["Length", "measure-length"],
          ]}
        />
      </div>
    </section>
  );
}

function TrustSection({ image }: { image: string }) {
  const cards: Array<[string, string, LucideIcon]> = [
    ["Live availability", "Stock is displayed on every product page.", PackageCheck],
    ["Private order tracking", "Use your order ID and matching phone number.", ShieldCheck],
    ["Human fit support", "Get measurement help before or after ordering.", HeartHandshake],
  ];

  return (
    <section data-reveal className="bg-surface py-24 sm:py-32">
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">Order with more certainty</p>
            <h2 className="font-display mt-4 text-5xl leading-none text-text-primary sm:text-6xl">
              Know what happens before you place an order.
            </h2>
          </div>
          <p className="text-sm leading-7 text-text-secondary">
            DARAJNI does not publish placeholder testimonials or ratings. The
            current trust promise is practical: live availability, clear order
            totals, private tracking and direct support when you need it.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map(([title, text, Icon]) => (
            <article key={title} className="rounded-2xl border border-border bg-surface p-6">
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="font-display mt-4 text-2xl text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[0.7fr_1.3fr] md:p-7">
          <div className="relative min-h-72 overflow-hidden rounded-2xl bg-surface-alt">
            <ProductImage src={image} alt="" sizes="(max-width: 768px) 100vw, 28vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="eyebrow">Care before scale</p>
            <h3 className="font-display mt-3 text-4xl leading-none text-text-primary">
              Every order has a clear next step.
            </h3>
            <p className="mt-4 text-sm leading-7 text-text-secondary">
              Customers can browse available products, place guest checkout
              orders, receive secure payment or COD options and track their
              order status with the same phone number used at checkout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PolicyPreview() {
  const policies: Array<[string, string, string, LucideIcon]> = [
    ["Shipping", "Pan-India delivery with tracking updates.", "/shipping-policy", Truck],
    ["Exchange", "Eligibility and custom-size rules explained.", "/returns-exchange", HeartHandshake],
    ["Custom Size", "Measurements are collected and confirmed.", "/size-guide", Ruler],
    ["Payment Safety", "COD and Razorpay checkout are clearly shown.", "/terms", ShieldCheck],
  ];

  return (
    <section data-reveal className="bg-surface-alt py-24 sm:py-32">
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
              className="rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-accent"
            >
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="font-display mt-5 text-2xl text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{text}</p>
              <span className="mt-5 inline-flex text-xs font-extrabold uppercase text-primary">
                View policy
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
    <section data-reveal className="bg-surface px-4 py-16 sm:py-20">
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
  const [{ products, categories }, homepageSlides, requestedDresses] = await Promise.all([
    getCatalog(),
    getActiveHomepageSlides(),
    getRequestedDresses(),
  ]);
  const availableCategories = categories.filter((category) =>
    products.some((product) => product.category.id === category.id),
  );
  const featured = products.filter((product) => product.isFeatured).slice(0, 6); // Show 6 featured products
  const trustImage = products.find((product) => product.images[0])?.images[0] || "/logo.webp";
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
          .map((category) => category.name.toLowerCase())
          .join(", ") || "designer occasion wear"}.`,
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
      <main id="main-content">
        <Hero products={products} />
        <HomepageLaunchSliderLazy slides={homepageSlides} />
        
        {/* Collection Section ID anchor */}
        <div id="collection-preview" />
        <DressShowcase products={products} categories={availableCategories} />

        {/* Featured Products */}
        {featured.length > 0 && (
          <section data-reveal className="bg-background py-24 sm:py-32">
            <div className="section-shell">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow text-accent">Curated Occasions</p>
                  <h2 className="font-display mt-3 text-4xl font-light text-text-primary sm:text-6xl">
                    New Arrivals &amp; Couture Picks
                  </h2>
                </div>
                <Link
                  href="/collection?sort=newest"
                  className="secondary-button w-fit"
                  aria-label="View new arrivals"
                >
                  Explore Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((product) => (
                  <DesignCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        <CustomFitSection />
        <RequestedDressesHomepageTeaser requests={requestedDresses} />
        <TrustSection image={trustImage} />
        <About />
        <PolicyPreview />
        <ClosingCta />
      </main>
    </>
  );
}
