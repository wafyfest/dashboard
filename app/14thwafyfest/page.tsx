'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon, Award, Menu, X } from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { FestivalNav } from '@/components/festival/FestivalNav';
import { FestivalHero } from '@/components/festival/FestivalHero';
import { AboutCIC } from '@/components/festival/AboutCIC';
import { AboutWSF } from '@/components/festival/AboutWSF';
import { WafyStream } from '@/components/festival/WafyStream';
import { FestHistory } from '@/components/festival/FestHistory';
import { CommitteeGrid } from '@/components/festival/CommitteeGrid';

const NAV_SECTIONS = [
  { href: '#cic', label: 'About CIC' },
  { href: '#wsf', label: 'About WSF' },
  { href: '#wafy', label: 'Wafy Stream' },
  { href: '#history', label: 'History' },
  { href: '#committee', label: 'Committee' },
];

function smoothScroll(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
}

export default function FestivalPage() {
  const { festSettings, theme, toggleTheme } = useFest();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden">

      {/* ── Sticky top navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md font-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">

          {/* Left: Back + Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Portal</span>
            </Link>
            <div className="w-px h-4 bg-[var(--border-subtle)] shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--brand-navy)] flex items-center justify-center shrink-0 border border-slate-700/30">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                {festSettings.fest_name || '14th Wafy Arts Fest'}
              </span>
            </div>
          </div>

          {/* Right: section links + theme (desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_SECTIONS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={e => {
                  e.preventDefault();
                  smoothScroll(href);
                }}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
              >
                {label}
              </a>
            ))}
            <div className="w-px h-4 bg-[var(--border-subtle)] mx-2" />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun className="w-3.5 h-3.5 text-amber-400" />
                : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 space-y-1 animate-in slide-in-from-top-2">
            {NAV_SECTIONS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={e => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  smoothScroll(href);
                }}
                className="block text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── Fixed section dot nav (desktop only) ─────────────────── */}
      <FestivalNav />

      {/* ── Page sections ────────────────────────────────────────── */}
      <main>
        <FestivalHero />
        <AboutCIC />
        <AboutWSF />
        <WafyStream />
        <FestHistory />
        <CommitteeGrid />
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--brand-navy)] flex items-center justify-center border border-slate-700/30">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-bold text-[var(--text-primary)] text-xs">
              {festSettings.fest_name || '14th Wafy Arts Fest'}
            </span>
          </div>
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} CIC &amp; WSF. All rights reserved.
          </p>
          <div className="flex items-center gap-4 font-medium">
            <Link href="/" className="hover:text-emerald-500 transition-colors">
              Main Portal
            </Link>
            <Link href="/student-login" className="hover:text-emerald-500 transition-colors">
              Student Login
            </Link>
            <Link href="/privacy" className="hover:text-emerald-500 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
