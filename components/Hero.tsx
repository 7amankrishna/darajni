import {
  ArrowRight,
  type LucideIcon,
  MessageCircle,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import type { Product } from "@/types/commerce";

const trustPoints: Array<[string, LucideIcon]> = [
  ["Secure Checkout", ShieldCheck],
  ["Custom Size Available", Ruler],
  ["Pan-India Delivery", Truck],
  ["WhatsApp Support", MessageCircle],
];

export default function Hero({
  products,
}: {
  products: Product[];
}) {
  const heroProducts = products.filter((product) => product.images.length > 0).slice(0, 6);
  const featuredProduct = heroProducts[0] ?? products[0] ?? null;
  const posterImage = featuredProduct?.images[0] ?? "/logo.webp";

  return (
    <section
      id="home"
      className="home-hero relative isolate overflow-hidden"
    >
      <div className="hero-model-layer hero-poster-layer" aria-hidden="true">
        <div className="dress-model-grid" />
        <div className="hero-poster-frame">
          <ProductImage
            src={posterImage}
            alt=""
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 30vw"
            priority
            className="object-cover"
          />
          {featuredProduct && (
            <div className="hero-poster-caption">
              <span>{featuredProduct.category.name}</span>
              <strong>{featuredProduct.name}</strong>
            </div>
          )}
        </div>
        <div className="hero-poster-accent" />
        <div className="dress-model-vignette" />
      </div>

      <div className="section-shell hero-3d-shell grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hero-3d-copy max-w-3xl">
          <p className="eyebrow">Premium occasion wear from Bihar Sharif</p>
          <h1 className="font-display mt-5 text-6xl font-semibold leading-[0.88] text-[#171717] sm:text-7xl lg:text-8xl">
            DARAJNI Designer House
          </h1>
          <p className="font-display mt-4 text-4xl leading-none text-[#6E0F1A] sm:text-5xl">
            Don&apos;t just wear clothes. Wear confidence.
          </p>
          <p className="mt-7 max-w-xl text-base leading-8 text-[#5F5348] md:text-lg">
            Indian occasion wear from the live DARAJNI collection, with custom
            sizing support, clear communication and delivery across India.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/collection?sort=newest" className="primary-button sm:min-w-48">
              Shop New Arrivals
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link href="/size-guide" className="secondary-button sm:min-w-48">
              How Custom Size Works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="hero-proof-grid mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#E9DCCB] sm:grid-cols-4">
            {trustPoints.map(([title, Icon]) => (
              <div key={title as string} className="bg-[#FFFDF8]/86 p-4">
                <Icon className="h-4 w-4 text-[#B8893B]" />
                <p className="mt-3 text-xs font-extrabold uppercase text-[#171717]">
                  {title as string}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-3d-aside" aria-hidden="true" />
      </div>
    </section>
  );
}
