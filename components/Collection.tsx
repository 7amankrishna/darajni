"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DesignCard from "@/components/DesignCard";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Category, Product } from "@/types/commerce";

type SortOption = "newest" | "price-low" | "price-high";
type PriceRange = "all" | "1000-3000" | "3000-5000" | "5000";

const occasions = ["Wedding", "Reception", "Party", "Navratri", "Photoshoot"];
const colors = [
  "Yellow",
  "Maroon",
  "Purple",
  "Lavender",
  "Pastel",
  "Black",
  "Gold",
];

export default function Collection({
  products,
  categories,
  mode = "home",
  initialCategory = "all",
  initialSort = "newest",
  initialSortInUrl = false,
  initialSale = false,
}: {
  products: Product[];
  categories: Category[];
  mode?: "home" | "page";
  initialCategory?: string;
  initialSort?: SortOption;
  initialSortInUrl?: boolean;
  initialSale?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [occasion, setOccasion] = useState("all");
  const [color, setColor] = useState("all");
  const [fabric, setFabric] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(initialSale);

  const categoryOptions = useMemo(
    () => [
      { name: "All", slug: "all", count: products.length },
      ...categories.flatMap((category) => {
        const count = products.filter(
          (product) => product.category.slug === category.slug,
        ).length;
        return count ? [{ ...category, count }] : [];
      }),
    ],
    [categories, products],
  );

  const fabricOptions = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.fabric).filter(Boolean)))
        .filter(
          (option) =>
            option.length <= 80 && !isProductInformationUncertain(option),
        )
        .slice(0, 16)
        .sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const activeCategoryName =
    categoryOptions.find((category) => category.slug === activeCategory)?.name ||
    "products";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = products.filter((product) => {
      const price = getProductPrice(product);
      const searchable = [
        product.name,
        product.fabric,
        product.category.name,
        product.description,
        ...product.sizes,
      ]
        .join(" ")
        .toLowerCase();
      const categoryMatches =
        activeCategory === "all" || product.category.slug === activeCategory;
      const searchMatches = !term || searchable.includes(term);
      const occasionMatches =
        occasion === "all" || searchable.includes(occasion.toLowerCase());
      const colorMatches = color === "all" || searchable.includes(color.toLowerCase());
      const fabricMatches = fabric === "all" || product.fabric === fabric;
      const priceMatches =
        priceRange === "all" ||
        (priceRange === "1000-3000" && price >= 1000 && price <= 3000) ||
        (priceRange === "3000-5000" && price > 3000 && price <= 5000) ||
        (priceRange === "5000" && price > 5000);
      const customMatches =
        !customOnly ||
        product.sizes.some((size) => size.toLowerCase().includes("custom"));
      const saleMatches = !saleOnly || product.discount > 0;

      return (
        categoryMatches &&
        searchMatches &&
        occasionMatches &&
        colorMatches &&
        fabricMatches &&
        priceMatches &&
        saleMatches &&
        customMatches &&
        (!inStockOnly || product.stock > 0)
      );
    });

    return result.sort((a, b) => {
      if (sort === "price-low") return getProductPrice(a) - getProductPrice(b);
      if (sort === "price-high") return getProductPrice(b) - getProductPrice(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    activeCategory,
    color,
    customOnly,
    fabric,
    inStockOnly,
    occasion,
    priceRange,
    products,
    saleOnly,
    search,
    sort,
  ]);

  useEffect(() => {
    if (mode !== "page") return;

    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (sort !== "newest" || initialSortInUrl) params.set("sort", sort);
    if (saleOnly) params.set("sale", "true");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    activeCategory,
    initialSortInUrl,
    mode,
    pathname,
    router,
    saleOnly,
    sort,
  ]);

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("all");
    setInStockOnly(false);
    setCustomOnly(false);
    setSort("newest");
    setPriceRange("all");
    setOccasion("all");
    setColor("all");
    setFabric("all");
    setSaleOnly(false);
  };

  return (
    <section id="collection" className="collection-stage py-20 sm:py-28">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            {mode === "page" && (
              <p className="mb-4 text-xs font-semibold text-[#666666] dark:text-[#B8A898]">
                Home / Collection
              </p>
            )}
            <p className="eyebrow">
              {mode === "page" ? "Explore DARAJNI Collection" : "All available designs"}
            </p>
            {mode === "page" ? (
              <h1 className="font-display mt-4 text-5xl leading-none text-[#1E1E1E] dark:text-[#F7EADB] sm:text-6xl">
                {activeCategory === "all"
                  ? saleOnly
                    ? "Sale collection"
                    : "Indian occasion wear, made to celebrate."
                  : `${activeCategoryName} collection`}
              </h1>
            ) : (
              <h2 className="font-display mt-4 text-5xl leading-none text-[#1E1E1E] dark:text-[#F7EADB] sm:text-6xl">
                Find your custom-fit celebration piece.
              </h2>
            )}
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
              Browse live designs by category, fabric, price and availability.
              Every product page includes stock, size and checkout details.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search collection</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8071]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, fabric, color..."
              className="field !pl-11"
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
                category.slug === activeCategory ? "is-active" : ""
              }`}
            >
              {category.name}
              <span>{category.count}</span>
            </button>
          ))}
        </div>

        <div
          id="collection-filters"
          className="collection-toolbar mt-5 rounded-2xl border border-[#E8E2DA] dark:border-[#3B3026] bg-white dark:bg-[#1B1612]/82 p-4"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#666666] dark:text-[#B8A898]">
              <SlidersHorizontal className="h-4 w-4 text-[#C8A97E]" />
              {filtered.length} product{filtered.length === 1 ? "" : "s"} available
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <select
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                className="field !min-h-11 !py-2 text-xs"
                aria-label="Filter by occasion"
              >
                <option value="all">All occasions</option>
                {occasions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value as PriceRange)}
                className="field !min-h-11 !py-2 text-xs"
                aria-label="Filter by price"
              >
                <option value="all">All prices</option>
                <option value="1000-3000">Rs 1000-Rs 3000</option>
                <option value="3000-5000">Rs 3000-Rs 5000</option>
                <option value="5000">Rs 5000+</option>
              </select>
              <select
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="field !min-h-11 !py-2 text-xs"
                aria-label="Filter by color"
              >
                <option value="all">All colors</option>
                {colors.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={fabric}
                onChange={(event) => setFabric(event.target.value)}
                className="field !min-h-11 !py-2 text-xs"
                aria-label="Filter by fabric"
              >
                <option value="all">All fabrics</option>
                {fabricOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="field !min-h-11 !py-2 text-xs"
                aria-label="Sort products"
              >
                <option value="newest">Newest first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
              <button
                type="button"
                onClick={resetFilters}
                className="secondary-button !min-h-11 !py-2 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8E2DA] dark:border-[#3B3026] pt-4">
            <label className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#666666] dark:text-[#B8A898] hover:bg-[#F9F9F9] dark:bg-[#241D17]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="accent-[#C8A97E]"
              />
              In stock only
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#666666] dark:text-[#B8A898] hover:bg-[#F9F9F9] dark:bg-[#241D17]">
              <input
                type="checkbox"
                checked={customOnly}
                onChange={(event) => setCustomOnly(event.target.checked)}
                className="accent-[#C8A97E]"
              />
              Custom size available
            </label>
            {products.some((product) => product.discount > 0) && (
              <label className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#666666] dark:text-[#B8A898] hover:bg-[#F9F9F9] dark:bg-[#241D17]">
                <input
                  type="checkbox"
                  checked={saleOnly}
                  onChange={(event) => setSaleOnly(event.target.checked)}
                  className="accent-[#C8A97E]"
                />
                Sale designs only
              </label>
            )}
          </div>
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-1 gap-5 pt-8 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <DesignCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-[#D8C6B1] bg-white dark:bg-[#1B1612]/70 py-20 text-center">
            <p className="font-display text-4xl text-[#1E1E1E] dark:text-[#F7EADB]">
              {activeCategory === "all"
                ? "No matching products"
                : `No ${activeCategoryName.toLowerCase()} available right now`}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#666666] dark:text-[#B8A898]">
              New designs are being added soon. You can clear filters to view
              every available outfit.
            </p>
            <button type="button" className="secondary-button mt-6" onClick={resetFilters}>
              View all available outfits
            </button>
          </div>
        )}
      </div>

      {mode === "page" && (
        <a
          href="#collection-filters"
          className="fixed bottom-24 left-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111111] px-4 text-xs font-extrabold uppercase text-white shadow-lg md:hidden"
        >
          <Filter className="h-4 w-4" />
          Filter
        </a>
      )}
    </section>
  );
}
