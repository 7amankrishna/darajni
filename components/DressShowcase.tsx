import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type { Category, Product } from "@/types/commerce";

export default function DressShowcase({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const productsWithImages = products.filter((product) => product.images.length > 0);
  const runwayProducts = productsWithImages.slice(0, 5);
  const categoryShowcases = categories
    .map((category) => ({
      category,
      products: productsWithImages.filter(
        (product) => product.category.slug === category.slug,
      ),
    }))
    .filter((showcase) => showcase.products.length > 0);

  if (products.length === 0) return null;

  return (
    <section id="showcase" className="showcase-band py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">Available dress showcases</p>
            <h2 className="font-display mt-4 text-5xl leading-none sm:text-6xl">
              See every live design by occasion.
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-white/52 lg:justify-self-end">
            Browse the current DARAJNI catalog as a visual showroom. Every card
            links to its product page with fabric, size, stock, price and secure
            checkout details.
          </p>
        </div>

        {runwayProducts.length > 0 && (
          <div className="runway-grid mt-12">
            {runwayProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/design/${product.slug}`}
                className={`runway-card runway-card-${index + 1}`}
                aria-label={`View ${product.name}`}
              >
                <ProductImage
                  src={product.images[0]}
                  alt={product.name}
                  sizes="(max-width: 768px) 76vw, (max-width: 1200px) 24vw, 18vw"
                  className="object-cover"
                />
                <span className="runway-label">
                  {product.category.name}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
                <div className="runway-caption">
                  <p className="font-display text-2xl leading-none">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-white/62">
                    {formatPrice(getProductPrice(product))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {categoryShowcases.length > 0 && (
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryShowcases.map(({ category, products: categoryProducts }) => {
              const previewProducts = categoryProducts.slice(0, 3);
              const fabrics = [
                ...new Set(categoryProducts.map((product) => product.fabric)),
              ]
                .slice(0, 2)
                .join(" + ");

              return (
                <Link
                  key={category.id}
                  href="/#collection"
                  className="category-depth-card"
                >
                  <div className="category-preview-stack" aria-hidden="true">
                    {previewProducts.map((product, index) => (
                      <span
                        key={product.id}
                        className={`category-preview-image category-preview-image-${
                          index + 1
                        }`}
                      >
                        <ProductImage
                          src={product.images[0]}
                          alt=""
                          sizes="9rem"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </div>
                  <div className="relative z-10">
                    <span className="text-[0.62rem] font-bold uppercase text-[#e6c47f]">
                      {categoryProducts.length} design
                      {categoryProducts.length === 1 ? "" : "s"}
                    </span>
                    <h3 className="font-display mt-4 text-4xl leading-none text-white">
                      {category.name}
                    </h3>
                    {fabrics && (
                      <p className="mt-3 text-xs leading-6 text-white/80">
                        {fabrics}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="absolute bottom-5 right-5 h-5 w-5 text-white/80" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
