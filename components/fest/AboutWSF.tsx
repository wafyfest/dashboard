'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const WSF_STATS = [
  { value: '25', label: 'Affiliated Colleges', detail: 'Owned by or affiliated to CIC' },
  { value: '15+', label: 'Years Operational', detail: 'Legacy of youth empowerment' },
  { value: '13', label: 'Arts Fests Held', detail: 'State-level cultural flagship' },
  { value: '2', label: 'Years Cycle', detail: 'Biennial Arts Fest & Sports Meet' },
];

export function AboutWSF() {
  return (
    <section
      id="wsf"
      aria-label="About Wafy Students Federation"
      className="relative scroll-mt-20 bg-[var(--f-surface-subtle)] py-20 text-[var(--f-text-primary)] sm:py-28 border-b border-white/5"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <span className="h-2 w-2 rounded-full bg-[var(--f-saffron)]" />
              <span>Official Student Wing of CIC</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white font-heading">
              Wafy Students
              <br />
              Federation
            </h2>
          </div>
          <p
            lang="ar"
            dir="rtl"
            className="f-kufi text-left sm:text-left text-2xl font-bold text-[var(--f-saffron)] sm:text-3xl"
          >
            اتحاد طلاب وافي
          </p>
        </div>

        {/* ── Editorial Narrative ── */}
        <div className="mt-8 max-w-4xl text-sm sm:text-base leading-relaxed text-[var(--f-text-secondary)] font-sans">
          <p>
            <strong className="text-white">Wafy Students Federation (WSF)</strong> is the apex student wing of CIC, representing
            the collegiate student body across affiliated colleges in Kerala. Operational for over 15 years, the WSF coordinates
            state-level youth initiatives, creative forums, and academic conferences, culminating in the premier biennial{' '}
            <strong className="text-white">State Wafy Arts Fest</strong>.
          </p>
        </div>

        {/* ── WSF Scale Strip ── */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {WSF_STATS.map(({ value, label, detail }) => (
            <div
              key={label}
              className="f-surface-card p-4 sm:p-5 text-center transition-transform hover:-translate-y-1"
            >
              <dd className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--f-saffron)]">
                {value}
              </dd>
              <dt className="mt-1.5 text-xs font-bold uppercase tracking-wider text-white font-heading">
                {label}
              </dt>
              <p className="mt-0.5 text-xs text-[var(--f-text-muted)] font-medium">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── Student Login CTA Banner ── */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-[#11182c] via-[#16203a] to-[#1e2a4a] border border-amber-500/25 p-6 sm:p-8 text-white shadow-2xl">
          <div>
            <h4 className="text-lg sm:text-xl font-extrabold text-white font-heading">
              WSF Student Login Access
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-[var(--f-text-secondary)] max-w-xl font-sans">
              Are you an affiliated college participant or candidate? Access candidate schedules, live stage registrations, chest numbers, and official scores.
            </p>
          </div>
          <Link
            href="/student-login"
            className="f-focus inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs sm:text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400 hover:text-black hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 shrink-0"
          >
            <span>Open Student Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
