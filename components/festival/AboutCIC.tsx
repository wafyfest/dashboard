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
  Globe2,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

const STATS = [
  { value: '62', label: 'Affiliated colleges', icon: Building2 },
  { value: '25', label: 'Women-only campuses', icon: GraduationCap },
  { value: '2000', label: 'Established year', icon: Award },
  { value: '4', label: 'Academic phases', icon: BookOpen },
];

const FACTS = [
  { label: 'Headquarters', value: 'Wafa Campus, Pang South PO, Kolathur VIA, Malappuram, PIN: 679338 Kerala, India' },
  { label: 'Registration', value: 'Govt. of Kerala (Reg. No. 379/04)' },
  { label: 'Affiliated Colleges', value: '62 Colleges (including 25 Women-only Campuses)' },
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
  { name: 'Foundation', ar: 'ما قبل التمهيدية', duration: '3 Years', focus: 'High school schooling (classes 8-10) leading to SSLC board examination, integrated with Fiqh, Aqeedah, Seerah, and Arabic-Urdu roots.' },
  { name: 'Thamheediyya', ar: 'التمهيدية', duration: '2 Years', focus: 'Higher secondary (+1 & +2) Science, Commerce, or Humanities streams with intensive Madrasathul Umm Arabic LSRW (Listening, Speaking, Reading, Writing) immersion and Nahw/Sarf grammar.' },
  { name: 'Aliya', ar: 'العالية', duration: '3–4 Years', focus: 'UGC-recognised university Bachelor’s degree (4 yrs Wafy / 3 yrs Wafiyya) paired with Tafseer, Hadith criticism, Logic, and Wafiyya Home Science.' },
  { name: 'Muthawwal', ar: 'المطوّل', duration: '2 Years', focus: 'Postgraduate Master’s specialization across Theology, Sharia, or Language & Culture faculties, culminating in a mandatory 100-page Arabic thesis.' },
];

