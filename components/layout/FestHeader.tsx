'use client';

import React from 'react';
import { useFest } from '@/lib/context/FestContext';
import {
  Calendar,
  AlertTriangle,
  Sun,
  Moon,
  Award
} from 'lucide-react';
import { festService } from '@/lib/services/festService';
import { formatIstDisplay, getDeadlineStatus } from '@/lib/utils/istDate';

export function FestHeader() {
  const {
    currentRole,
    currentCollegeId,
    setCurrentCollegeId,
    festSettings,
    theme,
    toggleTheme,
    timeTick
  } = useFest();

  const colleges = festService.getColleges();
  const activeCollege = colleges.find(c => c.id === currentCollegeId) || colleges[0];

  const deadlineStatus = React.useMemo(
    () => getDeadlineStatus(festSettings.reg_deadline),
    [festSettings.reg_deadline, timeTick]
  );

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors font-heading shadow-xs">
      {/* Top Banner: Role Switcher & System Status */}
      <div className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-4 lg:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-[var(--text-primary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] animate-pulse" />
            <span suppressHydrationWarning>{festSettings.fest_name}</span>
          </div>
          <span className="text-[var(--border-medium)] hidden sm:inline">|</span>
          <div className="hidden md:flex items-center gap-2 text-[var(--text-muted)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
            <span suppressHydrationWarning>
              Reg Deadline: {formatIstDisplay(festSettings.reg_deadline)}
            </span>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div className="flex items-center gap-2">
          {deadlineStatus.status === 'open' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              Registration Open
            </span>
          ) : deadlineStatus.status === 'fine' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-medium font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Fine Active (₹500)
            </span>
          ) : deadlineStatus.status === 'super_fine' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30 text-[11px] font-medium font-mono">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Super Fine (₹1,000)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px] font-medium font-mono">
              Registrations Locked
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="group relative p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 hover:bg-[var(--bg-hover)] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center transition-transform duration-500 group-hover:rotate-45">
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-[var(--f-saffron)] drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#090d1a] flex items-center justify-center font-bold text-xs shadow-md shadow-amber-500/20 border border-amber-300/40">
            <Award className="w-4 h-4 text-[#090d1a]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-none flex items-center gap-1.5">
              <span>Arts Fest Management Portal</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[var(--f-saffron-text)] border border-amber-500/30">
                14th Ed.
              </span>
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Active Role: <strong className="text-[var(--text-primary)] capitalize">{currentRole.replace('_', ' ')}</strong>
              {currentRole === 'college' && (
                <span className="text-[var(--f-saffron-text)] font-medium ml-1">
                  ({activeCollege?.name} - {activeCollege?.code})
                </span>
              )}
            </p>
          </div>
        </div>

        {currentRole === 'admin' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">Inspect College:</span>
            <select
              value={currentCollegeId}
              onChange={e => setCurrentCollegeId(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-xl px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-[var(--f-saffron)] focus:border-[var(--f-saffron)] cursor-pointer"
            >
              {colleges.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
