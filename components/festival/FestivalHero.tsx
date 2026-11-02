'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, GraduationCap, LogIn, ChevronDown } from 'lucide-react';
import { useInView } from '@/lib/hooks/useInView';
import { useFest } from '@/lib/context/FestContext';

const STATS = [
  { value: '14th', label: 'Edition' },
  { value: '25+', label: 'Colleges' },
  { value: '1,700+', label: 'Participants' },
  { value: '84+', label: 'Events' },
];

/**
 * Rich CSS gradient scene — shows when no hero image is available.
 * Evokes an auditorium / stage atmosphere purely through geometry and color.
 */
function HeroSceneFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{
        background: `
          radial-gradient(ellipse 120% 80% at 60% 110%, #065f46 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 80% -10%,  #1e3a5f 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 20% 30%,   #7c3aed22 0%, transparent 55%),
          linear-gradient(160deg, #0a0a0a 0%, #0f172a 40%, #020c05 100%)
        `,
      }}
    >
      {/* Stage spotlight cone */}
      <div
        className="absolute"
        style={{
          bottom: '-8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140%',
          height: '90%',
          background:
            'conic-gradient(from 270deg at 50% 110%, transparent 30%, rgba(16,185,129,0.07) 44%, rgba(16,185,129,0.13) 50%, rgba(16,185,129,0.07) 56%, transparent 70%)',
        }}
      />
      {/* Horizontal stage floor line */}
      <div
        className="absolute bottom-[18%] left-0 right-0 h-px opacity-20"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #10b981 30%, #f59e0b 50%, #10b981 70%, transparent 100%)',
        }}
      />
      {/* Decorative Arabic calligraphy silhouette — pure CSS arc */}
      <div
        className="absolute"
        style={{
          top: '12%',
          right: '8%',
          width: '180px',
          height: '180px',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          transform: 'rotate(-15deg)',
        }}
      />
      <div
        className="absolute"
        style={{
          top: '18%',
          right: '12%',
          width: '120px',
          height: '120px',
          border: '1px solid rgba(16,185,129,0.12)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          transform: 'rotate(-15deg)',
        }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
      />
    </div>
  );
}

export function FestivalHero() {
  const { festSettings } = useFest();
  const [imgError, setImgError] = useState(false);

  const [textRef, textInView] = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [statsRef, statsInView] = useInView<HTMLDivElement>({ threshold: 0.1 });

  const festName = festSettings.fest_name || '14TH WAFY ARTS FEST';

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden bg-black"
    >
      {/* ── Background: real photo OR CSS scene ───────────────── */}
      <div className="absolute inset-0">
        {!imgError ? (
          <>
            <Image
              src="/hero-fest.jpeg"
              alt="Wafy Arts Fest stage"
              fill
              priority
              className="object-cover object-center"
              onError={() => setImgError(true)}
              sizes="100vw"
            />
            {/* Dark overlay so text is always readable over any photo */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.35) 100%)',
              }}
            />
            {/* Bottom fade to page bg for seamless section transition */}
            <div
              className="absolute bottom-0 left-0 right-0 h-48"
              style={{
                background:
                  'linear-gradient(to top, var(--bg-page) 0%, transparent 100%)',
              }}
            />
          </>
        ) : (
          <HeroSceneFallback />
        )}
      </div>

      {/* ── Main editorial layout ───────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 pt-24 pb-36">
        <div
          ref={textRef}
          className={`reveal-up ${textInView ? 'in-view' : ''} max-w-2xl`}
        >
          {/* Eyebrow — edition + org */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
              14th Edition
            </span>
            <span className="w-8 h-px bg-emerald-500/60" />
            <span className="text-white/50 text-xs tracking-widest uppercase">
              WSF · CIC
            </span>
          </div>

          {/* Main title — intentionally large, left-anchored */}
          <h1
            className="font-heading font-extrabold leading-[0.95] tracking-tight text-white"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}
          >
            {festName.split(' ').map((word, i) => (
              <span
                key={i}
                className="block reveal-up in-view"
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Arabic subtitle */}
          <p
            className="mt-5 text-white/60 font-heading tracking-widest reveal-up in-view"
            style={{
              fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
              animationDelay: '380ms',
              direction: 'ltr',
            }}
          >
            المهرجان الثقافي الفني الرابع عشر
          </p>

          {/* Description */}
          <p
            className="mt-6 text-white/65 text-sm sm:text-base leading-relaxed max-w-lg reveal-up in-view"
            style={{ animationDelay: '440ms' }}
          >
            The premier inter-collegiate cultural festival organized by{' '}
            <span className="text-emerald-400 font-semibold">Wafy Students Federation</span> under
            the{' '}
            <span className="text-sky-400 font-semibold">
              Coordination of Islamic Colleges
            </span>
            . Uniting scholars, artists, and orators from 25+ affiliated institutions.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex flex-wrap items-center gap-3 reveal-up in-view"
            style={{ animationDelay: '520ms' }}
          >
            <Link
              href="/student-login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] font-heading shadow-lg shadow-emerald-500/25"
            >
              <GraduationCap className="w-4 h-4" />
              Student Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/35 text-white font-bold text-sm transition-all active:scale-[0.98] font-heading backdrop-blur-sm"
            >
              <LogIn className="w-4 h-4" />
              College Login
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats bar pinned to bottom ───────────────────────── */}
      <div
        ref={statsRef}
        className={`relative z-10 reveal-up ${statsInView ? 'in-view' : ''}`}
        style={{ animationDelay: '200ms' }}
      >
        <div className="border-t border-white/10 bg-black/60 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {STATS.map(({ value, label }, i) => (
                <div
                  key={label}
                  className={`py-5 sm:py-6 flex flex-col items-center gap-0.5 ${i < STATS.length - 1
                    ? 'border-r border-white/10'
                    : ''
                    }`}
                >
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    {value}
                  </span>
                  <span className="text-[11px] text-white/45 uppercase tracking-widest font-heading">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────── */}
      <div
        className="absolute bottom-[6.5rem] left-6 sm:left-10 lg:left-16 flex items-center gap-2 text-white/30 animate-bounce"
        aria-hidden="true"
      >
        <ChevronDown className="w-4 h-4" />
        <span className="text-[10px] tracking-widest uppercase font-heading">Scroll</span>
      </div>
    </section>
  );
}
