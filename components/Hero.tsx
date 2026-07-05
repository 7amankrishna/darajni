"use client";

import { ArrowRight, Sparkles, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import DressModelStage from "@/components/DressModelStage";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

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
  const featuredProduct = heroProducts[0] ?? products[0] ?? null;

  return (
    <section
      id="home"
      className="home-hero home-hero-3d relative isolate overflow-hidden"
    >
      <DressModelStage className="hero-model-layer" />

      <div className="section-shell hero-3d-shell grid items-center gap-10 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="hero-3d-copy max-w-3xl">
          <p className="eyebrow">3D couture showroom</p>
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

        <div className="hero-3d-aside">
          {featuredProduct && (
            <Link
              href={`/design/${featuredProduct.slug}`}
              className="hero-feature-link"
              aria-label={`View ${featuredProduct.name}`}
            >
              <span className="inline-flex items-center gap-2 text-[0.64rem] font-bold uppercase text-[#f0d28e]">
                <Sparkles className="h-3.5 w-3.5" />
                {featuredProduct.category.name}
              </span>
              <span className="font-display mt-2 block text-3xl leading-none text-white">
                {featuredProduct.name}
              </span>
              <span className="mt-2 block text-sm text-white/72">
                {formatPrice(getProductPrice(featuredProduct))}
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
