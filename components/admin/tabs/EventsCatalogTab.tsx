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
import { Item, ItemMode, ItemType } from '@/lib/types/fest';

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
  const [selectedMode, setSelectedMode] = useState<'All' | 'onstage' | 'offstage' | 'submission'>('All');
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
    mode: ItemMode;
    item_type: 'Single' | 'Group';
    no_of_participants: number;
  }>({
    code: '',
    name_eng: '',
    name_mal: '',
    phase: 'Foundation',
    category: 'A',
    mode: 'onstage',
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
    const onstage = items.filter(i => (i.mode || '').toLowerCase().trim() === 'onstage').length;
    const offstage = items.filter(i => {
      const m = (i.mode || '').toLowerCase().trim();
      return m === 'offstage' || (m !== 'onstage' && m !== 'submission');
    }).length;
    const submission = items.filter(i => (i.mode || '').toLowerCase().trim() === 'submission').length;
    return { total, single, group, locked, open, onstage, offstage, submission };
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

        // Stage Mode filter (On Stage, Off Stage, Submission)
        const itemNormMode = (item.mode || 'onstage').toLowerCase().trim();
        const matchMode =
          selectedMode === 'All' ||
          (selectedMode === 'onstage' && itemNormMode === 'onstage') ||
          (selectedMode === 'offstage' && (itemNormMode === 'offstage' || (itemNormMode !== 'onstage' && itemNormMode !== 'submission'))) ||
          (selectedMode === 'submission' && itemNormMode === 'submission');

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
      mode: 'onstage',
      item_type: 'Single',
      no_of_participants: 1
    });
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem({
      id: item.id,
      item_id: item.item_id,
      code: item.item_code || item.code || '',
      name_eng: item.name_eng || item.name || '',
      name_mal: item.name_mal || '',
      phase: item.phase || 'Foundation',
      category: (item.category || 'A').toUpperCase(),
      mode: (item.mode as ItemMode) || 'onstage',
      item_type: (item.point_type === 'group' || item.item_type === 'Group') ? 'Group' : 'Single',
      no_of_participants: item.no_of_participants || 1
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
      const payload: Partial<Item> = {
        item_id: editingItem.item_id,
        item_code: editingItem.code.trim().toUpperCase(),
        code: editingItem.code.trim().toUpperCase(),
        name_eng: editingItem.name_eng.trim(),
        name: editingItem.name_eng.trim(),
        name_mal: editingItem.name_mal.trim() || editingItem.name_eng.trim(),
        phase: editingItem.phase,
        category: (editingItem.category || 'A').toUpperCase().charAt(0),
        mode: editingItem.mode,
        point_type: editingItem.item_type === 'Group' ? 'group' : 'individual',
        item_type: editingItem.item_type,
        no_of_participants: Math.max(1, Number(editingItem.no_of_participants) || 1)
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
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Events</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-mono">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Full Arts Fest Catalog</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">On Stage</span>
            <Mic className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {metrics.onstage}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Live stage performances</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Off Stage</span>
            <PenTool className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {metrics.offstage}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Written / hall exams</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Format Types</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-[var(--text-primary)] mt-1 font-mono">
            {metrics.single} <span className="text-xs font-normal text-slate-500">Solo</span> • {metrics.group} <span className="text-xs font-normal text-slate-500">Group</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Single vs Ensembles</div>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-4 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Global Lock State</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {metrics.locked}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics.open} Open for Colleges</div>
        </Card>
      </div>

      {/* 2. Main Events Directory Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg text-[var(--text-primary)] flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-500" />
              Arts Fest Events Directory
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Manage event codes, stage modes (On Stage / Off Stage), categories, and participant quotas per college
            </CardDescription>
          </div>

          <Button size="sm" onClick={handleOpenAddModal} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs">
            <Plus className="w-4 h-4" /> Add New Event
          </Button>
        </CardHeader>

        {/* 3. Search & Filter Toolbar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code (e.g. AF065) or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Stage Mode Filter (On Stage vs Off Stage) */}
            <div>
              <select
                value={selectedMode}
                onChange={e => setSelectedMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="All">All Stage Modes</option>
                <option value="onstage">On Stage Only</option>
                <option value="offstage">Off Stage Only</option>
                <option value="submission">Submission Only</option>
              </select>
            </div>

            {/* Phase Filter */}
            <div>
              <select
                value={selectedPhase}
                onChange={e => setSelectedPhase(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Locked">Locked</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
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
                className="text-blue-500 hover:underline cursor-pointer"
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
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 text-slate-400 font-semibold">
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
                  <tr key={item.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {item.item_code || item.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-3">
                      {item.name_mal && (
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {item.name_mal}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.name_eng || item.name}
                      </div>
                    </td>

                    {/* Phase */}
                    <td className="py-3 px-3">
                      <CategoryBadge category={item.phase || item.category} />
                    </td>

                    {/* Category Letter (A, B, C, D) */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {(item.category || 'A').toUpperCase()}
                      </span>
                    </td>

                    {/* Type / Mode */}
                    <td className="py-3 px-3 text-center">
                      <ItemTypeBadge type={isGroup ? 'Group' : 'Individual'} mode={item.mode} />
                    </td>

                    {/* Participants from a College */}
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.no_of_participants || 1} student{Number(item.no_of_participants || 1) > 1 ? 's' : ''}
                    </td>

                    {/* Lock Status */}
                    <td className="py-3 px-3 text-center">
                      {item.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
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
                          className="h-7 text-xs border-slate-700 hover:bg-slate-800"
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
                  <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AF085"
                value={editingItem.code}
                onChange={e => setEditingItem({ ...editingItem, code: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Phase <span className="text-rose-500">*</span>
              </label>
              <select
                value={editingItem.phase}
                onChange={e => setEditingItem({ ...editingItem, phase: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Foundation">Foundation</option>
                <option value="Thamheediya">Thamheediyya</option>
                <option value="Aliya">Aliya</option>
                <option value="PG">PG</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Row 2: Event Name English & Malayalam */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Event Name (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Western Acoustic Solo"
              value={editingItem.name_eng}
              onChange={e => setEditingItem({ ...editingItem, name_eng: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Event Name (Malayalam)
            </label>
            <input
              type="text"
              placeholder="e.g. പ്രസംഗം ഇംഗ്ലീഷ്"
              value={editingItem.name_mal}
              onChange={e => setEditingItem({ ...editingItem, name_mal: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Row 3: Category (A, B, C, D), Type (Single/Group), Mode (onstage/offstage) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={editingItem.category}
                onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
              >
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                <option value="D">Category D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={editingItem.item_type}
                onChange={e => setEditingItem({ ...editingItem, item_type: e.target.value as 'Single' | 'Group' })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Single">Single</option>
                <option value="Group">Group</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stage Mode
              </label>
              <select
                value={editingItem.mode}
                onChange={e => setEditingItem({ ...editingItem, mode: e.target.value as ItemMode })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="onstage">On Stage (Live Stage Performance)</option>
                <option value="offstage">Off Stage (Written / Hall)</option>
                <option value="submission">Submission (Pre-event File/Artwork)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Participants from a College */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Number of Participants (that can register from a college) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={editingItem.no_of_participants}
              onChange={e => setEditingItem({ ...editingItem, no_of_participants: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Specifies how many students a college can enroll in their roster for this item (e.g. 1 for solo, 5+ for group).
            </p>
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
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
