'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  LogIn,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { TilePattern } from './FestivalPattern';

const STATS = [
  { value: '14th', label: 'Edition', detail: 'Biennial since 1997' },
  { value: '62+', label: 'Colleges', detail: 'Affiliated across Kerala' },
  { value: '1,700+', label: 'Participants', detail: 'Four academic phases' },
  { value: '84+', label: 'Events', detail: 'Onstage & offstage categories' },
];

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
    alt: 'Wafy Wafiyya State Arts Fest 2024-25 Theme',
    objectFit: 'object-contain bg-white',
  },
  {
    id: 'stage',
    src: '/fest-stage.jpg',
    alt: 'Wafy Arts Fest Grand Stage',
    objectFit: 'object-cover',
  },
  {
    id: 'arts',
    src: '/fest-arts.jpg',
    alt: 'Islamic Calligraphy & Arts Exhibition',
    objectFit: 'object-cover',
  },
  {
    id: 'convocation',
    src: '/image.png',
    alt: '14th State Arts Fest & Convocation Ceremony',
    objectFit: 'object-cover',
  },
  {
    id: 'auditorium',
    src: '/test-fest-1.jpg',
    alt: 'Grand Auditorium & Fest Hall',
    objectFit: 'object-cover',
  },
  {
    id: 'architecture',
    src: '/test-2-architecture.jpg',
    alt: 'Islamic Geometric Heritage Architecture',
    objectFit: 'object-cover',
  },
  {
    id: 'performance',
    src: '/test-3-stage.jpg',
    alt: 'Festive Cultural Stage Lighting',
    objectFit: 'object-cover',
  },
  {
    id: 'penmanship',
    src: '/test-4-calligraphy.jpg',
    alt: 'Literary Oratory & Calligraphy',
    objectFit: 'object-cover',
  },
  {
    id: 'trophy',
    src: '/test-5-trophy.jpg',
    alt: 'State Championship Trophy & Honors',
    objectFit: 'object-cover',
  },
  {
    id: 'celebration',
    src: '/test-6-celebration.jpg',
    alt: 'Fest Celebrations & Audience',
    objectFit: 'object-cover',
  },
];

const delay = (ms: number) => ({ '--d': `${ms}ms` } as React.CSSProperties);

