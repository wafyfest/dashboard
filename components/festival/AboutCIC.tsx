'use client';

import React from 'react';
import { MapPin, BookOpen, Users } from 'lucide-react';
import { useInView } from '@/lib/hooks/useInView';

const STATS = [
  { value: '25+', label: 'Colleges', color: 'text-sky-500', bg: 'bg-sky-500/8' },
  { value: '4', label: 'Academic Phases', color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
  { value: '40+', label: 'Years', color: 'text-amber-500', bg: 'bg-amber-500/8' },
  { value: '15K+', label: 'Alumni', color: 'text-purple-500', bg: 'bg-purple-500/8' },
];

/** Minimal Arabic geometric SVG tile — used as section texture */
function GeometricTexture() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="geo-cic" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
          <polygon
            points="36,3 69,19 69,53 36,69 3,53 3,19"
            fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5"
          />
          <polygon
            points="36,15 57,27 57,51 36,63 15,51 15,27"
            fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.3"
          />
          <circle cx="36" cy="36" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-cic)"
        className="text-[var(--text-primary)] opacity-[0.03] dark:opacity-[0.045]"
      />
    </svg>
  );
}

export function AboutCIC() {
  const [headRef, headInView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [leftRef, leftInView] = useInView<HTMLDivElement>({ threshold: 0.12 });
  const [rightRef, rightInView] = useInView<HTMLDivElement>({ threshold: 0.12 });

  return (
    <section id="cic" className="relative py-24 sm:py-32 overflow-hidden">
      <GeometricTexture />

      {/* Left-edge color bar — visual differentiator */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-sky-500 to-transparent rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

        {/* ── Section header — no pill badge, just bold hierarchy ── */}
        <div
          ref={headRef}
          className={`reveal-up ${headInView ? 'in-view' : ''} mb-14 sm:mb-20`}
        >
          <p className="text-sky-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            The Apex Body
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-[1.05] max-w-xl">
              Coordination of<br className="hidden sm:block" /> Islamic Colleges
            </h2>
            <p className="text-[var(--text-muted)] text-sm sm:text-right sm:max-w-xs leading-relaxed">
              تنسيقية الكليات الإسلامية<br />
              <span className="text-xs opacity-70">Markaz Campus, Karthala, Kerala</span>
            </p>
          </div>
          {/* Ruled line */}
          <div className="mt-6 h-px bg-gradient-to-r from-sky-500/60 via-[var(--border-medium)] to-transparent" />
        </div>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">

          {/* Left: prose */}
          <div
            ref={leftRef}
            className={`reveal-left ${leftInView ? 'in-view' : ''} space-y-6`}
          >
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              The <strong className="text-[var(--text-primary)] font-semibold">
                Coordination of Islamic Colleges (CIC)
              </strong> is the apex academic governing body overseeing the{' '}
              <em>Wafy</em> and <em>Wafiyya</em> curricula — a model that fuses classical
              Islamic scholarship with modern university education.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Rooted at <strong className="text-[var(--text-primary)]">Markaz Campus, Karthala</strong>,
              CIC has built an unmatched network of 25+ affiliated institutions across Kerala,
              setting the standard for holistic Islamic scholarship that is traditional in depth yet
              relevant to every era.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Four structured phases — <span className="text-amber-500 font-semibold">Foundation</span>,{' '}
              <span className="text-sky-500 font-semibold">Thamheediyya</span>,{' '}
              <span className="text-emerald-500 font-semibold">Aliya</span>, and{' '}
              <span className="text-purple-500 font-semibold">PG / General</span> — build
              systematically upon each other, graduating scholars equally at home in classical
              Arabic literature and modern disciplines.
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { icon: MapPin, label: 'Markaz Campus, Karthala' },
                { icon: BookOpen, label: 'Wafy & Wafiyya Curricula' },
                { icon: Users, label: '25+ Institutions' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full"
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </span>
              ))}
            </div>

            {/* Pull quote — left-border style */}
            <blockquote className="border-l-2 border-sky-500 pl-4 py-1">
              <p className="text-sm italic text-[var(--text-secondary)]">
                "Uniting the wisdom of the past with the knowledge of the present —
                building scholars who shape the future."
              </p>
            </blockquote>
          </div>

          {/* Right: stat grid */}
          <div
            ref={rightRef}
            className={`reveal-right ${rightInView ? 'in-view' : ''}`}
          >
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(({ value, label, color, bg }, i) => (
                <div
                  key={label}
                  className={`reveal-scale ${rightInView ? 'in-view' : ''} rounded-2xl p-6 sm:p-7 ${bg} border border-[var(--border-subtle)]`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`text-4xl sm:text-5xl font-extrabold font-mono ${color} leading-none`}>
                    {value}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
