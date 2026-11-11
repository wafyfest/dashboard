'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge, CategoryBadge, ItemModeBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  Plus,
  Lock,
  Unlock,
  Search,
  Award,
  Layers,
  Users,
  Mic,
  PenTool,
  SlidersHorizontal,
  SquarePen
} from 'lucide-react';
import {
  Item,
  ItemMode,
  getEffectiveStageMode,
  isSubmissionEvent,
  isScreeningEvent,
  isNonTabulationEvent,
  formatParticipantQuotaLabel
} from '@/lib/types/fest';

export function EventsCatalogTab() {
  const { refreshKey, triggerRefresh } = useFest();
  const [, startTransition] = useTransition();

  const items = useMemo(() => {
    return festService.getItems();
  }, [refreshKey]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<'All' | 'Single' | 'Group'>('All');
  const [selectedMode, setSelectedMode] = useState<'All' | 'onstage' | 'offstage' | 'submission' | 'screening'>('All');
  const [selectedLockStatus, setSelectedLockStatus] = useState<'All' | 'Open' | 'Locked'>('All');

  // Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<{
    id?: string;
    item_id?: number;
    code: string;
    name_eng: string;
    name_mal: string;
    phase: string;
    category: string;
    tabulation: boolean;
    mode: ItemMode;
    is_submission: boolean;
    is_screening: boolean;
    item_type: 'Single' | 'Group';
    no_of_participants: number | null;
  }>({
    code: '',
    name_eng: '',
    name_mal: '',
    phase: 'Foundation',
    category: 'A',
    tabulation: true,
    mode: 'onstage',
    is_submission: false,
    is_screening: false,
    item_type: 'Single',
    no_of_participants: 1
  });

  // Unique phases dynamically extracted
  const availablePhases = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.phase) set.add(i.phase);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = items.length;
    const single = items.filter(i => (i.point_type === 'individual' || i.item_type === 'Single')).length;
    const group = items.filter(i => (i.point_type === 'group' || i.item_type === 'Group')).length;
    const locked = items.filter(i => i.is_locked).length;
    const open = total - locked;
    const onstage = items.filter(i => getEffectiveStageMode(i) === 'onstage').length;
    const offstage = items.filter(i => getEffectiveStageMode(i) === 'offstage').length;
    const submission = items.filter(i => isSubmissionEvent(i)).length;
    const screening = items.filter(i => isScreeningEvent(i)).length;
    return { total, single, group, locked, open, onstage, offstage, submission, screening };
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return items
      .filter(item => {
        // Search query (code, English name, Malayalam name)
        const matchSearch =
          !q ||
          (item.code || item.item_code || '').toLowerCase().includes(q) ||
          (item.name || item.name_eng || '').toLowerCase().includes(q) ||
          (item.name_mal || '').toLowerCase().includes(q);

        // Phase filter
        const matchPhase =
          selectedPhase === 'All' ||
          (item.phase || '').toLowerCase() === selectedPhase.toLowerCase();

        // Category filter (A, B, C, D)
        const matchCategory =
          selectedCategory === 'All' ||
          (item.category || '').toUpperCase() === selectedCategory.toUpperCase();

        // Type filter
        const isGroup = item.point_type === 'group' || item.item_type === 'Group';
        const matchType =
          selectedType === 'All' ||
          (selectedType === 'Group' && isGroup) ||
          (selectedType === 'Single' && !isGroup);

        // Stage Mode filter (On Stage, Off Stage, Submission, Screening)
        const stageMode = getEffectiveStageMode(item);
        const matchMode =
          selectedMode === 'All' ||
          (selectedMode === 'onstage' && stageMode === 'onstage') ||
          (selectedMode === 'offstage' && stageMode === 'offstage') ||
          (selectedMode === 'submission' && isSubmissionEvent(item)) ||
          (selectedMode === 'screening' && isScreeningEvent(item));

        // Lock status filter
        const matchLock =
          selectedLockStatus === 'All' ||
          (selectedLockStatus === 'Locked' && item.is_locked) ||
          (selectedLockStatus === 'Open' && !item.is_locked);

        return matchSearch && matchPhase && matchCategory && matchType && matchMode && matchLock;
      })
      .sort((a, b) => {
        const codeA = a.item_code || a.code || '';
        const codeB = b.item_code || b.code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [items, searchQuery, selectedPhase, selectedCategory, selectedType, selectedMode, selectedLockStatus]);

  const handleOpenAddModal = () => {
    setEditingItem({
      code: '',
      name_eng: '',
      name_mal: '',
      phase: 'Foundation',
      category: 'A',
      tabulation: true,
      mode: 'onstage',
      is_submission: false,
      is_screening: false,
      item_type: 'Single',
      no_of_participants: 1
    });
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    const cat = (item.category || 'A').toUpperCase();
    setEditingItem({
      id: item.id,
      item_id: item.item_id,
      code: item.item_code || item.code || '',
      name_eng: item.name_eng || item.name || '',
      name_mal: item.name_mal || '',
      phase: item.phase?.trim().toLowerCase() === 'thamheediya' ? 'Thamheediyya' : (item.phase || 'Foundation'),
      category: cat,
      tabulation: item.tabulation !== undefined ? Boolean(item.tabulation) : cat !== 'D',
      mode: getEffectiveStageMode(item),
      is_submission: isSubmissionEvent(item),
      is_screening: isScreeningEvent(item),
      item_type: (item.point_type === 'group' || item.item_type === 'Group') ? 'Group' : 'Single',
      no_of_participants: item.no_of_participants ?? null
    });
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.code.trim()) {
      setFormError('Please enter a valid event code (e.g. AF085).');
      return;
    }
    if (!editingItem.name_eng.trim()) {
      setFormError('Please enter an event name in English.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const cat = (editingItem.category || 'A').toUpperCase().charAt(0);
      const payload: Partial<Item> = {
        item_id: editingItem.item_id,
        item_code: editingItem.code.trim().toUpperCase(),
        code: editingItem.code.trim().toUpperCase(),
        name_eng: editingItem.name_eng.trim(),
        name: editingItem.name_eng.trim(),
        name_mal: editingItem.name_mal.trim() || editingItem.name_eng.trim(),
        phase: editingItem.phase,
        category: cat,
        tabulation: editingItem.tabulation,
        mode: editingItem.mode,
        is_submission: editingItem.is_submission,
        is_screening: editingItem.is_screening,
        point_type: editingItem.item_type === 'Group' ? 'group' : 'individual',
        item_type: editingItem.item_type,
        no_of_participants:
          editingItem.no_of_participants == null
            ? null
            : Math.max(1, Number(editingItem.no_of_participants) || 1)
      };

      const res = await festService.saveItem(payload);
      if (!res.success) {
        setFormError(res.error || 'Failed to save event to database.');
        setIsSubmitting(false);
        return;
      }

      setIsItemModalOpen(false);
      startTransition(() => {
        triggerRefresh();
      });
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold text-[var(--text-muted)]">Total Events</span>
            <Award className="w-4 h-4 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-[var(--text-primary)] mt-1 font-mono tabular-nums">
            {metrics.total}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">Full Arts Fest Catalog</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold text-[var(--text-muted)]">On Stage</span>
            <Mic className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tabular-nums">
            {metrics.onstage}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">Live stage performances</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold text-[var(--text-muted)]">Off Stage</span>
            <PenTool className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-sky-600 dark:text-sky-400 mt-1 font-mono tabular-nums">
            {metrics.offstage}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">Written / hall exams</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold text-[var(--text-muted)]">Format Types</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-heading font-bold text-[var(--text-primary)] mt-1 font-mono tabular-nums">
            {metrics.single} <span className="text-xs font-normal text-[var(--text-muted)]">Solo</span> • {metrics.group} <span className="text-xs font-normal text-[var(--text-muted)]">Group</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">Single vs Ensembles</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-4 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold text-[var(--text-muted)]">Global Lock State</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-rose-600 dark:text-rose-400 mt-1 font-mono tabular-nums">
            {metrics.locked}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">{metrics.open} Open for Colleges</div>
        </Card>
      </div>

      {/* 2. Main Events Directory Card */}
      <Card className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg text-[var(--text-primary)] flex items-center gap-2 font-heading font-bold">
              <Award className="w-5 h-5 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
              Arts Fest Events Directory
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
              Manage event codes, stage modes (On Stage / Off Stage), categories, and participant quotas per college
            </CardDescription>
          </div>

          <Button size="sm" variant="saffron" onClick={handleOpenAddModal} className="shrink-0 gap-1.5 shadow-xs font-bold">
            <Plus className="w-4 h-4" /> Add New Event
          </Button>
        </CardHeader>

        {/* 3. Search & Filter Toolbar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by code (e.g. AF065) or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-sans"
              />
            </div>

            {/* Stage Mode Filter (On Stage vs Off Stage) */}
            <div>
              <select
                value={selectedMode}
                onChange={e => setSelectedMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-medium cursor-pointer"
              >
                <option value="All">All Stage Modes</option>
                <option value="onstage">On Stage Only</option>
                <option value="offstage">Off Stage Only</option>
                <option value="submission">Submission Only</option>
                <option value="screening">Screening Events Only</option>
              </select>
            </div>

            {/* Phase Filter */}
            <div>
              <select
                value={selectedPhase}
                onChange={e => setSelectedPhase(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="All">All Phases</option>
                {availablePhases.filter(p => p !== 'All').map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Category Filter (A, B, C, D) */}
            <div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                <option value="D">Category D</option>
              </select>
            </div>

            {/* Lock Status Filter */}
            <div>
              <select
                value={selectedLockStatus}
                onChange={e => setSelectedLockStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Locked">Locked</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
            <span>
              Showing <strong className="text-[var(--text-primary)] font-mono">{filteredItems.length}</strong> of{' '}
              <strong className="text-[var(--text-primary)] font-mono">{items.length}</strong> events
            </span>
            {(searchQuery || selectedPhase !== 'All' || selectedCategory !== 'All' || selectedType !== 'All' || selectedMode !== 'All' || selectedLockStatus !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPhase('All');
                  setSelectedCategory('All');
                  setSelectedType('All');
                  setSelectedMode('All');
                  setSelectedLockStatus('All');
                }}
                className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* 4. Table */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/75 text-[var(--text-secondary)] font-heading font-semibold">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-28">Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">Event Title</th>
                <th className="py-2.5 px-3">Phase</th>
                <th className="py-2.5 px-3 text-center">Category</th>
                <th className="py-2.5 px-3 text-center">Type / Mode</th>
                <th className="py-2.5 px-3 text-center min-w-[140px]">Participants / College</th>
                <th className="py-2.5 px-3 text-center">Lock Status</th>
                <th className="py-2.5 px-3 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredItems.map((item, idx) => {
                const isGroup = item.point_type === 'group' || item.item_type === 'Group';

                return (
                  <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-[var(--text-muted)]">
                      {idx + 1}
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-[var(--border-subtle)]">
                        {item.item_code || item.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-3">
                      {item.name_mal && (
                        <div className="font-heading font-semibold text-[var(--text-primary)] text-xs">
                          {item.name_mal}
                        </div>
                      )}
                      <div className="text-[11px] text-[var(--text-secondary)] font-sans">
                        {item.name_eng || item.name}
                      </div>
                    </td>

                    {/* Phase */}
                    <td className="py-3 px-3">
                      <CategoryBadge category={item.phase || item.category} />
                    </td>

                    {/* Category Letter (A, B, C, D) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                          {(item.category || 'A').toUpperCase()}
                        </span>
                        {isNonTabulationEvent(item) && (
                          <span
                            className="text-[10px] font-sans font-semibold text-[var(--text-muted)]"
                            title="Non-tabulation event (0 championship points)"
                          >
                            Non-Tab
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type / Mode */}
                    <td className="py-3 px-3 text-center">
                      <ItemTypeBadge
                        type={isGroup ? 'Group' : 'Individual'}
                        mode={item.mode}
                        isSubmission={isSubmissionEvent(item)}
                        isScreening={isScreeningEvent(item)}
                      />
                    </td>

                    {/* Participants from a College */}
                    <td className="py-3 px-3 text-center font-mono font-semibold text-[var(--text-primary)]">
                      {formatParticipantQuotaLabel(item)}
                    </td>

                    {/* Lock Status */}
                    <td className="py-3 px-3 text-center">
                      {item.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-rose-800 dark:text-rose-300 text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                          <Unlock className="w-3 h-3" /> Open
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant={item.is_locked ? 'success' : 'destructive'}
                          onClick={async () => {
                            await festService.toggleItemLock(item.item_id || item.id);
                            startTransition(() => {
                              triggerRefresh();
                            });
                          }}
                          className="h-7 text-xs font-medium"
                          title={item.is_locked ? 'Unlock for registrations' : 'Lock for all colleges'}
                        >
                          {item.is_locked ? 'Unlock' : 'Lock'}
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenEditModal(item)}
                          className="h-7 text-xs border-[var(--border-subtle)] hover:border-[var(--f-saffron)] hover:bg-[var(--bg-hover)]"
                          title="Edit event settings"
                        >
                          <SquarePen className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[var(--text-muted)] text-xs font-sans">
                    No events found matching your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 5. Add / Edit Event Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem.item_id ? `Edit Event #${String(editingItem.item_id).padStart(2, '0')}` : 'Add New Fest Event'}
        description="Configure event titles, phase, category letter (A, B, C, D), and participant allowance per college"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              {formError}
            </div>
          )}

          {/* Row 1: Code and Phase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Event Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AF085"
                value={editingItem.code}
                onChange={e => setEditingItem({ ...editingItem, code: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Academic Phase <span className="text-rose-500">*</span>
              </label>
              <select
                value={editingItem.phase}
                onChange={e => setEditingItem({ ...editingItem, phase: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="Foundation">Foundation</option>
                <option value="Thamheediyya">Thamheediyya</option>
                <option value="Aliya">Aliya</option>
                <option value="PG">PG</option>
                <option value="General">General</option>
                <option value="Special">Special</option>
                <option value="Special - Foundation">Special - Foundation</option>
              </select>
            </div>
          </div>

          {/* Row 2: Event Name English & Malayalam */}
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Event Name (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Western Acoustic Solo"
              value={editingItem.name_eng}
              onChange={e => setEditingItem({ ...editingItem, name_eng: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Event Name (Malayalam)
            </label>
            <input
              type="text"
              placeholder="e.g. പ്രസംഗം ഇംഗ്ലീഷ്"
              value={editingItem.name_mal}
              onChange={e => setEditingItem({ ...editingItem, name_mal: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)]"
            />
          </div>

          {/* Row 3: Category (A, B, C, D), Type (Single/Group), Mode (onstage/offstage) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={editingItem.category}
                onChange={e => {
                  const nextCat = e.target.value;
                  setEditingItem({
                    ...editingItem,
                    category: nextCat,
                    tabulation: nextCat.toUpperCase() !== 'D'
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-bold cursor-pointer"
              >
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                <option value="D">Category D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Type
              </label>
              <select
                value={editingItem.item_type}
                onChange={e => setEditingItem({ ...editingItem, item_type: e.target.value as 'Single' | 'Group' })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="Single">Single</option>
                <option value="Group">Group</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Stage Mode
              </label>
              <select
                value={editingItem.mode}
                onChange={e => setEditingItem({ ...editingItem, mode: e.target.value as ItemMode })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] cursor-pointer"
              >
                <option value="onstage">On Stage (Live Stage Performance)</option>
                <option value="offstage">Off Stage (Written / Hall / Off-stage)</option>
              </select>
            </div>
          </div>

          {/* Row 3b: Pre-event Submission & Screening flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={editingItem.is_submission}
                onChange={e => setEditingItem({ ...editingItem, is_submission: e.target.checked })}
                className="mt-0.5 rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] h-4 w-4 cursor-pointer"
              />
              <div>
                <span className="font-heading font-semibold text-[var(--text-primary)]">Pre-Event Submission</span>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">
                  Requires uploading media/artwork/files prior to judging (while keeping On Stage / Off Stage classification).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={editingItem.is_screening}
                onChange={e => setEditingItem({ ...editingItem, is_screening: e.target.checked })}
                className="mt-0.5 rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] h-4 w-4 cursor-pointer"
              />
              <div>
                <span className="font-heading font-semibold text-[var(--text-primary)]">Pre-Fest Screening Round</span>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">
                  Collects pre-fest video/digital links and shortlists finalists before the live stage finals.
                </p>
              </div>
            </label>
          </div>

          {/* Row 4: Participants from a College & Tabulation */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                  Number of Participants (that can register from a college)
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-heading font-semibold text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingItem.no_of_participants == null}
                    onChange={e =>
                      setEditingItem({
                        ...editingItem,
                        no_of_participants: e.target.checked ? null : (editingItem.item_type === 'Group' ? 2 : 1)
                      })
                    }
                    className="rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] h-3.5 w-3.5 cursor-pointer"
                  />
                  Open / Unlimited
                </label>
              </div>
              {editingItem.no_of_participants == null ? (
                <div className="w-full px-3 py-2 text-xs border border-dashed border-[var(--border-medium)] rounded-lg bg-[var(--bg-subtle)]/60 text-[var(--text-secondary)] font-mono">
                  Open Limit (NULL — Colleges can register multiple participants)
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editingItem.no_of_participants}
                  onChange={e => setEditingItem({ ...editingItem, no_of_participants: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] font-mono"
                  required
                />
              )}
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">
                Specifies how many students a college can enroll in their roster for this item (or leave Open for Category D items).
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={editingItem.tabulation}
                onChange={e => setEditingItem({ ...editingItem, tabulation: e.target.checked })}
                className="mt-0.5 rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] h-4 w-4 cursor-pointer"
              />
              <div>
                <span className="font-heading font-semibold text-[var(--text-primary)]">Counts in Official Tabulation & Points</span>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">
                  Uncheck for Category D non-tabulation events (e.g. SE090–SE093) so leaderboard points stay 0.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="saffron"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
