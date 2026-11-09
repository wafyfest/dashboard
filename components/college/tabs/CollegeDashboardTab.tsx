'use client';

import React from 'react';
import { College, FestSettings } from '@/lib/types/fest';
import { Zap, User, Mail, MapPin, Phone, MessageSquare, BookOpen, Layers, Sparkles } from 'lucide-react';
import { formatIstDisplay } from '@/lib/utils/istDate';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-primary)] shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
          </span>
          <span className="font-sans font-medium text-[var(--text-secondary)]">
            <strong className="font-heading font-bold text-[var(--text-primary)]">Key Deadlines:</strong> Regular Registration closes{' '}
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold" suppressHydrationWarning>
              {formatIstDisplay(festSettings.reg_deadline)}
            </span>{' '}
            • Late Fine Period ends:{' '}
            <span className="font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-semibold" suppressHydrationWarning>
              {formatIstDisplay(festSettings.fine_deadline)}
            </span>
          </span>
        </div>
        {isFinePeriod && (
          <Badge variant="saffron" size="sm" className="font-mono uppercase tracking-wider shrink-0 font-bold">
            Late Fine Period Active
          </Badge>
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
              className={`rounded-2xl p-4 flex flex-col justify-between h-28 transition-all backdrop-blur-md ${
                card.highlight
                  ? 'bg-[var(--bg-surface)] border border-amber-500/35 [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-heading font-semibold ${card.highlight ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]' : 'text-[var(--text-secondary)]'}`}>
                  {card.label}
                </span>
                {card.highlight ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)]" />
                  </span>
                ) : (
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
              </div>
              <div className={`text-2xl font-black font-mono tracking-tight ${card.highlight ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]' : 'text-[var(--text-primary)]'}`}>
                {card.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quota & Registration Progress Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-5 space-y-3 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--f-saffron)]" />
            <h3 className="text-xs font-heading font-bold text-[var(--text-primary)]">Registration Quota Usage</h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {registrationsCount} / {totalEventsCount} Events Enrolled ({totalEventsCount > 0 ? Math.round((registrationsCount / totalEventsCount) * 100) : 0}%)
          </span>
        </div>
        <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)]">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${totalEventsCount > 0 ? Math.min(100, Math.round((registrationsCount / totalEventsCount) * 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Institution Banner Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-6 space-y-4 shadow-2xs backdrop-blur-md">
        <h2 className="text-base sm:text-lg font-black font-heading text-[var(--text-primary)] uppercase tracking-tight">
          {college?.name ? (
            college.name
          ) : (
            <span className="inline-block w-64 h-5 bg-[var(--bg-subtle)] rounded animate-pulse" />
          )}
        </h2>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--f-saffron)] text-[#090d1a] flex items-center justify-center font-bold font-mono text-sm shadow-xs shrink-0 border border-amber-500/30">
            #{college?.affl_no || college?.affiliation_no || '—'}
          </div>
          <span className="text-xs font-heading font-semibold text-[var(--text-secondary)]">Institution Affiliation Number</span>
        </div>

        <div className="space-y-2 pt-1 text-xs text-[var(--text-secondary)] font-sans">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span className="font-medium text-[var(--text-primary)]">{college?.email || 'N/A'}</span>
          </div>
          {college?.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <span className="font-medium text-[var(--text-primary)]">{college.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Contact Staff Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Co-ordinator (Staff) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-5 space-y-3.5 shadow-2xs backdrop-blur-md">
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)]">Co-ordinator (Staff)</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)] font-sans">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-heading font-semibold text-[var(--text-primary)]">{college?.staff_coordinator_name || college?.coordinator_name || 'Usthad Shafi Wafy'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.staff_coordinator_phone || college?.coordinator_phone || '9645845185'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.staff_coordinator_whatsapp || college?.coordinator_phone || '9645845185'}</span>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-5 space-y-3.5 shadow-2xs backdrop-blur-md">
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)]">Manager</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)] font-sans">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-heading font-semibold text-[var(--text-primary)]">{college?.team_manager_name || college?.manager_name || 'Akbar shuhaib'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.team_manager_phone || college?.manager_phone || '9539629410'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.team_manager_whatsapp || college?.manager_phone || '9539629410'}</span>
            </div>
          </div>
        </div>

        {/* Asst. Manager */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-5 space-y-3.5 shadow-2xs backdrop-blur-md">
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)]">Asst. Manager</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)] font-sans">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-heading font-semibold text-[var(--text-primary)]">{college?.asst_team_manager_name || college?.asst_manager_name || 'Muhammed Minhaj'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.asst_team_manager_phone || college?.asst_manager_phone || '7306729618'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[var(--text-secondary)]">{college?.asst_team_manager_whatsapp || college?.asst_manager_phone || '7306729618'}</span>
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] hover:border-[var(--f-saffron)] text-xs font-heading font-bold text-[var(--text-primary)] shadow-2xs [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-colors"
        >
          <BookOpen className="w-4 h-4 text-[var(--f-saffron)]" />
          <span>Fest Manual & Rulebook PDF</span>
        </a>
      </div>
    </div>
  );
}
