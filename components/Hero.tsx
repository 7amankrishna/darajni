import Link from "next/link";
import { useEffect, useState, useRef } from "react";

import BrandLogo from "./BrandLogo";

export default function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
    };

    const heroElement = heroRef.current;
    if (heroElement) {
      heroElement.addEventListener("mousemove", handleMouseMove);
      return () => {
        heroElement.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, []);

  // Calculate transform values based on mouse position
  const getTransform = (element: string, maxMove: number) => {
    if (!heroRef.current) return "translate(0, 0)";
    const rect = heroRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = mousePos.x - centerX;
    const deltaY = mousePos.y - centerY;
    const moveX = (deltaX / centerX) * (maxMove / 2);
    const moveY = (deltaY / centerY) * (maxMove / 2);
    return `translate(${moveX}px, ${moveY}px)`;
  };

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative isolate min-h-[calc(100svh-74px)] overflow-hidden"
    >
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_42%,rgba(202,170,112,.2),transparent_28rem),linear-gradient(135deg,#080808_0%,#12100c_58%,#080808_100%)]" />
      <div
        className="absolute -right-28 top-1/2 -z-10 hidden -translate-y-1/2 opacity-55 lg:block"
        style={{ transform: getTransform("logo", 40) }}
      >
        <BrandLogo className="h-[42rem] w-[42rem] border border-[#caaa70]/15 shadow-[0_0_120px_rgba(202,170,112,.12)]" priority />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,7,7,.98)_0%,rgba(7,7,7,.82)_52%,rgba(7,7,7,.18)_100%)]" />

      <div className="section-shell flex min-h-[calc(100svh-74px)] items-end pb-14 pt-20 md:items-center md:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Crafted in Bihar Sharif · Delivered Pan India</p>
          <h1 className="font-display mt-6 text-[clamp(3.5rem,9vw,7.8rem)] font-medium leading-[0.82] tracking-[-0.035em]">
            Dont just wear Clothes.
            <span className="mt-2 block italic text-[#d8b879]">WEAR CONFIDENCE.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-white/67 md:text-lg">
            Discover premium lehengas, sarees, anarkalis and gowns with clear
            pricing, secure checkout and delivery across India.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#collection" className="primary-button sm:min-w-48">
              Explore collection
            </a>
            <Link href="/track" className="secondary-button sm:min-w-48">
              Track an order
            </Link>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/12 border-y border-white/12 py-5">
            {[
              ["Secure checkout", "COD and Razorpay"],
              ["Guest ordering", "No account required"],
              ["Pan India", "Tracked fulfilment"],
            ].map(([title, detail]) => (
              <div key={title} className="px-3 first:pl-0 sm:px-6">
                <p className="font-display text-lg text-[#e2c48b] sm:text-2xl">{title}</p>
                <p className="mt-1 hidden text-[0.68rem] text-white/38 sm:block">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}