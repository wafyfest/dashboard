'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, Registration } from '@/lib/types/fest';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { ChevronDown, Plus, Lock, SquarePen, Trash2, CalendarCheck } from 'lucide-react';

interface CollegeRegistrationTabProps {
  filteredItems: Item[];
  registrations: Registration[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoryOptions: string[];
  currentCollegeId: string;
  currentCollegeAfflNo?: number;
  onOpenRegistrationModal: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  allItemsCount: number;
  registrationStatusByItem?: Map<number, RegistrationStatus>;
}

export function CollegeRegistrationTab({
  filteredItems,
  registrations,
  selectedCategory,
  setSelectedCategory,
  categoryOptions,
  currentCollegeId,
  currentCollegeAfflNo,
  onOpenRegistrationModal,
  onUnregisterRegistration,
  allItemsCount,
  registrationStatusByItem
}: CollegeRegistrationTabProps) {
  const [selectedMode, setSelectedMode] = React.useState<'All' | 'onstage' | 'offstage' | 'submission'>('All');

  const registrationByItemId = React.useMemo(() => {
    const byItem = new Map<number, Registration>();
    for (const reg of registrations) {
      if (!byItem.has(reg.item_id)) {
        byItem.set(reg.item_id, reg);
      }
    }
    return byItem;
  }, [registrations]);

  const displayedItems = React.useMemo(() => {
    if (selectedMode === 'All') return filteredItems;
    return filteredItems.filter(item => {
      const m = (item.mode || 'onstage').toLowerCase().trim();
      if (selectedMode === 'onstage') return m === 'onstage';
      if (selectedMode === 'offstage') return m === 'offstage' || (m !== 'onstage' && m !== 'submission');
      if (selectedMode === 'submission') return m === 'submission';
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
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs text-[var(--text-secondary)] font-sans hidden sm:block">
            Enrolled:{' '}
            <strong className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-bold">
              {registrations.length}
            </strong>{' '}
            / <span className="font-mono">{allItemsCount}</span> Events
          </div>

          {/* Stage Mode Filter */}
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Stage Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
              <option value="submission">Submission</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
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
        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Event (Malayalam)</TableHead>
              <TableHead>Name (English)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Type / Mode</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">Registered</TableHead>
              <TableHead className="text-center w-28">Actions</TableHead>
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
              const maxCount = item.no_of_participants || item.max_participants || 1;
              const registeredCount = reg ? (reg.participants?.length || 1) : 0;
              const isRegistered = !!reg;

              return (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-sans font-medium text-[var(--text-secondary)]">
                    {item.name_mal || item.name}
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
                    <ItemTypeBadge type={itemType} mode={item.mode} />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {registeredCount}/{maxCount}
                      </span>
                    ) : (
                      <span
                        className={`font-mono font-bold text-sm ${isLocked ? 'text-rose-500' : 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]'}`}
                        title={isLocked ? lockCheck.reason || 'Registration Locked' : undefined}
                      >
                        0/{maxCount}
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
                              if (confirm(`Are you sure you want to unregister from "${item.name_eng || item.name}"?`)) {
                                onUnregisterRegistration?.(item);
                              }
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
                  </TableCell>
                </TableRow>
              );
            })}
            {displayedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-xs">
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
    </Card>
  );
}
