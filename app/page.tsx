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
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { FestNav } from '@/components/fest/FestNav';
import { FestHero } from '@/components/fest/FestHero';
import { AboutCIC } from '@/components/fest/AboutCIC';
import { AboutWSF } from '@/components/fest/AboutWSF';
import { WafyStream } from '@/components/fest/WafyStream';
import { CommitteeGrid } from '@/components/fest/CommitteeGrid';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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
    <div className="min-h-screen bg-[var(--f-canvas)] text-[var(--f-text-primary)] font-sans antialiased overflow-x-hidden flex flex-col selection:bg-amber-500 selection:text-black">
      {/* ─── Floating Header & Navigation (Phase 3) ─────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-heading ${
          scrolled
            ? 'bg-[#090d1a]/85 backdrop-blur-md border-b border-white/10 py-3 shadow-lg shadow-black/20'
            : 'bg-transparent border-b border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo with Illuminated Saffron Accent Dot */}
          <Link href="/" className="f-focus flex items-center gap-2 group shrink-0 rounded-lg" aria-label="Wafy Arts Fest Home">
            <span className="font-extrabold text-sm sm:text-base tracking-widest uppercase text-white font-heading">
              WAFY
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--f-saffron)] mx-1.5 shadow-[0_0_8px_var(--f-saffron)] align-middle" />
              FEST
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8" aria-label="Main page navigation">
            {NAV_SECTIONS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  smoothScroll(href);
                }}
                className="f-focus text-xs font-semibold tracking-wider text-white/75 hover:text-white transition-colors cursor-pointer py-1 px-1.5 rounded"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right Action Group: One Student Login Button + One Officer Login Button + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Primary Action: Student Login */}
            <Link
              href="/student-login"
              className="f-focus inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 sm:px-4 py-2 text-xs font-bold tracking-wider uppercase text-black shadow-md shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400 hover:text-black hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Student Login</span>
              <span className="sm:hidden">Student</span>
            </Link>

            {/* Secondary Action: College/Official Login */}
            <Link
              href={mounted && isAuthenticated ? getPortalRoute() : '/login'}
              className="f-focus hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-white/20 bg-white/5 text-white/90 hover:text-white hover:bg-white/10 hover:border-white/40 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
              <span>{mounted && isAuthenticated ? 'Dashboard' : 'College/Official Login'}</span>
            </Link>

            {/* Theme Preference Toggle for Portal / Dark Mode consistency */}
            <button
              onClick={toggleTheme}
              className="f-focus p-2 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="f-focus md:hidden p-2 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden mt-2 mx-4 p-4 rounded-2xl border border-white/15 bg-[#0b1022]/95 backdrop-blur-xl space-y-3 shadow-2xl animate-in slide-in-from-top-2"
            role="dialog"
            aria-label="Mobile navigation"
          >
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
                  className="block text-xs font-semibold text-white/85 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/student-login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 shadow-md transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Login</span>
              </Link>
              <Link
                href={mounted && isAuthenticated ? getPortalRoute() : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10"
              >
                <LogIn className="w-4 h-4 text-[var(--f-saffron)]" />
                <span>{mounted && isAuthenticated ? 'Open Dashboard' : 'College/Official Login'}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Desktop Section Dot Indicator ──────────────────────────── */}
      <FestNav />

      {/* ─── Main Editorial Fest Sections ────────────────────────── */}
      <main className="flex-1">
        <FestHero />
        <AboutCIC />
        <AboutWSF />
        <WafyStream />
        <CommitteeGrid />
      </main>

      {/* ─── Footer: Official CIC & WSF Headquarters & Contact (Phase 9) ─ */}
      <footer className="border-t border-white/10 bg-[#060913] py-12 text-xs text-[var(--f-text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-white/10">
            {/* Col 1: Branding & Summary */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--f-surface)] text-white flex items-center justify-center font-bold text-xs border border-white/10 shrink-0">
                  <Award className="w-4 h-4 text-[var(--f-saffron)]" />
                </div>
                <span className="font-extrabold text-white text-sm sm:text-base font-heading">
                  {festSettings.fest_name || '14th Wafy Arts Fest'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--f-text-secondary)] max-w-sm font-sans">
                Organized jointly by the Coordination of Islamic Colleges (CIC) and Wafy Students Federation (WSF), uniting 25+ affiliated institutions across Kerala.
              </p>
              <p className="text-[11px] text-[var(--f-text-muted)]">
                Registered with Government of Kerala (No. 379/04)
              </p>
            </div>

            {/* Col 2: Official Headquarters Location */}
            <div className="md:col-span-4 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-white font-heading">
                Headquarters
              </h4>
              <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--f-text-secondary)] font-sans">
                <MapPin className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Coordination of Islamic Colleges (CIC)</strong>
                  <br />
                  Wafa Campus, Pang South PO,
                  <br />
                  Kolathur VIA, Malappuram,
                  <br />
                  PIN: 679338 Kerala, India
                </span>
              </div>
            </div>

            {/* Col 3: Contact & Direct Channels */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-white font-heading">
                Contact Channels
              </h4>
              <div className="space-y-1.5 text-xs text-[var(--f-text-secondary)] font-sans">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                  <a href="tel:+917025687788" className="hover:text-white transition-colors">
                    +91 7025687788
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                  <a href="mailto:info@wafycic.com" className="hover:text-white transition-colors">
                    info@wafycic.com
                  </a>
                </div>
                <div className="pt-2">
                  <a
                    href="https://www.wafycic.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--f-saffron)] hover:underline"
                  >
                    <span>www.wafycic.com</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Dynamic Copyright Year and Portals */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p suppressHydrationWarning className="text-center sm:text-left text-[11px] text-[var(--f-text-muted)]">
              © {new Date().getFullYear()} Coordination of Islamic Colleges (CIC) &amp; Wafy Students Federation (WSF). All rights reserved.
            </p>

            <div className="flex items-center gap-4 font-semibold text-[11px]">
              <Link href="/login" className="hover:text-white transition-colors">
                College/Official Login
              </Link>
              <Link href="/student-login" className="hover:text-white transition-colors">
                Student Login
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
