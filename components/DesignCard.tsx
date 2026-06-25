import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export default function DesignCard({ product }: { product: Product }) {
  const price = getProductPrice(product);
  const image = product.images[0] || "/logo.webp";

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-[#11110f] transition hover:-translate-y-1 hover:border-[#caaa70]/35">
      <Link
        href={`/design/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-black"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={image}
          alt={product.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.025]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.isFeatured && (
            <span className="rounded-full bg-[#caaa70] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-black">
              Featured
            </span>
          )}
          {product.discount > 0 && (
            <span className="rounded-full bg-white px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-black">
              {product.discount}% off
            </span>
          )}
          {product.stock === 0 && (
            <span className="rounded-full bg-black/80 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-white">
              Sold out
            </span>
          )}
        </div>
      </Link>

      <div className="p-5">
        <p className="eyebrow !text-[0.58rem]">{product.category.name}</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight">{product.name}</h3>
          <div className="shrink-0 text-right">
            <p className="font-display text-xl text-[#dec184]">
              {formatPrice(price)}
            </p>
            {product.discount > 0 && (
              <p className="mt-1 text-xs text-white/32 line-through">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-white/38">{product.fabric}</p>
        <p className="mt-3 text-xs text-white/42">
          {product.stock > 0
            ? `${product.stock} available · ${product.sizes.join(", ")}`
            : "Currently unavailable"}
        </p>
        <Link
          href={`/design/${product.slug}`}
          className="primary-button mt-5 w-full"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
