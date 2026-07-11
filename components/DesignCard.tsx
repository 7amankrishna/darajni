"use client";

import { ArrowUpRight, Heart, Ruler, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ProductImage } from "@/components/product/product-image";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export default function DesignCard({ product }: { product: Product }) {
  const price = getProductPrice(product);
  const image = product.images[0] || "/logo.webp";
  const { isWishlisted, toggle } = useWishlist();
  const wished = isWishlisted(product.id);
  const customSize =
    product.sizes.length === 0 ||
    product.sizes.some((size) => size.toLowerCase().includes("custom"));
  const fabricSummary = isProductInformationUncertain(product.fabric)
    ? "Fabric confirmation available"
    : product.fabric;

  return (
    <article className="product-card-3d group overflow-hidden rounded-2xl">
      <div className="relative">
        <Link
          href={`/design/${product.slug}`}
          className="product-card-media relative block aspect-[4/5] overflow-hidden bg-[#F1E1D2]"
          aria-label={`View ${product.name}`}
        >
          <ProductImage
            src={image}
            alt={product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/52 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#FFFDF8]/92 px-3 py-1 text-[0.62rem] font-extrabold uppercase text-[#171717] shadow-sm">
              {product.category.name}
            </span>
            {customSize && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#6E0F1A] px-3 py-1 text-[0.62rem] font-extrabold uppercase text-white">
                <Ruler className="h-3 w-3" />
                Custom size
              </span>
            )}
          </div>
          <div className="product-card-float">
            {product.stock > 0
              ? product.stock === 1
                ? "1 available"
                : `${product.stock} available`
              : "Sold out"}
          </div>
        </Link>

        <button
          type="button"
          onClick={() => {
            const added = toggle(product.id);
            toast.success(
              added
                ? `${product.name} added to wishlist`
                : `${product.name} removed from wishlist`,
            );
          }}
          className={`absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border backdrop-blur ${
            wished
              ? "border-[#6E0F1A] bg-[#6E0F1A] text-white"
              : "border-[#FFFDF8]/60 bg-[#FFFDF8]/90 text-[#171717]"
          }`}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-extrabold uppercase text-[#B8893B]">
              {product.category.name}
            </p>
            <h3 className="font-display mt-1 text-[1.55rem] leading-none text-[#171717]">
              {product.name}
            </h3>
          </div>
          {product.isFeatured && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F6E9DD] text-[#B8893B]">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="line-clamp-2 text-xs leading-5 text-[#6F6255]">
              {fabricSummary}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#6F6255]">
              {product.stock > 0
                ? `${product.stock} available · ${customSize ? "Custom size" : product.sizes.join(", ")}`
                : "Currently unavailable"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-semibold text-[#171717]">
              {formatPrice(price)}
            </p>
            {product.discount > 0 && (
              <p className="text-xs text-[#8E8071] line-through">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
        </div>

        <Link
          href={`/design/${product.slug}`}
          className="secondary-button mt-5 w-full"
          aria-label={`View details for ${product.name}`}
        >
          View details
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
