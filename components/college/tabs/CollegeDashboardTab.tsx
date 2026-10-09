'use client';

import React from 'react';
import { College, FestSettings } from '@/lib/types/fest';
import { Zap, User, Mail, MapPin, Phone, MessageSquare, BookOpen, Layers } from 'lucide-react';

interface CollegeDashboardTabProps {
  college?: College;
  festSettings: FestSettings;
  categoryCards: { label: string; count: number; highlight?: boolean }[];
  registrationsCount: number;
  totalEventsCount: number;
}

export function CollegeDashboardTab({
  college,
  festSettings,
  categoryCards,
  registrationsCount,
  totalEventsCount
}: CollegeDashboardTabProps) {
  const isFinePeriod = new Date() > new Date(festSettings.reg_deadline);

  return (
    <div className="space-y-6">
      {/* Key Dates Alert Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-primary)] shadow-2xs">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span className="font-medium">
            <strong className="font-bold">Key Deadlines:</strong> Regular Registration closes{' '}
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {new Date(festSettings.reg_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>{' '}
            • Late Fine Period ends:{' '}
            <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
              {new Date(festSettings.fine_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        </div>
        {isFinePeriod && (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
            Late Fine Period Active
          </span>
        )}
      </div>

      {/* Student Category Stat Cards Row */}
      {categoryCards.length > 0 && (
        <div className={`grid gap-3 lg:gap-4 ${
          categoryCards.length === 1
            ? 'grid-cols-1 max-w-xs'
            : categoryCards.length === 2
            ? 'grid-cols-2 max-w-md'
            : categoryCards.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : categoryCards.length === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        }`}>
          {categoryCards.map(card => (
            <div
              key={card.label}
              className={`border rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs transition-all ${
                card.highlight
                  ? 'bg-[#132238] dark:bg-[#1E293B] border-[#132238] dark:border-[#1E293B] text-white'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${card.highlight ? 'text-slate-200' : 'text-[var(--text-secondary)]'}`}>
                  {card.label}
                </span>
                <User className={`w-3.5 h-3.5 ${card.highlight ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
              </div>
              <div className={`text-2xl font-extrabold tracking-tight ${card.highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                {card.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quota & Registration Progress Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Registration Quota Usage</h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {registrationsCount} / {totalEventsCount} Events Enrolled ({totalEventsCount > 0 ? Math.round((registrationsCount / totalEventsCount) * 100) : 0}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden border border-[var(--border-subtle)]">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${totalEventsCount > 0 ? Math.min(100, Math.round((registrationsCount / totalEventsCount) * 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Institution Banner Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4 shadow-2xs">
        <h2 className="text-base sm:text-lg font-black text-[#132238] dark:text-slate-100 uppercase tracking-tight">
          {college?.name ? (
            college.name
          ) : (
            <span className="inline-block w-64 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          )}
        </h2>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#132238] dark:bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-slate-700/40">
            #{college?.affl_no || college?.affiliation_no || '—'}
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Institution Affiliation Number</span>
        </div>

        <div className="space-y-2 pt-1 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium">{college?.email || 'N/A'}</span>
          </div>
          {college?.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <span className="font-medium">{college.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Contact Staff Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Co-ordinator (Staff) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3.5 shadow-2xs">
          <h3 className="text-xs font-bold text-[#132238] dark:text-slate-100">Co-ordinator (Staff)</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold">{college?.staff_coordinator_name || college?.coordinator_name || 'Usthad Shafi Wafy'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.staff_coordinator_phone || college?.coordinator_phone || '9645845185'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.staff_coordinator_whatsapp || college?.coordinator_phone || '9645845185'}</span>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3.5 shadow-2xs">
          <h3 className="text-xs font-bold text-[#132238] dark:text-slate-100">Manager</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold">{college?.team_manager_name || college?.manager_name || 'Akbar shuhaib'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.team_manager_phone || college?.manager_phone || '9539629410'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.team_manager_whatsapp || college?.manager_phone || '9539629410'}</span>
            </div>
          </div>
        </div>

        {/* Asst. Manager */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3.5 shadow-2xs">
          <h3 className="text-xs font-bold text-[#132238] dark:text-slate-100">Asst. Manager</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold">{college?.asst_team_manager_name || college?.asst_manager_name || 'Muhammed Minhaj'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.asst_team_manager_phone || college?.asst_manager_phone || '7306729618'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-mono">{college?.asst_team_manager_whatsapp || college?.asst_manager_phone || '7306729618'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fest Rulebook Link */}
      <div>
        <a
          href={festSettings.rulebook_url || '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] shadow-2xs transition-colors"
        >
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Fest Manual & Rulebook PDF</span>
        </a>
      </div>
    </div>
  );
}