export function AboutCIC() {
  const [selectedPhase, setSelectedPhase] = useState(0);

  return (
    <section
      id="cic"
      className="f-sans relative scroll-mt-16 bg-[var(--f-chalk)] py-20 text-[var(--f-ink)] sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Main Layout Grid ── */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">

          {/* ── Text & Content ── */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-lapis)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--f-lapis)]" />
              <span>Apex Academic Governing Body</span>
            </div>

            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Coordination of
              <br />
              Islamic Colleges
            </h2>

            <p
              lang="ar"
              dir="rtl"
              className="f-kufi mt-3 text-left text-2xl font-bold text-[var(--f-lapis)] sm:text-3xl"
            >
              تنسيقية الكليات الإسلامية
            </p>

            {/* Official Editorial Description */}
            <div className="mt-6 max-w-[62ch] space-y-4 text-sm sm:text-base leading-relaxed text-[var(--f-ink)]/85">
              <p>
                <strong>Coordination of Islamic Colleges (CIC)</strong>, based in Kerala, India, is an
                academic governing body functioning as an Islamic university. The CIC aims to foster
                Islamic culture and civic values; develop and revise the curricula of its affiliated
                colleges keeping abreast of the changing times; integrate revelatory and scientific
                streams of knowledge; and involve in a broad spectrum of humanitarian and environmental
                activities, cutting across religious, racial, and linguistic divides.
              </p>
              <p>
                Established in the year <strong>2000</strong> and registered with the government of Kerala
                (<strong>No. 379/04</strong>), the CIC has currently <strong>62 colleges</strong>,
                including <strong>25 women-only campuses</strong>, affiliated to it. As the academic parent
                body of these colleges, the CIC develops their curricula, conducts examinations, and issues
                certificates for the graduates.
              </p>
            </div>

            {/* Interactive Academic Pathway */}
            <div className="mt-8 rounded-xl border border-[var(--f-ink)]/15 bg-white/60 p-4 sm:p-5 backdrop-blur-sm dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--f-ink)]/70">
                Academic Tier Structure
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PHASES_INFO.map((p, idx) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPhase(idx)}
                    className={`rounded-lg px-3 py-2 text-left transition-all cursor-pointer ${selectedPhase === idx
                        ? 'bg-[var(--f-lapis)] text-white shadow-md'
                        : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[var(--f-ink)]'
                      }`}
                  >
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="text-[10px] opacity-75">{p.duration}</p>
                  </button>
                ))}
              </div>

              <div className="mt-3.5 border-t border-[var(--f-ink)]/10 pt-3 text-xs leading-relaxed text-[var(--f-ink)]/80 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[var(--f-ink)]">{PHASES_INFO[selectedPhase].name} ({PHASES_INFO[selectedPhase].ar}): </span>
                  {PHASES_INFO[selectedPhase].focus}
                </div>
              </div>
            </div>

            {/* Factual Information & Contact Ledger */}
            <dl className="mt-8 text-xs sm:text-sm">
              {FACTS.map(({ label, value }) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1 border-t border-[var(--f-ink)]/15 py-3 sm:grid-cols-[8.5rem_1fr] sm:gap-4 last:border-b"
                >
                  <dt className="font-semibold text-[var(--f-ink)]/65">{label}</dt>
                  <dd className="font-medium text-[var(--f-ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Saffron accent quote */}
            <blockquote className="mt-8 max-w-[50ch] border-l-4 border-[var(--f-saffron)] pl-4 text-sm sm:text-base font-medium leading-snug text-[var(--f-ink)]">
              “Integrating revelatory and scientific streams of knowledge to build competent leaders for society.”
            </blockquote>
          </div>

          {/* ── Stat Ledger & Contact Card ── */}
          <aside className="relative self-start overflow-hidden rounded-2xl bg-[var(--f-lapis)] p-6 text-white shadow-xl sm:p-8 lg:col-span-5">
            <TilePattern id="tiles-cic" className="text-white opacity-[0.08]" />

            <div className="relative">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--f-saffron)]">
                Institutional Scale
              </h3>
              <p className="mt-1 text-xs text-white/70">
                Official figures of CIC academic excellence across Kerala.
              </p>

              <dl className="mt-6 space-y-3.5">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div
                    key={label}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--f-saffron)] text-[var(--f-ink)] font-bold shadow-sm transition-transform group-hover:scale-105">
                        <Icon className="h-4 w-4" />
                      </div>
                      <dt className="text-xs sm:text-sm font-semibold text-white/90 truncate">{label}</dt>
                    </div>
                    <dd className="f-kufi text-2xl sm:text-3xl font-extrabold text-white shrink-0">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Head Office Details Card */}
              <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-xs text-white/90 space-y-2.5">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Head Office:</strong> Wafa Campus, Pang South PO, Kolathur VIA, Malappuram, PIN: 679338 Kerala, India
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <Phone className="w-4 h-4 text-[var(--f-saffron)] shrink-0" />
                  <a href="tel:+917025687788" className="hover:text-[var(--f-saffron)] transition-colors">
                    +91 7025687788
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--f-saffron)] shrink-0" />
                  <a href="mailto:info@wafycic.com" className="hover:text-[var(--f-saffron)] transition-colors">
                    info@wafycic.com
                  </a>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-center">
                <p className="text-xs text-white/80">
                  Explore the official portal of Coordination of Islamic Colleges
                </p>
                <a
                  href="https://www.wafycic.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white hover:text-[var(--f-ink)] cursor-pointer"
                >
                  <span>Visit wafycic.com</span>
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Mission & Vision (10 Key Pillars) ── */}
        <div className="mt-20 sm:mt-24 pt-12 border-t border-[var(--f-ink)]/15">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-lapis)]">
                <Compass className="w-3.5 h-3.5" />
                <span>Foundational Objectives</span>
              </div>
              <h3 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">
                Mission &amp; Vision
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--f-ink)]/70 max-w-md">
              Ten guiding principles shaping the educational, intellectual, and civic roadmap of the CIC Islamic University.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {MISSION_VISION.map(({ num, title, desc }) => (
              <div
                key={num}
                className="group relative flex flex-col justify-between rounded-xl border border-[var(--f-ink)]/15 bg-white/80 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:border-[var(--f-lapis)] hover:shadow-md hover:-translate-y-1 dark:bg-white/5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="f-kufi text-xs font-black text-[var(--f-saffron)] px-2 py-0.5 rounded bg-[var(--f-ink)]/5">
                      {num}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[var(--f-ink)]/30 group-hover:text-[var(--f-saffron)] transition-colors" />
                  </div>
                  <h4 className="mt-3 text-xs sm:text-sm font-bold text-[var(--f-ink)] group-hover:text-[var(--f-lapis)] transition-colors leading-snug">
                    {title}
                  </h4>
                  <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-[var(--f-ink)]/75">
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
