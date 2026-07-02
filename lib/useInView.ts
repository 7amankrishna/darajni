import { useEffect, useState, useRef } from "react";

export function useInView<E extends HTMLElement = HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.1 }
): [React.RefObject<E | null>, boolean] {
  const ref = useRef<E | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options]);

  return [ref, isVisible] as const;
}