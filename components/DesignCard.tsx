import { Sparkles } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { QuickViewTrigger } from "@/components/product/quick-view-trigger";
import { formatPrice } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export default function DesignCard({ product }: { product: Product }) {
  const price = getProductPrice(product);
  const image = product.images[0] || "/logo.webp";
  const fabricTag = isProductInformationUncertain(product.fabric)
    ? "View fabric details"
    : product.fabric;

  return (
    <article className="atelier-product group relative flex flex-col">
      {/* Media Box with Portrait 3:4 Ratio & Slow Cinematic Scale */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt">
        <Link href={`/design/${product.slug}`} className="block h-full w-full">
          <ProductImage
            src={image}
            alt={product.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="atelier-fabric">
            {fabricTag}
          </span>
        </div>

        {/* Wishlist Button */}
        <WishlistButton productId={product.id} productName={product.name} />

        {/* Quick View trigger: revealed on hover for pointer devices,
            always visible on touch devices (no hover state). */}
        <div className="atelier-quick-view absolute inset-x-3 bottom-3 z-10 translate-y-0 opacity-100 transition-all duration-300 [@media(hover:hover)]:translate-y-4 [@media(hover:hover)]:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <QuickViewTrigger product={product} />
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between py-5">
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

        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-sm font-medium text-text-primary">
            {formatPrice(price)}
          </span>
          {product.discount > 0 && (
            <span className="text-xs text-text-secondary line-through">
              {formatPrice(product.price)}
            </span>
          )}
          {product.stock <= 0 && <span className="ml-auto text-xs text-text-secondary">Sold out</span>}
        </div>
      </div>
    </article>
  );
}
