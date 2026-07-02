"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties, PointerEvent } from "react";
import { useMemo, useState } from "react";

import BrandLogo from "./BrandLogo";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

type StageStyle = CSSProperties & {
  "--tilt-x"?: string;
  "--tilt-y"?: string;
  "--shine-x"?: string;
  "--shine-y"?: string;
};

export default function Hero({
  products,
  categoryCount,
}: {
  products: Product[];
  categoryCount: number;
}) {
  const heroProducts = useMemo(
    () => products.filter((product) => product.images.length > 0).slice(0, 6),
    [products],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageStyle, setStageStyle] = useState<StageStyle>({
    "--tilt-x": "0deg",
    "--tilt-y": "0deg",
    "--shine-x": "50%",
    "--shine-y": "50%",
  });

  const activeProduct =
    heroProducts.length > 0 ? heroProducts[activeIndex % heroProducts.length] : null;
  const orbitProducts = heroProducts
    .filter((product) => product.id !== activeProduct?.id)
    .slice(0, 3);

  const updateActive = (direction: 1 | -1) => {
    if (heroProducts.length === 0) return;
    setActiveIndex((current) =>
      (current + direction + heroProducts.length) % heroProducts.length,
    );
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setStageStyle({
      "--tilt-x": `${(0.5 - y) * 9}deg`,
      "--tilt-y": `${(x - 0.5) * 12}deg`,
      "--shine-x": `${x * 100}%`,
      "--shine-y": `${y * 100}%`,
    });
  };

  const resetTilt = () => {
    setStageStyle({
      "--tilt-x": "0deg",
      "--tilt-y": "0deg",
      "--shine-x": "50%",
      "--shine-y": "50%",
    });
  };

  return (
    <section
      id="home"
      className="home-hero relative isolate overflow-hidden"
    >
      <div className="section-shell grid min-h-[calc(100svh-74px)] items-center gap-12 py-12 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="max-w-3xl">
          <p className="eyebrow">Interactive dress showroom</p>
          <h1 className="font-display mt-6 text-6xl font-medium leading-[0.86] sm:text-7xl lg:text-8xl">
            DARAJNI Designer House
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-white/67 md:text-lg">
            Premium lehengas, sarees, anarkalis and gowns staged in a
            dimensional showroom with clear prices, secure checkout and
            Pan-India delivery.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#collection" className="primary-button sm:min-w-48">
              Explore dresses
              <ShoppingBag className="h-4 w-4" />
            </a>
            <Link href="/track" className="secondary-button sm:min-w-48">
              Track an order
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="hero-proof-grid mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/12 border-y border-white/12 py-5">
            {[
              [products.length ? `${products.length}` : "Live", "Available designs"],
              [categoryCount ? `${categoryCount}` : "Curated", "Dress categories"],
              ["Pan India", "Tracked delivery"],
            ].map(([title, detail]) => (
              <div key={title} className="px-3 first:pl-0 sm:px-6">
                <p className="font-display text-lg text-[#e2c48b] sm:text-2xl">{title}</p>
                <p className="mt-1 hidden text-[0.68rem] text-white/38 sm:block">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="showroom-stage"
          style={stageStyle}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          aria-label="Featured DARAJNI dress showcase"
        >
          {activeProduct ? (
            <>
              <div className="showroom-rail" aria-hidden="true" />
              {orbitProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/design/${product.slug}`}
                  className={`showroom-orbit showroom-orbit-${index + 1}`}
                  aria-label={`View ${product.name}`}
                >
                  <ProductImage
                    src={product.images[0]}
                    alt={product.name}
                    sizes="(max-width: 1024px) 35vw, 18vw"
                    className="object-cover"
                  />
                </Link>
              ))}

              <Link
                href={`/design/${activeProduct.slug}`}
                className="showroom-focus"
                aria-label={`View ${activeProduct.name}`}
              >
                <ProductImage
                  src={activeProduct.images[0]}
                  alt={activeProduct.name}
                  sizes="(max-width: 768px) 90vw, (max-width: 1200px) 46vw, 32vw"
                  priority
                  className="object-cover"
                />
                <div className="showroom-shine" aria-hidden="true" />
                <div className="showroom-caption">
                  <span className="inline-flex items-center gap-2 text-[0.64rem] font-bold uppercase text-[#f0d28e]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {activeProduct.category.name}
                  </span>
                  <p className="font-display mt-2 text-3xl leading-none text-white">
                    {activeProduct.name}
                  </p>
                  <p className="mt-2 text-sm text-white/72">
                    {formatPrice(getProductPrice(activeProduct))}
                  </p>
                </div>
              </Link>

              <div className="showroom-controls">
                <button
                  type="button"
                  onClick={() => updateActive(-1)}
                  aria-label="Previous dress"
                  className="showroom-icon-button"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  {heroProducts.map((product, index) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show ${product.name}`}
                      aria-current={activeProduct.id === product.id}
                      className={`showroom-dot ${
                        activeProduct.id === product.id ? "is-active" : ""
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => updateActive(1)}
                  aria-label="Next dress"
                  className="showroom-icon-button"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="showroom-empty">
              <BrandLogo className="h-52 w-52 border border-[#caaa70]/20" priority />
              <p className="font-display mt-6 text-4xl text-[#e6cb98]">
                The showroom is being prepared.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
