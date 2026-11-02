'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Megaphone,
  Trophy,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileText,
  Activity,
  Award,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const WSF_STATS = [
  { value: '54', label: 'Affiliated Colleges', detail: 'Owned by or affiliated to CIC' },
  { value: '15+', label: 'Years Operational', detail: 'Legacy of youth empowerment' },
  { value: '14', label: 'Arts Fests Held', detail: 'State-level cultural flagship' },
  { value: '2', label: 'Years Cycle', detail: 'Biennial Arts Fest & Sports Meet' },
];

const FACTS = [
  { label: 'Parent Body', value: 'Coordination of Islamic Colleges (CIC)' },
  { label: 'Headquarters', value: 'Wafa Campus, Pang South PO, Kolathur VIA, Malappuram, Kerala' },
  { label: 'Colleges Represented', value: '54 Colleges across Kerala & beyond' },
  { label: 'Community Network', value: 'Wafy Orbit System' },
  { label: 'Current Edition', value: '14th Wafy Arts Fest' },
  { label: 'Flagship Gatherings', value: 'Arts Fest, Sports Meet, Leaders’ Summit' },
];

const MAJOR_ACTIVITIES = [
  {
    title: 'The Leaders’ Summit',
    theme: 'Visionary Leadership, Revolutionary Progress',
    desc: 'Flagship leadership conference empowering student leaders with strategic governance and administrative foresight.',
    icon: Compass,
    category: 'Leadership',
  },
  {
    title: 'Comprehensive Research Programmes',
    theme: 'Beacon of Truth · Thahdīr · Al Mad’hab',
    desc: 'Rigorous multi-disciplinary academic research initiatives encouraging analytical scholarship and theological inquiry.',
    icon: BookOpen,
    category: 'Research',
  },
  {
    title: 'Discourse: Public Speaking Training',
    theme: 'Oratory, Rhetoric & Eloquence',
    desc: 'Structured elocution and public address coaching developing bilingual orators in Malayalam, English, and Arabic.',
    icon: Megaphone,
    category: 'Oratory',
  },
  {
    title: 'Wal Qalam Writing Programmes',
    theme: 'Essay, Poetry & Literary Fiction',
    desc: 'Dedicated literary writing workshops honing creative expression, essay analysis, and journalistic critique.',
    icon: FileText,
    category: 'Literature',
  },
  {
    title: 'College Union Evaluation & Grading',
    theme: 'Continuous Academic Governance',
    desc: 'Systematic benchmarking and merit grading of student unions across all 54 affiliated colleges.',
    icon: Activity,
    category: 'Governance',
  },
  {
    title: 'Medfoc Media Training',
    theme: 'Digital Media, Journalism & PR',
    desc: 'Hands-on media workshops covering modern journalism, broadcast production, and digital advocacy.',
    icon: Radio,
    category: 'Media',
  },
  {
    title: 'Magazine & Creative Competitions',
    theme: 'Campus Magazines, Moral Video & CSS Awards',
    desc: 'Annual evaluation of college periodicals, short moral film productions, and Community Social Service (CSS) honors.',
    icon: Award,
    category: 'Creativity',
  },
  {
    title: 'State-Wide Wafy Sports Meet',
    theme: 'Athletics & Physical Fitness (Biennial)',
    desc: 'State-wide athletics, games, and physical endurance championships held every two years.',
    icon: Trophy,
    category: 'Sports',
  },
];

