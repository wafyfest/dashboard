'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Megaphone,
  Trophy,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import { useInView } from '@/lib/hooks/useInView';

// ── What WSF does — shown as a horizontal feature strip ──────────────
const WSF_PILLARS = [
  {
    icon: Trophy,
    title: 'Arts & Culture',
    desc: 'Organises the biennial Wafy Arts Fest — the flagship inter-collegiate cultural competition for 25+ institutions.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
  },
  {
    icon: BookOpen,
    title: 'Academic Publishing',
    desc: 'Produces journals, magazines, and research publications that amplify the scholarly voice of the Wafy student community.',
    color: 'text-sky-500',
    bg: 'bg-sky-500/8',
    border: 'border-sky-500/20',
  },
  {
    icon: Megaphone,
    title: 'Student Leadership',
    desc: 'Trains and develops future leaders through workshops, seminars, and cross-college governance programs.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
  },
  {
    icon: HeartHandshake,
    title: 'Social Engagement',
    desc: 'Drives community outreach, charitable initiatives, and welfare activities that extend scholarship into service.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/8',
    border: 'border-purple-500/20',
  },
];

// ── Quick-stat row ────────────────────────────────────────────────────
const WSF_STATS = [
  { value: '25+',  label: 'Member Colleges' },
  { value: '14',   label: 'Arts Fests Conducted' },
  { value: '5K+',  label: 'Active Members' },
  { value: '2',    label: 'Streams (Wafy & Wafiyya)' },
];

export function AboutWSF() {
  const [headRef,    headInView]    = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [introRef,   introInView]   = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [pillarsRef, pillarsInView] = useInView<HTMLDivElement>({ threshold: 0.04 });
  const [statsRef,   statsInView]   = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section id="wsf" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Unique background treatment — deep tinted surface, different from CIC's plain white */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 100% 50%, rgba(16,185,129,0.05) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 50% at 0% 100%,  rgba(14,165,233,0.04) 0%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      {/* Right-edge accent — mirrors CIC's left-edge bar but on the opposite side */}
      <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-emerald-500 to-transparent rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

        {/* ── Section header ─────────────────────────────────────── */}
        <div
          ref={headRef}
          className={`reveal-up ${headInView ? 'in-view' : ''} mb-14 sm:mb-20`}
        >
          <p className="text-emerald-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            The Student Federation
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-[1.05]">
              Wafy Students<br className="hidden sm:block" /> Federation
            </h2>
            <p className="text-[var(--text-muted)] text-sm sm:text-right sm:max-w-xs leading-relaxed">
              اتحاد طلاب وافي<br />
              <span className="text-xs opacity-70">Organiser of the 14th Wafy Arts Fest</span>
            </p>
          </div>
          {/* Ruled line with emerald lead */}
          <div className="mt-6 h-px bg-gradient-to-r from-emerald-500/60 via-[var(--border-medium)] to-transparent" />
        </div>

        {/* ── Two-column intro ────────────────────────────────────── */}
        <div
          ref={introRef}
          className={`reveal-up ${introInView ? 'in-view' : ''} grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-20 mb-16 sm:mb-20`}
        >
          {/* Left: long description */}
          <div className="space-y-5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <p>
              The{' '}
              <strong className="text-[var(--text-primary)]">
                Wafy Students Federation (WSF)
              </strong>{' '}
              is the representative student confederation of the Wafy and Wafiyya academic
              streams, functioning under the direct auspices of the{' '}
              <strong className="text-[var(--text-primary)]">
                Coordination of Islamic Colleges (CIC)
              </strong>
              . It is the unified voice and action-body of over 5,000 students across 25+
              affiliated institutions in Kerala and beyond.
            </p>
            <p>
              WSF is the organisation that conceives, plans, and executes the{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Wafy Arts Fest
              </span>{' '}
              — the biennial inter-collegiate cultural extravaganza that brings together
              the finest talents in oratory, literary arts, performing arts, Quranic sciences,
              and creative expression from all affiliated colleges.
            </p>
            <p>
              Beyond the Arts Fest, WSF drives student leadership development, academic
              publications, social engagement programmes, and community welfare initiatives
              — embodying the principle that scholarship and service are inseparable.
            </p>
          </div>

          {/* Right: identity panel — WSF monogram + quick details */}
          <div className="flex flex-col justify-center">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
              {/* Monogram badge */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-lg text-[var(--text-primary)] font-heading leading-tight">
                    WSF
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-snug">
                    Wafy Students Federation<br />
                    <span className="text-emerald-500 font-semibold">Affiliated to CIC</span>
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--border-subtle)]" />

              {/* Quick facts list */}
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'Founded under',     value: 'Coordination of Islamic Colleges (CIC)' },
                  { label: 'Headquarters',       value: 'Markaz Campus, Karthala, Kerala' },
                  { label: 'Membership',         value: '25+ Affiliated Institutions' },
                  { label: 'Current Edition',    value: '14th Wafy Arts Fest (2024–2025)' },
                  { label: 'Fest Frequency',     value: 'Biennial' },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-32 shrink-0 pt-0.5 leading-snug">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Four pillars — what WSF does ────────────────────────── */}
        <div
          ref={pillarsRef}
          className={`reveal-up ${pillarsInView ? 'in-view' : ''} mb-16 sm:mb-20`}
        >
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.15em] font-bold mb-6">
            What WSF Does
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WSF_PILLARS.map(({ icon: Icon, title, desc, color, bg, border }, i) => (
              <div
                key={title}
                className={`reveal-up ${pillarsInView ? 'in-view' : ''} rounded-2xl p-5 sm:p-6 ${bg} border ${border} flex flex-col gap-3 hover:scale-[1.01] transition-transform duration-300`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl bg-[var(--bg-page)] border ${border} flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-sm ${color} font-heading`}>{title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────── */}
        <div
          ref={statsRef}
          className={`reveal-up ${statsInView ? 'in-view' : ''} grid grid-cols-2 sm:grid-cols-4 border border-[var(--border-subtle)] rounded-2xl overflow-hidden`}
        >
          {WSF_STATS.map(({ value, label }, i) => (
            <div
              key={label}
              className={`reveal-scale ${statsInView ? 'in-view' : ''} py-6 sm:py-8 flex flex-col items-center gap-1 bg-[var(--bg-surface)] ${
                i < WSF_STATS.length - 1 ? 'border-r border-[var(--border-subtle)]' : ''
              } ${i < 2 ? 'border-b sm:border-b-0 border-[var(--border-subtle)]' : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-500 leading-none">
                {value}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] text-center px-2">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA strip ───────────────────────────────────────────── */}
        <div
          className={`reveal-up ${statsInView ? 'in-view' : ''} mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-6 sm:px-8 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]`}
          style={{ animationDelay: '200ms' }}
        >
          <p className="text-sm text-[var(--text-secondary)] text-center sm:text-left">
            <span className="font-semibold text-[var(--text-primary)]">Participating in the 14th Wafy Arts Fest?</span>
            {' '}Log in to access your admit card, stage schedule, and results.
          </p>
          <Link
            href="/student-login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] font-heading shrink-0 shadow-sm shadow-emerald-600/20"
          >
            Student Login
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
