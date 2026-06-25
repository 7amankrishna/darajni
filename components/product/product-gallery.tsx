"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";

import { ProductImage } from "@/components/product/product-image";

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
    <div className="bg-black">
      <button
        type="button"
        onClick={() => setZoomed((value) => !value)}
        className={`relative block aspect-[4/5] w-full overflow-hidden md:min-h-[680px] md:aspect-auto ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        aria-label={zoomed ? "Zoom out product image" : "Zoom in product image"}
      >
        <ProductImage
          src={gallery[active]}
          alt={`${name}, image ${active + 1}`}
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover transition duration-500 ${
            zoomed ? "scale-150" : "scale-100"
          }`}
        />
        <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/55 backdrop-blur">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {gallery.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => {
                setActive(index);
                setZoomed(false);
              }}
              className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                active === index ? "border-[#caaa70]" : "border-transparent"
              }`}
              aria-label={`Show image ${index + 1} of ${name}`}
            >
              <ProductImage
                src={image}
                alt=""
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
