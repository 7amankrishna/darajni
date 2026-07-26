"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductImage } from "@/components/product/product-image";
import { VideoPlayer } from "@/components/video-player";
import type { HomepageSlide } from "@/types/commerce";

function SlideLink({ slide }: { slide: HomepageSlide }) {
  const className = "primary-button w-fit";
  const content = (
    <>
      {slide.ctaLabel}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  if (slide.linkUrl.startsWith("https://")) {
    return (
      <a href={slide.linkUrl} className={className} rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={slide.linkUrl} className={className}>
      {content}
    </Link>
  );
}

export function HomepageLaunchSlider({ slides }: { slides: HomepageSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [slides.length]);

  if (!activeSlide) return null;

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length);
  };

  return (
    <section className="bg-[#FFF8EF] py-14 sm:py-20" aria-labelledby="homepage-launches-title">
      <div className="section-shell">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-[#B8893B]/30 bg-[#171717] text-[#FFFDF8] shadow-[0_28px_70px_rgba(83,54,22,0.16)]"
          role="region"
          aria-roledescription="carousel"
          aria-label="Homepage launches"
        >
          <div className="grid min-h-[31rem] md:grid-cols-[0.96fr_1.04fr] md:min-h-[34rem]">
            <div className="relative order-2 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 md:order-1 lg:px-14">
              <span className="absolute left-0 top-0 h-36 w-36 rounded-full bg-[#B8893B]/15 blur-3xl" />
              <div className="relative z-10 max-w-xl">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-[#E7C47F]">
                  {activeSlide.eyebrow || "New at DARAJNI"}
                </p>
                <h2 id="homepage-launches-title" className="font-display mt-4 text-5xl leading-[0.9] sm:text-6xl">
                  {activeSlide.title}
                </h2>
                {activeSlide.description && (
                  <p className="mt-5 max-w-lg text-sm leading-7 text-[#FFF8EF]/76">
                    {activeSlide.description}
                  </p>
                )}
                <div className="mt-8">
                  <SlideLink slide={activeSlide} />
                </div>
              </div>

              {slides.length > 1 && (
                <div className="homepage-launch-controls relative z-10 mt-9 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={showPrevious}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:border-[#E7C47F] hover:bg-white/10"
                    aria-label="Show previous launch"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:border-[#E7C47F] hover:bg-white/10"
                    aria-label="Show next launch"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="homepage-launch-dots ml-2 flex min-w-0 gap-2" aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}>
                    {slides.map((slide, index) => (
                      <button
                        type="button"
                        key={slide.id}
                        onClick={() => setActiveIndex(index)}
                        className={`h-2.5 rounded-full transition ${
                          index === activeIndex
                            ? "w-7 bg-[#E7C47F]"
                            : "w-2.5 bg-white/35 hover:bg-white/60"
                        }`}
                        aria-label={`Show ${slide.title}`}
                        aria-current={index === activeIndex ? "true" : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative order-1 min-h-72 overflow-hidden bg-[#F6E9DD] md:order-2">
              {activeSlide.videoUrl ? (
                <VideoPlayer
                  src={activeSlide.videoUrl}
                  poster={activeSlide.imageUrl}
                  className="h-full w-full"
                />
              ) : (
                <ProductImage
                  src={activeSlide.imageUrl}
                  alt=""
                  sizes="(max-width: 768px) 100vw, 52vw"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r md:from-black/20 md:via-transparent" />
              <span className="absolute bottom-5 right-5 rounded-full border border-white/35 bg-black/25 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white backdrop-blur">
                {activeIndex + 1} / {slides.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
