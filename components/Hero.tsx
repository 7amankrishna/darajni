import { ChevronDown, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import type { Product } from "@/types/commerce";

export default function Hero({
  products,
}: {
  products: Product[];
}) {
  const featuredProduct = products.find((product) => product.isFeatured) ?? products[0] ?? null;
  const heroImage = featuredProduct?.images[0] ?? "/logo.webp";

  return (
    <section
      id="home"
      className="relative flex min-h-[92vh] w-full flex-col justify-between overflow-hidden bg-[#111111] text-[#FAF7F2]"
    >
      {/* Edge-to-Edge Background Image with Subtle Parallax Zoom */}
      <div className="absolute inset-0 z-0">
        <ProductImage
          src={heroImage}
          alt="DARAJNI High Couture Collection"
          sizes="100vw"
          priority
          className="h-full w-full object-cover object-center opacity-65 transition-transform duration-1000 ease-out hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-[#111111]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/80 via-transparent to-[#111111]/50" />
      </div>

      {/* Empty Top Spacer for Navbar Breathing Room */}
      <div className="relative z-10" />

      {/* Cinematic Center/Left Overlay Copy */}
      <div className="section-shell relative z-10 py-16">
        <div className="max-w-3xl">
          <p className="eyebrow text-[#C8A97E]">
            DARAJNI High Couture
          </p>

          <h1 className="font-display mt-4 text-5xl font-light tracking-wide text-[#FAF7F2] sm:text-7xl lg:text-8xl">
            Timeless Indian Couture
          </h1>

          <p className="font-display mt-6 max-w-xl text-2xl font-normal italic leading-relaxed text-[#F5EFEB] sm:text-3xl">
            Designed for celebrations, crafted exclusively for you.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/collection" className="primary-button bg-[#111111] text-[#FAF7F2] hover:bg-[#C8A97E] hover:text-[#111111]">
              Explore Collection
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link href="/requested-dresses" className="secondary-button border-[#C8A97E]/60 text-[#FAF7F2] hover:bg-[#FAF7F2] hover:text-[#111111]">
              Request a Custom Dress
            </Link>
          </div>
        </div>
      </div>

      {/* Minimal Scroll Down Indicator */}
      <div className="relative z-10 pb-8 text-center">
        <a
          href="#collection-preview"
          className="inline-flex flex-col items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C8A97E]/80 transition hover:text-[#C8A97E]"
          aria-label="Scroll to collection"
        >
          <span>Discover</span>
          <ChevronDown className="h-4 w-4 animate-bounce text-[#C8A97E]" />
        </a>
      </div>
    </section>
  );
}
