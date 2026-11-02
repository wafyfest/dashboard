'use client';

import React from 'react';
import { BookOpen, Star, GraduationCap, Layers } from 'lucide-react';
import { useInView } from '@/lib/hooks/useInView';

const PHASES = [
  {
    id: 'foundation',
    arabicName: 'ما قبل التمهيدية',
    engName: 'Foundation',
    subtitle: 'Sub-Junior',
    icon: Star,
    accent: '#f59e0b',           // amber-500
    borderClass: 'border-amber-500/25',
    bgClass: 'bg-amber-500/6',
    textClass: 'text-amber-500',
    numeral: '01',
    description:
      'Cultivating a love for Islamic learning, Arabic language, and creative expression in young scholars at the beginning of their Wafy journey.',
    highlights: ['Arabic Language', 'Quranic Studies', 'Creative Arts', 'Public Speaking'],
  },
  {
    id: 'thamheediyya',
    arabicName: 'التمهيدية',
    engName: 'Thamheediyya',
    subtitle: 'Junior',
    icon: BookOpen,
    accent: '#0ea5e9',           // sky-500
    borderClass: 'border-sky-500/25',
    bgClass: 'bg-sky-500/6',
    textClass: 'text-sky-500',
    numeral: '02',
    description:
      'Deepening engagement with Islamic sciences and classical Arabic literature, introducing competitive academic discourse and oratory.',
    highlights: ['Islamic Sciences', 'Classical Arabic', 'Debate & Oratory', 'Literary Arts'],
  },
  {
    id: 'aliya',
    arabicName: 'العالية',
    engName: 'Aliya',
    subtitle: 'Senior',
    icon: GraduationCap,
    accent: '#10b981',           // emerald-500
    borderClass: 'border-emerald-500/25',
    bgClass: 'bg-emerald-500/6',
    textClass: 'text-emerald-500',
    numeral: '03',
    description:
      'Advanced Islamic jurisprudence, philosophy, and high-level intellectual competitions — the pinnacle of the Wafy academic stream.',
    highlights: ['Advanced Jurisprudence', 'Islamic Philosophy', 'Research & Writing', 'Leadership'],
  },
  {
    id: 'pg',
    arabicName: 'الدراسات العليا',
    engName: 'PG / General',
    subtitle: 'Postgraduate',
    icon: Layers,
    accent: '#a855f7',           // purple-500
    borderClass: 'border-purple-500/25',
    bgClass: 'bg-purple-500/6',
    textClass: 'text-purple-500',
    numeral: '04',
    description:
      'The highest tier — postgraduate scholars bringing interdisciplinary depth, academic publication, and mentorship to the festival.',
    highlights: ['Post-Grad Research', 'Interdisciplinary Arts', 'Academic Publications', 'Mentorship'],
  },
] as const;

export function WafyStream() {
  const [headRef, headInView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [cardsRef, cardsInView] = useInView<HTMLDivElement>({ threshold: 0.04 });

  return (
    <section id="wafy" className="relative py-24 sm:py-32 bg-[var(--bg-subtle)]/40">
      {/* Top rule */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[var(--border-subtle)]" />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

        {/* ── Header — two-column editorial style ── */}
        <div
          ref={headRef}
          className={`reveal-up ${headInView ? 'in-view' : ''} flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14 sm:mb-20`}
        >
          <div>
            <p className="text-emerald-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              The Curriculum
            </p>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-[1.05]">
              Wafy &amp;<br className="hidden sm:block" /> Wafiyya Stream
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed lg:max-w-sm lg:text-right">
            A revolutionary model integrating the full rigor of traditional Islamic scholarship
            with the depth of a modern university education.
          </p>
        </div>

        {/* ── Phase cards — numbered, editorial grid ── */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border-subtle)] rounded-2xl overflow-hidden border border-[var(--border-subtle)]"
        >
          {PHASES.map(
            ({ id, arabicName, engName, subtitle, icon: Icon, borderClass, bgClass, textClass, numeral, description, highlights }, i) => (
              <div
                key={id}
                className={`reveal-up ${cardsInView ? 'in-view' : ''} bg-[var(--bg-page)] p-6 sm:p-8 flex flex-col gap-5 group hover:bg-[var(--bg-surface)] transition-colors duration-300`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {/* Numeral + icon */}
                <div className="flex items-start justify-between">
                  <span className={`text-4xl font-extrabold font-mono ${textClass} opacity-20 leading-none select-none`}>
                    {numeral}
                  </span>
                  <div className={`w-10 h-10 rounded-xl ${bgClass} ${textClass} border ${borderClass} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                  </div>
                </div>

                {/* Names */}
                <div className="space-y-0.5">
                  <div className={`text-[10px] font-bold tracking-[0.18em] uppercase ${textClass}`}>
                    {subtitle}
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] font-heading leading-tight">
                    {engName}
                  </h3>
                  <p className={`text-[11px] ${textClass} opacity-70 font-heading`}>{arabicName}</p>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                  {description}
                </p>

                {/* Highlights — simple text list */}
                <ul className="space-y-1 border-t border-[var(--border-subtle)] pt-4">
                  {highlights.map(h => (
                    <li key={h} className={`text-[11px] font-medium ${textClass} flex items-center gap-2`}>
                      <span className="w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
