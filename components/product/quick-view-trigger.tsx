"use client";

import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  const price = getProductPrice(product);
  const image = product.images[0] || "/logo.webp";
  const fabricTag = isProductInformationUncertain(product.fabric)
    ? "Handcrafted Silk"
    : product.fabric;

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
      
      <DialogContent className="max-w-3xl overflow-hidden bg-surface text-text-primary sm:p-0">
        <div className="grid sm:grid-cols-[1fr_1.2fr]">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt sm:h-full sm:aspect-auto">
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#111111]/85 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[#FAF7F2] backdrop-blur-sm">
                {fabricTag}
              </span>
            </div>
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
