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
  const categoryShowcases = categories.flatMap((category) => {
    const categoryProducts = productsWithImages.filter(
      (product) => product.category.slug === category.slug,
    );
    if (!categoryProducts.length) return [];
    return [{
      category,
      products: categoryProducts,
      image: categoryProducts[0].images[0],
    }];
  });

  if (products.length === 0 && categories.length === 0) return null;

  return (
    <section id="categories" className="showcase-band py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 className="font-display mt-4 text-5xl leading-none text-text-primary sm:text-6xl">
              Festive silhouettes, made easier to browse.
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-text-secondary lg:justify-self-end">
            Browse only the categories that currently have designs available.
            Every category opens a filtered, shareable collection page.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryShowcases.map(({ category, products: categoryProducts, image }) => {
            const content = (
              <article className="category-depth-card">
                <div className="category-preview-stack" aria-hidden="true">
                  <span className="category-preview-image category-preview-image-1">
                    <ProductImage src={image} alt="" sizes="9rem" className="object-cover" />
                  </span>
                  {categoryProducts.slice(1, 3).map((product, index) => (
                    <span
                      key={product.id}
                      className={`category-preview-image category-preview-image-${index + 2}`}
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
                <div className="relative z-10 max-w-[68%]">
                  <span className="text-[0.62rem] font-extrabold uppercase text-accent">
                    {categoryProducts.length} design{categoryProducts.length === 1 ? "" : "s"}
                  </span>
                  <h3 className="font-display mt-4 text-4xl leading-none text-text-primary">
                    {category.name}
                  </h3>
                  <p className="mt-3 text-xs font-semibold text-text-secondary">
                    Explore
                  </p>
                </div>
                <ArrowUpRight className="absolute bottom-5 right-5 h-5 w-5 text-accent" />
              </article>
            );

            return (
              <Link key={category.id} href={`/collection?category=${encodeURIComponent(category.slug)}`}>
                {content}
              </Link>
            );
          })}
        </div>

        {runwayProducts.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Live from the studio</p>
                <h3 className="font-display mt-3 text-4xl leading-none text-text-primary">
                  Featured designs with real product details.
                </h3>
              </div>
              <Link href="/collection" className="secondary-button w-fit">
                View full collection
              </Link>
            </div>
            <div className="runway-grid">
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
                    <p className="mt-1 text-xs text-white/78">
                      {formatPrice(getProductPrice(product))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
