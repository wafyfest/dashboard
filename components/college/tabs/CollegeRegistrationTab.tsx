'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Item,
  Registration,
  Student,
  SubmissionEntry,
  getEffectiveStageMode,
  getItemParticipantBounds,
  isSpecialGroupEvent,
  requiresPreFestSubmission,
  isSubmissionEvent,
  isScreeningEvent
} from '@/lib/types/fest';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { getCanonicalChestNo, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { useFest } from '@/lib/context/FestContext';
import { evaluateEventDeadlineSetting, formatIstDisplay } from '@/lib/utils/istDate';
import { ChevronDown, Plus, Lock, Unlock, Clock, SquarePen, Trash2, CalendarCheck, AlertTriangle, Search, X, CheckCircle2, Link2 } from 'lucide-react';
import { SubmissionLinkModal, SubmissionLinkTarget } from '@/components/college/SubmissionLinkModal';

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
  const { timeTick } = useFest();
  const [selectedMode, setSelectedMode] = React.useState<'All' | 'onstage' | 'offstage' | 'screening' | 'submission'>('All');
  const [selectedType, setSelectedType] = React.useState<'All' | 'individual' | 'group'>('All');
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'enrolled' | 'not_enrolled' | 'link_submitted' | 'link_pending'>('All');
  const [eventSearch, setEventSearch] = React.useState<string>('');
  const [selectedSubmissionTarget, setSelectedSubmissionTarget] = React.useState<SubmissionLinkTarget | null>(null);

  const onstageSetting = festService.getEventDeadlineSetting('onstage');
  const offstageSetting = festService.getEventDeadlineSetting('offstage');
  const generalSetting = festService.getEventDeadlineSetting('general');

  const activeDeadlineSetting = React.useMemo(() => {
    if (selectedMode === 'onstage') return onstageSetting;
    if (selectedMode === 'offstage') return offstageSetting;
    return generalSetting;
  }, [selectedMode, onstageSetting, offstageSetting, generalSetting]);

  const activeDeadlineEval = React.useMemo(
    () => evaluateEventDeadlineSetting(activeDeadlineSetting, new Date()),
    [activeDeadlineSetting, timeTick]
  );

  const registrationByItemId = React.useMemo(() => {
    const byItem = new Map<number, Registration>();
    for (const reg of registrations) {
      const itmId = Number(reg.item_id);
      if (!isNaN(itmId) && !byItem.has(itmId)) {
        byItem.set(itmId, reg);
      }
    }
    return byItem;
  }, [registrations]);

  // Compute total counts for each mode badge/pill
  const modeCounts = React.useMemo(() => {
    let all = filteredItems.length;
    let onstage = 0;
    let offstage = 0;
    let screening = 0;
    let submission = 0;

    for (const item of filteredItems) {
      const m = getEffectiveStageMode(item);
      if (m === 'onstage') onstage++;
      if (m === 'offstage') offstage++;
      if (isScreeningEvent(item)) screening++;
      if (isSubmissionEvent(item)) submission++;
    }
    return { all, onstage, offstage, screening, submission };
  }, [filteredItems]);

  const displayedItems = React.useMemo(() => {
    // List all types of events (Onstage, Offstage, Screening, Submission)
    let list = [...filteredItems];

    if (selectedMode !== 'All') {
      list = list.filter(item => {
        const m = getEffectiveStageMode(item);
        if (selectedMode === 'screening') return isScreeningEvent(item);
        if (selectedMode === 'submission') return isSubmissionEvent(item);
        if (selectedMode === 'onstage') return m === 'onstage';
        if (selectedMode === 'offstage') return m === 'offstage';
        return true;
      });
    }

    if (selectedType !== 'All') {
      list = list.filter(item => {
        const itemType = (item.point_type || (item as any).type || 'individual').toLowerCase();
        const isGroup = itemType === 'group' || Boolean((item as any).is_group);
        return selectedType === 'group' ? isGroup : !isGroup;
      });
    }

    if (statusFilter !== 'All') {
      list = list.filter(item => {
        const itmId = Number(item.item_id || item.id);
        const hasReg = registrationByItemId.has(itmId);
        const sub = _submissions.find(s => Number(s.item_id) === itmId);
        const hasSub = Boolean(sub?.file_url);
        if (statusFilter === 'enrolled') return hasReg;
        if (statusFilter === 'not_enrolled') return !hasReg;
        if (statusFilter === 'link_submitted') return hasReg && hasSub;
        if (statusFilter === 'link_pending') return hasReg && requiresPreFestSubmission(item) && !hasSub;
        return true;
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
  }, [filteredItems, selectedMode, selectedType, statusFilter, eventSearch, registrationByItemId, _submissions]);

  const enrolledCount = registrationByItemId.size;
  const totalCount = allItemsCount || displayedItems.length;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((enrolledCount / totalCount) * 100)) : 0;

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Event Registration
            </CardTitle>
            <Badge variant="saffron" className="font-mono font-bold">
              {enrolledCount} / {totalCount} Enrolled ({progressPercent}%)
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Enroll student participants in Single and Group events according to phase quotas
          </CardDescription>
        </div>

        {/* Right side: Real-time Deadline Status Badge */}
        {activeDeadlineSetting.is_active !== false && (
          <div className="flex items-center gap-2.5 shrink-0">
            {activeDeadlineEval.tier === 'open' ? (
              <Badge variant="success" size="md" className="font-mono font-bold">
                Registration Open
              </Badge>
            ) : activeDeadlineEval.tier === 'fine' ? (
              <Badge variant="warning" size="md" className="font-mono font-bold">
                Late Fine Active (₹{activeDeadlineEval.fineAmount})
              </Badge>
            ) : activeDeadlineEval.tier === 'super_fine' ? (
              <Badge variant="destructive" size="md" className="font-mono font-bold">
                Super Fine Active (₹{activeDeadlineEval.fineAmount})
              </Badge>
            ) : (
              <Badge variant="secondary" size="md" className="font-mono font-bold">
                Registration Closed
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Mode Filter Pills with live event counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'All', label: 'All Modes', count: modeCounts.all },
            { id: 'onstage', label: 'On Stage', count: modeCounts.onstage },
            { id: 'offstage', label: 'Off Stage', count: modeCounts.offstage },
            { id: 'screening', label: 'Screening Round', count: modeCounts.screening },
            { id: 'submission', label: 'Digital Submission', count: modeCounts.submission },
          ].map(pill => {
            const isActive = selectedMode === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedMode(pill.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-black/15 text-[#090d1a]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Full-width Filters Toolbar matching all other tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="py-1.5 font-semibold"
            >
              <option value="All">All Status (Enrolled & Pending)</option>
              <option value="enrolled">Enrolled Only</option>
              <option value="not_enrolled">Pending Enrolment</option>
              <option value="link_submitted">Link Submitted</option>
              <option value="link_pending">Pending Video/File Link</option>
            </Select>
          </div>

          {/* Mode Filter */}
          <div className="min-w-[140px]">
            <Select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="py-1.5 font-semibold"
            >
              <option value="All">All Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
              <option value="screening">Screening Round</option>
              <option value="submission">Digital Submission</option>
            </Select>
          </div>

          {/* Participation Type Filter */}
          <div className="min-w-[140px]">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="py-1.5 font-semibold"
            >
              <option value="All">All Participation Types</option>
              <option value="individual">Single / Individual</option>
              <option value="group">Group Events</option>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="min-w-[150px]">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 font-semibold"
            >
              <option value="All Categories">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </div>
        </div>


        {/* Registration Deadline Alert Banner (Active Schedules) */}
        {activeDeadlineSetting.is_active !== false && activeDeadlineEval.tier === 'fine' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Fine Period Active (₹{activeDeadlineEval.fineAmount}):</strong> The normal deadline has passed. New registrations incur a <strong>₹{activeDeadlineEval.fineAmount} fine</strong> until{' '}
              <strong className="font-mono">{activeDeadlineSetting.fine_deadline ? formatIstDisplay(activeDeadlineSetting.fine_deadline) : '—'}</strong>.
              {activeDeadlineSetting.has_super_fine && activeDeadlineSetting.super_fine_deadline && (
                <> After that, a <strong>₹{activeDeadlineSetting.super_fine_amount ?? 1000} Super Fine</strong> applies until <strong className="font-mono">{formatIstDisplay(activeDeadlineSetting.super_fine_deadline)}</strong>.</>
              )}
            </div>
          </div>
        )}

        {activeDeadlineSetting.is_active !== false && activeDeadlineEval.tier === 'super_fine' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Super Fine Period Active (₹{activeDeadlineEval.fineAmount}):</strong> Registrations now incur a <strong>₹{activeDeadlineEval.fineAmount} Super Fine</strong> until{' '}
              <strong className="font-mono">{activeDeadlineSetting.super_fine_deadline ? formatIstDisplay(activeDeadlineSetting.super_fine_deadline) : '—'}</strong>, after which registration will be <strong>completely locked for all colleges</strong>!
            </div>
          </div>
        )}

        {activeDeadlineSetting.is_active !== false && activeDeadlineEval.tier === 'closed' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200">
            <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="flex-1 font-sans">
              <strong className="font-heading font-bold">Registrations Locked:</strong> The deadline and fine grace windows have ended. Registration is completely closed for all colleges.
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
              const isSpecialGroup = isSpecialGroupEvent(item);
              const { min: minCount, max: maxCount, isOpen: isOpenParticipants } = getItemParticipantBounds(item);
              const fallbackStudent = (students.length > 0 && (reg?.cic_no || reg?.chest_no))
                ? findStudentByIdentifier(students, reg.cic_no || reg.chest_no, currentCollegeAfflNo)
                : undefined;
              const rawParticipants = reg
                ? ((reg.participants && reg.participants.length > 0)
                  ? reg.participants
                  : (reg.student ? [reg.student] : (fallbackStudent ? [fallbackStudent] : [])))
                : [];
              const rosterParticipants = isSpecialGroup
                ? rawParticipants
                : rawParticipants.filter(p => !String(p.chest_no || '').startsWith('COL-') && !String(p.id || '').startsWith('col-entry-'));
              const registeredCount = isSpecialGroup
                ? (reg ? 1 : 0)
                : rosterParticipants.length;
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
                          {isSpecialGroup ? 'Institutional Entry:' : 'Roster:'}
                        </span>
                        {isSpecialGroup ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10.5px] font-bold text-amber-800 dark:text-amber-200 font-sans">
                            {festService.getCollege(currentCollegeAfflNo || currentCollegeId)?.name || `College #${currentCollegeAfflNo || currentCollegeId}`}
                          </span>
                        ) : rosterParticipants.length > 0 ? (
                          rosterParticipants.map((p, pIdx) => {
                            const cicVal = p.cic_no || p.admission_no || p.cic_number;
                            const idLabel = cicVal ? `CIC: ${cicVal}` : getCanonicalChestNo(p);
                            const matchedStudent = findStudentByIdentifier(students, cicVal || p.chest_no || p.id, currentCollegeAfflNo);
                            const isBlocked = Boolean(matchedStudent?.is_blocked || p.is_blocked);
                            return (
                              <span
                                key={p.id || pIdx}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium font-sans ${
                                  isBlocked
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {p.full_name || p.name} <span className="ml-1 text-[var(--text-muted)] font-mono text-[9.5px]">({idLabel})</span>
                                {isBlocked && (
                                  <Badge variant="destructive" size="sm" className="ml-1.5 text-[8.5px] py-0 px-1 font-bold">
                                    Blocked
                                  </Badge>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 font-sans text-[10.5px] font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                            Action Required: Select 5 students
                          </span>
                        )}
                      </div>
                    )}
                    {requiresPreFestSubmission(item) && isRegistered && (() => {
                      const itmId = Number(item.item_id || item.id);
                      const sub = _submissions.find(s => Number(s.item_id) === itmId);
                      return sub?.file_url ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="font-mono truncate max-w-xs">{sub.file_url}</span>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="w-3 h-3 shrink-0" /> Pre-Fest Video / Link pending submission
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={itemCategory} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ItemTypeBadge
                      type={itemType}
                      mode={item.mode}
                      isSubmission={isSubmissionEvent(item)}
                      isScreening={isScreeningEvent(item)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <div className="inline-flex flex-col items-center">
                        {isSpecialGroup ? (
                          <span className="font-sans font-bold text-[10.5px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> College Entry
                          </span>
                        ) : rosterParticipants.length > 0 ? (
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {registeredCount}/{isOpenParticipants ? 'Open' : maxCount}
                          </span>
                        ) : (
                          <span className="font-sans font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            0/{maxCount} (Pending)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`font-mono font-bold text-xs ${isLocked ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}
                        title={isLocked ? lockCheck.reason || 'Registration Locked' : undefined}
                      >
                        {isSpecialGroup ? 'College Entry' : `0/${isOpenParticipants ? 'Open' : maxCount}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {isRegistered ? (
                        <>
                          {/* Pre-fest Video/File link button */}
                          {requiresPreFestSubmission(item) && (() => {
                            const itmId = Number(item.item_id || item.id);
                            const sub = _submissions.find(s => Number(s.item_id) === itmId);
                            const linkCheck = festService.isLinkSubmissionOpen(currentCollegeAfflNo || currentCollegeId || 0, itmId);
                            const isLinkLocked = !linkCheck.canSubmitLink;
                            return (
                              <Button
                                size="xs"
                                variant="outline"
                                className={`h-8 px-2.5 rounded-lg text-xs font-heading font-semibold hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 ${
                                  isLinkLocked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={
                                  isLinkLocked
                                    ? `Link submission is locked (${linkCheck.reason || 'Locked'})`
                                    : sub?.file_url
                                      ? 'Edit Submitted Video/File Link'
                                      : 'Submit Video/File Link'
                                }
                                disabled={isLinkLocked}
                                onClick={() => {
                                  if (isLinkLocked) return;
                                  const targetChest = rosterParticipants[0]?.chest_no || '—';
                                  const targetName = isSpecialGroup
                                    ? (festService.getCollege(currentCollegeAfflNo || currentCollegeId)?.name || 'College')
                                    : (rosterParticipants[0]?.full_name || rosterParticipants[0]?.name || 'Participant');
                                  setSelectedSubmissionTarget({
                                    collegeAfflNo: Number(currentCollegeAfflNo || currentCollegeId),
                                    chestNo: targetChest,
                                    studentName: targetName,
                                    itemId: itmId,
                                    itemCode: item.item_code || item.code || '',
                                    itemName: item.name_eng || item.name || '',
                                    isScreening: isScreeningEvent(item),
                                    existingUrl: sub?.file_url,
                                  });
                                }}
                              >
                                {isLinkLocked ? (
                                  <Lock className="w-3.5 h-3.5 mr-1 text-[var(--text-muted)]" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                )}
                                {isLinkLocked ? 'Link Locked' : sub?.file_url ? 'Edit Link' : 'Submit Link'}
                              </Button>
                            );
                          })()}

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
                    {!isLocked && (lockCheck.isSuperFinePeriod || lockCheck.isFinePeriod) && lockCheck.lockType !== 'admin_clearance' && (
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold font-mono border ${lockCheck.isSuperFinePeriod
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                            }`}
                        >
                          {lockCheck.isSuperFinePeriod ? `Super Fine ₹${lockCheck.fineAmount || 1000}` : `Fine ₹${lockCheck.fineAmount || 500}`}
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
                    {(eventSearch || statusFilter !== 'All' || selectedMode !== 'All' || selectedType !== 'All' || selectedCategory !== 'All Categories') && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="mt-2 text-xs font-heading"
                        onClick={() => {
                          setEventSearch('');
                          setStatusFilter('All');
                          setSelectedMode('All');
                          setSelectedType('All');
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

      {/* Pre-fest Submission Link Modal */}
      {selectedSubmissionTarget && (
        <SubmissionLinkModal
          target={selectedSubmissionTarget}
          onClose={() => setSelectedSubmissionTarget(null)}
          onSaved={_onRefresh}
        />
      )}
    </Card>
  );
}