export function FestivalHero() {
  const { festSettings, isAuthenticated, currentRole } = useFest();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const archRef = useRef<HTMLDivElement>(null);
  const isSwapping = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const festName = festSettings.fest_name || '14TH WAFY ARTS FEST';

  const getPortalRoute = () => {
    switch (currentRole) {
      case 'admin': return '/admin';
      case 'college': return '/college';
      case 'stage_controller': return '/stage-controller';
      case 'result_entry': return '/result-entry';
      case 'convenor': return '/convenor';
      case 'student': return '/student';
      default: return '/college';
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

  // Dedicated non-passive wheel listener: swaps images and PREVENTS page from scrolling down while hovering the arch
  useEffect(() => {
    const el = archRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Stop the window from moving down when scrolling over the arch container
      e.preventDefault();
      e.stopPropagation();

      if (isSwapping.current) return;
      if (Math.abs(e.deltaY) > 15 || Math.abs(e.deltaX) > 15) {
        isSwapping.current = true;
        if (e.deltaY > 0 || e.deltaX > 0) {
          swapNext();
        } else {
          swapPrev();
        }
        setTimeout(() => {
          isSwapping.current = false;
        }, 360);
      }
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [swapNext, swapPrev]);

  // Touch gesture support
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

  // Auto-play timer (every 5.5s), pauses on hover
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      swapNext();
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, swapNext]);

  return (
    <section
      id="hero"
      className="f-sans relative overflow-hidden bg-[var(--f-ink)] text-white min-h-[100svh] h-auto lg:h-[100svh] lg:max-h-[100svh] flex flex-col justify-between w-full max-w-full"
    >
      {/* Background Islamic Tile Pattern */}
      <TilePattern id="tiles-hero" className="text-white opacity-[0.05]" />

      {/* Ambient background glow highlights */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[var(--f-lapis)] opacity-30 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-[var(--f-saffron)] opacity-15 blur-[140px]"
        aria-hidden="true"
      />

      {/* Main Hero Content Area - Responsive Flex Grid */}
      <div className="relative mx-auto grid w-full flex-1 max-w-7xl items-center gap-4 sm:gap-6 lg:gap-12 px-4 sm:px-6 lg:px-12 pt-16 sm:pt-20 lg:pt-16 pb-4 sm:pb-6 lg:pb-3 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* ── Text Column (Responsive Editorial Hierarchy: Centered on Mobile, Left-Aligned on Desktop) ── */}
        <div className="z-10 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
          
          {/* Eyebrow badge */}
          <div className="f-rise flex items-center justify-center lg:justify-start gap-2" style={delay(50)}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-white/90 backdrop-blur-sm shadow-sm">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[var(--f-saffron)] animate-pulse" />
              <span>Official Cultural Festival</span>
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-white/60">WSF · CIC</span>
          </div>

          {/* Main Title: Responsive 2-line lockup */}
          <h1
            className="f-rise mt-2 sm:mt-3 text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.08] sm:leading-[1.04] tracking-tight text-white text-center lg:text-left"
            style={delay(120)}
          >
            <span className="block text-white">14th Wafy</span>
            <span className="block text-white">Arts Fest</span>
          </h1>

          {/* Arabic Subtitle: Primary saffron cultural accent line */}
          <p
            lang="ar"
            dir="rtl"
            className="f-kufi f-rise mt-1.5 sm:mt-2.5 text-center lg:text-left text-base sm:text-xl lg:text-3xl font-bold text-[var(--f-saffron)]"
            style={delay(200)}
          >
            مهرجان وافي الرابع عشر للفنون
          </p>

          {/* Editorial Lead Paragraph */}
          <p
            className="f-rise mt-2 sm:mt-3 max-w-lg text-xs sm:text-sm lg:text-base leading-relaxed text-white/80 text-center lg:text-left mx-auto lg:mx-0"
            style={delay(280)}
          >
            The premier inter-collegiate arts festival of the Wafy and Wafiyya colleges. Uniting
            oratory, literature, Quranic recitation, and performing arts from more than 62 institutions
            across Kerala.
          </p>

          {/* Action Buttons: Responsive sizing and centering */}
          <div className="f-rise mt-3 sm:mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3" style={delay(360)}>
            <Link
              href="/student-login"
              className="f-focus group inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[var(--f-saffron)] px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold text-[var(--f-ink)] shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="h-3.5 w-3.5 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
              <span>Student portal</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            {isAuthenticated ? (
              <Link
                href={getPortalRoute()}
                className="f-focus inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-white/30 bg-white/10 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/20 active:scale-[0.98]"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--f-saffron)]" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="f-focus inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-white/30 bg-white/10 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/20 active:scale-[0.98]"
              >
                <LogIn className="h-3.5 w-3.5 text-[var(--f-saffron)]" />
                <span>Officer / College login</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── 3D Stacked Arch Deck (Responsive Sizing, Tilted to Back in Infinite Loop) ── */}
        <div
          ref={archRef}
          className="f-rise relative mx-auto w-full max-w-[190px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[360px] xl:max-w-[390px] aspect-[3/4] select-none my-4 sm:my-6 lg:my-auto"
          style={{
            ...delay(260),
            perspective: '1200px',
            perspectiveOrigin: 'center center',
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Tilted Arch Containers in Infinite Loop */}
          {HERO_SLIDES.map((slide, i) => {
            const total = HERO_SLIDES.length;
            const position = (i - currentIndex + total) % total;

            const isFront = position === 0;

            // 3D Tilt configs matching sketch: arches tilted backward into the right/depth
            let transform = '';
            let zIndex = 0;
            let opacity = 0;
            let filter = 'brightness(0.3)';
            let borderStyle = 'border border-white/10';
            let pointerEvents: 'auto' | 'none' = 'none';

            if (position === 0) {
              // Front arch: perfectly upright, primary focus
              zIndex = 40;
              opacity = 1;
              filter = 'brightness(1)';
              transform = 'translate3d(0px, 0px, 0px) rotateZ(0deg) rotateY(0deg) rotateX(0deg) scale(1)';
              borderStyle = 'border-2 border-[var(--f-saffron)] shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/40';
              pointerEvents = 'auto';
            } else if (position === 1) {
              // 1st arch tilted back-right (top peeks out right, bottom corner dips below baseline)
              zIndex = 30;
              opacity = 0.92;
              filter = 'brightness(0.8)';
              transform = 'translate3d(28px, -10px, -45px) rotateZ(7deg) rotateY(-18deg) rotateX(6deg) scale(0.98)';
              borderStyle = 'border-2 border-white/35 hover:border-[var(--f-saffron)] hover:brightness-100 shadow-[0_20px_45px_rgba(0,0,0,0.75)]';
              pointerEvents = 'auto';
            } else if (position === 2) {
              // 2nd arch tilted further back-right (visible behind 1st tilted arch)
              zIndex = 20;
              opacity = 0.78;
              filter = 'brightness(0.6)';
              transform = 'translate3d(54px, -18px, -90px) rotateZ(14deg) rotateY(-28deg) rotateX(10deg) scale(0.95)';
              borderStyle = 'border-2 border-white/25 hover:border-[var(--f-saffron)] hover:brightness-100 shadow-[0_15px_35px_rgba(0,0,0,0.65)]';
              pointerEvents = 'auto';
            } else if (position === 3) {
              // 3rd arch in deck (deepest visible arch in stack)
              zIndex = 10;
              opacity = 0.45;
              filter = 'brightness(0.4)';
              transform = 'translate3d(76px, -24px, -135px) rotateZ(20deg) rotateY(-36deg) rotateX(14deg) scale(0.92)';
              borderStyle = 'border border-white/15 shadow-[0_10px_25px_rgba(0,0,0,0.5)]';
              pointerEvents = 'auto';
            } else {
              // Reserve slides waiting in infinite loop queue
              zIndex = 0;
              opacity = 0;
              filter = 'brightness(0.2)';
              transform = 'translate3d(85px, -28px, -160px) rotateZ(22deg) rotateY(-40deg) rotateX(16deg) scale(0.9)';
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
                  absolute inset-0 rounded-t-[999px] overflow-hidden bg-[var(--f-lapis)]
                  w-full h-full aspect-[3/4] cursor-pointer group shadow-2xl
                  ${borderStyle}
                `}
              >
                {/* Pure Artwork (No captions) */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className={`h-full w-full ${slide.objectFit} object-center transition-transform duration-700 ease-out group-hover:scale-105`}
                  loading={i < 4 ? 'eager' : 'lazy'}
                />

                {/* Minimal front arch controls */}
                {isFront && (
                  <>
                    {/* Previous Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        swapPrev();
                      }}
                      aria-label="Previous arch"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/25 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[var(--f-saffron)] hover:text-[var(--f-ink)] hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Next Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        swapNext();
                      }}
                      aria-label="Next arch"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/25 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[var(--f-saffron)] hover:text-[var(--f-ink)] hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Minimal Dots (Bottom Center) with Slide Counter */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 px-3 py-1 shadow-xl">
                      <div className="flex items-center gap-1">
                        {HERO_SLIDES.map((s, dotIdx) => (
                          <button
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToSlide(dotIdx);
                            }}
                            aria-label={`Switch to slide ${dotIdx + 1}`}
                            className={`transition-all duration-300 rounded-full cursor-pointer shrink-0 ${
                              currentIndex === dotIdx
                                ? 'w-3.5 h-1.5 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]'
                                : 'w-1 h-1 bg-white/40 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-white/70 ml-1 pl-1.5 border-l border-white/20 tabular-nums">
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

      {/* ── Stats Strip: Docked cleanly at bottom of viewport with refined dark aesthetic ── */}
      <div className="relative border-t border-amber-500/20 bg-black/80 backdrop-blur-md text-white shrink-0 z-20">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0 px-3 py-1.5 sm:py-3 sm:px-8 lg:px-12">
          {STATS.map(({ value, label, detail }) => (
            <div
              key={label}
              className="group flex flex-col justify-center items-center text-center sm:items-start sm:text-left px-2.5 py-1.5 sm:px-6 sm:py-2.5 transition-all duration-200 hover:bg-white/[0.04] cursor-default"
            >
              <dd className="f-kufi text-xl sm:text-2xl lg:text-3xl font-extrabold leading-none tracking-tight text-[var(--f-saffron)] group-hover:drop-shadow-[0_0_12px_rgba(255,180,31,0.4)] transition-all">
                {value}
              </dd>
              <dt className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
                {label}
              </dt>
              <span className="mt-0.5 text-[9px] sm:text-[11px] text-white/60 font-medium">
                {detail}
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
