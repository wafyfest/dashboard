'use client';

import React from 'react';
import Link from 'next/link';
import { FestivalHero } from '@/components/festival/FestivalHero';

export default function EmeraldPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Floating Theme Navigation Bar */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-emerald-500/30 shadow-2xl text-[11px] sm:text-xs font-semibold max-w-[95vw] overflow-x-auto">
        <Link href="/" className="px-2.5 sm:px-3 py-1 text-white/70 hover:text-white rounded-full transition-colors shrink-0">
          Home
        </Link>
        <span className="text-white/20">|</span>
        <Link href="/preview/emerald" className="px-2.5 sm:px-3.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0 font-bold">
          🌿 Emerald & Gold
        </Link>
      </nav>

      <FestivalHero />
    </div>
  );
}
