"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";

import { ProductImage } from "@/components/product/product-image";

const labels = ["Front", "Back", "Fabric", "Work", "Video"];

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const gallery = images.length ? images : ["/logo.webp"];
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="grid gap-3 md:grid-cols-[5rem_1fr]">
      <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col">
        {gallery.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            onClick={() => {
              setActive(index);
              setZoomed(false);
            }}
            className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#F6E9DD] ${
              active === index ? "border-[#B8893B]" : "border-[#E9DCCB]"
            }`}
            aria-label={`Show ${labels[index] || `image ${index + 1}`} of ${name}`}
          >
            <ProductImage
              src={image}
              alt=""
              sizes="80px"
              className="object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/58 py-0.5 text-[0.55rem] font-bold uppercase text-white">
              {labels[index] || index + 1}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setZoomed((value) => !value)}
        className={`relative order-1 block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] md:order-2 md:min-h-[600px] md:aspect-auto ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        aria-label={zoomed ? "Zoom out product image" : "Click to zoom product image"}
      >
        <ProductImage
          src={gallery[active]}
          alt={`${name}, ${labels[active] || `image ${active + 1}`}`}
          priority
          sizes="(max-width: 768px) 100vw, 45vw"
          className={`object-cover transition duration-500 ${
            zoomed ? "scale-150" : "scale-100"
          }`}
        />
        <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#FFFDF8]/60 bg-[#FFFDF8]/90 px-3 py-2 text-[0.68rem] font-extrabold uppercase text-[#171717] backdrop-blur">
          <Maximize2 className="h-4 w-4" />
          Click to zoom
        </span>
      </button>
    </div>
  );
}
