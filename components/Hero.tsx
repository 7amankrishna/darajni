"use client";

import { ArrowRight, ShoppingBag, Truck, ShieldCheck, RefreshCcw, HeadphonesIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Great_Vibes, Playfair_Display, Cinzel, Montserrat } from "next/font/google";

import { ProductImage } from "@/components/product/product-image";
import { getProductPrice } from "@/lib/commerce";
import type { Product, StoreSettings } from "@/types/commerce";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ weight: "400", subsets: ["latin"], display: "swap" });
const cinzel = Cinzel({ weight: "400", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ weight: "400", subsets: ["latin"], display: "swap" });

const fontMap: Record<string, string> = {
  "Great_Vibes": greatVibes.className,
  "Playfair_Display": playfair.className,
  "Cinzel": cinzel.className,
  "Montserrat": montserrat.className,
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Hero({
  products,
  settings,
}: {
  products: Product[];
  settings: StoreSettings;
}) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const heroProducts = featuredProducts.length ? featuredProducts : products;
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredProduct = heroProducts[activeIndex] ?? null;
  const heroImage = featuredProduct?.images[0] ?? "/logo.webp";
  const cursiveClass = fontMap[settings.heroFontFamily] || greatVibes.className;

  useEffect(() => {
    setActiveIndex(0);
  }, [heroProducts.length]);

  useEffect(() => {
    if (heroProducts.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroProducts.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroProducts.length]);

  return (
    <section className="hero-lux relative w-full overflow-hidden bg-background text-text-primary">
      {/* Feathered garment image on the right */}
      <div className="absolute inset-0 z-[1] flex justify-end">
        <div className="hero-lux-media relative h-full w-full lg:w-[66%]">
          <ProductImage
            key={featuredProduct?.id ?? "hero-fallback"}
            src={heroImage}
            alt={featuredProduct ? `${featuredProduct.name} — DARAJNI designer collection` : "DARAJNI designer collection"}
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
            className="hero-lux-img h-full w-full object-cover object-top"
          />
        </div>
      </div>

      {/* Editorial copy */}
      <div className="section-shell hero-lux-inner relative z-[3] flex items-center">
        <div className="hero-lux-copy max-w-[34rem]">
          <p className="flex items-center gap-3.5 text-[0.68rem] font-bold uppercase tracking-[0.32em]" style={{ color: settings.heroAccentColor }}>
            <span className="hidden h-px w-10 sm:block" style={{ background: `linear-gradient(90deg, ${settings.heroAccentColor}, transparent)` }} aria-hidden="true" />
            {settings.heroEyebrow}
          </p>

          <h1 className="font-display mt-5 sm:mt-6 text-[3.2rem] font-medium leading-[0.92] tracking-[-0.01em] text-text-primary sm:text-[4.75rem] lg:text-[6rem]">
            {settings.heroTitle}
            <span
              className={`block leading-[0.8] ${cursiveClass}`}
              style={{
                fontSize: "clamp(4rem, 8.4vw, 8rem)",
                marginTop: "-0.06em",
                color: settings.heroAccentColor,
                filter: "drop-shadow(0 8px 22px rgba(143,106,53,0.22))",
              }}
            >
              {settings.heroCursiveTitle}
            </span>
          </h1>

          <p className="mt-6 max-w-[23rem] whitespace-pre-line text-base leading-[1.75] text-text-secondary sm:text-[1.06rem]">
            {settings.heroSubtitle}
          </p>

          <div className="mt-9 flex flex-col flex-wrap items-stretch gap-3.5 sm:flex-row sm:items-center">
            <Link href="/collection" className="primary-button">
              Explore Collection
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link href="/requested-dresses" className="secondary-button">
              Request a Custom Dress
            </Link>
          </div>

          {/* Slide progress */}
          {heroProducts.length > 1 && (
            <div className="mt-11 flex items-center gap-5">
              <div className="flex gap-2.5">
                {heroProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${product.name}`}
                    aria-current={index === activeIndex}
                    className={`hero-lux-dot ${index === activeIndex ? "is-active" : ""}`}
                  />
                ))}
              </div>
              <span className="text-[0.72rem] font-semibold tracking-[0.2em] text-text-secondary">
                <b className="text-text-primary">{String(activeIndex + 1).padStart(2, "0")}</b>
                {" / "}
                {String(heroProducts.length).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Featured look chip */}
      {featuredProduct && (
        <Link
          href={`/design/${featuredProduct.slug}`}
          className="hero-lux-featured group"
          aria-label={`View ${featuredProduct.name}`}
        >
          <span className="flex flex-col gap-0.5">
            <small className="text-[0.56rem] font-extrabold uppercase tracking-[0.22em] text-[var(--gold-dark)]">
              Featured Look
            </small>
            <strong className="font-display text-lg font-semibold leading-none text-text-primary line-clamp-1">
              {featuredProduct.name}
            </strong>
            <span className="mt-0.5 text-xs font-semibold text-text-secondary">
              {inr.format(getProductPrice(featuredProduct))}
            </span>
          </span>
          <span className="hero-lux-featured-arrow">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Slim assurance strip */}
      <div className="hero-lux-assurance relative z-[5]">
        <div className="section-shell grid grid-cols-2 sm:grid-cols-4">
          <div className="hero-lux-assure">
            <Truck className="hero-lux-assure-ico h-4 w-4" />
            <span>Free Shipping <b>over ₹999</b></span>
          </div>
          <div className="hero-lux-assure">
            <ShieldCheck className="hero-lux-assure-ico h-4 w-4" />
            <span>Secure <b>Checkout</b></span>
          </div>
          <div className="hero-lux-assure">
            <RefreshCcw className="hero-lux-assure-ico h-4 w-4" />
            <span>7-Day <b>Returns</b></span>
          </div>
          <div className="hero-lux-assure">
            <HeadphonesIcon className="hero-lux-assure-ico h-4 w-4" />
            <span>Dedicated <b>Support</b></span>
          </div>
        </div>
      </div>
    </section>
  );
}
