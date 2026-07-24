"use client";

import { useEffect } from "react";

// Reveals [data-reveal] sections as they scroll into view. Content is only
// hidden after this effect runs (html.js-reveal), so nothing disappears when
// JS is disabled or fails to load. A MutationObserver picks up sections that
// stream in after navigation (dynamic pages render behind loading.tsx), so
// late-mounted content still reveals. The observer work is coalesced in a
// frame and relies on IntersectionObserver instead of synchronous layout reads.
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

    let frame: number | undefined;

    function track() {
      const targets = document.querySelectorAll<HTMLElement>(
        "[data-reveal]:not(.is-revealed):not([data-reveal-tracked])",
      );
      for (const target of targets) {
        target.setAttribute("data-reveal-tracked", "");
        io.observe(target);
      }
    }

    function scheduleTrack() {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        track();
      });
    }

    track();
    const mo = new MutationObserver(scheduleTrack);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
