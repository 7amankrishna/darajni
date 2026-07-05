"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import { useInView } from "@/lib/useInView";

export default function Card3DReveal({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const observerOptions = useMemo<IntersectionObserverInit>(
    () => ({ threshold: 0.15, rootMargin: "0px 0px -40px 0px" }),
    [],
  );
  const [cardRef, isVisible] = useInView<HTMLDivElement>(observerOptions);

  return (
    <div ref={cardRef} className="card-3d-stage">
      <div
        className={
          isVisible ? "card-3d-reveal is-revealed" : "card-3d-reveal"
        }
        style={{ transitionDelay: `${Math.min(index, 5) * 110}ms` }}
      >
        {children}
      </div>
    </div>
  );
}
