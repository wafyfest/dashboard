'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  LogIn,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { TilePattern } from './FestivalPattern';

interface HeroSlide {
  id: string;
  src: string;
  alt: string;
  objectFit: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'concept',
    src: '/hero-fest.png',
    alt: 'Wafy Wafiyya State Arts Fest 2024-25 official identity poster and Islamic emblem',
    objectFit: 'object-contain bg-white',
  },
  {
    id: 'stage',
    src: '/fest-stage.jpg',
    alt: 'Wafy Arts Fest Grand Stage with illuminated Islamic architectural arches',
    objectFit: 'object-cover',
  },
  {
    id: 'arts',
    src: '/fest-arts.jpg',
    alt: 'Islamic Calligraphy & Arts Exhibition gallery display',
    objectFit: 'object-cover',
  },
  {
    id: 'convocation',
    src: '/image.png',
    alt: '14th State Arts Fest & Convocation Ceremony plenary gathering',
    objectFit: 'object-cover',
  },
  {
    id: 'auditorium',
    src: '/test-fest-1.jpg',
    alt: 'Grand Auditorium filled with collegiate participants and scholars',
    objectFit: 'object-cover',
  },
  {
    id: 'architecture',
    src: '/test-2-architecture.jpg',
    alt: 'Traditional Islamic Geometric Heritage Architecture with arched corridors',
    objectFit: 'object-cover',
  },
  {
    id: 'performance',
    src: '/test-3-stage.jpg',
    alt: 'Dramatic stage illumination during cultural speech and choral competition',
    objectFit: 'object-cover',
  },
  {
    id: 'penmanship',
    src: '/test-4-calligraphy.jpg',
    alt: 'Master calligrapher demonstrating classical Arabic script penmanship',
    objectFit: 'object-cover',
  },
  {
    id: 'trophy',
    src: '/test-5-trophy.jpg',
    alt: 'State Championship Rolling Trophy and institutional awards of excellence',
    objectFit: 'object-cover',
  },
  {
    id: 'celebration',
    src: '/test-6-celebration.jpg',
    alt: 'Wafy Students Federation audience celebrating festival results',
    objectFit: 'object-cover',
  },
];

const delay = (ms: number) => ({ '--d': `${ms}ms` } as React.CSSProperties);

