'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const PHASES_INFO = [
  {
    name: 'Foundation',
    ar: 'ما قبل التمهيدية',
    duration: '3 Years',
    focus: 'High school schooling (classes 8-10) leading to SSLC board examination.',
  },
  {
    name: 'Thamheediyya',
    ar: 'التمهيدية',
    duration: '2 Years',
    focus: 'Higher secondary schooling (+1 & +2).',
  },
  {
    name: 'Aliya',
    ar: 'العالية',
    duration: '3–4 Years',
    focus: 'UGC-recognised university Bachelor’s degree (4 yrs Wafy / 3 yrs Wafiyya).',
  },
  {
    name: 'Muthawwal',
    ar: 'المطوّل',
    duration: '2 Years',
    focus: 'Postgraduate Master’s degree specialization.',
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
        {/* ── Main Layout: Two Column Asymmetry ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Editorial Identity & Heading */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <span className="h-2 w-2 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
              <span>Academic Governing Body</span>
            </div>

            <h2 className="mt-4 text-3xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl text-white font-heading">
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

            <div className="mt-6 text-sm sm:text-base leading-relaxed text-[var(--f-text-secondary)] font-sans">
              <p>
                <strong className="text-white">Coordination of Islamic Colleges (CIC)</strong> is the academic governing body
                functioning as an Islamic university across Kerala, India. The CIC integrates Islamic theological traditions with
                university sciences across affiliated colleges.
              </p>
            </div>

            {/* Saffron Accent Quote */}
            <blockquote className="mt-8 border-l-2 border-[var(--f-saffron)] bg-white/[0.02] pl-4 py-2 text-xs sm:text-sm font-medium leading-relaxed text-[var(--f-text-muted)] italic">
              “Integrating revelatory and scientific streams of knowledge to build competent leaders for society.”
            </blockquote>
          </div>

          {/* Right Column: Interactive Curriculum Framework Card */}
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[var(--f-surface)] p-6 sm:p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--f-saffron)] font-heading">
                  Curriculum Framework
                </p>
                <p className="text-xs text-[var(--f-text-muted)] font-sans mt-0.5">
                  Click a tier to inspect structure and duration
                </p>
              </div>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                4 Tiers
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PHASES_INFO.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPhase(idx)}
                  aria-pressed={selectedPhase === idx}
                  className={`rounded-xl p-3 text-left transition-all duration-200 cursor-pointer border ${
                    selectedPhase === idx
                      ? 'bg-[var(--f-saffron)] text-[var(--f-ink)] border-[var(--f-saffron)] shadow-lg shadow-amber-500/20 font-bold scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                  }`}
                >
                  <p className="text-xs font-bold font-heading truncate">{p.name}</p>
                  <p className={`text-[11px] font-mono mt-1 ${selectedPhase === idx ? 'text-[var(--f-ink)]/90 font-semibold' : 'text-white/60'}`}>
                    {p.duration}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4.5 text-xs sm:text-sm leading-relaxed text-[var(--f-text-secondary)] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white font-heading text-sm sm:text-base">
                  {PHASES_INFO[selectedPhase].name}
                  <span className="f-kufi ml-2 text-xs text-[var(--f-saffron)] font-normal">
                    {PHASES_INFO[selectedPhase].ar}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--f-text-secondary)] font-sans leading-relaxed">
                  {PHASES_INFO[selectedPhase].focus}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}