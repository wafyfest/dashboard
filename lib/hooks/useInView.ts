'use client';

import { useEffect, useRef, useState, MutableRefObject } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * useInView — triggers a boolean when the referenced element enters the viewport.
 * Uses IntersectionObserver; no external dependencies.
 *
 * Usage:
 *   const [ref, inView] = useInView<HTMLDivElement>();
 *   <div ref={ref} className={`reveal-up ${inView ? 'in-view' : ''}`} />
 */
export function useInView<T extends Element = Element>(
  options: UseInViewOptions = {}
): [MutableRefObject<T | null>, boolean] {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px',
    once = true,
  } = options;

  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView];
}
