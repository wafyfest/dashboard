'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Item,
  Registration,
  Student,
  SubmissionEntry,
  getEffectiveStageMode,
  getItemParticipantBounds,
  requiresPreFestSubmission
} from '@/lib/types/fest';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { getCanonicalChestNo, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { useFest } from '@/lib/context/FestContext';
import { getDeadlineStatus, formatIstDisplay } from '@/lib/utils/istDate';
import { ChevronDown, Plus, Lock, SquarePen, Trash2, CalendarCheck, AlertTriangle, Search, X, CheckCircle2 } from 'lucide-react';

interface CollegeRegistrationTabProps {
  filteredItems: Item[];
  registrations: Registration[];
  submissions?: SubmissionEntry[];
  students?: Student[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoryOptions: string[];
  currentCollegeId: string;
  currentCollegeAfflNo?: number;
  onOpenRegistrationModal: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  onRefresh?: () => void;
  onOpenParticipantsTab?: () => void;
  allItemsCount: number;
  registrationStatusByItem?: Map<number, RegistrationStatus>;
}

export function CollegeRegistrationTab({
  filteredItems,
  registrations,
  submissions: _submissions = [],
  students = [],
  selectedCategory,
  setSelectedCategory,
  categoryOptions,
  currentCollegeId,
  currentCollegeAfflNo,
  onOpenRegistrationModal,
  onUnregisterRegistration,
  onRefresh: _onRefresh,
  onOpenParticipantsTab: _onOpenParticipantsTab,
  allItemsCount,
  registrationStatusByItem
}: CollegeRegistrationTabProps) {
  const { festSettings, timeTick } = useFest();
  const deadlineInfo = React.useMemo(
    () => getDeadlineStatus(festSettings.reg_deadline),
    [festSettings.reg_deadline, timeTick]
  );
  const deadlineSchedule = deadlineInfo.schedule;

  const [selectedMode, setSelectedMode] = React.useState<'All' | 'onstage' | 'offstage'>('All');
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'enrolled' | 'not_enrolled'>('All');
  const [eventSearch, setEventSearch] = React.useState<string>('');

  const registrationByItemId = React.useMemo(() => {
    const byItem = new Map<number, Registration>();
    for (const reg of registrations) {
      if (reg.item && requiresPreFestSubmission(reg.item)) continue;
      const itmId = Number(reg.item_id);
      if (!isNaN(itmId) && !byItem.has(itmId)) {
        byItem.set(itmId, reg);
      }
    }
    return byItem;
  }, [registrations]);

  const displayedItems = React.useMemo(() => {
    // Strictly exclude Screening and Submission pre-fest events from the normal registration tab
    let list = filteredItems.filter(item => !requiresPreFestSubmission(item));

    if (selectedMode !== 'All') {
      list = list.filter(item => {
        const m = getEffectiveStageMode(item);
        if (selectedMode === 'onstage') return m === 'onstage';
        if (selectedMode === 'offstage') return m === 'offstage';
        return true;
      });
    }

    if (statusFilter !== 'All') {
      list = list.filter(item => {
        const hasReg = registrationByItemId.has(Number(item.item_id || item.id));
        return statusFilter === 'enrolled' ? hasReg : !hasReg;
      });
    }

    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase().trim();
      list = list.filter(item => {
        const name = (item.name_eng || item.name || '').toLowerCase();
        const malName = (item.name_mal || '').toLowerCase();
        const code = (item.item_code || item.code || '').toLowerCase();
        return name.includes(q) || malName.includes(q) || code.includes(q);
      });
    }

    return list;
  }, [filteredItems, selectedMode, statusFilter, eventSearch, registrationByItemId]);

  const enrolledCount = registrationByItemId.size;
  const totalCount = allItemsCount || displayedItems.length;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((enrolledCount / totalCount) * 100)) : 0;

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
              </span>
              <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
                Event Registration
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
              Enroll student participants in Single and Group events according to phase quotas
            </CardDescription>
          </div>

          {/* Enrolled Badge & Progress */}
          <div className="flex items-center gap-3 bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-2xl px-3.5 py-2 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-heading font-semibold">
                Progress
              </div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                <span className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">{enrolledCount}</span> / {totalCount} Events
              </div>
            </div>
            <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
              <span className="font-mono text-xs font-extrabold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Event Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search event name or code..."
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-sans font-medium"
            />
            {eventSearch && (
              <button
                type="button"
                onClick={() => setEventSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Status (Enrolled & Pending)</option>
              <option value="enrolled">Enrolled Only</option>
              <option value="not_enrolled">Pending Enrolment</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Stage Mode Filter */}
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Stage Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All Categories">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Registration Deadline Alert Banner */}
        {deadlineInfo.status === 'fine' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Fine Period Active (₹500):</strong> The normal deadline has passed. New registrations incur a <strong>₹500 fine</strong> until{' '}
              <strong className="font-mono">{deadlineSchedule ? formatIstDisplay(deadlineSchedule.fineEndIso) : '—'}</strong>. After that, a <strong>₹1,000 Super Fine</strong> applies for 1 hour.
            </div>
          </div>
        )}

        {deadlineInfo.status === 'super_fine' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Super Fine Period Active (₹1,000):</strong> The 1-hour ₹500 fine window has ended. Registrations now incur a <strong>₹1,000 Super Fine</strong> until{' '}
              <strong className="font-mono">{deadlineSchedule ? formatIstDisplay(deadlineSchedule.superFineEndIso) : '—'}</strong>, after which registration will be <strong>completely locked for all colleges</strong>!
            </div>
          </div>
        )}

        {deadlineInfo.status === 'closed' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200">
            <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Registrations Locked:</strong> The deadline and 2-hour Super Fine grace window have ended. Registration is completely closed for all colleges.
            </div>
          </div>
        )}

        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-x-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-[34%]">Event Name</TableHead>
              <TableHead className="whitespace-nowrap">Category</TableHead>
              <TableHead className="text-center whitespace-nowrap">Type / Mode</TableHead>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="text-center whitespace-nowrap">Registered</TableHead>
              <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.map((item, index) => {
              const itmId = Number(item.item_id || item.id);
              const reg = registrationByItemId.get(itmId);
              const lockCheck = registrationStatusByItem?.get(itmId)
                || festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, itmId);
              const isLocked = !lockCheck.canRegister;
              const itemCategory = item.phase || item.category;
              const itemType = item.point_type
                ? (item.point_type.toLowerCase() === 'group' ? 'Group' : 'Individual')
                : (item.item_type === 'Group' ? 'Group' : 'Individual');
              const { min: minCount, max: maxCount, isOpen: isOpenParticipants } = getItemParticipantBounds(item);
              const fallbackStudent = (students.length > 0 && reg?.chest_no)
                ? findStudentByIdentifier(students, reg.chest_no, currentCollegeAfflNo)
                : undefined;
              const rosterParticipants = reg
                ? ((reg.participants && reg.participants.length > 0)
                  ? reg.participants
                  : (reg.student ? [reg.student] : (fallbackStudent ? [fallbackStudent] : [])))
                : [];
              const registeredCount = reg ? (rosterParticipants.length || 1) : 0;
              const isRegistered = !!reg;

              return (
                <TableRow key={item.id} className={isRegistered ? 'bg-amber-500/[0.02]' : undefined}>
                  <TableCell className="text-center font-mono font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                      {item.name_eng || item.name}
                    </div>
                    {item.name_mal && (
                      <div className="text-[11px] text-[var(--text-muted)] font-sans">
                        {item.name_mal}
                      </div>
                    )}
                    {isRegistered && (
                      <div className="text-[11px] font-sans text-[var(--text-muted)] mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Roster:
                        </span>
                        {rosterParticipants.length > 0 ? (
                          rosterParticipants.map((p, pIdx) => {
                            const chest = getCanonicalChestNo(p);
                            const idLabel = chest !== '—' ? `#${chest}` : `CIC: ${p.admission_no || p.cic_no || p.cic_number || 'N/A'}`;
                            return (
                              <span
                                key={p.id || pIdx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10.5px] font-medium text-[var(--text-secondary)] font-sans"
                              >
                                {p.full_name || p.name} <span className="ml-1 text-[var(--text-muted)] font-mono text-[9.5px]">({idLabel})</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[var(--text-secondary)] font-mono text-[10.5px]">
                            {reg.chest_no ? `Chest #${reg.chest_no}` : 'Enrolled'}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={itemCategory} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ItemTypeBadge
                      type={itemType}
                      mode={item.mode}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {registeredCount}/{isOpenParticipants ? 'Open' : maxCount}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`font-mono font-bold text-xs ${isLocked ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}
                        title={isLocked ? lockCheck.reason || 'Registration Locked' : undefined}
                      >
                        0/{isOpenParticipants ? 'Open' : maxCount}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isRegistered ? (
                        <>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg text-xs font-heading font-semibold hover:border-[var(--f-saffron)] hover:text-[var(--f-saffron-text)]"
                            title={isLocked ? 'Registration Closed (Locked)' : 'Edit Participant Roster'}
                            disabled={isLocked}
                            onClick={() => !isLocked && onOpenRegistrationModal(item)}
                          >
                            {isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            ) : (
                              <>
                                <SquarePen className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </>
                            )}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 shrink-0"
                            title={isLocked ? 'Registration Closed (Locked)' : 'Remove / Unregister Event'}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) return;
                              onUnregisterRegistration?.(item);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant={isLocked ? 'secondary' : 'saffron'}
                          disabled={isLocked}
                          className="h-8 px-2.5 rounded-lg text-xs font-heading font-bold transition-all"
                          title={!isLocked ? (lockCheck.reason || 'Register Entry') : lockCheck.reason || 'Registration Locked'}
                          onClick={() => !isLocked && onOpenRegistrationModal(item)}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1" />
                              Locked
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Register
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {!isLocked && (lockCheck.isSuperFinePeriod || lockCheck.isFinePeriod) && (
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold font-mono border ${lockCheck.isSuperFinePeriod
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                            }`}
                        >
                          {lockCheck.isSuperFinePeriod ? 'Super Fine ₹1,000' : 'Fine ₹500'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {displayedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-xs">
                  <div className="max-w-md mx-auto space-y-2">
                    <CalendarCheck className="w-8 h-8 mx-auto opacity-40 text-[var(--text-muted)]" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      No events found matching your search or filters.
                    </p>
                    {(eventSearch || statusFilter !== 'All' || selectedMode !== 'All' || selectedCategory !== 'All Categories') && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="mt-2 text-xs font-heading"
                        onClick={() => {
                          setEventSearch('');
                          setStatusFilter('All');
                          setSelectedMode('All');
                          setSelectedCategory('All Categories');
                        }}
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
