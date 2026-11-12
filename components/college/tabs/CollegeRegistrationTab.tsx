'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubmissionLinkModal, SubmissionLinkTarget } from '@/components/college/SubmissionLinkModal';
import {
  Item,
  Registration,
  SubmissionEntry,
  getEffectiveStageMode,
  isSubmissionEvent,
  isScreeningEvent,
  getItemParticipantBounds,
  requiresPreFestSubmission
} from '@/lib/types/fest';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { ChevronDown, Plus, Lock, SquarePen, Trash2, CalendarCheck, Link2, ExternalLink } from 'lucide-react';

interface CollegeRegistrationTabProps {
  filteredItems: Item[];
  registrations: Registration[];
  submissions?: SubmissionEntry[];
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
  submissions = [],
  selectedCategory,
  setSelectedCategory,
  categoryOptions,
  currentCollegeId,
  currentCollegeAfflNo,
  onOpenRegistrationModal,
  onUnregisterRegistration,
  onRefresh,
  onOpenParticipantsTab,
  allItemsCount,
  registrationStatusByItem
}: CollegeRegistrationTabProps) {
  const [selectedMode, setSelectedMode] = React.useState<'All' | 'onstage' | 'offstage' | 'submission' | 'screening'>('All');
  const [linkTarget, setLinkTarget] = React.useState<SubmissionLinkTarget | null>(null);

  const registrationByItemId = React.useMemo(() => {
    const byItem = new Map<number, Registration>();
    for (const reg of registrations) {
      if (!byItem.has(reg.item_id)) {
        byItem.set(reg.item_id, reg);
      }
    }
    return byItem;
  }, [registrations]);

  const submissionLookup = React.useMemo(() => {
    const byChest = new Map<string, SubmissionEntry>();
    const byItem = new Map<number, SubmissionEntry>();
    for (const s of submissions) {
      const itmId = Number(s.item_id);
      if (s.file_url && !byItem.has(itmId)) byItem.set(itmId, s);
      const keys = [s.chest_no, s.student?.chest_no, s.student ? getCanonicalChestNo(s.student) : undefined];
      for (const k of keys) {
        const clean = (k || '').trim().toUpperCase();
        if (clean && clean !== '—') byChest.set(`${itmId}:${clean}`, s);
      }
    }
    return { byChest, byItem };
  }, [submissions]);

  const pendingPreFestCount = React.useMemo(() => {
    let missing = 0;
    registrationByItemId.forEach((reg, itemId) => {
      if (!requiresPreFestSubmission(reg.item)) return;
      if (!submissionLookup.byItem.get(Number(itemId))?.file_url) {
        missing++;
      }
    });
    return missing;
  }, [registrationByItemId, submissionLookup]);

  const displayedItems = React.useMemo(() => {
    if (selectedMode === 'All') return filteredItems;
    return filteredItems.filter(item => {
      const m = getEffectiveStageMode(item);
      if (selectedMode === 'onstage') return m === 'onstage';
      if (selectedMode === 'offstage') return m === 'offstage';
      if (selectedMode === 'submission') return isSubmissionEvent(item);
      if (selectedMode === 'screening') return isScreeningEvent(item);
      return true;
    });
  }, [filteredItems, selectedMode]);

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Event Registration
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Enroll student participants in Single and Group events according to quotas
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="text-xs text-[var(--text-secondary)] font-sans hidden sm:block">
            Enrolled:{' '}
            <strong className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-bold">
              {registrationByItemId.size}
            </strong>{' '}
            / <span className="font-mono">{allItemsCount}</span> Events
          </div>

          {/* Stage Mode Filter */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Stage Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
              <option value="submission">Submission</option>
              <option value="screening">Screening</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative flex-1 sm:flex-initial min-w-[150px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
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
        {pendingPreFestCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs">
            <div className="flex items-start sm:items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="font-heading font-bold">{pendingPreFestCount}</strong> registered Submission / Screening {pendingPreFestCount === 1 ? 'event still needs' : 'events still need'} a Video/File URL. Click <strong className="font-semibold">Submit Link</strong> right on the event row or manage all entries in Participants.
              </span>
            </div>
            {onOpenParticipantsTab && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={onOpenParticipantsTab}
                className="border-indigo-500/40 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/15 shrink-0 font-heading font-semibold"
              >
                Open Participants
              </Button>
            )}
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
              const reg = registrationByItemId.get(item.item_id);
              const lockCheck = registrationStatusByItem?.get(item.item_id)
                || festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, item.item_id || item.id);
              const isLocked = !lockCheck.canRegister;
              const itemCategory = item.phase || item.category;
              const itemType = item.point_type
                ? (item.point_type.toLowerCase() === 'group' ? 'Group' : 'Individual')
                : (item.item_type === 'Group' ? 'Group' : 'Individual');
              const { max: maxCount, isOpen: isOpenParticipants } = getItemParticipantBounds(item);
              const registeredCount = reg ? (reg.participants?.length || 1) : 0;
              const isRegistered = !!reg;

              return (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                      {item.name_eng || item.name}
                    </div>
                    {reg && reg.participants && reg.participants.length > 0 && (
                      <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5">
                        Roster: {reg.participants.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p)})`).join(', ')}
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
                      isSubmission={isSubmissionEvent(item)}
                      isScreening={isScreeningEvent(item)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {registeredCount}/{isOpenParticipants ? 'Open' : maxCount}
                      </span>
                    ) : (
                      <span
                        className={`font-mono font-bold text-sm ${isLocked ? 'text-rose-500' : 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]'}`}
                        title={isLocked ? lockCheck.reason || 'Registration Locked' : undefined}
                      >
                        0/{isOpenParticipants ? 'Open' : maxCount}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isRegistered ? (
                        <>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg"
                            title={isLocked ? 'Registration Closed (Locked)' : 'Edit Roster'}
                            disabled={isLocked}
                            onClick={() => !isLocked && onOpenRegistrationModal(item)}
                          >
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                              <SquarePen className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            title={isLocked ? 'Registration Closed (Locked)' : 'Remove / Unregister Event'}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) return;
                              onUnregisterRegistration?.(item);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant={isLocked ? 'secondary' : 'saffron'}
                          disabled={isLocked}
                          className="h-8 w-8 p-0 rounded-lg transition-colors"
                          title={!isLocked ? 'Register Entry' : lockCheck.reason || 'Registration Locked'}
                          onClick={() => !isLocked && onOpenRegistrationModal(item)}
                        >
                          {isLocked ? (
                            <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {isRegistered && requiresPreFestSubmission(item) && (() => {
                      const primaryStu = reg.participants?.[0] || reg.student;
                      const resolvedChest = primaryStu ? getCanonicalChestNo(primaryStu) : '';
                      const primaryChest = resolvedChest && resolvedChest !== '—' ? resolvedChest : (reg.chest_no || '');
                      const stuName = primaryStu?.full_name || primaryStu?.name || 'Registered Team';
                      const subEntry =
                        submissionLookup.byChest.get(`${item.item_id}:${primaryChest.toUpperCase()}`) ||
                        submissionLookup.byChest.get(`${item.item_id}:${(reg.chest_no || '').trim().toUpperCase()}`) ||
                        submissionLookup.byItem.get(Number(item.item_id));
                      const targetCollegeAffl = Number(currentCollegeAfflNo || reg.college_affl_no || 0);

                      return (
                        <div className="mt-1.5 flex items-center justify-center gap-1 flex-wrap">
                          {subEntry?.file_url && (
                            <a
                              href={subEntry.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20"
                              title={subEntry.file_url}
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              View
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setLinkTarget({
                                collegeAfflNo: targetCollegeAffl,
                                chestNo: primaryChest,
                                studentName: stuName,
                                itemId: Number(item.item_id),
                                itemCode: item.item_code || item.code || `ITM-${item.item_id}`,
                                itemName: item.name_eng || item.name || 'Event',
                                isScreening: isScreeningEvent(item),
                                existingUrl: subEntry?.file_url
                              })
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                              subEntry?.file_url
                                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                                : 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-300 hover:bg-amber-500/25'
                            }`}
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            {subEntry?.file_url ? 'Edit Link' : 'Submit Link'}
                          </button>
                        </div>
                      );
                    })()}
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
                      No events found matching the selected category.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <SubmissionLinkModal
        target={linkTarget}
        onClose={() => setLinkTarget(null)}
        onSaved={onRefresh}
      />
    </Card>
  );
}
