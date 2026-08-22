"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EventBanner } from "@/types/commerce";

export function EventsSlider({ eventBanners }: { eventBanners: EventBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (eventBanners.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % eventBanners.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [eventBanners.length]);

  if (eventBanners.length === 0) return null;

  const showPrevious = () => {
    setActiveIndex(
      (current) => (current - 1 + eventBanners.length) % eventBanners.length
    );
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % eventBanners.length);
  };

  return (
    <section className="bg-background py-14 sm:py-20" aria-labelledby="events-slider-title">
      <div className="section-shell">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end mb-8">
          <div>
            <p className="eyebrow text-text-secondary">Happenings</p>
            <h2 id="events-slider-title" className="font-display mt-3 text-4xl font-light text-text-primary sm:text-5xl">
              Launches &amp; Events
            </h2>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-border group"
          role="region"
          aria-roledescription="carousel"
          aria-label="Events and Launches"
        >
          <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/7] w-full overflow-hidden bg-surface-alt">
            {eventBanners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
                aria-hidden={index !== activeIndex}
              >
                <Link href={banner.linkUrl} className="block w-full h-full relative" aria-label={`View ${banner.title}`}>
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 90vw"
                    priority={index === 0}
                  />
                  {/* Optional gradient overlay to make text more readable if we add text overlay later */}
                  <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors duration-300" />
                </Link>
              </div>
            ))}

            {eventBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 transition-all hover:bg-white/40 group-hover:opacity-100 focus:opacity-100 sm:h-12 sm:w-12 border border-white/30"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 transition-all hover:bg-white/40 group-hover:opacity-100 focus:opacity-100 sm:h-12 sm:w-12 border border-white/30"
                  aria-label="Next banner"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {eventBanners.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeIndex
                          ? "w-8 bg-white"
                          : "w-2 bg-white/50 hover:bg-white/80"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                      aria-current={index === activeIndex ? "true" : undefined}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
