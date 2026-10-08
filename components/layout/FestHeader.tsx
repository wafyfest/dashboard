'use client';

import React from 'react';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';
import {
  ShieldAlert,
  Building2,
  GraduationCap,
  Radio,
  ClipboardPen,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react';
import { festService } from '@/lib/services/festService';

export function FestHeader() {
  const {
    currentRole,
    setCurrentRole,
    currentCollegeId,
    setCurrentCollegeId,
    festSettings,
    theme,
    toggleTheme
  } = useFest();

  const colleges = festService.getColleges();
  const activeCollege = colleges.find(c => c.id === currentCollegeId) || colleges[0];

  const now = new Date();
  const regDeadline = new Date(festSettings.reg_deadline);
  const fineDeadline = new Date(festSettings.fine_deadline);

  const isBeforeRegDeadline = now <= regDeadline;
  const isFinePeriod = !isBeforeRegDeadline && now <= fineDeadline;
  const isPastDeadline = now > fineDeadline;

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { role: 'admin', label: 'Admin', icon: <ShieldAlert className="w-3.5 h-3.5" />, desc: 'Global system control & locks' },
    { role: 'college', label: 'College Portal', icon: <Building2 className="w-3.5 h-3.5" />, desc: 'Registrations & Admit cards' },
    { role: 'student', label: 'Student View', icon: <GraduationCap className="w-3.5 h-3.5" />, desc: 'Schedule & Results viewer' },
    { role: 'stage_controller', label: 'Stage Controller', icon: <Radio className="w-3.5 h-3.5" />, desc: 'Blind codes & live stage' },
    { role: 'result_entry', label: 'Result Entry', icon: <ClipboardPen className="w-3.5 h-3.5" />, desc: 'Fast write-once scoring' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-xs border-b border-[var(--border-subtle)] transition-colors">
      {/* Top Banner: Role Switcher & System Status */}
      <div className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-4 lg:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-[var(--text-primary)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span suppressHydrationWarning>{festSettings.fest_name}</span>
          </div>
          <span className="text-[var(--border-medium)] hidden sm:inline">|</span>
          <div className="hidden md:flex items-center gap-2 text-[var(--text-muted)]">
            <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Reg Deadline: {new Date(festSettings.reg_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div className="flex items-center gap-2">
          {isBeforeRegDeadline ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Registration Open
            </span>
          ) : isFinePeriod ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px] font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Late Reg (Fine Applicable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 text-[11px] font-medium">
              Registrations Closed
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1.5 transition-colors ml-1 hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-slate-700/30">
            KU
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-none flex items-center gap-1.5">
              Arts Fest Management Portal
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Active Role: <strong className="text-[var(--text-primary)] capitalize">{currentRole.replace('_', ' ')}</strong>
              {currentRole === 'college' && (
                <span className="text-sky-600 dark:text-sky-400 font-medium ml-1">
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
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-slate-400 cursor-pointer"
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
