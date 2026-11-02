'use client';

import React, { useState } from 'react';
import { Star } from './FestivalPattern';
import { Calendar, Search, Sparkles, Trophy } from 'lucide-react';

interface Edition {
  edition: number;
  year: string;
  host?: string;
  highlight: string;
  isCurrent?: boolean;
}

const EDITIONS: Edition[] = [
  { edition: 1, year: '1997', highlight: 'The inaugural Wafy Arts Fest, establishing a legacy of inter-collegiate cultural excellence under CIC.' },
  { edition: 2, year: '1999', highlight: 'Growing participation as more affiliated colleges joined the expanding Wafy network across Kerala.' },
  { edition: 3, year: '2001', highlight: 'Introduction of formal blind-judging protocols to ensure impeccable fairness and academic impartiality.' },
  { edition: 4, year: '2003', highlight: 'Expansion of literary categories: Quranic recitation and Arabic classical oratory formally incorporated.' },
  { edition: 5, year: '2005', highlight: 'First edition to feature specialized offstage and research submission categories alongside live stage events.' },
  { edition: 6, year: '2007', highlight: 'Pan-Kerala reach achieved with 15+ colleges competing across all four progressive academic tiers.' },
  { edition: 7, year: '2009', highlight: 'Aliya (Senior Undergraduate) tier introduced as a fully independent competitive category.' },
  { edition: 8, year: '2011', highlight: 'Digital tabulation system piloted for real-time score processing and transparent public reporting.' },
  { edition: 9, year: '2013', highlight: 'Record milestone of 1,000+ competitors across Foundation, Junior, and Senior academic streams.' },
  { edition: 10, year: '2015', highlight: 'Decade anniversary, celebrated with multi-stage synchronized tracks, grand honors, and special trophies.' },
  { edition: 11, year: '2017', highlight: 'PG / General postgraduate stream formalized with dedicated research competitions and mentorship.' },
  { edition: 12, year: '2019', highlight: 'Online portal registration system inaugurated, connecting all affiliated colleges digitally.' },
  { edition: 13, year: '2022', highlight: 'Grand post-pandemic resurgence featuring hybrid stage broadcasts, digital scoring, and record crowds.' },
  {
    edition: 14,
    year: '2024–2025',
    highlight:
      'The most technologically advanced edition yet: automated digital tabulation, QR-enabled student admit cards, and full public festival portal.',
    isCurrent: true,
  },
];

export function FestHistory() {
  const [filterMode, setFilterMode] = useState<'all' | 'recent' | 'early'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const current = EDITIONS.find((e) => e.isCurrent) ?? EDITIONS[EDITIONS.length - 1];
  const allPast = EDITIONS.filter((e) => !e.isCurrent).reverse();

  const filteredPast = allPast.filter((item) => {
    const matchesSearch =
      item.year.includes(searchQuery) ||
      item.edition.toString().includes(searchQuery) ||
      item.highlight.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'recent') {
      return item.edition >= 10;
    }
    if (filterMode === 'early') {
      return item.edition < 10;
    }
    return true;
  });

  return (
    <section
      id="history"
      className="f-sans relative scroll-mt-16 bg-[var(--f-chalk)] py-20 text-[var(--f-ink)] sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-lapis)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--f-lapis)]" />
              <span>Historic Retrospective</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Fourteen Editions
              <br />
              Since 1997
            </h2>
          </div>
          <p className="max-w-xs text-sm sm:text-base leading-relaxed text-[var(--f-ink)]/75 sm:text-right">
            Tracing the evolution from a humble campus gathering to South India&apos;s premier collegiate cultural festival.
          </p>
        </div>

        {/* ── Current Edition Feature Card ── */}
        <div className="relative mt-12 grid gap-6 overflow-hidden rounded-2xl bg-[var(--f-ink)] p-7 sm:p-10 text-white shadow-xl sm:grid-cols-[auto_1fr] sm:items-center sm:gap-12">
          <Star className="pointer-events-none absolute -right-8 -top-8 h-64 w-64 text-white/[0.04]" />

          <div className="flex items-center gap-4 sm:flex-col sm:items-start">
            <div className="f-kufi text-7xl sm:text-9xl font-extrabold leading-none text-[var(--f-saffron)]">
              {current.edition}
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[var(--f-saffron)] tracking-wider uppercase">
              Current Edition
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
              <Calendar className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
              <span>{current.year} Academic Cycle</span>
            </div>
            <p className="mt-2.5 max-w-[56ch] text-lg sm:text-2xl font-bold leading-snug">
              {current.highlight}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                100% Digital Tabulation
              </span>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                Live Public Dashboards
              </span>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                Automated QR Admit Cards
              </span>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--f-ink)]/15 pb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[var(--f-lapis)] text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-[var(--f-ink)]/80 dark:bg-white/5'
              }`}
            >
              All 13 Past Editions
            </button>
            <button
              onClick={() => setFilterMode('recent')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'recent'
                  ? 'bg-[var(--f-lapis)] text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-[var(--f-ink)]/80 dark:bg-white/5'
              }`}
            >
              Modern Era (10–13)
            </button>
            <button
              onClick={() => setFilterMode('early')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'early'
                  ? 'bg-[var(--f-lapis)] text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-[var(--f-ink)]/80 dark:bg-white/5'
              }`}
            >
              Early Years (1–9)
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--f-ink)]/50" />
            <input
              type="text"
              placeholder="Search year or milestone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--f-ink)]/20 bg-white/70 py-1.5 pl-9 pr-3 text-xs text-[var(--f-ink)] placeholder-[var(--f-ink)]/50 focus:border-[var(--f-lapis)] focus:outline-none dark:bg-black/20"
            />
          </div>
        </div>

        {/* ── Past Editions Interactive Grid ── */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPast.map((ed) => (
            <div
              key={ed.edition}
              className="group rounded-xl border border-[var(--f-ink)]/15 bg-white/70 p-5 transition-all duration-200 hover:border-[var(--f-lapis)] hover:bg-white hover:shadow-md dark:bg-white/5 dark:hover:bg-[#151515]"
            >
              <div className="flex items-baseline justify-between border-b border-[var(--f-ink)]/10 pb-2.5">
                <span className="f-kufi text-2xl font-black text-[var(--f-lapis)] dark:text-sky-400">
                  {ed.year}
                </span>
                <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-bold text-[var(--f-ink)]/70 dark:bg-white/10">
                  Edition {ed.edition}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--f-ink)]/80">
                {ed.highlight}
              </p>
            </div>
          ))}
        </div>

        {filteredPast.length === 0 && (
          <div className="py-12 text-center text-xs text-[var(--f-ink)]/60">
            No festival editions matched your search criteria.
          </div>
        )}
      </div>
    </section>
  );
}
