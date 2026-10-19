// hooks/useInView.ts
'use client';

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Umbral de visibilidad (0-1). Default 0.15 (15% visible). */
  threshold?: number;
  /** Margen para disparar la animación antes/después. Default '0px 0px -50px 0px'. */
  rootMargin?: string;
  /** Si es true, la animación solo se dispara la primera vez. Default true. */
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
  once = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback para navegadores viejos o SSR
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView] as const;
}