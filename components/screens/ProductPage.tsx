import Link from "next/link";

import DesignCard from "@/components/DesignCard";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

export default function ProductPage({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const price = getProductPrice(product);

  return (
    <main className="py-6 sm:py-10">
      <div className="section-shell">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/35"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-[#dfc184]">
            Home
          </Link>
          <span>/</span>
          <Link href="/#collection" className="hover:text-[#dfc184]">
            Collection
          </Link>
          <span>/</span>
          <span className="text-white/55">{product.name}</span>
        </nav>

        <div className="glass-panel overflow-hidden">
          <div className="grid md:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} />
            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
              <p className="eyebrow">{product.category.name}</p>
              <h1 className="font-display mt-4 text-4xl leading-none sm:text-6xl">
                {product.name}
              </h1>
              <div className="mt-5 flex items-end gap-3">
                <p className="font-display text-3xl text-[#dfc084]">
                  {formatPrice(price)}
                </p>
                {product.discount > 0 && (
                  <>
                    <p className="pb-1 text-sm text-white/30 line-through">
                      {formatPrice(product.price)}
                    </p>
                    <span className="mb-1 rounded-full bg-[#caaa70]/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[#dfc084]">
                      {product.discount}% off
                    </span>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/38">
                {product.fabric}
              </p>
              <div className="my-7 h-px bg-white/9" />
              <p className="text-sm leading-7 text-white/58">
                {product.description}
              </p>
              <div className="my-7 h-px bg-white/9" />
              <ProductPurchase product={product} />
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="py-20">
            <p className="eyebrow">Complete your edit</p>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl">
              Related products
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <DesignCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
