'use client';

import React from 'react';
import { BookOpen, Layers, GraduationCap, Sparkles } from 'lucide-react';

const PHASES = [
  {
    id: 'foundation',
    arabicName: 'ما قبل التمهيدية',
    engName: 'Foundation',
    subtitle: 'HIGH SCHOOL LEVEL',
    numeral: '01',
    duration: '3 Years',
    icon: BookOpen,
    description:
      'Three-year integrated schooling leading to the secondary school leaving board examination.',
  },
  {
    id: 'thamheediyya',
    arabicName: 'التمهيدية',
    engName: 'Thamheediyya',
    subtitle: 'PREPARATORY LEVEL',
    numeral: '02',
    duration: '2 Years',
    icon: Layers,
    description:
      'Two-year preparatory schooling across higher secondary academic streams.',
  },
  {
    id: 'aliya',
    arabicName: 'العالية',
    engName: 'Aliya',
    subtitle: 'UNDERGRADUATE DEGREE',
    numeral: '03',
    duration: '3–4 Years',
    icon: GraduationCap,
    description:
      'UGC-recognised university Bachelor’s degree program across affiliated collegiate campuses.',
  },
  {
    id: 'muthawwal',
    arabicName: 'المطوّل',
    engName: 'Muthawwal',
    subtitle: 'POSTGRADUATE TIER',
    numeral: '04',
    duration: '2 Years',
    icon: Sparkles,
    description:
      'Two-year postgraduate Master’s level specialization and academic research thesis.',
  },
] as const;

export function WafyStream() {
  return (
    <section
      id="wafy"
      aria-label="Academic Stream Curriculum"
      className="relative scroll-mt-20 bg-[var(--f-canvas)] py-20 text-[var(--f-text-primary)] sm:py-28 border-b border-white/5"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-14 sm:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>4-Tier Academic Roadmap</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white font-heading">
              Stream Curriculum
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-[var(--f-text-muted)] lg:text-right font-sans">
            Combines classical Islamic scholarship with modern university education across four sequential phases.
          </p>
        </div>

        {/* ── Connected Timeline Visual Indicator (Desktop) ── */}
        <div className="hidden lg:block relative mb-8" aria-hidden="true">
          <div className="absolute top-1/2 left-10 right-10 h-0.5 -translate-y-1/2 bg-gradient-to-r from-amber-500/20 via-blue-500/30 to-amber-500/20 z-0" />
          <div className="relative z-10 grid grid-cols-4 text-center">
            {PHASES.map((phase) => (
              <div key={phase.id} className="flex flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--f-saffron)] bg-[var(--f-canvas)] text-[var(--f-saffron)] font-mono text-xs font-bold shadow-md shadow-amber-500/10">
                  {phase.numeral}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Responsive 4-Phase Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-5">
          {PHASES.map((phase) => {
            const Icon = phase.icon;

            return (
              <div
                key={phase.id}
                className="f-surface-card flex flex-col justify-between p-6 transition-all duration-300 hover:border-[var(--f-saffron)]/50 hover:shadow-xl"
              >
                <div>
                  {/* Top Bar: Numeral & Duration Badge */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[var(--f-saffron)] select-none">
                      {phase.numeral}
                    </span>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white">
                      <Icon className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                      <span>{phase.duration}</span>
                    </div>
                  </div>

                  {/* Titles */}
                  <div className="mt-5">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--f-text-muted)] font-heading">
                      {phase.subtitle}
                    </p>
                    <h3 className="mt-1 text-xl sm:text-2xl font-extrabold text-white tracking-tight font-heading">
                      {phase.engName}
                    </h3>
                    <p
                      lang="ar"
                      dir="rtl"
                      className="f-kufi mt-1 text-left sm:text-left text-base sm:text-lg font-bold text-[var(--f-saffron)]"
                    >
                      {phase.arabicName}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-[var(--f-text-secondary)] font-sans">
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
