"use client";

import { ArrowRight, Headphones, Pause, Play, Ruler, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Great_Vibes, Playfair_Display, Cinzel, Montserrat } from "next/font/google";

import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product, StoreSettings } from "@/types/commerce";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ weight: "400", subsets: ["latin"], display: "swap" });
const cinzel = Cinzel({ weight: "400", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ weight: "400", subsets: ["latin"], display: "swap" });

const campaignFonts: Record<string, string> = {
  Great_Vibes: greatVibes.className,
  Playfair_Display: playfair.className,
  Cinzel: cinzel.className,
  Montserrat: montserrat.className,
};

export default function Hero({
  products,
  settings,
}: {
  products: Product[];
  settings: StoreSettings;
}) {
  // Show featured products from database (fallback to active products if none marked featured)
  const featuredProducts = products.filter(
    (product) => product.isFeatured && product.isActive && product.images.length > 0,
  );
  const heroProducts = (
    featuredProducts.length > 0
      ? featuredProducts
      : products.filter((p) => p.isActive && p.images.length > 0)
  ).slice(0, 6);

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const look = heroProducts[active] ?? heroProducts[0];
  const cursiveClass =
    campaignFonts[settings.heroFontFamily] || greatVibes.className;

  useEffect(() => {
    setActive(0);
  }, [heroProducts.length]);

  useEffect(() => {
    if (
      !playing ||
      heroProducts.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % heroProducts.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [playing, heroProducts.length]);

  // Preload upcoming hero slide image in the background for instant transitions
  useEffect(() => {
    if (heroProducts.length <= 1) return;
    const nextIndex = (active + 1) % heroProducts.length;
    const nextImgSrc = heroProducts[nextIndex]?.images[0];
    if (nextImgSrc && typeof window !== "undefined") {
      const preload = new window.Image();
      preload.src = `https://wsrv.nl/?url=${encodeURIComponent(nextImgSrc)}&w=1200&q=80&output=webp`;
    }
  }, [active, heroProducts]);

  return (
    <>
      <section className="atelier-hero" aria-label="DARAJNI collection">
        {look && (
          <div className="atelier-hero-image" key={look.id}>
            <ProductImage
              src={look.images[0]}
              alt={look.name}
              sizes="100vw"
              priority
              className="object-cover object-[center_28%]"
            />
          </div>
        )}
        <div className="atelier-hero-shade" />
        <div className="section-shell atelier-hero-content">
          <p
            className="atelier-kicker"
            style={{ color: settings.heroAccentColor || "var(--atelier-champagne)" }}
          >
            {settings.heroEyebrow || "DARAJNI / Designer House"}
          </p>
          <h1>
            <span>{settings.heroTitle}</span>
            {settings.heroCursiveTitle && (
              <span
                className={`atelier-hero-cursive ${cursiveClass}`}
                style={{
                  color: settings.heroAccentColor || "var(--atelier-champagne)",
                }}
              >
                {settings.heroCursiveTitle}
              </span>
            )}
          </h1>
          {settings.heroSubtitle && (
            <p className="atelier-hero-subtitle whitespace-pre-line">
              {settings.heroSubtitle}
            </p>
          )}
          <div className="atelier-hero-actions">
            <Link
              href="/collection"
              className="atelier-button atelier-button-light"
            >
              Explore Collection <ArrowRight size={16} />
            </Link>
            <Link
              href="/requested-dresses"
              className="atelier-button atelier-button-outline"
            >
              Request Custom Dress <ArrowRight size={16} />
            </Link>
          </div>
          {heroProducts.length > 1 && (
            <div className="atelier-slide-controls" aria-label="Featured looks">
              <span>{String(active + 1).padStart(2, "0")}</span>
              {heroProducts.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  aria-label={`Show ${product.name}`}
                  aria-current={active === index ? "true" : undefined}
                  onClick={() => {
                    setActive(index);
                    setPlaying(false);
                  }}
                  className={active === index ? "is-active" : ""}
                >
                  <span />
                </button>
              ))}
              <span>{String(heroProducts.length).padStart(2, "0")}</span>
              <button
                type="button"
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          )}
        </div>
        {look && (
          <Link className="atelier-hero-caption" href={`/design/${look.slug}`}>
            <span
              className="atelier-kicker"
              style={{ color: settings.heroAccentColor || "var(--atelier-champagne)" }}
            >
              Featured Look
            </span>
            <span className="atelier-hero-caption-title">{look.name}</span>
            <small>
              <span>{formatPrice(getProductPrice(look))}</span>
              <ArrowRight size={14} />
            </small>
          </Link>
        )}
      </section>
      <div className="atelier-assurances">
        <div className="section-shell">
          <span>
            <Truck size={17} /> Pan-India delivery
          </span>
          <span>
            <Ruler size={17} /> Measurement assistance
          </span>
          <span>
            <ShieldCheck size={17} /> Secure checkout
          </span>
          <span>
            <Headphones size={17} /> Personal support
          </span>
        </div>
      </div>
    </>
  );
}

