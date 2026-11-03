'use client';

import React, { useState } from 'react';
import { TilePattern } from './FestivalPattern';
import {
  Award,
  BookOpen,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Compass,
  Building2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const STATS = [
  { value: '62', label: 'Affiliated Colleges', icon: Building2 },
  { value: '25', label: 'Women-Only Campuses', icon: GraduationCap },
  { value: '2000', label: 'Established Year', icon: Award },
  { value: '4', label: 'Academic Phases', icon: BookOpen },
];

const FACTS = [
  { label: 'Headquarters', value: 'Wafa Campus, Pang South PO, Kolathur VIA, Malappuram, PIN: 679338 Kerala, India' },
  { label: 'Registration', value: 'Govt. of Kerala (Reg. No. 379/04)' },
  { label: 'Affiliated Colleges', value: '62 Colleges (including 25 Women-Only Campuses)' },
  { label: 'Academic System', value: 'Integrated Wafy & Wafiyya Curricula (Undergraduate & PG)' },
  { label: 'Telephone', value: '+91 7025687788' },
  { label: 'Email', value: 'info@wafycic.com' },
];

const MISSION_VISION = [
  {
    num: '01',
    title: 'In-Depth Islamic Faith',
    desc: 'In-depth teaching of Islamic faith grounded in classical revelation and scholarly rigor.',
  },
  {
    num: '02',
    title: 'Integration of Knowledge',
    desc: 'Achieving closer integration of different paradigms of knowledge and streams of wisdom by wedding classical Islamic studies with contemporary sciences.',
  },
  {
    num: '03',
    title: 'Intellectual Internalisation',
    desc: 'To enable Muslims to learn and internalise knowledge from a broad, enlightened Islamic intellectual perspective.',
  },
  {
    num: '04',
    title: 'Curricular Standardisation',
    desc: 'Standardizing and revising the curricula of Islamic studies, in tune with contemporary educational methodology and international best practices.',
  },
  {
    num: '05',
    title: 'Promoting Islamic Thought',
    desc: 'Promoting the beauty of Islamic thought and propagating the peaceful message of Islam by funnelling competent religious resource people in all spheres of public life.',
  },
  {
    num: '06',
    title: 'Bridging Sacred-Scientific Divide',
    desc: 'Raising the stature of religious culture and religious resource people, bridging the sacred-scientific divide among intellectuals caused by watertight segregation.',
  },
  {
    num: '07',
    title: 'Peaceful Coexistence',
    desc: 'Promoting peaceful coexistence, social cohesion, and mutual understanding across diverse religions and societies.',
  },
  {
    num: '08',
    title: 'Holistic Generation',
    desc: 'Raising the new generation in an inspiring, moral, and intellectually vibrant Islamic environment.',
  },
  {
    num: '09',
    title: 'Empowerment of Women',
    desc: 'Enhancing the educational, social, and intellectual status of Muslim women through dedicated campuses and tailored curricula.',
  },
  {
    num: '10',
    title: 'Civic & Humanitarian Outreach',
    desc: 'Engaging in a broad spectrum of civic, humanitarian, and environmental activities, cutting across religious, racial, and linguistic divides.',
  },
];

const PHASES_INFO = [
  {
    name: 'Foundation',
    ar: 'ما قبل التمهيدية',
    duration: '3 Years',
    focus: 'High school schooling (classes 8-10) leading to SSLC board examination, integrated with Fiqh, Aqeedah, Seerah, and Arabic-Urdu roots.',
  },
  {
    name: 'Thamheediyya',
    ar: 'التمهيدية',
    duration: '2 Years',
    focus: 'Higher secondary (+1 & +2) Science, Commerce, or Humanities streams with intensive Madrasathul Umm Arabic LSRW (Listening, Speaking, Reading, Writing) immersion and Nahw/Sarf grammar.',
  },
  {
    name: 'Aliya',
    ar: 'العالية',
    duration: '3–4 Years',
    focus: 'UGC-recognised university Bachelor’s degree (4 yrs Wafy / 3 yrs Wafiyya) paired with Tafseer, Hadith criticism, Logic, and Wafiyya Home Science.',
  },
  {
    name: 'Muthawwal',
    ar: 'المطوّل',
    duration: '2 Years',
    focus: 'Postgraduate Master’s specialization across Theology, Sharia, or Language & Culture faculties, culminating in a mandatory 100-page Arabic thesis.',
  },
];

export function AboutCIC() {
  const [selectedPhase, setSelectedPhase] = useState(0);

  return (
    <section
      id="cic"
      aria-label="About Coordination of Islamic Colleges"
      className="relative scroll-mt-20 bg-[var(--f-canvas)] py-20 text-[var(--f-text-primary)] sm:py-28 border-b border-white/5"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Main Layout Grid ── */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14 items-start">
          
          {/* ── Left Column: Editorial & Factual Narrative ── */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <span className="h-2 w-2 rounded-full bg-[var(--f-saffron)]" />
              <span>Apex Academic Governing Body</span>
            </div>

            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white font-heading">
              Coordination of
              <br />
              Islamic Colleges
            </h2>

            <p
              lang="ar"
              dir="rtl"
              className="f-kufi mt-3 text-left sm:text-left text-2xl font-bold text-[var(--f-saffron)] sm:text-3xl"
            >
              تنسيقية الكليات الإسلامية
            </p>

            {/* Official Editorial Description */}
            <div className="mt-6 max-w-[62ch] space-y-4 text-sm sm:text-base leading-relaxed text-[var(--f-text-secondary)] font-sans">
              <p>
                <strong className="text-white">Coordination of Islamic Colleges (CIC)</strong>, based in Kerala, India, is an
                academic governing body functioning as an Islamic university. The CIC aims to foster
                Islamic culture and civic values; develop and revise the curricula of its affiliated
                colleges keeping abreast of the changing times; integrate revelatory and scientific
                streams of knowledge; and involve in a broad spectrum of humanitarian and environmental
                activities, cutting across religious, racial, and linguistic divides.
              </p>
              <p>
                Established in the year <strong className="text-white">2000</strong> and registered with the government of Kerala
                (<strong className="text-white">No. 379/04</strong>), the CIC has currently <strong className="text-white">62 colleges</strong>,
                including <strong className="text-white">25 women-only campuses</strong>, affiliated to it. As the academic parent
                body of these colleges, the CIC develops their curricula, conducts examinations, and issues
                certificates for the graduates.
              </p>
            </div>

            {/* Interactive Academic Tier Preview */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--f-surface)] p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--f-saffron)] font-heading">
                Academic Tier Overview
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PHASES_INFO.map((p, idx) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPhase(idx)}
                    aria-pressed={selectedPhase === idx}
                    className={`rounded-xl px-3 py-2 text-left transition-all cursor-pointer border ${
                      selectedPhase === idx
                        ? 'bg-[var(--f-saffron)] text-[var(--f-ink)] border-[var(--f-saffron)] shadow-md font-bold'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className={`text-xs ${selectedPhase === idx ? 'text-[var(--f-ink)]/80' : 'text-white/60'}`}>
                      {p.duration}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-[var(--f-text-secondary)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">
                    {PHASES_INFO[selectedPhase].name} ({PHASES_INFO[selectedPhase].ar}):{' '}
                  </span>
                  {PHASES_INFO[selectedPhase].focus}
                </div>
              </div>
            </div>

            {/* Factual Information & Contact Ledger */}
            <dl className="mt-8 text-xs sm:text-sm">
              {FACTS.map(({ label, value }) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1 border-t border-white/10 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4 last:border-b"
                >
                  <dt className="font-semibold text-[var(--f-text-muted)]">{label}</dt>
                  <dd className="font-medium text-white">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Saffron Accent Quote */}
            <blockquote className="mt-8 max-w-[50ch] border-l-4 border-[var(--f-saffron)] bg-white/[0.02] p-4 rounded-r-xl text-sm sm:text-base font-medium leading-snug text-[var(--f-text-secondary)] italic">
              “Integrating revelatory and scientific streams of knowledge to build competent leaders for society.”
            </blockquote>
          </div>

          {/* ── Right Column: Stat Ledger & Official Portal Card ── */}
          <aside className="relative self-start overflow-hidden rounded-2xl bg-[var(--f-surface)] border border-white/10 p-6 sm:p-8 text-white shadow-2xl lg:col-span-5">
            <TilePattern id="tiles-cic" className="text-white opacity-[0.05]" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)] font-heading">
                  Institutional Scale
                </h3>
                <span className="text-xs uppercase font-bold text-white/50 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  Govt Reg 379/04
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--f-text-muted)]">
                Official figures of CIC academic excellence across Kerala.
              </p>

              <dl className="mt-6 space-y-3">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div
                    key={label}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition-all duration-200 hover:bg-white/[0.07] hover:border-white/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--f-saffron)] text-[var(--f-ink)] font-bold shadow-sm transition-transform group-hover:scale-105">
                        <Icon className="h-4 w-4" />
                      </div>
                      <dt className="text-xs sm:text-sm font-semibold text-white/90 truncate">{label}</dt>
                    </div>
                    <dd className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--f-saffron)] shrink-0">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Head Office Details Card */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-[var(--f-text-secondary)] space-y-2.5">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-white">Head Office:</strong> Wafa Campus, Pang South PO, Kolathur VIA, Malappuram, PIN: 679338 Kerala, India
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <Phone className="w-4 h-4 text-[var(--f-saffron)] shrink-0" />
                  <a href="tel:+917025687788" className="hover:text-white transition-colors">
                    +91 7025687788
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--f-saffron)] shrink-0" />
                  <a href="mailto:info@wafycic.com" className="hover:text-white transition-colors">
                    info@wafycic.com
                  </a>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-[var(--f-text-secondary)]">
                  Explore the official academic portal of Coordination of Islamic Colleges
                </p>
                <a
                  href="https://www.wafycic.com"
                  target="_blank"
                  rel="noreferrer"
                  className="f-focus mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/15 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-white hover:text-[var(--f-ink)] cursor-pointer"
                >
                  <span>Visit wafycic.com</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Mission & Vision (Editorial Hierarchy) ── */}
        <div className="mt-20 sm:mt-24 pt-12 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
                <Compass className="w-3.5 h-3.5" />
                <span>Foundational Objectives</span>
              </div>
              <h3 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-heading">
                Mission &amp; Vision
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--f-text-muted)] max-w-md">
              Ten guiding principles shaping the educational, intellectual, and civic roadmap of the CIC Islamic University.
            </p>
          </div>

          {/* ── Flagship Anchor Pillars (Featured Spotlight) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5">
            {MISSION_VISION.slice(0, 2).map(({ num, title, desc }) => (
              <div
                key={num}
                className="relative overflow-hidden rounded-2xl border-2 border-[var(--f-saffron)]/40 bg-gradient-to-br from-[#131b31] via-[#10172a] to-[#0d1322] p-5 sm:p-6 shadow-xl transition-all duration-300 hover:border-[var(--f-saffron)] hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-[var(--f-ink)] px-2.5 py-0.5 rounded-md bg-[var(--f-saffron)] shadow-sm">
                      {num}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--f-saffron)]">
                      {num === '01' ? 'Foundational Core' : 'Curricular Synthesis'}
                    </span>
                  </div>
                  <Sparkles className="w-4 h-4 text-[var(--f-saffron)]" />
                </div>
                <h4 className="mt-3.5 text-base sm:text-lg font-bold text-white font-heading">
                  {title}
                </h4>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--f-text-secondary)] font-sans">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Secondary Specialized Pillars (Editorial 4-Column Grid) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {MISSION_VISION.slice(2).map(({ num, title, desc }) => (
              <div
                key={num}
                className="f-surface-card group relative flex flex-col justify-between p-4 sm:p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--f-saffron)] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      {num}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-white/20 group-hover:text-[var(--f-saffron)] transition-colors" />
                  </div>
                  <h4 className="mt-3 text-xs sm:text-sm font-bold text-white group-hover:text-[var(--f-saffron)] transition-colors leading-snug font-heading">
                    {title}
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--f-text-secondary)] font-sans">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}