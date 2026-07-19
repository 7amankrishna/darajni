"use client";

import { useEffect } from "react";

// Reveals [data-reveal] sections as they scroll into view. Content is only
// hidden after this effect runs (html.js-reveal), so nothing disappears when
// JS is disabled or fails to load. A MutationObserver picks up sections that
// stream in after navigation (dynamic pages render behind loading.tsx), so
// late-mounted content still reveals.
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    function track() {
      const targets = document.querySelectorAll<HTMLElement>(
        "[data-reveal]:not(.is-revealed):not([data-reveal-tracked])",
      );
      for (const target of targets) {
        target.setAttribute("data-reveal-tracked", "");
        if (target.getBoundingClientRect().top < window.innerHeight) {
          target.classList.add("is-revealed");
        } else {
          io.observe(target);
        }
      }
    }

    track();
    const mo = new MutationObserver(track);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
