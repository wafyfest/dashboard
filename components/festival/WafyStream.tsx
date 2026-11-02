'use client';

import React, { useState } from 'react';
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
      '3-year integrated schooling leading to the SSLC board exam alongside foundational Islamic jurisprudence (Fiqh), theology (Aqeedah), and Arabic roots.',
    highlights: ['SSLC Board Exam', 'Fiqh & Aqeedah', 'Arabic & Urdu Roots'],
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
      '2-year higher secondary (+1 & +2) across Science, Commerce, or Humanities with intensive Madrasathul Umm Arabic LSRW (Listening, Speaking, Reading, Writing) immersion and Hadith studies.',
    highlights: ['LSRW (Listen, Speak, Read, Write)', 'Plus Two (+1 & +2)', 'Madrasathul Umm'],
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
      'UGC-recognised university Bachelor’s degree integrated with advanced theology, Tafseer, philosophy, logic, and Wafiyya Home Science for girls.',
    highlights: ['UGC Bachelor’s', 'Advanced Theology', 'Wafiyya Home Science'],
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
      '2-year Master’s specialization across Theology, Sharia, and Language faculties, culminating in a mandatory 100-page Arabic thesis.',
    highlights: ['Master’s Specialisation', 'Theology & Sharia', '100-Page Arabic Thesis'],
  },
] as const;

export function WafyStream() {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);

  return (
    <section
      id="wafy"
      className="f-sans relative scroll-mt-16 bg-black py-20 text-white sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-12 sm:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>4-Tier Academic Roadmap</span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white">
              Stream Curriculum
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-white/70 lg:text-right">
            Seamlessly wedding classical Islamic scholarship with modern university education across four progressive phases.
          </p>
        </div>

        {/* ── Curriculum Progression Cards (Compact Uniform Heights) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-4 sm:gap-5">
          {PHASES.map((phase) => {
            const isHovered = hoveredPhase === phase.id;
            const Icon = phase.icon;

            return (
              <div
                key={phase.id}
                onMouseEnter={() => setHoveredPhase(phase.id)}
                onMouseLeave={() => setHoveredPhase(null)}
                className={`
                  group relative flex flex-col justify-between rounded-[22px] border p-6 sm:p-7
                  transition-all duration-300 ease-out cursor-pointer h-full min-h-[440px] sm:min-h-[460px]
                  ${isHovered
                    ? 'bg-[#FFB41F] border-amber-400/50 text-[#0C1244] shadow-[0_20px_50px_rgba(255,180,31,0.35)] -translate-y-2 scale-[1.015]'
                    : 'bg-[#18181C] border-white/[0.10] text-white hover:bg-[#FFB41F] hover:border-amber-400/50 hover:text-[#0C1244] hover:shadow-[0_20px_50px_rgba(255,180,31,0.35)] hover:-translate-y-2 hover:scale-[1.015]'
                  }
                `}
              >
                {/* ── Top content ── */}
                <div>
                  {/* Top Header: Numeral + Duration Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`f-kufi text-4xl sm:text-5xl font-extrabold leading-none transition-colors select-none ${
                        isHovered ? 'text-[#0C1244]/35' : 'text-white/20 group-hover:text-[#0C1244]/35'
                      }`}
                    >
                      {phase.numeral}
                    </span>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all ${
                        isHovered
                          ? 'border-[#0C1244]/15 bg-[#0C1244]/10 text-[#0C1244] scale-105'
                          : 'border-white/15 bg-white/5 text-white/85 group-hover:border-[#0C1244]/15 group-hover:bg-[#0C1244]/10 group-hover:text-[#0C1244] group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{phase.duration}</span>
                    </div>
                  </div>

                  {/* Subtitle tier label */}
                  <div className="mt-6">
                    <p
                      className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${
                        isHovered ? 'text-[#0C1244]/70' : 'text-white/60 group-hover:text-[#0C1244]/70'
                      }`}
                    >
                      {phase.subtitle}
                    </p>
                    <h3
                      className={`mt-1 text-2xl font-extrabold leading-tight tracking-tight transition-colors ${
                        isHovered ? 'text-[#0C1244]' : 'text-white group-hover:text-[#0C1244]'
                      }`}
                    >
                      {phase.engName}
                    </h3>
                    <p
                      lang="ar"
                      dir="rtl"
                      className={`f-kufi mt-0.5 text-left text-lg font-bold transition-colors ${
                        isHovered ? 'text-[#0C1244]' : 'text-white/90 group-hover:text-[#0C1244]'
                      }`}
                    >
                      {phase.arabicName}
                    </p>
                  </div>

                  {/* Concise Description paragraph */}
                  <p
                    className={`mt-3.5 text-xs sm:text-sm leading-relaxed transition-colors ${
                      isHovered ? 'text-[#0C1244]/85' : 'text-white/70 group-hover:text-[#0C1244]/85'
                    }`}
                  >
                    {phase.description}
                  </p>
                </div>

                {/* ── Bottom content: Divider + Key Competencies ── */}
                <div
                  className={`mt-6 border-t pt-4 transition-colors ${
                    isHovered ? 'border-[#0C1244]/15' : 'border-white/10 group-hover:border-[#0C1244]/15'
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold tracking-widest uppercase mb-2.5 transition-colors ${
                      isHovered ? 'text-[#0C1244]/65' : 'text-white/50 group-hover:text-[#0C1244]/65'
                    }`}
                  >
                    KEY COMPETENCIES
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.highlights.map((h) => (
                      <span
                        key={h}
                        className={`
                          rounded-full border px-2.5 py-0.5 text-[11px] font-semibold
                          transition-all duration-200 cursor-default
                          ${
                            isHovered
                              ? 'bg-[#0C1244]/12 text-[#0C1244] border-[#0C1244]/10 hover:bg-[#0C1244]/20'
                              : 'bg-[#2A2A32] text-white/85 border-white/[0.06] group-hover:bg-[#0C1244]/12 group-hover:text-[#0C1244] group-hover:border-[#0C1244]/10 hover:bg-white/20'
                          }
                        `}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
