'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useInView } from '@/lib/hooks/useInView';

interface Edition {
  edition: number;
  year: string;
  host?: string;
  highlight: string;
  isCurrent?: boolean;
}

const EDITIONS: Edition[] = [
  {
    edition: 1,
    year: '1997',
    highlight:
      'The inaugural Wafy Arts Fest — establishing a legacy of inter-collegiate cultural excellence under CIC.',
  },
  {
    edition: 2,
    year: '1999',
    highlight:
      'Growing participation as more affiliated colleges joined the expanding Wafy network.',
  },
  {
    edition: 3,
    year: '2001',
    highlight:
      'Introduction of formal blind-judging protocols to ensure fair and impartial competition.',
  },
  {
    edition: 4,
    year: '2003',
    highlight:
      'Expansion of literary categories — Quranic recitation and Arabic oratory formally added.',
  },
  {
    edition: 5,
    year: '2005',
    highlight:
      'First edition to feature offstage and submission-based events alongside live performances.',
  },
  {
    edition: 6,
    year: '2007',
    highlight:
      'Pan-Kerala reach achieved with 15+ colleges competing across all four academic phases.',
  },
  {
    edition: 7,
    year: '2009',
    highlight:
      'Aliya (Senior) category introduced as a fully independent competitive tier.',
  },
  {
    edition: 8,
    year: '2011',
    highlight:
      'Digital tabulation system piloted for real-time result processing and score transparency.',
  },
  {
    edition: 9,
    year: '2013',
    highlight:
      'Record 1,000+ participants across Foundation, Junior, and Senior phases in a single edition.',
  },
  {
    edition: 10,
    year: '2015',
    highlight:
      'Decade milestone — celebrated with expanded stage count, grand ceremony, and special awards.',
  },
  {
    edition: 11,
    year: '2017',
    highlight:
      'PG / General category formalized with dedicated events for postgraduate scholars.',
  },
  {
    edition: 12,
    year: '2019',
    highlight:
      'Online registration system launched, streamlining coordination across all affiliated colleges.',
  },
  {
    edition: 13,
    year: '2022',
    highlight:
      'Post-pandemic return with hybrid formats, heightened participation energy, and digital broadcasts.',
  },
  {
    edition: 14,
    year: '2024–2025',
    highlight:
      'The 14th edition — the most technologically advanced fest yet, with live stage tracking, automated blind tabulation, admit cards, and the official digital management portal.',
    isCurrent: true,
  },
];

// ── Single edition card ───────────────────────────────────────────────
function EditionCard({
  edition,
  align,
}: {
  edition: Edition;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`
        glass-card p-4 sm:p-5 rounded-2xl w-full max-w-sm
        ${align === 'right' ? 'ml-auto text-right' : 'mr-auto text-left'}
        ${edition.isCurrent
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
          : ''
        }
      `}
    >
      <div
        className={`flex items-center gap-2 mb-2 ${align === 'right' ? 'justify-end' : ''}`}
      >
        <span
          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${edition.isCurrent
            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
            }`}
        >
          {edition.isCurrent && <Sparkles className="w-3 h-3 inline mr-1" />}
          Edition {edition.edition}
        </span>
        {edition.isCurrent && (
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            Current
          </span>
        )}
      </div>
      {edition.host && (
        <p className="text-[10px] text-[var(--text-muted)] mb-1.5 font-medium">
          {edition.host}
        </p>
      )}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {edition.highlight}
      </p>
    </div>
  );
}

// ── Single timeline node ──────────────────────────────────────────────
function TimelineNode({
  edition,
  index,
}: {
  edition: Edition;
  index: number;
}) {
  const isLeft = index % 2 === 0;
  const [nodeRef, nodeInView] = useInView<HTMLDivElement>({ threshold: 0.2 });

  return (
    <div ref={nodeRef} className="relative flex items-center justify-center">

      {/* ── Desktop: alternating left / right ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] w-full items-center gap-6">

        {/* Left slot */}
        <div className={isLeft ? `reveal-left ${nodeInView ? 'in-view' : ''}` : ''}>
          {isLeft ? <EditionCard edition={edition} align="right" /> : <div />}
        </div>

        {/* Center dot + year */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div
            className={`w-4 h-4 rounded-full border-2 z-10 relative transition-colors duration-300 ${edition.isCurrent
              ? 'bg-emerald-500 border-emerald-400 pulse-dot'
              : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'
              }`}
          />
          <span
            className={`text-[10px] font-mono font-bold ${edition.isCurrent ? 'text-emerald-500' : 'text-[var(--text-muted)]'
              }`}
          >
            {edition.year}
          </span>
        </div>

        {/* Right slot */}
        <div className={!isLeft ? `reveal-right ${nodeInView ? 'in-view' : ''}` : ''}>
          {!isLeft ? <EditionCard edition={edition} align="left" /> : <div />}
        </div>
      </div>

      {/* ── Mobile: all left-aligned ── */}
      <div className={`lg:hidden w-full pl-8 reveal-right ${nodeInView ? 'in-view' : ''}`}>
        <div
          className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 z-10 ${edition.isCurrent
            ? 'bg-emerald-500 border-emerald-400 pulse-dot'
            : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'
            }`}
        />
        <EditionCard edition={edition} align="left" />
      </div>
    </div>
  );
}

// ── Main FestHistory component ────────────────────────────────────────
export function FestHistory() {
  const [headerRef, headerInView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [lineRef, lineInView] = useInView<HTMLDivElement>({ threshold: 0.05 });

  return (
    <section id="history" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Top rule */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[var(--border-subtle)]" />
      {/* Right-edge color bar */}
      <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-amber-500 to-transparent rounded-full" />

      <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16">

        {/* Section header — editorial, left-aligned on desktop */}
        <div
          ref={headerRef}
          className={`reveal-up ${headerRef ? 'in-view' : ''} mb-14 sm:mb-20`}
        >
          <p className="text-amber-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            Since 1997
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-[1.05]">
              A Legacy of<br className="hidden sm:block" /> 14 Editions
            </h2>
            <p className="text-sm text-[var(--text-secondary)] sm:text-right sm:max-w-xs leading-relaxed">
              From a humble gathering of scholars to a premier inter-collegiate cultural institution — growing edition by edition.
            </p>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-amber-500/60 via-[var(--border-medium)] to-transparent" />
        </div>

        {/* Timeline */}
        <div className="relative">

          {/* Desktop center gradient line */}
          <div
            ref={lineRef}
            className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px overflow-hidden"
          >
            <div
              className={`w-full h-full draw-line ${lineInView ? 'in-view' : ''}`}
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, #10B981 10%, #F59E0B 50%, #A855F7 90%, transparent 100%)',
              }}
            />
          </div>

          {/* Mobile left line */}
          <div className="lg:hidden absolute left-1.5 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent" />

          {/* Edition nodes */}
          <div className="space-y-6 sm:space-y-8">
            {EDITIONS.map((ed, i) => (
              <TimelineNode key={ed.edition} edition={ed} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
