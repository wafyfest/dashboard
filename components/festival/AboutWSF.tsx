'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Megaphone,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileText,
  Activity,
  Award,
  Radio,
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

        {/* ── Narrative & Snapshot Grid ── */}
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14 items-start">
          <div className="lg:col-span-7 space-y-4 text-sm sm:text-base leading-relaxed text-[var(--f-text-secondary)] font-sans">
            <p>
              <strong className="text-white">Wafy Students Federation (WSF)</strong> is the student wing of CIC, representing all the
              students from <strong className="text-white">54 colleges</strong> owned by or affiliated to CIC.
            </p>
            <p>
              The federation is actively involved in conducting various programmes and social projects. It
              coordinates curricular and non-curricular activities of the students from all affiliated
              colleges. Focus areas of its operations include empowering students, developing their
              organizational and leadership skills, and leveraging their creative potential for various vital
              social projects.
            </p>
            <p>
              The WSF, which has been operational for over <strong className="text-white">15 years</strong>, has made its presence felt
              by conducting tremendously successful state-level events such as the biannual{' '}
              <strong className="text-white">State Wafy Arts Fests</strong>, the state-wide <strong className="text-white">Wafy sports meet</strong> (held
              every two years), and an international seminar under the theme <em className="text-white">‘Multiculturalism and world peace’</em>.
              The organization utilises an effective networking system called the{' '}
              <strong className="text-white">‘Wafy Orbit system’</strong> to reach out to the community.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[var(--f-surface)] p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--f-saffron)] pb-3 border-b border-white/10 font-heading">
              <ShieldCheck className="w-4 h-4" />
              <span>Federation Snapshot</span>
            </div>
            <dl className="mt-3 divide-y divide-white/10 text-xs sm:text-sm">
              {FACTS.map(({ label, value }) => (
                <div key={label} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                  <dt className="text-[var(--f-text-muted)] font-medium">{label}</dt>
                  <dd className="font-semibold text-white sm:text-right">{value}</dd>
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
              className="f-surface-card p-4 sm:p-5 text-center transition-transform hover:-translate-y-1"
            >
              <dd className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--f-saffron)]">
                {value}
              </dd>
              <dt className="mt-1.5 text-xs font-bold uppercase tracking-wider text-white font-heading">
                {label}
              </dt>
              <p className="mt-0.5 text-[11px] text-[var(--f-text-muted)] font-medium">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── Major Activities Section ── */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Flagship Operations</span>
              </div>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
                Major WSF Activities
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--f-text-muted)] max-w-md">
              Comprehensive student development, academic research, and community networking programmes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MAJOR_ACTIVITIES.map(({ title, theme, desc, icon: Icon, category }) => (
              <div
                key={title}
                className="f-surface-card group relative flex flex-col justify-between p-5 transition-all duration-300 hover:border-[var(--f-saffron)]/40 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--f-saffron)] bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                      {category}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 group-hover:bg-[var(--f-saffron)] group-hover:text-[var(--f-ink)] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white leading-snug font-heading group-hover:text-[var(--f-saffron)] transition-colors">
                    {title}
                  </h4>
                  <p className="mt-1 text-[11px] font-semibold text-blue-400">
                    {theme}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--f-text-secondary)] font-sans">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Student Portal CTA Banner ── */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-[#11182c] via-[#16203a] to-[#1e2a4a] border border-amber-500/25 p-6 sm:p-8 text-white shadow-2xl">
          <div>
            <h4 className="text-lg sm:text-xl font-extrabold text-white font-heading">
              WSF Student Portal Access
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-[var(--f-text-secondary)] max-w-xl font-sans">
              Are you an affiliated college participant or candidate? Access candidate schedules, live stage registrations, chest numbers, and official scores.
            </p>
          </div>
          <Link
            href="/student-login"
            className="f-focus inline-flex items-center gap-2 rounded-xl bg-[var(--f-saffron)] px-6 py-3 text-xs sm:text-sm font-bold text-[var(--f-ink)] shadow-lg shadow-amber-500/20 transition-all hover:bg-white hover:scale-105 shrink-0"
          >
            <span>Open Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
