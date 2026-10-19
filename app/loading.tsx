import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center max-w-sm w-full space-y-6 text-center">
        {/* Animated Brand Emblem */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20 animate-bounce">
            ✦
          </div>
          <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-25" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            Loading Arts Fest Portal...
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Synchronizing live schedules, stages & registrations
          </p>
        </div>

        {/* Shimmer Bar Skeleton */}
        <div className="w-48 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden relative">
          <div className="h-full bg-emerald-500 rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
}
