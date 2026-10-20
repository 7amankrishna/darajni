"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import DesignCard from "@/components/DesignCard";
import type { Product } from "@/types/commerce";

export function FeaturedProductsSlider({ products }: { products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
  };
  if (!products.length) return null;
  return (
    <div role="region" aria-label="Curated designs">
      <div className="atelier-product-rail" ref={rail}>
        {products.map((product) => <DesignCard key={product.id} product={product} />)}
      </div>
      {products.length > 1 && <div className="atelier-rail-controls">
        <span>Find a piece that feels like you.</span>
        <div>
          <button type="button" onClick={() => move(-1)} aria-label="Previous designs"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next designs"><ChevronRight size={18} /></button>
        </div>
      </div>}
    </div>
  );
}
