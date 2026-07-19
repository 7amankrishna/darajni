"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import {
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { ProductImage } from "@/components/product/product-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const labels = ["Front", "Back", "Fabric", "Work", "Video"];
const swipeThreshold = 44;
const tapThreshold = 12;

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const gallery = images.length ? images : ["/logo.webp"];
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const activeIndex = Math.min(active, gallery.length - 1);

  function goTo(index: number) {
    setActive((index + gallery.length) % gallery.length);
  }

  function showPrevious() {
    setActive(
      (current) =>
        (Math.min(current, gallery.length - 1) - 1 + gallery.length) %
        gallery.length,
    );
  }

  function showNext() {
    setActive(
      (current) =>
        (Math.min(current, gallery.length - 1) + 1) % gallery.length,
    );
  }

  function beginSwipe(event: PointerEvent<HTMLButtonElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function finishSwipe(event: PointerEvent<HTMLButtonElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;

    if (
      Math.abs(distanceX) >= swipeThreshold &&
      Math.abs(distanceX) > Math.abs(distanceY)
    ) {
      if (distanceX > 0) showPrevious();
      else showNext();
      return;
    }

    if (
      Math.abs(distanceX) < tapThreshold &&
      Math.abs(distanceY) < tapThreshold
    ) {
      setViewerOpen(true);
    }
  }

  function openFromKeyboard(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard activation (Enter/Space) fires a click with detail 0 and no
    // preceding pointerup; pointer taps are already handled in finishSwipe.
    if (event.detail === 0) setViewerOpen(true);
  }

  return (
    <div className="product-gallery grid min-w-0 gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)] md:gap-4">
      <div className="product-gallery-thumbnails order-2 flex min-w-0 gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-y-auto md:pb-0">
        {gallery.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            onClick={() => goTo(index)}
            className={`product-gallery-thumbnail relative h-[4.5rem] w-[3.5rem] shrink-0 overflow-hidden rounded-md bg-[#F4F1EC] ${
              activeIndex === index ? "is-active" : ""
            }`}
            aria-label={`Show ${labels[index] || `image ${index + 1}`} of ${name}`}
            aria-current={activeIndex === index ? "true" : undefined}
          >
            <ProductImage
              src={image}
              alt=""
              sizes="56px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <div className="product-gallery-stage group relative order-1 aspect-[3/4] overflow-hidden rounded-md bg-[#F4F1EC] md:order-2">
          <button
            type="button"
            className="absolute inset-0 block w-full cursor-zoom-in touch-pan-y"
            aria-label={`Open full-screen view of ${name}`}
            aria-haspopup="dialog"
            aria-expanded={viewerOpen}
            onPointerDown={beginSwipe}
            onPointerUp={finishSwipe}
            onPointerCancel={() => {
              pointerStart.current = null;
            }}
            onClick={openFromKeyboard}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                showPrevious();
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                showNext();
              }
            }}
          >
            <span className="product-gallery-viewport block h-full overflow-hidden">
              <span
                className="product-gallery-track flex h-full"
                style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
              >
                {gallery.map((image, index) => (
                  <span className="product-gallery-slide relative block h-full min-w-full" key={`${image}-${index}`}>
                    <ProductImage
                      src={image}
                      alt={`${name}, ${labels[index] || `image ${index + 1}`}`}
                      priority={index === 0}
                      sizes="(max-width: 767px) 100vw, (max-width: 1279px) 56vw, 48vw"
                      className="object-cover"
                    />
                  </span>
                ))}
              </span>
            </span>
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="product-gallery-arrow product-gallery-arrow-previous"
                aria-label="Previous product image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="product-gallery-arrow product-gallery-arrow-next"
                aria-label="Next product image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <span className="product-gallery-count" aria-live="polite">
            {activeIndex + 1} / {gallery.length}
          </span>
          <span className="product-gallery-expand" aria-hidden="true">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </div>

        <DialogContent className="h-[92svh] max-h-[92dvh] max-w-6xl overflow-hidden p-3 sm:p-5">
          <DialogTitle className="sr-only">{name} image viewer</DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen product image. Use the arrow buttons to browse all views.
          </DialogDescription>
          <div className="relative h-full min-h-0 overflow-hidden rounded-xl bg-black/25">
            <ProductImage
              src={gallery[activeIndex]}
              alt={`${name}, ${labels[activeIndex] || `image ${activeIndex + 1}`}`}
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
              {activeIndex + 1} / {gallery.length}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
