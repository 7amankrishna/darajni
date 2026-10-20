"use client";

import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import { getProductPrice, isProductInformationUncertain } from "@/lib/commerce";
import type { Product } from "@/types/commerce";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QuickViewTrigger({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const price = getProductPrice(product);
  const images = product.images.length > 0 ? product.images : ["/logo.webp"];
  const fabricTag = isProductInformationUncertain(product.fabric)
    ? "View fabric details"
    : product.fabric;

  useEffect(() => {
    if (open) {
      setCurrentImageIndex(0);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
      }
    }
  }, [open]);

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({ left: index * width, behavior: "smooth" });
      setCurrentImageIndex(index);
    }
  };

  const scrollNext = () => {
    const nextIndex = Math.min(currentImageIndex + 1, images.length - 1);
    scrollToIndex(nextIndex);
  };

  const scrollPrev = () => {
    const prevIndex = Math.max(currentImageIndex - 1, 0);
    scrollToIndex(prevIndex);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.clientWidth > 0) {
      const index = Math.round(target.scrollLeft / target.clientWidth);
      setCurrentImageIndex(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="primary-button w-full text-xs shadow-lg backdrop-blur-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          Quick View
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl overflow-y-auto bg-surface text-text-primary sm:p-0">
        <div className="grid sm:grid-cols-[1fr_1.2fr]">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt sm:h-full sm:aspect-auto group/gallery">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {images.map((img, i) => (
                <div key={i} className="relative h-full w-full shrink-0 snap-center">
                  <ProductImage
                    src={img}
                    alt={`${product.name} - view ${i + 1}`}
                    priority={true}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover object-center"
                  />
                </div>
              ))}
            </div>
            
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
              <span className="atelier-fabric">
                {fabricTag}
              </span>
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  aria-label="Previous product image"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 hidden h-8 w-8 place-items-center rounded-full bg-surface/80 text-text-primary opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-surface sm:grid group-hover/gallery:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  aria-label="Next product image"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 hidden h-8 w-8 place-items-center rounded-full bg-surface/80 text-text-primary opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-surface sm:grid group-hover/gallery:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 pointer-events-auto">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to image ${i + 1}`}
                      onClick={() => scrollToIndex(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentImageIndex ? "w-5 bg-surface shadow" : "w-1.5 bg-surface/50 hover:bg-surface/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <DialogHeader>
              <div className="mb-2 text-[0.65rem] font-extrabold uppercase tracking-widest text-accent">
                {product.category.name}
              </div>
              <DialogTitle className="text-3xl text-text-primary sm:text-4xl">
                {product.name}
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-relaxed text-text-secondary">
                {isProductInformationUncertain(product.description)
                  ? `${product.name} by DARAJNI Designer House.`
                  : product.description.slice(0, 150) + "..."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-text-primary">
                {formatPrice(price)}
              </span>
              {product.discount > 0 && (
                <span className="text-sm text-text-secondary line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-2">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-text-secondary">
                Available Sizes
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.length > 0 ? (
                  product.sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md border border-border bg-surface-alt px-3 text-xs font-semibold"
                    >
                      {size}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface-alt px-4 text-xs font-semibold">
                    Custom Size Available
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/design/${product.slug}`}
                onClick={() => setOpen(false)}
                className="primary-button flex-1 justify-center"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
