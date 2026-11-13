'use client';

import React, { useMemo } from 'react';
import {
  Appeal,
  College,
  FestSettings,
  Item,
  Registration,
  Replacement,
  Schedule,
  Student,
  SubmissionEntry,
  getEffectiveStageMode,
  normalizeCategoryKey,
  requiresPreFestSubmission,
} from '@/lib/types/fest';
import {
  Mail,
  MapPin,
  Phone,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  LockOpen,
  Link2,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { formatIstDisplay, getDeadlineStatus } from '@/lib/utils/istDate';
import { useFest } from '@/lib/context/FestContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, StageStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CollegeDashboardTabProps {
  college?: College;
  festSettings: FestSettings;
  categoryCards: { label: string; count: number; highlight?: boolean }[];
  registrationsCount: number;
  totalEventsCount: number;
  allEventsCount?: number;
  totalEntriesCount?: number;
  pendingSubmissionsCount?: number;
  students?: Student[];
  registrations?: Registration[];
  eligibleItems?: Item[];
  submissions?: SubmissionEntry[];
  schedules?: Schedule[];
  appeals?: Appeal[];
  replacements?: Replacement[];
  onNavigateTab?: (tabId: string) => void;
}

interface StaffContactCardProps {
  roleTitle: string;
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isLoading: boolean;
}

