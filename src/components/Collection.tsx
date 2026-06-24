import { useMemo, useState } from "react";
import { useCatalog } from "../context/CatalogContext";
import DesignCard from "./DesignCard";

export default function Collection() {
  const { designs, categories, loading, error } = useCatalog();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return designs.filter((design) => {
      const categoryMatches = activeCategory === "All" || design.category === activeCategory;
      const searchMatches =
        !term ||
        [design.name, design.fabric, design.category, ...design.tags]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return categoryMatches && searchMatches;
    });
  }, [activeCategory, designs, search]);
  const categoryNames = ["All", ...categories.map((category) => category.name)];

  return (
    <section id="collection" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">The DARAJNI edit</p>
            <h2 className="font-display mt-4 text-5xl leading-none sm:text-6xl">Find your silhouette</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/48">
              Browse by style or search by occasion, fabric and detail. Prices are starting
              prices and final quotes depend on customisation.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search collection</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search styles, fabrics, occasions…"
              className="field !rounded-full !pl-5"
            />
          </label>
        </div>

        <div className="-mx-2 mt-9 flex gap-2 overflow-x-auto px-2 pb-3 [scrollbar-width:none]">
          {categoryNames.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`min-h-10 shrink-0 rounded-full border px-5 text-xs font-semibold transition ${
                category === activeCategory
                  ? "border-[#caaa70] bg-[#caaa70] text-[#151006]"
                  : "border-white/10 text-white/55 hover:border-[#caaa70]/45"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100/70">
            The live catalog could not be reached. Please try again shortly.
          </p>
        )}

        {loading ? (
          <div className="grid gap-5 pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-5 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-white/12 py-20 text-center">
            <p className="font-display text-3xl text-white/55">
              {designs.length ? "No matching designs" : "The collection is being curated"}
            </p>
            {designs.length > 0 && (
              <button
                type="button"
                className="secondary-button mt-6"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
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
