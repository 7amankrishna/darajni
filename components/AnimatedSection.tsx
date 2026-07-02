"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useInView } from "@/lib/useInView";

export default function AnimatedSection({
  children,
}: {
  children: ReactNode;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const observerOptions = useMemo<IntersectionObserverInit>(
    () => ({ threshold: 0.1 }),
    [],
  );
  const [sectionRef, isVisible] = useInView<HTMLDivElement>(observerOptions);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };

    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div
      ref={sectionRef}
      className={
        reduceMotion || isVisible
          ? "animate-fade-up visible"
          : "animate-fade-up"
      }
    >
      {children}
    </div>
  );
}
