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
  { id: 'committee', label: 'Committee' },
];

export function FestivalNav() {
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      // Offset calculation for reading zone (120px below top of viewport)
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // If at bottom of page, activate last section
      if (scrollY + windowHeight >= documentHeight - 50) {
        setActiveId(SECTIONS[SECTIONS.length - 1].id);
        return;
      }

      // Check sections from bottom to top
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Element is active if its top is near or above reading line (120px)
          if (rect.top <= 140) {
            setActiveId(SECTIONS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger on mount
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = 56; // 14rem / 56px navbar
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = Math.max(0, elementPosition - navHeight);

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  return (
    <nav
      className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-2 select-none pointer-events-auto"
      aria-label="Section navigation"
    >
      {SECTIONS.map(({ id, label }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            title={label}
            aria-label={`Scroll to ${label}`}
            className="group relative flex items-center justify-end cursor-pointer bg-transparent border-none p-1 focus:outline-none"
          >
            {/* Tooltip label on hover */}
            <span
              className="
                absolute right-full mr-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap
                bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]
                opacity-0 group-hover:opacity-100 pointer-events-none shadow-sm
                transition-all duration-150 transform translate-x-1 group-hover:translate-x-0 font-heading
              "
            >
              {label}
            </span>

            {/* Micro Indicator Dot */}
            <div
              className={`
                rounded-full transition-all duration-200
                ${
                  isActive
                    ? 'w-2 h-2 bg-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-600 hover:bg-emerald-400 hover:scale-125'
                }
              `}
            />
          </button>
        );
      })}
    </nav>
  );
}


