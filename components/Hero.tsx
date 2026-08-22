"use client";

import { ChevronLeft, ChevronRight, Truck, ShieldCheck, RefreshCcw, HeadphonesIcon, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Great_Vibes, Playfair_Display, Cinzel, Montserrat } from "next/font/google";

import { ProductImage } from "@/components/product/product-image";
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

  const nextSlide = () => {
    setActiveIndex((index) => (index + 1) % heroProducts.length);
  };

  const prevSlide = () => {
    setActiveIndex((index) => (index - 1 + heroProducts.length) % heroProducts.length);
  };

  return (
    <section className="relative flex min-h-[90vh] w-full flex-col bg-background text-text-primary overflow-hidden">
      {/* Dynamic blurred background to extract image color */}
      <div className="absolute inset-0 z-0">
        <ProductImage
          key={`bg-${featuredProduct?.id ?? "hero-fallback"}`}
          src={heroImage}
          alt=""
          sizes="100vw"
          priority
          className="h-full w-full object-cover blur-[80px] scale-110 opacity-60 dark:opacity-40 transition-opacity duration-1000 ease-out"
        />
      </div>

      {/* Background Image on Right Side */}
      <div className="absolute inset-0 z-0 flex justify-end">
        <div className="relative h-full w-full lg:w-[75%] lg:[mask-image:linear-gradient(to_right,transparent,black_15%)]">
          {/* Frosted glass blend that takes on the underlying image color instead of a flat white gradient */}
          <div className="absolute inset-0 z-10 backdrop-blur-2xl bg-background/20 [mask-image:linear-gradient(to_right,black_10%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,black_0%,transparent_80%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent z-10" />

          <ProductImage
            key={featuredProduct?.id ?? "hero-fallback"}
            src={heroImage}
            alt="DARAJNI designer collection"
            sizes="(max-width: 1024px) 100vw, 65vw"
            priority
            className="h-full w-full object-cover object-top transition-opacity duration-1000 ease-out"
          />
        </div>
      </div>
      
      {/* Navigation Arrows */}
      {heroProducts.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/70 text-text-primary shadow-md backdrop-blur transition hover:bg-surface sm:left-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/70 text-text-primary shadow-md backdrop-blur transition hover:bg-surface sm:right-8"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Main Content */}
      <div className="section-shell relative z-10 flex flex-1 items-center pt-32 pb-24 lg:pt-[280px] lg:pb-32">
        <div className="max-w-xl pr-6 sm:pr-12">
          <p className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-widest sm:text-text-secondary" style={{ color: settings.heroAccentColor }}>
            {settings.heroEyebrow}
          </p>
          
          <h1 className="mt-5 sm:mt-4 font-display text-[3.5rem] font-normal leading-[0.9] text-text-primary sm:text-7xl lg:text-[5.5rem] drop-shadow-sm">
            {settings.heroTitle}
            <span 
              className={`block pt-1 pb-4 text-[4.5rem] sm:text-[6rem] lg:text-[7rem] leading-none drop-shadow-md ${fontMap[settings.heroFontFamily] || greatVibes.className}`}
              style={{ color: settings.heroAccentColor }}
            >
              {settings.heroCursiveTitle}
            </span>
          </h1>

          <p className="mt-1 sm:mt-4 max-w-sm sm:max-w-full text-base leading-relaxed text-text-secondary sm:text-xl sm:font-medium whitespace-pre-line">
            {settings.heroSubtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            <Link href="/collection" className="primary-button">
              Explore Collection
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link href="/requested-dresses" className="secondary-button">
              Request a Custom Dress
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-8 text-center sm:hidden">
        <span className="inline-flex flex-col items-center gap-2 text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary">
          <span>Scroll to discover</span>
          <span className="text-accent">&darr;</span>
        </span>
      </div>

      {/* Bottom Feature Banner - Hidden on mobile to clean up space, visible on tablet+ */}
      <div className="relative z-10 mx-auto mb-6 mt-12 hidden w-[95%] max-w-[85rem] rounded-2xl bg-surface/80 py-5 px-2 shadow-sm backdrop-blur-xl sm:block sm:mb-10 sm:mt-auto border border-border/50">
        <div className="grid grid-cols-2 gap-y-6 gap-x-2 sm:grid-cols-4 sm:gap-4 sm:divide-x sm:divide-border">
          <div className="flex items-center gap-3 px-2 sm:px-6">
            <Truck className="h-6 w-6 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">Free Shipping</p>
              <p className="text-xs text-text-secondary truncate">On orders over ₹999</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 sm:px-6">
            <ShieldCheck className="h-6 w-6 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">Secure Payment</p>
              <p className="text-xs text-text-secondary truncate">100% secure checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 sm:px-6">
            <RefreshCcw className="h-6 w-6 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">Easy Returns</p>
              <p className="text-xs text-text-secondary truncate">7-day return policy</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 sm:px-6">
            <HeadphonesIcon className="h-6 w-6 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">24/7 Support</p>
              <p className="text-xs text-text-secondary truncate">We're here to help</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
