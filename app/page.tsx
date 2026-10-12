'use client';

import React from 'react';
import Link from 'next/link';
import {
  Award,
  LogIn,
  GraduationCap,
  Sparkles,
  Calendar,
  Building2,
  Users,
  Trophy,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';

export default function LandingPage() {
  const { festSettings, theme, toggleTheme, isAuthenticated, currentRole } = useFest();

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
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-base shadow-xs border border-slate-700/30 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
                  {festSettings.fest_name || '14TH WAFY ARTS FEST'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  WSF & CIC
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-none mt-0.5">
                Coordination of Islamic Colleges (CIC)
              </p>
            </div>
          </Link>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-2xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Student Login Link */}
            <Link
              href="/student-login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-[0.98]"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Student Login</span>
              <span className="sm:hidden">Student</span>
            </Link>

            {/* Primary Login Button */}
            {isAuthenticated ? (
              <Link
                href={getPortalRoute()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all active:scale-[0.98]"
              >
                <span>My Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                id="header-login-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand-navy)] hover:bg-[var(--brand-navy-hover)] shadow-xs transition-all active:scale-[0.98] border border-slate-700/30"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Portal Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[var(--border-subtle)] bg-radial from-emerald-500/5 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Cultural & Arts Fest Portal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.15]">
              {festSettings.fest_name || '14TH WAFY ARTS FEST'}
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
              Organized by <strong>Wafy Students Federation (WSF)</strong> under the apex auspices of the{' '}
              <strong>Coordination of Islamic Colleges (CIC)</strong>. Uniting hundreds of talents across 25+ affiliated institutions in creative, intellectual, and artistic excellence.
            </p>

            {/* Quick Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>Executive & College Login</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/student-login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold text-sm border border-[var(--border-medium)] shadow-xs transition-all active:scale-[0.98]"
              >
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>Student CIC Login</span>
              </Link>

              <Link
                href="/student"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-500 transition-colors"
              >
                <span>View Public Schedule & Results</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 text-center shadow-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono">25+</div>
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Affiliated Colleges</div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 text-center shadow-card">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono">1,700+</div>
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Active Participants</div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 text-center shadow-card">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono">84+</div>
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Competition Categories</div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 text-center shadow-card">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono">100%</div>
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Blind Judging & Fair Play</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Detail Sections: CIC, WSF, and Wafy Fest ────────────────── */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section 1: About Wafy Fest */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Cultural Extravaganza</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              About Wafy Arts Fest
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              The <strong>Wafy Arts Fest</strong> is the pinnacle inter-collegiate arts and literary convention organized biennially to foster creative talents, literary acumen, eloquence, and multifaceted expressions among scholars of the Wafy academic stream.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Featuring competitive stages in multilingual oratory, Quranic and Islamic sciences, scholarly writing, creative arts, debates, and performing arts across structured categories: <em>Foundation (Sub-Junior)</em>, <em>Thamheediyya (Junior)</em>, <em>Aliya (Senior)</em>, and <em>General</em>.
            </p>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Multi-stage live performance tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Automated category-wise quota enforcement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Fair blind judging with code letter allotment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Real-time score tabulations & appeals portal</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Fest Schedule & Timeline</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">Registration Deadline</div>
                  <div className="text-[var(--text-muted)] font-mono mt-0.5">
                    {festSettings.reg_deadline ? new Date(festSettings.reg_deadline).toLocaleDateString() : 'Active'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">Late Entry Fine Window</div>
                  <div className="text-[var(--text-muted)] font-mono mt-0.5">
                    {festSettings.fine_deadline ? new Date(festSettings.fine_deadline).toLocaleDateString() : 'Upcoming'}
                  </div>
                </div>
              </div>

              {festSettings.rulebook_url && (
                <a
                  href={festSettings.rulebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  Download Official Fest Rulebook (PDF) ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Wafy CIC & WSF Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CIC Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                Coordination of Islamic Colleges (CIC)
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                The <strong>Coordination of Islamic Colleges (CIC)</strong> is the academic governing body regulating the revolutionary <em>Wafy</em> and <em>Wafiyya</em> curricula. Integrating traditional Islamic sciences with contemporary university education, CIC oversees affiliated colleges across Kerala and beyond, establishing pioneering benchmarks for holistic scholarship.
              </p>
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-500" /> Markaz Campus, Karthala
              </span>
              <span className="font-semibold text-sky-500">Apex Governing Body</span>
            </div>
          </div>

          {/* WSF Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                Wafy Students Federation (WSF)
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                The <strong>Wafy Students Federation (WSF)</strong> is the representative student confederation functioning under CIC. WSF spearheads student leadership, academic publications, creative development, social engagements, and conducts the prestigious inter-college Arts Fest with utmost transparency and peer coordination.
              </p>
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Student Leadership & Organizing Committee
              </span>
              <span className="font-semibold text-emerald-500">Student Federation</span>
            </div>
          </div>
        </div>

        {/* Section 3: Student Direct Access Prompt */}
        <div className="rounded-3xl bg-gradient-to-r from-[var(--brand-navy)] to-slate-900 text-white p-8 sm:p-10 border border-slate-700/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Student Information System
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Are you a participating student?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Log in with your official <strong>CIC Number</strong> and credentials to view your personalized Admit Card, check competition reporting stages, or verify published scores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              href="/student-login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student CIC Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/student"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <span>Public Live View</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xs border border-slate-700/30">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">
              {festSettings.fest_name || '14TH WAFY ARTS FEST'}
            </span>
          </div>

          <p>
            © {new Date().getFullYear()} Coordination of Islamic Colleges (CIC) & Wafy Students Federation (WSF). All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/login" className="hover:text-emerald-500 transition-colors">
              Portal Sign In
            </Link>
            <Link href="/student-login" className="hover:text-emerald-500 transition-colors">
              Student Login
            </Link>
            <Link href="/student" className="hover:text-emerald-500 transition-colors">
              Public Schedule
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}