'use client';

import React, { useEffect, useState } from 'react';

interface NavSection {
  id: string;
  label: string;
}

const SECTIONS: NavSection[] = [
  { id: 'hero', label: 'Home' },
  { id: 'cic', label: 'About CIC' },
  { id: 'wsf', label: 'About WSF' },
  { id: 'wafy', label: 'Wafy Stream' },
  { id: 'history', label: 'History' },
  { id: 'committee', label: 'Committee' },
];

export function FestivalNav() {
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-3"
      aria-label="Page sections"
    >
      {SECTIONS.map(({ id, label }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            title={label}
            aria-label={`Go to ${label} section`}
            className="group relative flex items-center justify-end gap-2 cursor-pointer bg-transparent border-none p-0"
          >
            {/* Tooltip label */}
            <span className="
              absolute right-full mr-3 px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap
              bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]
              opacity-0 group-hover:opacity-100 pointer-events-none
              transition-opacity duration-150 shadow-card font-heading
            ">
              {label}
            </span>
            {/* Dot */}
            <div className={`
              rounded-full border transition-all duration-300
              ${isActive
                ? 'w-3 h-3 bg-emerald-500 border-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)]'
                : 'w-2 h-2 bg-[var(--bg-hover)] border-[var(--border-medium)] hover:border-emerald-400 hover:bg-emerald-500/30'
              }
            `} />
          </button>
        );
      })}
    </nav>
  );
}
