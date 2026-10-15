'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, StageStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Item, Stage, Schedule, StageStatus } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import {
  Calendar,
  Clock,
  MapPin,
  Edit,
  Search,
  Filter,
  CheckCircle2,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface EventsScheduleTabProps {
  items: Item[];
  stages: Stage[];
  schedules: Schedule[];
}

export function EventsScheduleTab({ items, stages, schedules }: EventsScheduleTabProps) {
  const { triggerRefresh } = useFest();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Edit Schedule Modal State
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<{
    stageNumber: number;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    status: StageStatus;
  }>({
    stageNumber: 1,
    startDate: '',
    startTime: '09:30',
    endDate: '',
    endTime: '10:15',
    status: 'Upcoming'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Map schedules by item_id
  const scheduleByItemId = useMemo(() => {
    const map = new Map<number, Schedule>();
    for (const sch of schedules) {
      map.set(Number(sch.item_id), sch);
    }
    return map;
  }, [schedules]);

  // Unique phase categories
  const phaseOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const p = i.phase || i.category;
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items list
  const filteredRows = useMemo(() => {
    return items.filter(item => {
      const sch = scheduleByItemId.get(Number(item.item_id || item.id));

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.item_code || item.code || '').toLowerCase();
        const nameEng = (item.name_eng || item.name || '').toLowerCase();
        const nameMal = (item.name_mal || '').toLowerCase();
        if (!code.includes(q) && !nameEng.includes(q) && !nameMal.includes(q)) {
          return false;
        }
      }

      // Stage filter
      if (selectedStageFilter !== 'all') {
        const targetStageNum = parseInt(selectedStageFilter, 10);
        if (!sch || sch.stage_number !== targetStageNum) {
          return false;
        }
      }

      // Phase filter
      if (selectedPhaseFilter !== 'all') {
        const itemPhase = (item.phase || item.category || '').toLowerCase();
        if (itemPhase !== selectedPhaseFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        const schStatus = sch?.status || 'Upcoming';
        if (schStatus !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [items, scheduleByItemId, searchQuery, selectedStageFilter, selectedPhaseFilter, selectedStatusFilter]);

  // Open modal to edit an item's schedule
  const handleOpenEditModal = (item: Item) => {
    const sch = scheduleByItemId.get(Number(item.item_id || item.id));
    const now = new Date();

    let startDateStr = now.toISOString().slice(0, 10);
    let startTimeStr = '09:30';
    let endDateStr = now.toISOString().slice(0, 10);
    let endTimeStr = '10:15';
    let stageNum = stages[0]?.stage_number || 1;
    let currentStatus: StageStatus = 'Upcoming';

    if (sch) {
      stageNum = sch.stage_number || stageNum;
      currentStatus = (sch.status as StageStatus) || 'Upcoming';

      if (sch.starting) {
        const sDate = new Date(sch.starting);
        startDateStr = sDate.toISOString().slice(0, 10);
        const hours = String(sDate.getHours()).padStart(2, '0');
        const mins = String(sDate.getMinutes()).padStart(2, '0');
        startTimeStr = `${hours}:${mins}`;
      }

      if (sch.ending) {
        const eDate = new Date(sch.ending);
        endDateStr = eDate.toISOString().slice(0, 10);
        const hours = String(eDate.getHours()).padStart(2, '0');
        const mins = String(eDate.getMinutes()).padStart(2, '0');
        endTimeStr = `${hours}:${mins}`;
      } else {
        endDateStr = startDateStr;
      }
    }

    setEditingItem(item);
    setEditForm({
      stageNumber: stageNum,
      startDate: startDateStr,
      startTime: startTimeStr,
      endDate: endDateStr,
      endTime: endTimeStr,
      status: currentStatus
    });
  };

  // Submit modal schedule edits
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSaving(true);
    try {
      // Build ISO starting and ending strings
      const startingIso = new Date(`${editForm.startDate}T${editForm.startTime}:00`).toISOString();
      const endingIso = editForm.endDate && editForm.endTime
        ? new Date(`${editForm.endDate}T${editForm.endTime}:00`).toISOString()
        : undefined;

      const res = await festService.saveSchedule({
        item_id: Number(editingItem.item_id || editingItem.id),
        stage_number: editForm.stageNumber,
        starting: startingIso,
        ending: endingIso,
        status: editForm.status
      });

      if (res.success) {
        showToast(`Schedule updated for ${editingItem.name_eng || editingItem.name}`);
        setEditingItem(null);
        triggerRefresh();
      } else {
        alert(res.error || 'Failed to update schedule');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving schedule');
    } finally {
      setIsSaving(false);
    }
  };

  // Inline quick status updater
  const handleQuickStatusChange = async (itemId: number, newStatus: StageStatus) => {
    try {
      await festService.updateScheduleStatus(itemId, newStatus);
      showToast(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format time helper
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Festival Events & Stage Schedule Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Configure stage allocations, performance timing, and operational live status for all catalog events.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
              Scheduled: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{schedules.length}</strong> / {items.length} Events
            </div>
          </div>
        </CardHeader>

        {/* Filter Bar */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search event code or title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Stage Filter */}
            <div className="relative">
              <select
                value={selectedStageFilter}
                onChange={e => setSelectedStageFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Stages ({stages.length})</option>
                {stages.map(st => (
                  <option key={st.stage_number} value={st.stage_number}>
                    Stage {st.stage_number}: {st.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Phase / Category Filter */}
            <div className="relative">
              <select
                value={selectedPhaseFilter}
                onChange={e => setSelectedPhaseFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Categories</option>
                {phaseOptions.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Starting_Soon">Starting Soon</option>
                <option value="Next_Item">Next Item</option>
                <option value="On_Going">Live / On Going</option>
                <option value="Ended">Ended</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Schedule Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Starting Time</TableHead>
                <TableHead>Ending Time</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-[var(--text-muted)] text-sm">
                    No events match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((item, idx) => {
                  const sch = scheduleByItemId.get(Number(item.item_id || item.id));
                  const stageObj = stages.find(st => st.stage_number === sch?.stage_number);
                  const currentStatus = (sch?.status as StageStatus) || 'Upcoming';

                  return (
                    <TableRow key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {item.item_code || item.code || `ITM-${item.item_id}`}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">
                          {item.name_eng || item.name}
                        </div>
                        {item.name_mal && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {item.name_mal}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={item.phase || item.category || 'General'} />
                      </TableCell>
                      <TableCell>
                        {sch ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[var(--text-primary)]">
                              Stage {sch.stage_number}
                            </span>
                            {stageObj && (
                              <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]" title={stageObj.name}>
                                {stageObj.name.replace(/^Stage \d+:\s*/, '')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {sch?.starting ? `${formatDate(sch.starting)} · ${formatTime(sch.starting)}` : 'TBD'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {sch?.ending ? `${formatDate(sch.ending)} · ${formatTime(sch.ending)}` : 'TBD'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={currentStatus}
                            onChange={e => handleQuickStatusChange(Number(item.item_id || item.id), e.target.value as StageStatus)}
                            className="text-[11px] font-semibold py-1 px-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Starting_Soon">Starting Soon</option>
                            <option value="Next_Item">Next Item</option>
                            <option value="On_Going">Live / On Going</option>
                            <option value="Ended">Ended</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenEditModal(item)}
                          className="gap-1.5 font-medium border-slate-300 dark:border-slate-700 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Schedule Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={`Edit Schedule: ${editingItem?.name_eng || editingItem?.name}`}
        description={`Item Code: ${editingItem?.item_code || editingItem?.code} · Category: ${editingItem?.phase || editingItem?.category}`}
        maxWidth="lg"
      >
        {editingItem && (
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Assigned Stage Venue
              </label>
              <select
                value={editForm.stageNumber}
                onChange={e => setEditForm({ ...editForm, stageNumber: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                required
              >
                {stages.map(st => (
                  <option key={st.stage_number} value={st.stage_number}>
                    Stage {st.stage_number}: {st.name} ({st.location || 'Campus'})
                  </option>
                ))}
              </select>
            </div>

            {/* Starting Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Starting Date
                </label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Starting Time
                </label>
                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Ending Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Ending Date
                </label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Ending Time
                </label>
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Stage Status */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Operational Stage Status
              </label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as StageStatus })}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Starting_Soon">Starting Soon</option>
                <option value="Next_Item">Next Item</option>
                <option value="On_Going">Live / On Going</option>
                <option value="Ended">Ended</option>
              </select>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
