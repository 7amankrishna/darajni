import { Eye, Sparkles } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { formatPrice } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export default function DesignCard({ product }: { product: Product }) {
  const price = getProductPrice(product);
  const image = product.images[0] || "/logo.webp";
  const fabricTag = isProductInformationUncertain(product.fabric)
    ? "Handcrafted Silk"
    : product.fabric;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_10px_30px_rgba(58,46,37,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_48px_rgba(58,46,37,0.1)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
      {/* Media Box with Portrait 3:4 Ratio & Slow Cinematic Scale */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt">
        <Link href={`/design/${product.slug}`} className="block h-full w-full">
          <ProductImage
            src={image}
            alt={product.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#111111]/85 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[#FAF7F2] backdrop-blur-sm">
            {fabricTag}
          </span>
        </div>

        {/* Wishlist Button */}
        <WishlistButton productId={product.id} productName={product.name} />

        {/* Hover Quick View Trigger */}
        <div className="absolute inset-x-3 bottom-3 z-10 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Link
            href={`/design/${product.slug}`}
            className="primary-button w-full text-xs shadow-lg backdrop-blur-md"
          >
            <Eye className="h-3.5 w-3.5" />
            Quick View
          </Link>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-accent">
              {product.category.name}
            </span>
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase text-accent">
                <Sparkles className="h-3 w-3 text-accent" />
                Featured
              </span>
            )}
          </div>

          <h3 className="font-display mt-1 text-2xl font-normal leading-snug text-text-primary">
            <Link href={`/design/${product.slug}`} className="transition hover:text-accent">
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
          <span className="font-display text-2xl font-semibold text-text-primary">
            {formatPrice(price)}
          </span>
          {product.discount > 0 && (
            <span className="text-xs text-text-secondary line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
