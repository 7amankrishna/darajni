"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import DesignCard from "@/components/DesignCard";
import type { Category, Product } from "@/types/commerce";

type SortOption = "newest" | "price-low" | "price-high";

export default function Collection({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const categoryOptions = useMemo(
    () => [
      { name: "All", slug: "all", count: products.length },
      ...categories.map((category) => ({
        ...category,
        count: products.filter(
          (product) => product.category.slug === category.slug,
        ).length,
      })),
    ],
    [categories, products],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = products.filter((product) => {
      const categoryMatches =
        activeCategory === "all" || product.category.slug === activeCategory;
      const searchMatches =
        !term ||
        [
          product.name,
          product.fabric,
          product.category.name,
          product.description,
          ...product.sizes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return (
        categoryMatches &&
        searchMatches &&
        (!inStockOnly || product.stock > 0)
      );
    });

    return result.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeCategory, inStockOnly, products, search, sort]);

  return (
    <section id="collection" className="collection-stage py-20 sm:py-28">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">All available dresses</p>
            <h2 className="font-display mt-4 text-5xl leading-none sm:text-6xl">
              Find your silhouette in the live catalog.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80">
              Search every active design by style, fabric, category or size.
              Every displayed price is the price used at checkout.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search collection</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products…"
              className="field !rounded-full !pl-11"
            />
          </label>
        </div>

        <div className="-mx-2 mt-9 flex gap-2 overflow-x-auto px-2 pb-3 [scrollbar-width:none]">
          {categoryOptions.map((category) => (
            <button
              type="button"
              key={category.slug}
              onClick={() => setActiveCategory(category.slug)}
              aria-pressed={category.slug === activeCategory}
              className={`category-filter-button ${
                category.slug === activeCategory
                  ? "is-active"
                  : "border-white/10 text-white/55 hover:border-[#caaa70]/45"
              }`}
            >
              {category.name}
              <span>{category.count}</span>
            </button>
          ))}
        </div>

        <div className="collection-toolbar mt-5 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <SlidersHorizontal className="h-4 w-4" />
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs text-white/55">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="accent-[#caaa70]"
              />
              In stock only
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="field !min-h-10 !w-auto !py-2 text-xs"
              aria-label="Sort products"
            >
              <option value="newest">Newest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </div>
        </div>

        {filtered.length ? (
          <div className="grid gap-5 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <DesignCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-white/12 py-20 text-center">
            <p className="font-display text-3xl text-white/55">
              {products.length ? "No matching products" : "No products are live yet"}
            </p>
            {products.length > 0 && (
              <button
                type="button"
                className="secondary-button mt-6"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                  setInStockOnly(false);
                  setSort("newest");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
