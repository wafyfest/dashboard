'use client';

import React from 'react';
import Link from 'next/link';
import { Home, GraduationCap, LogIn, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Background ambient decorative glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-2xl -translate-y-20 translate-x-20" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        {/* Visual Badge */}
        <div className="inline-flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 backdrop-blur-md">
              <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 dark:text-emerald-400 animate-pulse" />
            </div>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-white shadow-xs">
              404
            </span>
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading">
            Stage Not Found
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            The page or fest resource you are looking for doesn&apos;t exist or may have been relocated.
          </p>
        </div>

        {/* Helpful Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
          <Link
            href="/student-login"
            className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate">Student Portal</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">Check admits & schedule</div>
              </div>
            </div>
          </Link>

          <Link
            href="/login"
            className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate">Officer Sign In</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">College & judging console</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-[var(--text-muted)] pt-4">
          14th Wafy Arts Fest • Coordination of Islamic Colleges (CIC) & WSF
        </p>
      </div>
    </div>
  );
}