function StaffContactCard({
  roleTitle,
  name,
  phone,
  whatsapp,
  isLoading,
}: StaffContactCardProps) {
  const cleanPhone = phone?.trim() || '';
  const cleanWhatsapp = whatsapp?.trim() || cleanPhone;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="text-xs font-medium text-[var(--text-muted)]">{roleTitle}</div>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-36 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            <div className="font-heading font-semibold text-sm text-[var(--text-primary)] truncate">
              {name?.trim() || 'Not assigned'}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              {cleanPhone ? (
                <a
                  href={`tel:${cleanPhone.replace(/\s+/g, '')}`}
                  className="font-mono tabular-nums text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] transition-colors"
                >
                  {cleanPhone}
                </a>
              ) : (
                <span className="font-mono text-[var(--text-muted)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {cleanWhatsapp || '—'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressMeterRowProps {
  label: string;
  enrolled: number;
  total: number;
}

function ProgressMeterRow({ label, enrolled, total }: ProgressMeterRowProps) {
  const pct = total > 0 ? Math.min(100, Math.round((enrolled / total) * 100)) : 0;
  const isCompleted = total > 0 && enrolled >= total;
  const barColor = isCompleted ? 'bg-emerald-500' : 'bg-[var(--f-saffron)]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--text-primary)] truncate">{label}</span>
        <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
          <span
            className={`text-[10px] font-sans font-semibold ${isCompleted
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[var(--text-muted)]'
              }`}
          >
            {total === 0 ? 'No events' : isCompleted ? 'Completed' : `${total - enrolled} pending`}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {enrolled}
            <span className="text-[var(--text-muted)] font-normal">/{total}</span>
          </span>
          <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const PHASE_ORDER = [
  'FOUNDATION',
  'THAMHEEDIYYA',
  'ALIYA',
  'PG',
  'GENERAL',
  'SPECIAL_FOUNDATION',
  'SPECIAL',
];

const PHASE_DISPLAY_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  THAMHEEDIYYA: 'Thamheediyya',
  ALIYA: 'Aliya',
  PG: 'PG',
  GENERAL: 'General',
  SPECIAL_FOUNDATION: 'Special Foundation',
  SPECIAL: 'Special',
};

const ROSTER_COLS_BY_COUNT: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function CollegeDashboardTab({
  college,
  festSettings,
  categoryCards,
  registrationsCount,
  totalEventsCount,
  allEventsCount,
  totalEntriesCount,
  pendingSubmissionsCount = 0,
  students = [],
  registrations = [],
  eligibleItems = [],
  submissions = [],
  schedules = [],
  appeals = [],
  replacements = [],
  onNavigateTab,
}: CollegeDashboardTabProps) {
  const { timeTick } = useFest();
  const deadlineInfo = useMemo(
    () => getDeadlineStatus(festSettings.reg_deadline),
    [festSettings.reg_deadline, timeTick]
  );
  const deadlineSchedule = deadlineInfo.schedule;
  const enrolledPct = totalEventsCount > 0
    ? Math.min(100, Math.round((registrationsCount / totalEventsCount) * 100))
    : 0;
  const remainingEvents = Math.max(0, totalEventsCount - registrationsCount);
  const afflNumber = college?.affl_no || college?.affiliation_no;
  const hasRulebook = Boolean(
    festSettings.rulebook_url &&
    festSettings.rulebook_url.trim() !== '' &&
    festSettings.rulebook_url !== '#'
  );
  const rosterGridCols =
    ROSTER_COLS_BY_COUNT[categoryCards.length] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  const progressDetails = useMemo(() => {
    const registeredItemIds = new Set<number>(registrations.map(r => Number(r.item_id)));

    const participatingStudentKeys = new Set<string>();
    for (const reg of registrations) {
      if (reg.participants && reg.participants.length > 0) {
        for (const p of reg.participants) {
          participatingStudentKeys.add(p.id || String(p.cic_no || p.chest_no || ''));
        }
      } else if (reg.student?.id) {
        participatingStudentKeys.add(reg.student.id);
      } else if (reg.chest_no) {
        participatingStudentKeys.add(String(reg.chest_no).trim().toUpperCase());
      }
    }
    participatingStudentKeys.delete('');

    const totalRosterStudents =
      students.length > 0
        ? students.length
        : (categoryCards.find(c => c.highlight)?.count ?? 0);
    const activeStudentsCount = participatingStudentKeys.size;
    const activeStudentsPct =
      totalRosterStudents > 0
        ? Math.min(100, Math.round((activeStudentsCount / totalRosterStudents) * 100))
        : 0;

    let onstageTotal = 0;
    let onstageEnrolled = 0;
    let offstageTotal = 0;
    let offstageEnrolled = 0;
    let singleTotal = 0;
    let singleEnrolled = 0;
    let groupTotal = 0;
    let groupEnrolled = 0;

    const phaseBuckets = new Map<string, { label: string; total: number; enrolled: number }>();

    for (const item of eligibleItems) {
      const itemId = Number(item.item_id || item.id);
      const isEnrolled = registeredItemIds.has(itemId);

      if (getEffectiveStageMode(item) === 'onstage') {
        onstageTotal++;
        if (isEnrolled) onstageEnrolled++;
      } else {
        offstageTotal++;
        if (isEnrolled) offstageEnrolled++;
      }

      const isGroup = item.point_type === 'group' || item.item_type === 'Group';
      if (isGroup) {
        groupTotal++;
        if (isEnrolled) groupEnrolled++;
      } else {
        singleTotal++;
        if (isEnrolled) singleEnrolled++;
      }

      const rawPhase = item.phase || item.category || 'General';
      const phaseKey = normalizeCategoryKey(rawPhase);
      const formattedLabel = PHASE_DISPLAY_LABELS[phaseKey] || rawPhase;
      const bucket = phaseBuckets.get(phaseKey) || { label: formattedLabel, total: 0, enrolled: 0 };
      bucket.total++;
      if (isEnrolled) bucket.enrolled++;
      phaseBuckets.set(phaseKey, bucket);
    }

    const phaseRows = Array.from(phaseBuckets.entries())
      .sort(([keyA], [keyB]) => {
        const idxA = PHASE_ORDER.indexOf(keyA);
        const idxB = PHASE_ORDER.indexOf(keyB);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      })
      .map(([key, data]) => ({ key, ...data }));

    const submittedItemIds = new Set(
      submissions.filter(s => Boolean(s.file_url)).map(s => Number(s.item_id))
    );
    let preFestRegistered = 0;
    let preFestSubmitted = 0;
    const seenPreFest = new Set<number>();
    for (const reg of registrations) {
      const id = Number(reg.item_id);
      if (seenPreFest.has(id)) continue;
      seenPreFest.add(id);
      if (requiresPreFestSubmission(reg.item)) {
        preFestRegistered++;
        if (submittedItemIds.has(id)) preFestSubmitted++;
      }
    }

    const enrolledSchedules = schedules
      .filter(s => registeredItemIds.has(Number(s.item_id)))
      .sort((a, b) => {
        const ta = new Date(a.scheduled_start || a.starting || 0).getTime();
        const tb = new Date(b.scheduled_start || b.starting || 0).getTime();
        return ta - tb;
      });

    const eventGroups = new Map<
      number,
      {
        itemId: number;
        code: string;
        name: string;
        isGroup: boolean;
        participantCount: number;
        needsSubmission: boolean;
        hasSubmission: boolean;
      }
    >();

    for (const reg of registrations) {
      const id = Number(reg.item_id);
      const count = reg.participants && reg.participants.length > 0 ? reg.participants.length : 1;
      const existing = eventGroups.get(id);
      if (existing) {
        existing.participantCount += count;
      } else {
        eventGroups.set(id, {
          itemId: id,
          code: reg.item?.code || reg.item?.item_code || `#${id}`,
          name: reg.item?.name || reg.item?.name_eng || `Event #${id}`,
          isGroup: reg.item?.point_type === 'group' || reg.item?.item_type === 'Group',
          participantCount: count,
          needsSubmission: requiresPreFestSubmission(reg.item),
          hasSubmission: submittedItemIds.has(id),
        });
      }
    }

    const enrolledEvents = Array.from(eventGroups.values()).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
    );

    const scheduledCount = enrolledSchedules.length;
    const pendingAppeals = appeals.filter(a => a.status === 'Pending').length;
    const pendingReplacements = replacements.filter(r => r.status === 'Pending').length;

    return {
      activeStudentsCount,
      totalRosterStudents,
      activeStudentsPct,
      onstageTotal,
      onstageEnrolled,
      offstageTotal,
      offstageEnrolled,
      singleTotal,
      singleEnrolled,
      groupTotal,
      groupEnrolled,
      phaseRows,
      preFestRegistered,
      preFestSubmitted,
      enrolledSchedules,
      enrolledEvents,
      scheduledCount,
      pendingAppeals,
      pendingReplacements,
    };
  }, [eligibleItems, registrations, students, categoryCards, submissions, schedules, appeals, replacements]);

  const deadlineStatusText =
    deadlineInfo.status === 'closed'
      ? 'Locked'
      : deadlineInfo.status === 'super_fine'
        ? 'Super Fine ₹1,000'
        : deadlineInfo.status === 'fine'
          ? 'Fine ₹500'
          : 'Open';

  return (
    <div className="space-y-5">
      {/* 1. KEY DEADLINES TOP BANNER */}
      <Card className="rounded-2xl sm:rounded-full">
        <CardContent className="px-4 py-3 sm:px-6 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ring-4 ${deadlineInfo.status === 'closed'
                      ? 'bg-rose-500 ring-rose-500/20'
                      : deadlineInfo.status === 'super_fine'
                        ? 'bg-orange-500 ring-orange-500/20'
                        : deadlineInfo.status === 'fine'
                          ? 'bg-[var(--f-saffron)] ring-amber-500/20'
                          : 'bg-emerald-500 ring-emerald-500/20'
                    }`}
                />
                <strong className="font-heading font-bold text-[var(--text-primary)] whitespace-nowrap">
                  Key Deadlines:
                </strong>
              </div>
              <Badge
                variant={
                  deadlineInfo.status === 'closed'
                    ? 'rose'
                    : deadlineInfo.status === 'fine' || deadlineInfo.status === 'super_fine'
                      ? 'saffron'
                      : 'emerald'
                }
                size="sm"
                className="sm:hidden font-mono uppercase tracking-wider font-semibold shrink-0"
                suppressHydrationWarning
              >
                {deadlineStatusText}
              </Badge>
            </div>

            <div className="sm:hidden space-y-1 text-[11px] font-sans text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-2">
                <span>Normal</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {formatIstDisplay(festSettings.reg_deadline)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Fine (₹500, +1h)</span>
                <span className="font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {deadlineSchedule ? formatIstDisplay(deadlineSchedule.fineEndIso) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Super Fine (₹1,000, +2h Lock)</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {deadlineSchedule ? formatIstDisplay(deadlineSchedule.superFineEndIso) : '—'}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-x-1.5 font-sans text-[var(--text-secondary)] leading-relaxed">
              <span>
                Normal:{' '}
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {formatIstDisplay(festSettings.reg_deadline)}
                </span>
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span>
                ₹500 Fine (+1h):{' '}
                <span className="font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {deadlineSchedule ? formatIstDisplay(deadlineSchedule.fineEndIso) : '—'}
                </span>
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span>
                ₹1,000 Super Fine (+2h Lock):{' '}
                <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap" suppressHydrationWarning>
                  {deadlineSchedule ? formatIstDisplay(deadlineSchedule.superFineEndIso) : '—'}
                </span>
              </span>
            </div>
          </div>

          <Badge
            variant={
              deadlineInfo.status === 'closed'
                ? 'rose'
                : deadlineInfo.status === 'fine' || deadlineInfo.status === 'super_fine'
                  ? 'saffron'
                  : 'emerald'
            }
            size="sm"
            className="hidden sm:inline-flex font-mono uppercase tracking-wider font-semibold shrink-0"
            suppressHydrationWarning
          >
            {deadlineStatusText}
          </Badge>
        </CardContent>
      </Card>

      {/* 2. INSTITUTION DETAILS */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--f-saffron)] text-[#090d1a] flex items-center justify-center font-bold font-mono text-sm sm:text-base tabular-nums shrink-0">
                  #{afflNumber || '—'}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline gap-x-2.5 gap-y-1 flex-wrap">
                    <h1 className="text-base sm:text-xl font-bold font-heading text-[var(--text-primary)] tracking-tight leading-snug break-words">
                      {college?.name ? (
                        college.name
                      ) : (
                        <span className="inline-block w-48 sm:w-64 h-6 bg-[var(--bg-subtle)] rounded animate-pulse align-middle" />
                      )}
                    </h1>
                    {(college?.short_name || college?.type) && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {[college?.short_name, college?.type].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>

                  {/* Desktop inline metadata (aligns under title) */}
                  <div className="hidden sm:flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--text-secondary)] pt-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      {college?.email ? (
                        <a
                          href={`mailto:${college.email}`}
                          className="text-[var(--text-primary)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] break-all transition-colors"
                        >
                          {college.email}
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">No email</span>
                      )}
                    </div>
                    {college?.union_name && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span>{college.union_name}</span>
                      </div>
                    )}
                    {college?.address && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span>{college.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile full-width metadata (prevents squeezing beside #badge) */}
              <div className="flex sm:hidden flex-col gap-1.5 text-xs text-[var(--text-secondary)] pt-2.5 border-t border-[var(--border-subtle)]">
                <div className="flex items-start gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  {college?.email ? (
                    <a
                      href={`mailto:${college.email}`}
                      className="text-[var(--text-primary)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] break-all transition-colors"
                    >
                      {college.email}
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)]">No email</span>
                  )}
                </div>
                {college?.union_name && (
                  <div className="flex items-start gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <span className="break-words">{college.union_name}</span>
                  </div>
                )}
                {college?.address && (
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <span className="break-words">{college.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {hasRulebook ? (
                <a
                  href={festSettings.rulebook_url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-heading font-semibold text-[var(--text-primary)] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                  <span>Fest Manual</span>
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-heading font-medium text-[var(--text-muted)] cursor-not-allowed"
                >
                  <BookOpen className="w-3.5 h-3.5 opacity-60" />
                  <span>Fest Manual Unavailable</span>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. ACTIONABLE STATUS NOTICES */}
      {(college?.fine_status || college?.manual_lock_override || pendingSubmissionsCount > 0) && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {college?.fine_status && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex-1 sm:min-w-[240px]">
              <AlertTriangle className="w-4 h-4 text-[var(--f-saffron)] shrink-0" />
              <span>Late fine applies to registrations recorded in the late window.</span>
            </div>
          )}
          {college?.manual_lock_override && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200 flex-1 sm:min-w-[240px]">
              <LockOpen className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Admin registration lock override is enabled.</span>
            </div>
          )}
          {pendingSubmissionsCount > 0 && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-indigo-500/35 bg-indigo-500/10 text-xs text-indigo-900 dark:text-indigo-200 flex-1 sm:min-w-[280px]">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  <strong className="font-semibold tabular-nums">{pendingSubmissionsCount}</strong>{' '}
                  {pendingSubmissionsCount === 1 ? 'pre-fest event needs a link.' : 'pre-fest events need links.'}
                </span>
              </div>
              {onNavigateTab && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onNavigateTab('registration')}
                  className="border-indigo-500/40 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/15 shrink-0 font-heading font-semibold"
                >
                  Submit
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. STUDENT ROSTER COUNTS */}
      {categoryCards.length > 0 && (
        <div className={`grid gap-3 lg:gap-4 ${rosterGridCols}`}>
          {categoryCards.map(card => (
            <Card
              key={card.label}
              variant={card.highlight ? 'saffron' : 'default'}
            >
              <CardContent className="p-4 sm:p-4 flex flex-col justify-between gap-1.5">
                <span
                  className={`text-xs font-medium truncate ${card.highlight
                      ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]'
                      : 'text-[var(--text-muted)]'
                    }`}
                >
                  {card.label}
                </span>
                <span
                  className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${card.highlight
                      ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]'
                      : 'text-[var(--text-primary)]'
                    }`}
                >
                  {card.count}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 4. REGISTRATION PROGRESS */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>Registration Progress</CardTitle>
            <Badge
              variant={totalEventsCount > 0 && remainingEvents === 0 ? 'success' : 'saffron'}
              size="sm"
            >
              {totalEventsCount > 0 && remainingEvents === 0
                ? 'Completed'
                : registrationsCount === 0
                  ? 'Not Started'
                  : 'In Progress'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
              {registrationsCount} / {totalEventsCount} eligible events ({enrolledPct}%)
            </span>
            {typeof allEventsCount === 'number' && allEventsCount !== totalEventsCount && (
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                · {allEventsCount} in catalog
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Overall Enrollment Bar */}
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2 overflow-hidden">
            <div
              className={`${enrolledPct === 100 && totalEventsCount > 0 ? 'bg-emerald-500' : 'bg-[var(--f-saffron)]'} h-full rounded-full transition-all duration-300`}
              style={{ width: `${enrolledPct}%` }}
            />
          </div>

          {/* Flat Key Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-3 border-y border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Eligible Events</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                {totalEventsCount}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {registrationsCount} completed · {remainingEvents} not completed
              </div>
            </div>

            <div>
              <div className="text-xs text-[var(--text-muted)]">Active Participants</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                {progressDetails.activeStudentsCount}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {' '}/ {progressDetails.totalRosterStudents}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                {progressDetails.activeStudentsPct}% of roster competing
              </div>
            </div>

            <div>
              <div className="text-xs text-[var(--text-muted)]">Total Entries</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                {totalEntriesCount ?? registrations.length}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">Single &amp; group slots</div>
            </div>

            <div>
              <div className="text-xs text-[var(--text-muted)]">Pre-Fest Links</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                {progressDetails.preFestSubmitted}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {' '}/ {progressDetails.preFestRegistered}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {progressDetails.preFestRegistered === 0
                  ? 'None enrolled'
                  : progressDetails.preFestSubmitted >= progressDetails.preFestRegistered
                    ? 'All uploaded'
                    : `${progressDetails.preFestRegistered - progressDetails.preFestSubmitted} pending`}
              </div>
            </div>
          </div>

          {/* 2-Column Progress Breakdowns */}
          {eligibleItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-[var(--text-muted)]">
                  By Stage Mode
                </h4>
                <div className="space-y-3">
                  <ProgressMeterRow
                    label="On Stage"
                    enrolled={progressDetails.onstageEnrolled}
                    total={progressDetails.onstageTotal}
                  />
                  <ProgressMeterRow
                    label="Off Stage"
                    enrolled={progressDetails.offstageEnrolled}
                    total={progressDetails.offstageTotal}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-medium text-[var(--text-muted)]">
                  By Category
                </h4>
                <div className="space-y-3">
                  {progressDetails.phaseRows.map(row => (
                    <ProgressMeterRow
                      key={row.key}
                      label={row.label}
                      enrolled={row.enrolled}
                      total={row.total}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Operational Counters */}
          <div className="pt-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span>Scheduled</span>
              <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                {progressDetails.scheduledCount}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Appeals</span>
              <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                {appeals.length}
              </strong>
              {progressDetails.pendingAppeals > 0 && (
                <span className="font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  ({progressDetails.pendingAppeals} pending)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span>Replacements</span>
              <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                {replacements.length}
              </strong>
              {progressDetails.pendingReplacements > 0 && (
                <span className="font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  ({progressDetails.pendingReplacements} pending)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. TEAM CONTACTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <StaffContactCard
          roleTitle="Staff Coordinator"
          name={college?.staff_coordinator_name || college?.coordinator_name}
          phone={college?.staff_coordinator_phone || college?.coordinator_phone}
          whatsapp={college?.staff_coordinator_whatsapp}
          isLoading={!college}
        />
        <StaffContactCard
          roleTitle="Team Manager"
          name={college?.team_manager_name || college?.manager_name}
          phone={college?.team_manager_phone || college?.manager_phone}
          whatsapp={college?.team_manager_whatsapp}
          isLoading={!college}
        />
        <StaffContactCard
          roleTitle="Asst. Manager"
          name={college?.asst_team_manager_name || college?.asst_manager_name}
          phone={college?.asst_team_manager_phone || college?.asst_manager_phone}
          whatsapp={college?.asst_team_manager_whatsapp}
          isLoading={!college}
        />
      </div>

      {/* 6. STAGE SCHEDULE & ENROLLED EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Stage Schedule</CardTitle>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] transition-colors"
              >
                View schedule
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {progressDetails.enrolledSchedules.length === 0 ? (
              <div className="px-5 py-8 text-xs text-[var(--text-muted)] text-center">
                No stage schedules published for your enrolled events yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {progressDetails.enrolledSchedules.slice(0, 5).map(sch => (
                  <div
                    key={sch.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-[var(--text-primary)] truncate">
                        {sch.item?.name || sch.item?.name_eng || `Event #${sch.item_id}`}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        <span className="font-mono text-[var(--text-secondary)]">
                          {sch.item?.code || sch.item?.item_code}
                        </span>
                        {sch.stage?.name ? ` · ${sch.stage.name}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StageStatusBadge status={sch.status} />
                      <span
                        className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]"
                        suppressHydrationWarning
                      >
                        {(sch.scheduled_start || sch.starting)
                          ? formatIstDisplay(sch.scheduled_start || sch.starting)
                          : 'TBD'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrolled Events</CardTitle>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('registration')}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] transition-colors"
              >
                View all
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {progressDetails.enrolledEvents.length === 0 ? (
              <div className="px-5 py-8 text-xs text-[var(--text-muted)] text-center">
                No events enrolled for this institution yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {progressDetails.enrolledEvents.slice(0, 5).map(ev => (
                  <div
                    key={ev.itemId}
                    className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-[var(--text-primary)] truncate">
                        {ev.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        <span className="font-mono text-[var(--text-secondary)]">{ev.code}</span>
                        {' · '}
                        <span className="tabular-nums">
                          {ev.participantCount} {ev.participantCount === 1 ? 'participant' : 'participants'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {ev.needsSubmission ? (
                        <span
                          className={`text-[11px] font-medium ${ev.hasSubmission
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]'
                            }`}
                        >
                          {ev.hasSubmission ? 'Link added' : 'Link needed'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {ev.isGroup ? 'Group' : 'Individual'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {progressDetails.enrolledEvents.length > 5 && (
                  <div className="px-5 py-2.5 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                    + {progressDetails.enrolledEvents.length - 5} more events enrolled
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