export function AboutWSF() {
  return (
    <section
      id="wsf"
      className="f-sans relative scroll-mt-16 bg-[var(--f-mist)] py-20 text-[var(--f-ink)] sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-lapis)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--f-lapis)]" />
              <span>Official Student Wing of CIC</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Wafy Students
              <br />
              Federation
            </h2>
          </div>
          <p
            lang="ar"
            dir="rtl"
            className="f-kufi text-left text-2xl font-bold text-[var(--f-lapis)] sm:text-right sm:text-3xl"
          >
            اتحاد طلاب وافي
          </p>
        </div>

        {/* ── Intro + Facts Grid ── */}
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7 space-y-4 text-sm sm:text-base leading-relaxed text-[var(--f-ink)]/85">
            <p>
              <strong>Wafy Students Federation (WSF)</strong> is the student wing of CIC, representing all the
              students from <strong>54 colleges</strong> owned by or affiliated to CIC.
            </p>
            <p>
              The federation is actively involved in conducting various programmes and social projects. It
              coordinates curricular and non-curricular activities of the students from all affiliated
              colleges. Focus areas of its operations include empowering students, developing their
              organizational and leadership skills, and leveraging their creative potential for various vital
              social projects.
            </p>
            <p>
              The WSF, which has been operational for over <strong>15 years</strong>, has made its presence felt
              by conducting tremendously successful state-level events such as the biannual{' '}
              <strong>State Wafy Arts Fests</strong>, the state-wide <strong>Wafy sports meet</strong> (held
              every two years), and an international seminar under the theme <em>‘Multiculturalism and world peace’</em>.
              The organization utilises an effective networking system called the{' '}
              <strong>‘Wafy Orbit system’</strong> to reach out to the community.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[var(--f-ink)]/15 bg-white/70 p-6 backdrop-blur-sm dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--f-ink)]/70 pb-3 border-b border-[var(--f-ink)]/10">
              <ShieldCheck className="w-4 h-4 text-[var(--f-saffron)]" />
              <span>Federation Snapshot</span>
            </div>
            <dl className="mt-3 divide-y divide-[var(--f-ink)]/10 text-xs sm:text-sm">
              {FACTS.map(({ label, value }) => (
                <div key={label} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                  <dt className="text-[var(--f-ink)]/65 font-medium">{label}</dt>
                  <dd className="font-semibold text-[var(--f-ink)] sm:text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── WSF Scale Strip ── */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {WSF_STATS.map(({ value, label, detail }) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--f-ink)]/15 bg-white/70 p-4 sm:p-5 text-center backdrop-blur-sm dark:bg-white/5 transition-transform hover:-translate-y-1"
            >
              <dd className="f-kufi text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--f-lapis)]">
                {value}
              </dd>
              <dt className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--f-ink)]">
                {label}
              </dt>
              <p className="mt-0.5 text-[10px] text-[var(--f-ink)]/60">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── Major Activities Section ── */}
        <div className="mt-20 pt-12 border-t border-[var(--f-ink)]/15">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-lapis)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                <span>Flagship Operations</span>
              </div>
              <h3 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
                Major WSF Activities
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--f-ink)]/70 max-w-md">
              Comprehensive student development, academic research, and community networking programmes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MAJOR_ACTIVITIES.map(({ title, theme, desc, icon: Icon, category }) => (
              <div
                key={title}
                className="group relative flex flex-col justify-between rounded-xl border border-[var(--f-ink)]/15 bg-white/80 p-5 shadow-sm transition-all duration-300 hover:border-[var(--f-lapis)] hover:shadow-md hover:-translate-y-1 dark:bg-white/5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--f-lapis)] bg-[var(--f-lapis)]/10 px-2 py-0.5 rounded">
                      {category}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-[var(--f-ink)]/5 flex items-center justify-center text-[var(--f-ink)] group-hover:bg-[var(--f-saffron)] group-hover:text-[var(--f-ink)] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-[var(--f-ink)] leading-snug">
                    {title}
                  </h4>
                  <p className="mt-1 text-[11px] font-medium text-[var(--f-lapis)]">
                    {theme}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--f-ink)]/75">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Student Portal CTA Banner ── */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl bg-[var(--f-lapis)] p-6 sm:p-8 text-white shadow-xl">
          <div>
            <h4 className="text-lg sm:text-xl font-bold">WSF Student Portal Access</h4>
            <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
              Are you an affiliated college participant or candidate? Access candidate schedules, live stage registrations, and scores.
            </p>
          </div>
          <Link
            href="/student-login"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--f-saffron)] px-5 py-3 text-xs sm:text-sm font-bold text-[var(--f-ink)] shadow-md transition-all hover:bg-white hover:scale-105 shrink-0"
          >
            <span>Open Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
