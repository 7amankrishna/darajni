"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Reveals [data-reveal] sections as they scroll into view. Content is only
// hidden after this effect runs (html.js-reveal), so nothing disappears when
// JS is disabled or fails to load.
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-reveal");

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"),
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    for (const target of targets) {
      if (target.getBoundingClientRect().top < window.innerHeight) {
        target.classList.add("is-revealed");
      } else {
        observer.observe(target);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
