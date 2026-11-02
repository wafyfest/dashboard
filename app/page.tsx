'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  Sun,
  Moon,
  Menu,
  X,
  GraduationCap,
  LogIn,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { FestivalNav } from '@/components/festival/FestivalNav';
import { FestivalHero } from '@/components/festival/FestivalHero';
import { AboutCIC } from '@/components/festival/AboutCIC';
import { AboutWSF } from '@/components/festival/AboutWSF';
import { WafyStream } from '@/components/festival/WafyStream';
import { CommitteeGrid } from '@/components/festival/CommitteeGrid';

const NAV_SECTIONS = [
  { href: '#cic', label: 'About CIC' },
  { href: '#wsf', label: 'About WSF' },
  { href: '#wafy', label: 'Curriculum' },
  { href: '#committee', label: 'Committee' },
];

function smoothScroll(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  const navHeight = 70;
  const elementPosition = el.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = Math.max(0, elementPosition - navHeight);
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
}

export default function HomePage() {
  const { festSettings, theme, toggleTheme, isAuthenticated, currentRole } = useFest();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ─── Floating Transparent Navigation Bar (Over Hero) ─────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-heading ${
          scrolled
            ? 'bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 py-3 shadow-sm'
            : 'bg-transparent border-b border-transparent py-5 sm:py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Logo (SONICFLUX style with illuminated accent dot) */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span
              className={`font-black text-sm sm:text-base tracking-widest uppercase transition-colors ${
                scrolled
                  ? 'text-[var(--text-primary)]'
                  : 'text-white'
              }`}
            >
              WAFY
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--f-saffron)] mx-1.5 shadow-[0_0_8px_var(--f-saffron)] align-middle" />
              FEST
            </span>
          </Link>

          {/* Center: Navigation Links (Lineup, Schedule style centered links) */}
          <nav className="hidden md:flex items-center justify-center gap-7 lg:gap-9">
            {NAV_SECTIONS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  smoothScroll(href);
                }}
                className={`text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
                  scrolled
                    ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right: Accent CTA Button (like "GET TICKETS" in image) + Portal + Theme */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/student-login"
              className="f-focus inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-[var(--f-saffron)] px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[var(--f-ink)] shadow-md transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Student Portal</span>
              <span className="sm:hidden">Portal</span>
            </Link>

            <Link
              href={isAuthenticated ? getPortalRoute() : '/login'}
              className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                scrolled
                  ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{isAuthenticated ? 'Dashboard' : 'Portal'}</span>
            </Link>

            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                scrolled
                  ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  : 'border-white/20 bg-white/5 text-white/80 hover:text-white hover:bg-white/15'
              }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`md:hidden p-1.5 rounded-md border transition-colors cursor-pointer ${
                scrolled
                  ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'border-white/20 bg-white/5 text-white hover:bg-white/15'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mx-4 p-4 rounded-xl border border-white/15 bg-black/85 backdrop-blur-xl space-y-3 shadow-2xl animate-in slide-in-from-top-2">
            <div className="space-y-1">
              {NAV_SECTIONS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    smoothScroll(href);
                  }}
                  className="block text-xs font-semibold text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/student-login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-[var(--f-ink)] bg-[var(--f-saffron)] shadow-md"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Portal</span>
              </Link>
              <Link
                href={isAuthenticated ? getPortalRoute() : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white border border-white/20 bg-white/10"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAuthenticated ? 'Open Dashboard' : 'Portal Login'}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Fixed Section Dot Navigation (Desktop) ─────────────────── */}
      <FestivalNav />

      {/* ─── Main Editorial Festival Sections ────────────────────────── */}
      <main className="flex-1">
        <FestivalHero />
        <AboutCIC />
        <AboutWSF />
        <WafyStream />
        <CommitteeGrid />
      </main>

      {/* ─── Footer: Official CIC & WSF Headquarters & Contact ────── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-12 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[var(--border-subtle)]">
            
            {/* Col 1: Branding & Summary */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xs border border-slate-700/30 shrink-0">
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="font-extrabold text-[var(--text-primary)] text-sm sm:text-base">
                  {festSettings.fest_name || '14th Wafy Arts Fest'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)] max-w-sm">
                Organized jointly by the Coordination of Islamic Colleges (CIC) and Wafy Students Federation (WSF), uniting 62 affiliated institutions across Kerala.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Registered with Government of Kerala (No. 379/04)
              </p>
            </div>

            {/* Col 2: Official Headquarters Location */}
            <div className="md:col-span-4 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-[var(--text-primary)]">
                Headquarters
              </h4>
              <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                <MapPin className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                <span>
                  <strong>Coordination of Islamic Colleges (CIC)</strong><br />
                  Wafa Campus, Pang South PO,<br />
                  Kolathur VIA, Malappuram,<br />
                  PIN: 679338 Kerala, India
                </span>
              </div>
            </div>

            {/* Col 3: Contact & Direct Channels */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-[var(--text-primary)]">
                Contact Channels
              </h4>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                  <a href="tel:+917025687788" className="hover:text-[var(--text-primary)] transition-colors">
                    +91 7025687788
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                  <a href="mailto:info@wafycic.com" className="hover:text-[var(--text-primary)] transition-colors">
                    info@wafycic.com
                  </a>
                </div>
                <div className="pt-2">
                  <a
                    href="https://www.wafycic.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:underline"
                  >
                    <span>www.wafycic.com</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright and Portals */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p suppressHydrationWarning className="text-center sm:text-left text-[11px]">
              © {new Date().getFullYear()} Coordination of Islamic Colleges (CIC) &amp; Wafy Students Federation (WSF). All rights reserved.
            </p>

            <div className="flex items-center gap-4 font-semibold text-[11px]">
              <Link href="/login" className="hover:text-[var(--text-primary)] transition-colors">
                Portal Sign In
              </Link>
              <Link href="/student-login" className="hover:text-[var(--text-primary)] transition-colors">
                Student Portal
              </Link>
              <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


