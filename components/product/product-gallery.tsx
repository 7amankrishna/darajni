"use client";

import { ChevronLeft, ChevronRight, Maximize2, Search } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { ProductImage } from "@/components/product/product-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [hovering, setHovering] = useState(false);
  const [zoomPosition, setZoomPosition] = useState("50% 50%");

  function startZoom(event: MouseEvent<HTMLButtonElement>) {
    setHovering(true);
    updateZoomPosition(event);
  }

  function updateZoomPosition(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomPosition(`${x}% ${y}%`);
  }

  function showPrevious() {
    setActive((current) => (current - 1 + gallery.length) % gallery.length);
  }

  function showNext() {
    setActive((current) => (current + 1) % gallery.length);
  }

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[5rem_minmax(0,1fr)]">
      <div className="order-2 flex min-w-0 gap-2 overflow-x-auto md:order-1 md:flex-col">
        {gallery.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            onClick={() => {
              setActive(index);
              setHovering(false);
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

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            onMouseEnter={startZoom}
            onMouseMove={updateZoomPosition}
            onMouseLeave={() => {
              setHovering(false);
              setZoomPosition("50% 50%");
            }}
            className="product-gallery-stage relative order-1 block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] md:order-2 md:min-h-[600px] md:aspect-auto"
            aria-label={`Open full-screen view of ${name}`}
          >
            <ProductImage
              src={gallery[active]}
              alt={`${name}, ${labels[active] || `image ${active + 1}`}`}
              priority
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover transition-transform duration-200 ease-out"
            />
            <span
              aria-hidden="true"
              className="product-gallery-zoom absolute inset-0"
              style={{
                opacity: hovering ? 1 : 0,
              }}
            >
              <span
                className="product-gallery-zoom-image absolute inset-0"
                style={{
                  transform: `scale(${hovering ? 2.1 : 1})`,
                  transformOrigin: zoomPosition,
                }}
              >
                <ProductImage
                  src={gallery[active]}
                  alt=""
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover"
                />
              </span>
            </span>
            <span className="gallery-zoom-hint absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#FFFDF8]/60 bg-[#FFFDF8]/90 px-3 py-2 text-[0.68rem] font-extrabold uppercase text-[#171717] shadow-sm backdrop-blur">
              <Search className="hidden h-4 w-4 sm:block" />
              <Maximize2 className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Hover to zoom · click to expand</span>
              <span className="sm:hidden">Tap to expand</span>
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="h-[92svh] max-h-[92dvh] max-w-6xl overflow-hidden p-3 sm:p-5">
          <DialogTitle className="sr-only">{name} image viewer</DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen product image. Use the arrow buttons to browse all views.
          </DialogDescription>
          <div className="relative h-full min-h-0 overflow-hidden rounded-xl bg-black/25">
            <ProductImage
              src={gallery[active]}
              alt={`${name}, ${labels[active] || `image ${active + 1}`}`}
              sizes="96vw"
              className="object-contain"
            />
            {gallery.length > 1 && (
              <>
                <button type="button" onClick={showPrevious} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/85" aria-label="Previous product image">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={showNext} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/85" aria-label="Next product image">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              {active + 1} / {gallery.length} · {labels[active] || "Detail"}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
