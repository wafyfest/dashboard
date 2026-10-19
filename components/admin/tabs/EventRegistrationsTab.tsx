'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemModeBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Award,
  Users,
  Search,
  Building2,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  Phone,
  Copy,
  Check
} from 'lucide-react';
import { Item, College, Student, Registration } from '@/lib/types/fest';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { generateParticipantsListPdf, ParticipantPdfRow } from '@/lib/utils/participantsListPdf';
import { formatIstDisplay } from '@/lib/utils/istDate';

interface EnrolledParticipantRow {
  id: string;
  registration: Registration;
  student?: Student;
  college?: College;
  codeLetter?: string | null;
  isLate: boolean;
  registeredAt?: string;
}

export function EventRegistrationsTab() {
  const { festSettings, refreshKey } = useFest();

  const items = useMemo(() => festService.getItems(), [refreshKey]);
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const registrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const lateRegistrations = useMemo(() => festService.getLateRegistrations(), [refreshKey]);

  // Pre-index lookups
  const collegeMap = useMemo(() => new Map(colleges.map(c => [Number(c.affl_no), c])), [colleges]);
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => {
      if (s.chest_no) map.set(String(s.chest_no).toLowerCase(), s);
      if (s.admission_no) map.set(String(s.admission_no).toLowerCase(), s);
      if (s.id) map.set(String(s.id).toLowerCase(), s);
    });
    return map;
  }, [students]);

  // Group registrations by item_id
  const itemRegistrationsMap = useMemo(() => {
    const map = new Map<number, EnrolledParticipantRow[]>();
    registrations.forEach(r => {
      const itmId = Number(r.item_id);
      if (!map.has(itmId)) {
        map.set(itmId, []);
      }
      const col = collegeMap.get(Number(r.college_affl_no));
      const stu =
        findStudentByIdentifier(students, r.chest_no, r.college_affl_no) ||
        (r.chest_no ? studentMap.get(r.chest_no.toLowerCase()) : undefined);

      const isLate = lateRegistrations.some(
        l => Number(l.item_id) === itmId && l.chest_no === r.chest_no
      );

      map.get(itmId)!.push({
        id: r.id || `${r.college_affl_no}-${r.item_id}-${r.chest_no}`,
        registration: r,
        student: stu,
        college: col,
        codeLetter: r.code_letter,
        isLate,
        registeredAt: r.created_at
      });
    });
    return map;
  }, [registrations, collegeMap, students, studentMap, lateRegistrations]);

  // Filters state
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState<'All' | 'onstage' | 'offstage'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Registered' | 'Empty'>('All');

  // Expanded items state (set of item_ids)
  const [expandedItemIds, setExpandedItemIds] = useState<Set<number>>(() => {
    const firstWithRegs = items.find(i => (itemRegistrationsMap.get(Number(i.item_id))?.length ?? 0) > 0);
    return new Set(firstWithRegs ? [Number(firstWithRegs.item_id)] : []);
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleExpand = (itemId: number) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedItemIds(new Set(items.map(i => Number(i.item_id))));
  };

  const collapseAll = () => {
    setExpandedItemIds(new Set());
  };

  // Distinct phases for filter pills
  const distinctPhases = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.phase) set.add(i.phase);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return items.filter(itm => {
      const itmId = Number(itm.item_id);
      const regs = itemRegistrationsMap.get(itmId) || [];
      const regCount = regs.length;

      // Status filter
      if (statusFilter === 'Registered' && regCount === 0) return false;
      if (statusFilter === 'Empty' && regCount > 0) return false;

      // Phase filter
      if (phaseFilter !== 'All' && (itm.phase || itm.category || '').toLowerCase() !== phaseFilter.toLowerCase()) {
        return false;
      }

      // Mode filter
      if (modeFilter !== 'All' && itm.mode !== modeFilter) {
        return false;
      }

      // Search filter
      const q = eventSearchQuery.toLowerCase().trim();
      if (!q) return true;

      const name = (itm.name || itm.name_eng || '').toLowerCase();
      const code = (itm.code || itm.item_code || '').toLowerCase();
      const idStr = String(itm.item_id);

      if (name.includes(q) || code.includes(q) || idStr.includes(q)) return true;

      return regs.some(p => {
        const sName = (p.student?.name || p.student?.full_name || '').toLowerCase();
        const sChest = (p.student?.chest_no || p.registration.chest_no || '').toLowerCase();
        const cName = (p.college?.name || '').toLowerCase();
        const cShort = (p.college?.short_name || p.college?.code || '').toLowerCase();
        const cAffl = String(p.college?.affl_no || '');
        return sName.includes(q) || sChest.includes(q) || cName.includes(q) || cShort.includes(q) || cAffl.includes(q);
      });
    });
  }, [items, itemRegistrationsMap, statusFilter, phaseFilter, modeFilter, eventSearchQuery]);

  // Summary statistics
  const totalRegisteredEvents = useMemo(() => {
    return items.filter(i => (itemRegistrationsMap.get(Number(i.item_id))?.length ?? 0) > 0).length;
  }, [items, itemRegistrationsMap]);

  const totalRegisteredEntries = useMemo(() => {
    return registrations.length;
  }, [registrations]);

  // Export single event PDF
  const handleExportEventPdf = (itm: Item, participants: EnrolledParticipantRow[]) => {
    if (participants.length === 0) {
      alert(`No registered students found for event "${itm.name || itm.code}".`);
      return;
    }

    const rows: ParticipantPdfRow[] = participants.map(p => ({
      studentName: p.student?.name || p.student?.full_name || 'Participant',
      cicNo: String(p.student?.admission_no || '—'),
      chestNo: p.registration.chest_no || getCanonicalChestNo(p.student),
      category: p.student?.phase || itm.phase || itm.category || '—',
      itemName: itm.name || itm.name_eng || `Event #${itm.item_id}`,
      itemCode: itm.code || itm.item_code || `ITM-${itm.item_id}`,
      itemType: itm.item_type || ((itm.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
      itemMode: itm.mode === 'offstage' ? 'Off' : 'On',
      blindCode: p.codeLetter || 'Unassigned'
    }));

    const collegesCount = new Set(participants.map(p => p.college?.affl_no).filter(Boolean)).size;
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const doc = generateParticipantsListPdf({
      collegeName: `Event: ${itm.code} - ${itm.name}`,
      collegeAfflNo: `${collegesCount} Participating Colleges`,
      participants: rows,
      festName: festSettings?.fest_name || '14th Wafy Arts Fest',
      filterSummary: `${rows.length} total participants from ${collegesCount} colleges`
    });

    const safeName = (itm.name || itm.code || 'Event').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Event_${itm.code}_${safeName}_Roster.pdf`);
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. CLEAN HEADER & METRICS BAR */}
      <Card className="p-4 sm:p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Event Registrations Roster
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] font-medium">
                {items.length} Events Total
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Click the arrow (<ChevronRight className="w-3.5 h-3.5 inline text-[var(--text-secondary)]" />) on any event row to view registered students across all participating colleges.
            </p>
          </div>

          {/* Clean Metric Counters & Expand/Collapse */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Active Events: </span>
                <strong className="text-[var(--text-primary)] font-mono font-semibold">
                  {totalRegisteredEvents}
                </strong>
                <span className="text-[var(--text-muted)] font-mono"> / {items.length}</span>
              </div>
              <span className="text-[var(--border-subtle)]">|</span>
              <div>
                <span className="text-[var(--text-muted)]">Total Entries: </span>
                <strong className="text-[var(--text-primary)] font-mono font-semibold">
                  {totalRegisteredEntries}
                </strong>
              </div>
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={expandAll}
              className="h-8 text-xs font-medium"
            >
              Expand All
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={collapseAll}
              className="h-8 text-xs font-medium"
            >
              Collapse All
            </Button>
          </div>
        </div>

        {/* 2. MINIMALIST SEARCH & FILTER TOOLBAR */}
        <div className="mt-3.5 pt-3.5 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search event code, title, student name, chest #, or college..."
              value={eventSearchQuery}
              onChange={e => setEventSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>

          {/* Simple Neutral Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
              {(['All', 'Registered', 'Empty'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st === 'All'
                    ? `All (${items.length})`
                    : st === 'Registered'
                    ? `Registered (${totalRegisteredEvents})`
                    : `No Entries (${items.length - totalRegisteredEvents})`}
                </button>
              ))}
            </div>

            {/* Mode Filter */}
            <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
              {(['All', 'onstage', 'offstage'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-2 py-1 rounded text-xs font-medium capitalize transition-all ${
                    modeFilter === m
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m === 'All' ? 'All Modes' : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Phase Filter Tabs */}
        {distinctPhases.length > 2 && (
          <div className="flex items-center gap-1 overflow-x-auto text-xs mt-2.5 pt-1">
            <span className="text-[11px] font-medium text-[var(--text-muted)] mr-1 shrink-0">Phase:</span>
            {distinctPhases.map(ph => (
              <button
                key={ph}
                type="button"
                onClick={() => setPhaseFilter(ph)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all border shrink-0 ${
                  phaseFilter.toLowerCase() === ph.toLowerCase()
                    ? 'bg-slate-900 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {ph}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 3. COLLAPSIBLE EVENTS LIST */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <Card className="p-10 text-center bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                No events matched your search or filter criteria.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Try resetting your search query or choosing "All" in the filters above.
              </p>
            </div>
          </Card>
        ) : (
          filteredItems.map(item => {
            const itmId = Number(item.item_id);
            const participants = itemRegistrationsMap.get(itmId) || [];
            const isExpanded = expandedItemIds.has(itmId);
            const collegeCount = new Set(participants.map(p => p.college?.affl_no).filter(Boolean)).size;
            const lateCount = participants.filter(p => p.isLate).length;

            return (
              <div
                key={itmId || item.id}
                className={`rounded-lg border transition-colors bg-[var(--bg-surface)] overflow-hidden ${
                  isExpanded
                    ? 'border-slate-400 dark:border-slate-600'
                    : 'border-[var(--border-subtle)] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Event Row Header */}
                <div
                  onClick={() => toggleExpand(itmId)}
                  className={`p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                    isExpanded
                      ? 'bg-[var(--bg-canvas)]/70 border-b border-[var(--border-subtle)]'
                      : 'hover:bg-[var(--bg-canvas)]/40'
                  }`}
                >
                  {/* Left: Arrow + Code + Event Name + Metadata Badges */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Arrow Button */}
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse registered students' : 'Expand registered students'}
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-transform duration-150 ${
                        isExpanded
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 rotate-90'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Event Code Pill */}
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold shrink-0">
                      {item.code}
                    </span>

                    {/* Title & Category Info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate" title={item.name}>
                          {item.name}
                        </h3>
                        {item.name_mal && (
                          <span className="text-xs text-[var(--text-muted)] hidden sm:inline truncate max-w-[200px]">
                            ({item.name_mal})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <CategoryBadge category={item.phase || item.category} />
                        <ItemModeBadge mode={item.mode} size="sm" />
                        <ItemTypeBadge type={item.item_type || 'Single'} size="sm" />
                        <span className="hidden sm:inline">•</span>
                        <span className="text-[11px] font-mono hidden sm:inline">
                          Quota: {item.min_participants === item.max_participants ? item.min_participants : `${item.min_participants}-${item.max_participants}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Enrolled Count Badge + PDF Download Button */}
                  <div
                    className="flex items-center gap-2 shrink-0 self-end md:self-center"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Participant Counts Badge */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {participants.length > 0 ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] font-medium">
                          <span className="font-mono font-semibold">{participants.length}</span>
                          <span className="text-[var(--text-muted)]">{participants.length === 1 ? 'Student' : 'Students'}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="font-mono font-semibold">{collegeCount}</span>
                          <span className="text-[var(--text-muted)]">{collegeCount === 1 ? 'College' : 'Colleges'}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)] text-xs italic">
                          No Registrations
                        </span>
                      )}

                      {lateCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          {lateCount} Late
                        </span>
                      )}
                    </div>

                    {/* PDF Export Button */}
                    {participants.length > 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleExportEventPdf(item, participants)}
                        className="h-7 text-xs gap-1 font-medium whitespace-nowrap"
                        title={`Download official participants PDF for ${item.name}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Export PDF</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Students Roll Table */}
                {isExpanded && (
                  <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-[var(--border-subtle)]">
                    {participants.length === 0 ? (
                      <div className="py-8 text-center bg-[var(--bg-surface)] rounded-lg border border-dashed border-[var(--border-subtle)]">
                        <Users className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                          No students from any college have registered for this event yet.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Colleges can register their delegates before the deadline.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
                        <div className="p-2.5 px-3.5 bg-[var(--bg-canvas)]/70 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">
                              Enrolled Participants
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-200/70 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {participants.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                            <span>
                              <strong className="text-[var(--text-primary)] font-mono">{collegeCount}</strong> {collegeCount === 1 ? 'College' : 'Colleges'}
                            </span>
                            {lateCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                • {lateCount} Late Entries
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <Table className="w-full text-xs">
                            <TableHeader>
                              <TableRow className="border-b border-[var(--border-subtle)]">
                                <TableHead className="w-10 text-center font-semibold py-2.5">#</TableHead>
                                <TableHead className="w-56 font-semibold py-2.5 pl-3">Student & Chest #</TableHead>
                                <TableHead className="w-64 font-semibold py-2.5">College / Institution</TableHead>
                                <TableHead className="w-36 font-semibold py-2.5">Admission / Phone</TableHead>
                                <TableHead className="w-24 font-semibold py-2.5 text-center">Blind Code</TableHead>
                                <TableHead className="w-28 font-semibold py-2.5 text-center">Entry Status</TableHead>
                                <TableHead className="w-40 font-semibold py-2.5 text-right pr-4">Registered (IST)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {participants.map((p, pIdx) => {
                                const chestNo = p.registration.chest_no || getCanonicalChestNo(p.student);
                                const stuName = p.student?.name || p.student?.full_name || 'Participant';
                                const initials = stuName
                                  .split(' ')
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map(w => w[0])
                                  .join('')
                                  .toUpperCase() || 'ST';
                                const isCopied = copiedId === `chest-${p.id}`;

                                return (
                                  <TableRow
                                    key={p.id}
                                    className="border-b border-[var(--border-subtle)]/40 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors"
                                  >
                                    {/* Index */}
                                    <TableCell className="py-2.5 text-center font-mono text-[var(--text-muted)] text-[11px]">
                                      {pIdx + 1}
                                    </TableCell>

                                    {/* Student Name & Chest */}
                                    <TableCell className="py-2.5 pl-3 align-middle">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                                          {initials}
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                          <div className="font-bold text-[var(--text-primary)] text-xs truncate max-w-[170px]" title={stuName}>
                                            {stuName}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(chestNo, `chest-${p.id}`)}
                                              className="group/btn inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-slate-400 dark:hover:border-slate-500 text-[var(--text-secondary)] transition-colors"
                                              title="Click to copy Chest Number"
                                            >
                                              <span>{chestNo}</span>
                                              {isCopied ? (
                                                <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                              ) : (
                                                <Copy className="w-2.5 h-2.5 text-[var(--text-muted)] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                              )}
                                            </button>
                                            {p.student?.class && (
                                              <span className="text-[10px] text-[var(--text-muted)]">
                                                {p.student.class}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>

                                    {/* College / Institution */}
                                    <TableCell className="py-2.5 align-middle">
                                      {p.college ? (
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-[var(--border-subtle)] bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] font-semibold">
                                              #{p.college.affl_no}
                                            </span>
                                            <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[190px]" title={p.college.name}>
                                              {p.college.short_name || p.college.name}
                                            </span>
                                          </div>
                                          <div className="text-[10.5px] text-[var(--text-muted)] truncate max-w-[210px]" title={p.college.name}>
                                            {p.college.name}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="font-mono text-xs text-[var(--text-muted)]">
                                          College #{p.registration.college_affl_no}
                                        </span>
                                      )}
                                    </TableCell>

                                    {/* Admission & Phone */}
                                    <TableCell className="py-2.5 align-middle">
                                      <div className="text-xs space-y-0.5">
                                        <div className="font-mono font-medium text-[var(--text-secondary)]">
                                          {p.student?.admission_no || '—'}
                                        </div>
                                        {p.student?.phone ? (
                                          <div className="text-[10.5px] text-[var(--text-muted)] font-mono flex items-center gap-1">
                                            <Phone className="w-2.5 h-2.5" />
                                            <span>{p.student.phone}</span>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-[var(--text-muted)]">No phone</span>
                                        )}
                                      </div>
                                    </TableCell>

                                    {/* Blind Code */}
                                    <TableCell className="py-2.5 align-middle text-center">
                                      {p.codeLetter ? (
                                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-2xs">
                                          {p.codeLetter}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                                      )}
                                    </TableCell>

                                    {/* Entry Status */}
                                    <TableCell className="py-2.5 align-middle text-center">
                                      {p.isLate ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                          Late Entry
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          On Time
                                        </span>
                                      )}
                                    </TableCell>

                                    {/* Registered Date */}
                                    <TableCell className="py-2.5 align-middle text-right pr-4 font-mono text-[11px] text-[var(--text-muted)]">
                                      {p.registeredAt ? formatIstDisplay(p.registeredAt) : '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Summary Footer */}
                        <div className="p-2 px-3.5 bg-[var(--bg-canvas)]/40 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>
                            Total: <strong className="text-[var(--text-primary)] font-mono">{participants.length}</strong> registered students
                          </span>
                          <span>
                            Item Code: <strong className="text-[var(--text-primary)] font-mono">{item.code}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
