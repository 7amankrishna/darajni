import { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { Design } from "../types";
import { categories } from "../data/designs";
import DesignCard from "./DesignCard";

interface CollectionProps {
  onViewDesign: (design: Design) => void;
  onEditDesign: (design: Design) => void;
}

export default function Collection({ onViewDesign, onEditDesign }: CollectionProps) {
  const { designs } = useAdmin();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = designs.filter((d) => {
    const matchCat = activeCategory === "All" || d.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.fabric.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <section id="collection" className="bg-[#0a0a0a] py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a96e]" />
            <span
              className="text-[#c9a96e] text-[10px] tracking-[0.5em] uppercase"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              The Darjana Edit
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a96e]" />
          </div>
          <h2
            className="text-white text-5xl sm:text-6xl font-light mb-6"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Our Collection
          </h2>
          <p
            className="text-white/50 text-base max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Every piece is a labour of love — designed, embroidered, and finished by skilled artisans across India.
          </p>
        </div>

        {/* Search */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-md">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, fabric, occasion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm pl-12 pr-4 py-3 focus:outline-none focus:border-[#c9a96e]/50 focus:bg-white/8 transition-all"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] tracking-[0.25em] uppercase px-5 py-2.5 border transition-all duration-300 cursor-pointer ${
                activeCategory === cat
                  ? "border-[#c9a96e] bg-[#c9a96e] text-white shadow-lg shadow-[#c9a96e]/20"
                  : "border-white/15 text-white/50 hover:border-[#c9a96e]/50 hover:text-white/80"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Designs Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p
              className="text-white/30 text-2xl font-light mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              No designs found
            </p>
            <p
              className="text-white/20 text-xs tracking-widest"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Try a different category or search term
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-white/30 text-[10px] tracking-[0.2em] uppercase mb-6"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {filtered.length} design{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onView={onViewDesign}
                  onEdit={onEditDesign}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