export function FestivalHero() {
  const { festSettings, isAuthenticated, currentRole } = useFest();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Statistics state backed by live festival data service with reliable official benchmarks
  const [statsData, setStatsData] = useState([
    { value: '14th', label: 'Edition', detail: 'Biennial since 1997' },
    { value: '62+', label: 'Colleges', detail: 'Affiliated across Kerala' },
    { value: '1,700+', label: 'Participants', detail: 'Four academic phases' },
    { value: '84+', label: 'Events', detail: 'Onstage & offstage categories' },
  ]);

  useEffect(() => {
    try {
      const colleges = festService.getColleges();
      const items = festService.getItems();
      const students = festService.getStudents();

      setStatsData([
        { value: '14th', label: 'Edition', detail: 'Biennial since 1997' },
        {
          value: colleges.length > 0 ? `${colleges.length}+` : '62+',
          label: 'Colleges',
          detail: 'Affiliated across Kerala',
        },
        {
          value: students.length > 0 ? `${students.length.toLocaleString()}+` : '1,700+',
          label: 'Participants',
          detail: 'Four academic phases',
        },
        {
          value: items.length > 0 ? `${items.length}+` : '84+',
          label: 'Events',
          detail: 'Onstage & offstage categories',
        },
      ]);
    } catch {
      // Fallback cleanly to established defaults
    }
  }, []);

  const touchStartX = useRef<number | null>(null);

  const getPortalRoute = () => {
    switch (currentRole) {
      case 'admin':
        return '/admin';
      case 'college':
        return '/college';
      case 'stage_controller':
        return '/stage-controller';
      case 'result_entry':
        return '/result-entry';
      case 'convenor':
        return '/convenor';
      case 'student':
        return '/student';
      default:
        return '/college';
    }
  };

  const swapNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const swapPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const jumpToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation when user interacts with carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      swapPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      swapNext();
    }
  };

  // Touch gesture support without scroll interference
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        swapNext();
      } else {
        swapPrev();
      }
    }
    touchStartX.current = null;
  };

  // Auto-advance every 5.5s, paused when user hovers or explicitly pauses
  useEffect(() => {
    if (isManuallyPaused || isHovered) return;
    const timer = setInterval(() => {
      swapNext();
    }, 5500);
    return () => clearInterval(timer);
  }, [isManuallyPaused, isHovered, swapNext]);

  return (
    <section
      id="hero"
      aria-label="Festival Hero & Overview"
      className="relative overflow-hidden bg-[var(--f-canvas)] text-[var(--f-text-primary)] min-h-[92svh] lg:min-h-[100svh] flex flex-col justify-between w-full max-w-full"
    >
      {/* Background Islamic Tile Pattern */}
      <TilePattern id="tiles-hero" className="text-white opacity-[0.04]" />

      {/* Atmospheric ambient lighting */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[var(--f-lapis)] opacity-20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-[var(--f-saffron)] opacity-15 blur-[140px]"
        aria-hidden="true"
      />

      {/* Main Hero Content Area */}
      <div className="relative mx-auto grid w-full flex-1 max-w-7xl items-center gap-6 lg:gap-12 px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24 lg:pt-28 pb-6 sm:pb-8 lg:pb-6 lg:grid-cols-[1.1fr_0.9fr]">

        {/* ── Left Column: Editorial Hierarchy ── */}
        <div className="z-10 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">

          {/* Eyebrow badge */}
          <div className="f-rise flex items-center justify-center lg:justify-start gap-2" style={delay(50)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-white/90 backdrop-blur-sm shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[var(--f-saffron)] animate-pulse" />
              <span>Official Cultural Festival</span>
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-white/60">WSF · CIC</span>
          </div>

          {/* Main Title */}
          <h1
            className="f-rise mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.08] sm:leading-[1.04] tracking-tight text-white font-heading"
            style={delay(120)}
          >
            <span className="block text-white">14th Wafy</span>
            <span className="block text-white">Arts Fest</span>
          </h1>

          {/* Arabic Subtitle */}
          <p
            lang="ar"
            dir="rtl"
            className="f-kufi f-rise mt-2 sm:mt-3 text-center lg:text-left text-lg sm:text-2xl lg:text-3xl font-bold text-[var(--f-saffron)]"
            style={delay(200)}
          >
            مهرجان وافي الرابع عشر للفنون
          </p>

          {/* Editorial Lead Paragraph */}
          <p
            className="f-rise mt-3 sm:mt-4 max-w-lg text-xs sm:text-sm lg:text-base leading-relaxed text-[var(--f-text-secondary)] text-center lg:text-left mx-auto lg:mx-0 font-sans"
            style={delay(280)}
          >
            The premier inter-collegiate arts festival of the Wafy and Wafiyya colleges. Uniting
            oratory, literature, Quranic recitation, and performing arts from more than 62 institutions
            across Kerala.
          </p>

          {/* Action Buttons: Primary Student Access & Secondary Institutional Login */}
          <div className="f-rise mt-5 sm:mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3" style={delay(360)}>
            <Link
              href="/student-login"
              className="f-focus group inline-flex items-center gap-2 rounded-xl bg-[var(--f-saffron)] px-5 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--f-ink)] shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
              <span>Student Portal</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            {isAuthenticated ? (
              <Link
                href={getPortalRoute()}
                className="f-focus inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/10 active:scale-[0.98]"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4 text-[var(--f-saffron)]" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="f-focus inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/10 active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4 text-[var(--f-saffron)]" />
                <span>Officer / College Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Right Column: 3D Moorish Arch Magazine Deck (No Scroll Hijack) ── */}
        <div className="flex flex-col items-center justify-center">
          <div
            tabIndex={0}
            role="region"
            aria-label="Festival Gallery Carousel. Use left and right arrow keys to browse slides."
            onKeyDown={handleKeyDown}
            className="f-rise relative mx-auto w-full max-w-[210px] sm:max-w-[250px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[370px] aspect-[3/4] select-none my-2 sm:my-4 lg:my-auto focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)] rounded-t-[999px]"
            style={{
              ...delay(260),
              perspective: '1200px',
              perspectiveOrigin: 'center center',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Tilted Arch Containers in Infinite Deck */}
            {HERO_SLIDES.map((slide, i) => {
              const total = HERO_SLIDES.length;
              const position = (i - currentIndex + total) % total;

              const isFront = position === 0;

              let transform = '';
              let zIndex = 0;
              let opacity = 0;
              let filter = 'brightness(0.3)';
              let borderStyle = 'border border-white/10';
              let pointerEvents: 'auto' | 'none' = 'none';

              if (position === 0) {
                zIndex = 40;
                opacity = 1;
                filter = 'brightness(1)';
                transform = 'translate3d(0px, 0px, 0px) rotateZ(0deg) rotateY(0deg) rotateX(0deg) scale(1)';
                borderStyle = 'border-2 border-[var(--f-saffron)] shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/40';
                pointerEvents = 'auto';
              } else if (position === 1) {
                zIndex = 30;
                opacity = 0.92;
                filter = 'brightness(0.8)';
                transform = 'translate3d(24px, -8px, -40px) rotateZ(6deg) rotateY(-16deg) rotateX(5deg) scale(0.98)';
                borderStyle = 'border-2 border-white/30 shadow-[0_20px_45px_rgba(0,0,0,0.75)]';
                pointerEvents = 'auto';
              } else if (position === 2) {
                zIndex = 20;
                opacity = 0.75;
                filter = 'brightness(0.6)';
                transform = 'translate3d(46px, -15px, -80px) rotateZ(12deg) rotateY(-25deg) rotateX(9deg) scale(0.95)';
                borderStyle = 'border-2 border-white/20 shadow-[0_15px_35px_rgba(0,0,0,0.65)]';
                pointerEvents = 'auto';
              } else if (position === 3) {
                zIndex = 10;
                opacity = 0.45;
                filter = 'brightness(0.4)';
                transform = 'translate3d(66px, -20px, -120px) rotateZ(18deg) rotateY(-32deg) rotateX(12deg) scale(0.92)';
                borderStyle = 'border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.5)]';
                pointerEvents = 'auto';
              } else {
                zIndex = 0;
                opacity = 0;
                filter = 'brightness(0.2)';
                transform = 'translate3d(75px, -24px, -150px) rotateZ(20deg) rotateY(-36deg) rotateX(14deg) scale(0.9)';
                pointerEvents = 'none';
              }

              return (
                <div
                  key={slide.id}
                  onClick={() => {
                    if (!isFront && pointerEvents === 'auto') jumpToSlide(i);
                  }}
                  title={!isFront && pointerEvents === 'auto' ? 'Click to bring to front' : undefined}
                  style={{
                    zIndex,
                    opacity,
                    filter,
                    transform,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'bottom center',
                    pointerEvents,
                    transition: 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1), opacity 600ms ease, filter 600ms ease',
                  }}
                  className={`
                    absolute inset-0 rounded-t-[999px] overflow-hidden bg-[var(--f-surface)]
                    w-full h-full aspect-[3/4] cursor-pointer group shadow-2xl
                    ${borderStyle}
                  `}
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className={`h-full w-full ${slide.objectFit} object-center transition-transform duration-700 ease-out group-hover:scale-105`}
                    loading={i < 3 ? 'eager' : 'lazy'}
                  />

                  {/* Accessible Controls on Front Arch */}
                  {isFront && (
                    <>
                      {/* Previous Slide Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          swapPrev();
                        }}
                        aria-label="Previous slide"
                        className="f-focus absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 transition-all opacity-85 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[var(--f-saffron)] hover:text-[var(--f-ink)] hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {/* Next Slide Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          swapNext();
                        }}
                        aria-label="Next slide"
                        className="f-focus absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 transition-all opacity-85 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[var(--f-saffron)] hover:text-[var(--f-ink)] hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {/* Pagination Pill & Pause Control */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-black/75 backdrop-blur-md border border-white/20 px-3 py-1 shadow-xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsManuallyPaused((p) => !p);
                          }}
                          aria-label={isManuallyPaused ? 'Resume slideshow' : 'Pause slideshow'}
                          aria-pressed={!isManuallyPaused}
                          className="f-focus text-white/70 hover:text-[var(--f-saffron)] transition-colors cursor-pointer"
                        >
                          {isManuallyPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        </button>

                        <div className="flex items-center gap-1">
                          {HERO_SLIDES.map((s, dotIdx) => (
                            <button
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToSlide(dotIdx);
                              }}
                              aria-label={`Jump to slide ${dotIdx + 1}`}
                              className={`transition-all duration-300 rounded-full cursor-pointer shrink-0 ${currentIndex === dotIdx
                                  ? 'w-3.5 h-1.5 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]'
                                  : 'w-1 h-1 bg-white/40 hover:bg-white/80'
                                }`}
                            />
                          ))}
                        </div>

                        <span className="text-[10px] font-bold text-white/70 ml-1 pl-1.5 border-l border-white/20 tabular-nums font-mono">
                          {currentIndex + 1}/{HERO_SLIDES.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Integrated Statistics Strip (Phase 5) ── */}
      <div className="relative border-t border-white/10 bg-[var(--f-surface-subtle)]/90 backdrop-blur-md text-white shrink-0 z-20">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0 px-3 py-2 sm:py-3.5 sm:px-8 lg:px-12">
          {statsData.map(({ value, label, detail }) => (
            <div
              key={label}
              className="group flex flex-col justify-center items-center text-center sm:items-start sm:text-left px-3 py-2 sm:px-6 sm:py-3 transition-all duration-200 hover:bg-white/[0.04] cursor-default"
            >
              <dd className="f-kufi text-xl sm:text-2xl lg:text-3xl font-extrabold leading-none tracking-tight text-[var(--f-saffron)] group-hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.45)] transition-all">
                {value}
              </dd>
              <dt className="mt-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--f-text-primary)] font-heading">
                {label}
              </dt>
              <span className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--f-text-muted)] font-medium">
                {detail}
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
