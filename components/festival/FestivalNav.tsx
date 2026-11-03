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
  { id: 'wafy', label: 'Curriculum' },
  { id: 'committee', label: 'Committee' },
];

export function FestivalNav() {
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight >= documentHeight - 50) {
        setActiveId(SECTIONS[SECTIONS.length - 1].id);
        return;
      }

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            setActiveId(SECTIONS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = 70;
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = Math.max(0, elementPosition - navHeight);

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  return (
    <nav
      className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-2.5 select-none pointer-events-auto"
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
            className="f-focus group relative flex items-center justify-end cursor-pointer bg-transparent border-none p-1.5 focus:outline-none"
          >
            {/* Tooltip label on hover */}
            <span
              className="
                absolute right-full mr-3 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                bg-[#11182c] border border-white/10 text-white
                opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl
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
                    ? 'w-2.5 h-2.5 bg-[var(--f-saffron)] ring-2 ring-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-110'
                    : 'w-1.5 h-1.5 bg-slate-500 hover:bg-[var(--f-saffron)] hover:scale-125'
                }
              `}
            />
          </button>
        );
      })}
    </nav>
  );
}
