"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import DesignCard from "@/components/DesignCard";
import type { Product } from "@/types/commerce";

export function FeaturedProductsSlider({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProduct = products[activeIndex];

  useEffect(() => {
    if (products.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % products.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [products.length]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(products.length - 1, 0)));
  }, [products.length]);

  if (!activeProduct) return null;

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + products.length) % products.length);
  };
  const showNext = () => {
    setActiveIndex((index) => (index + 1) % products.length);
  };

  return (
    <div
      className="mt-10"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl">
        <div key={activeProduct.id} className="animate-fade-up">
          <DesignCard product={activeProduct} />
        </div>
      </div>

      {products.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={showPrevious}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-text-primary transition hover:border-accent hover:text-accent"
            aria-label="Show previous featured product"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2" aria-label={`Slide ${activeIndex + 1} of ${products.length}`}>
            {products.map((product, index) => (
              <button
                type="button"
                key={product.id}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition ${
                  index === activeIndex
                    ? "w-7 bg-accent"
                    : "w-2.5 bg-border hover:bg-accent/60"
                }`}
                aria-label={`Show ${product.name}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={showNext}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-text-primary transition hover:border-accent hover:text-accent"
            aria-label="Show next featured product"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
