'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useThemedAlert } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { College, LateRegistration } from '@/lib/types/fest';
import { findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { formatIstDisplay } from '@/lib/utils/istDate';
import {
  Building2,
  Search,
  X,
  ShieldAlert,
  AlertTriangle,
  Unlock,
  Lock,
  Phone,
  Mail,
  MapPin,
  Eye,
  ArrowUpDown,
  GraduationCap,
  Users,
  CheckCircle2,
  Info,
  DollarSign,
  RotateCcw,
  Receipt,
  Check
} from 'lucide-react';

interface CollegesTabProps {
  onOpenMatrix?: () => void;
  hideMetrics?: boolean;
}

type FilterType = 'all' | 'override' | 'fine' | 'clear';
type SortType = 'affl_asc' | 'affl_desc' | 'name_asc';

export function CollegesTab({ onOpenMatrix, hideMetrics = false }: CollegesTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const { showConfirm } = useThemedAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('affl_asc');
  const [selectedCollegeForDetail, setSelectedCollegeForDetail] = useState<College | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Apply Fine Modal State
  const [collegeForFineModal, setCollegeForFineModal] = useState<College | null>(null);
  const [fineModalAmount, setFineModalAmount] = useState<number>(500);
  const [fineModalReason, setFineModalReason] = useState<string>('Administrative Penalty');

  // Waive & Manage Event Fines Modal State
  const [collegeForWaiveModal, setCollegeForWaiveModal] = useState<College | null>(null);

  // Reactive colleges from festService keyed to refreshKey
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);

  // Reactive items, students & registrations
  const allItems = useMemo(() => festService.getItems(), [refreshKey]);
  const allStudents = useMemo(() => festService.getStudents(), [refreshKey]);
  const allRegistrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const itemMap = useMemo(() => new Map(allItems.map(i => [Number(i.item_id || i.id), i])), [allItems]);

  // Group late entries by event for the selected waive modal college
  const waiveModalLateEntries = useMemo(() => {
    if (!collegeForWaiveModal) return [];
    return festService.getLateRegistrations(collegeForWaiveModal.affl_no);
  }, [collegeForWaiveModal, refreshKey]);

  const eventFineGroups = useMemo(() => {
    if (!collegeForWaiveModal) return [];
    const map = new Map<number, {
      itemId: number;
      itemCode: string;
      itemName: string;
      category: string;
      mode: string;
      entries: Array<{
        raw: LateRegistration;
        id?: string;
        chestNo: string;
        cicNo?: number | null;
        studentName?: string;
        fineTier: 'fine' | 'super_fine';
        fineAmount: number;
        lateReason?: string;
        registeredAt?: string;
        isWaived: boolean;
      }>;
      totalAmount: number;
      pendingAmount: number;
      waivedAmount: number;
      isAllWaived: boolean;
    }>();

    waiveModalLateEntries.forEach(l => {
      const itmId = Number(l.item_id);
      if (!map.has(itmId)) {
        const itm = itemMap.get(itmId);
        map.set(itmId, {
          itemId: itmId,
          itemCode: itm?.item_code || itm?.code || `ITM-${itmId}`,
          itemName: itm?.name_eng || itm?.name || `Event #${itmId}`,
          category: itm?.category || itm?.phase || 'General',
          mode: itm?.mode || 'onstage',
          entries: [],
          totalAmount: 0,
          pendingAmount: 0,
          waivedAmount: 0,
          isAllWaived: true,
        });
      }

      const group = map.get(itmId)!;
      const matchedStudent = findStudentByIdentifier(allStudents, (l as any).cic_no || l.chest_no, collegeForWaiveModal.affl_no);
      const studentName = matchedStudent?.name?.trim() ? matchedStudent.name.trim() : null;
      const amt = Number(l.fine_amount) || (l.fine_tier === 'super_fine' ? 1000 : 500);
      const isWaived = Boolean(l.is_waived);

      group.entries.push({
        raw: l,
        id: l.id,
        chestNo: l.chest_no,
        cicNo: l.cic_no != null ? Number(l.cic_no) : null,
        studentName: studentName || undefined,
        fineTier: (l.fine_tier as 'fine' | 'super_fine') || 'fine',
        fineAmount: amt,
        lateReason: l.late_reason,
        registeredAt: l.registered_at,
        isWaived,
      });

      group.totalAmount += amt;
      if (isWaived) {
        group.waivedAmount += amt;
      } else {
        group.pendingAmount += amt;
        group.isAllWaived = false;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true }));
  }, [collegeForWaiveModal, waiveModalLateEntries, itemMap, allStudents]);

  const regCountByCollege = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of allRegistrations) {
      if (r.college_affl_no) {
        counts.set(r.college_affl_no, (counts.get(r.college_affl_no) || 0) + 1);
      }
    }
    return counts;
  }, [allRegistrations]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let overrideCount = 0;
    let fineCount = 0;

    for (const col of colleges) {
      if (col.manual_lock_override) overrideCount++;
      if (col.fine_status) fineCount++;
    }

    return {
      totalColleges: colleges.length,
      overrideCount,
      fineCount,
      clearCount: colleges.length - overrideCount - fineCount,
      totalRegistrations: allRegistrations.length
    };
  }, [colleges, allRegistrations]);

  // Filter & Sort
  const filteredColleges = useMemo(() => {
    let result = [...colleges];

    // Status filter
    if (activeFilter === 'override') {
      result = result.filter(c => c.manual_lock_override);
    } else if (activeFilter === 'fine') {
      result = result.filter(c => c.fine_status);
    } else if (activeFilter === 'clear') {
      result = result.filter(c => !c.manual_lock_override && !c.fine_status);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const afflStr = c.affl_no?.toString() || '';
        const name = (c.name || '').toLowerCase();
        const shortName = (c.short_name || c.code || '').toLowerCase();
        const coordName = (c.coordinator_name || c.staff_coordinator_name || c.team_manager_name || '').toLowerCase();
        const phone = (c.coordinator_phone || c.staff_coordinator_phone || '').toLowerCase();
        return (
          afflStr.includes(q) ||
          name.includes(q) ||
          shortName.includes(q) ||
          coordName.includes(q) ||
          phone.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'affl_asc') {
        return (Number(a.affl_no) || 0) - (Number(b.affl_no) || 0);
      }
      if (sortBy === 'affl_desc') {
        return (Number(b.affl_no) || 0) - (Number(a.affl_no) || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return result;
  }, [colleges, activeFilter, searchQuery, sortBy]);

  // Handlers
  const handleToggleOverride = async (afflNo: number) => {
    setIsProcessing(true);
    try {
      await festService.toggleCollegeLockOverride(afflNo);
      triggerRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFineModal = (col: College) => {
    setCollegeForFineModal(col);
    setFineModalAmount(500);
    setFineModalReason('Administrative Penalty');
  };

  const handleApplyFineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeForFineModal) return;
    setIsProcessing(true);
    try {
      await festService.applyCollegeFine(collegeForFineModal.affl_no, fineModalAmount, fineModalReason);
      triggerRefresh();
      setCollegeForFineModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWaiveAll = async (afflNo: number, collegeName: string, netAmount: number) => {
    const amountLabel = netAmount > 0 ? ` (₹${netAmount.toLocaleString('en-IN')})` : '';
    const confirmed = await showConfirm({
      title: 'Waive Institutional Fines',
      message: `Waive all pending fines${amountLabel} for #${afflNo} ${collegeName}?`,
      type: 'warning',
      confirmText: 'Waive Fines',
    });
    if (confirmed) {
      setIsProcessing(true);
      try {
        await festService.waiveCollegeAllFines(afflNo);
        triggerRefresh();
        const fresh = festService.getCollege(afflNo);
        if (selectedCollegeForDetail?.affl_no === afflNo) {
          setSelectedCollegeForDetail(fresh || null);
        }
        if (collegeForWaiveModal?.affl_no === afflNo) {
          setCollegeForWaiveModal(fresh || null);
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleOpenWaiveModal = async (col: College) => {
    setCollegeForWaiveModal(col);
    try {
      await festService.fetchLateRegistrationsForCollege(col.affl_no);
      triggerRefresh();
    } catch (err) {
      console.warn('Failed to prefetch college late registrations:', err);
    }
  };

  const handleToggleEventWaiver = async (itemId: number, isWaived: boolean) => {
    if (!collegeForWaiveModal) return;
    setIsProcessing(true);
    try {
      const afflNo = collegeForWaiveModal.affl_no;
      await festService.toggleLateRegistrationWaiver('', isWaived, afflNo, itemId);
      await festService.fetchLateRegistrationsForCollege(afflNo);
      triggerRefresh();
      const fresh = festService.getCollege(afflNo);
      if (fresh) {
        setCollegeForWaiveModal(fresh);
        if (selectedCollegeForDetail?.affl_no === fresh.affl_no) {
          setSelectedCollegeForDetail(fresh);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEntryWaiver = async (rawEntry: LateRegistration, isWaived: boolean) => {
    if (!collegeForWaiveModal) return;
    setIsProcessing(true);
    try {
      const afflNo = collegeForWaiveModal.affl_no;
      await festService.toggleLateRegistrationWaiver(
        rawEntry.id || '',
        isWaived,
        afflNo,
        rawEntry.item_id,
        rawEntry.chest_no
      );
      await festService.fetchLateRegistrationsForCollege(afflNo);
      triggerRefresh();
      const fresh = festService.getCollege(afflNo);
      if (fresh) {
        setCollegeForWaiveModal(fresh);
        if (selectedCollegeForDetail?.affl_no === fresh.affl_no) {
          setSelectedCollegeForDetail(fresh);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWaiveManualFine = async () => {
    if (!collegeForWaiveModal) return;
    setIsProcessing(true);
    try {
      const afflNo = collegeForWaiveModal.affl_no;
      await festService.waiveCollegeManualFine(afflNo);
      triggerRefresh();
      const fresh = festService.getCollege(afflNo);
      if (fresh) {
        setCollegeForWaiveModal(fresh);
        if (selectedCollegeForDetail?.affl_no === fresh.affl_no) {
          setSelectedCollegeForDetail(fresh);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWaiveAllFromModal = async () => {
    if (!collegeForWaiveModal) return;
    const summary = festService.getCollegeFineSummary(collegeForWaiveModal.affl_no);
    await handleWaiveAll(collegeForWaiveModal.affl_no, collegeForWaiveModal.name, summary.netFine);
  };

  const handleRevokeAllOverrides = async () => {
    if (metrics.overrideCount === 0) return;
    const confirmed = await showConfirm({
      title: 'Lock Overrides',
      message: `Lock all ${metrics.overrideCount} currently unlocked colleges back to standard lock rules?`,
      type: 'warning',
      confirmText: 'Lock All',
    });
    if (confirmed) {
      setIsProcessing(true);
      try {
        const revoked = await festService.revokeAllCollegeLockOverrides();
        triggerRefresh();
        alert(`Successfully locked ${revoked} institutions.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* 1. TOP KPI SUMMARY METRICS */}
      {!hideMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Colleges */}
          <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl hover:border-[var(--border-medium)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Participating Colleges
                </p>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {metrics.totalColleges}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-amber-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> All institutions active
            </div>
          </Card>

          {/* Unlocked Colleges */}
          <Card className={`p-4 border [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl transition-all ${metrics.overrideCount > 0
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Unlocked Colleges
                </p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {metrics.overrideCount}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              {metrics.overrideCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Unlocked across events
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">All standard locks enforced</span>
              )}
            </div>
          </Card>

          {/* Late Fines Flagged */}
          <Card className={`p-4 border [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl transition-all ${metrics.fineCount > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Late Fines Applied
                </p>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {metrics.fineCount}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <span>{metrics.fineCount} institution(s) penalized</span>
            </div>
          </Card>

          {/* Total Student Registrations */}
          <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl hover:border-[var(--border-medium)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Total Registrations
                </p>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {metrics.totalRegistrations}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-purple-500" /> Across all colleges
            </div>
          </Card>
        </div>
      )}

      {/* 2. TOOLBAR: SEARCH, FILTERS & ACTION CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 sm:p-4 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Affl #, college name, code, coordinator..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Segmented Filter */}
          <div className="flex items-center rounded-xl p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeFilter === 'all'
                  ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              All ({metrics.totalColleges})
            </button>
            <button
              onClick={() => setActiveFilter('override')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeFilter === 'override'
                  ? 'bg-amber-500 text-[#090d1a] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              Unlocked ({metrics.overrideCount})
            </button>
            <button
              onClick={() => setActiveFilter('fine')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeFilter === 'fine'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              Fines ({metrics.fineCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="min-w-[170px]">
            <Select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="py-1 text-xs"
            >
              <option value="affl_asc">Affl # Ascending</option>
              <option value="affl_desc">Affl # Descending</option>
              <option value="name_asc">Name (A → Z)</option>
            </Select>
          </div>

          {/* Bulk Lock All (Only shown if any colleges are unlocked) */}
          {metrics.overrideCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRevokeAllOverrides}
              disabled={isProcessing}
              className="text-xs h-8 px-2.5 font-semibold shadow-xs"
              title="Lock all unlocked colleges back to standard rules"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Lock All ({metrics.overrideCount})
            </Button>
          )}

          {/* View Locks Matrix Button */}
          {onOpenMatrix && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenMatrix}
              className="text-xs h-8 px-2.5 font-medium border-[var(--border-medium)] hover:bg-[var(--bg-subtle)]"
            >
              <Unlock className="w-3.5 h-3.5 mr-1 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
              View 2D Matrix
            </Button>
          )}
        </div>
      </div>

      {/* 3. COMPACT, SCREEN-FITTED TABLE */}
      <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 font-bold text-[var(--text-secondary)] py-2.5 pl-4">
                  Affl #
                </TableHead>
                <TableHead className="min-w-[200px] max-w-[280px] font-bold text-[var(--text-secondary)] py-2.5">
                  Institution
                </TableHead>
                <TableHead className="w-52 font-bold text-[var(--text-secondary)] py-2.5">
                  Coordinator & Contact
                </TableHead>
                <TableHead className="w-28 text-center font-bold text-[var(--text-secondary)] py-2.5">
                  Enrolled / Quota
                </TableHead>
                <TableHead className="w-36 text-center font-bold text-[var(--text-secondary)] py-2.5">
                  Status
                </TableHead>
                <TableHead className="w-56 text-right font-bold text-[var(--text-secondary)] py-2.5 pr-4">
                  Controls
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                    <p className="font-medium text-sm text-[var(--text-primary)]">No colleges match the selected filter or search.</p>
                    <p className="text-xs mt-1 text-[var(--text-muted)]">Try resetting the search query or status filter.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredColleges.map(col => {
                  const regCount = regCountByCollege.get(col.affl_no) || 0;
                  const totalQuota =
                    (col.st_pre_foundation || 0) +
                    (col.st_foundation || 0) +
                    (col.st_thamheediya || 0) +
                    (col.st_aliya || 0) +
                    (col.st_pg || 0);

                  return (
                    <TableRow
                      key={col.id || col.affl_no}
                      className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-subtle)]/70 transition-colors"
                    >
                      {/* Affl # & Code */}
                      <TableCell className="py-2.5 pl-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-sm leading-tight">
                            #{col.affl_no}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                            {col.short_name || col.code || 'COL'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Institution Full Name & Type */}
                      <TableCell className="py-2.5 align-middle max-w-[280px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-[var(--text-primary)] text-xs leading-snug line-clamp-1"
                            title={col.name}
                          >
                            {col.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            {col.type || 'wafy'}
                          </span>
                          {col.union_name && (
                            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">
                              {col.union_name}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Coordinator & Contact */}
                      <TableCell className="py-2.5 align-middle">
                        <div className="font-semibold text-[var(--text-primary)] text-xs leading-tight truncate max-w-[200px]">
                          {col.coordinator_name || col.staff_coordinator_name || col.team_manager_name || 'Coordinator Unassigned'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)] font-mono">
                          {(col.coordinator_phone || col.staff_coordinator_phone || col.contact_no) && (
                            <span className="flex items-center gap-0.5 text-[var(--text-secondary)]">
                              <Phone className="w-2.5 h-2.5 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                              {col.coordinator_phone || col.staff_coordinator_phone || col.contact_no}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Enrolled Students / Quota */}
                      <TableCell className="py-2.5 align-middle text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {regCount} <span className="text-[10px] font-normal text-[var(--text-muted)]">Regs</span>
                          </span>
                          <span
                            className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 cursor-help"
                            title={`Category Quotas: Pre-Foundation: ${col.st_pre_foundation || 0} | Foundation: ${col.st_foundation || 0} | Thamheediyya: ${col.st_thamheediya || 0} | Aliya: ${col.st_aliya || 0} | PG: ${col.st_pg || 0}`}
                          >
                            Quota: {totalQuota > 0 ? totalQuota : '—'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badges */}
                      <TableCell className="py-2.5 align-middle text-center">
                        {(() => {
                          const fineSummary = festService.getCollegeFineSummary(col.affl_no);
                          return (
                            <div className="flex flex-col items-center gap-1">
                              {col.manual_lock_override ? (
                                <Badge variant="amber" size="sm" className="text-[10px] px-1.5 py-0 leading-tight">
                                  Unlocked
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                  Locked
                                </span>
                              )}

                              {fineSummary.hasActiveFine ? (
                                <Badge
                                  variant="destructive"
                                  size="sm"
                                  className="text-[10px] px-1.5 py-0 leading-tight font-mono font-bold"
                                  title={
                                    fineSummary.manualFine > 0
                                      ? `Late Fines: ₹${fineSummary.pendingAutoFine.toLocaleString('en-IN')} | Admin Fine: ₹${fineSummary.manualFine.toLocaleString('en-IN')} (${fineSummary.manualFineReason})`
                                      : `Pending Late Fines: ₹${fineSummary.pendingAutoFine.toLocaleString('en-IN')}`
                                  }
                                >
                                  Fine: ₹{fineSummary.netFine.toLocaleString('en-IN')}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Fine Clear
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Controls Buttons */}
                      <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                        {(() => {
                          const fineSummary = festService.getCollegeFineSummary(col.affl_no);
                          return (
                            <div className="inline-flex items-center gap-1">
                              {/* Lock / Unlock Toggle */}
                              <Button
                                size="xs"
                                variant={col.manual_lock_override ? 'destructive' : 'outline'}
                                onClick={() => handleToggleOverride(col.affl_no)}
                                disabled={isProcessing}
                                className={`h-7 px-2 text-xs font-semibold ${col.manual_lock_override
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
                                    : 'text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-500/40'
                                  }`}
                                title={
                                  col.manual_lock_override
                                    ? 'Lock this college to standard event & deadline rules'
                                    : 'Unlock this college for all events'
                                }
                              >
                                {col.manual_lock_override ? (
                                  <>
                                    <Lock className="w-3 h-3 mr-1" /> Lock
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3 mr-1 text-emerald-500" /> Unlock
                                  </>
                                )}
                              </Button>

                              {/* Fine Action: Waive if active, Apply modal if not */}
                              {fineSummary.hasActiveFine ? (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleOpenWaiveModal(col)}
                                  disabled={isProcessing}
                                  className="h-7 px-2 text-xs font-semibold border-rose-400/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title={`Waive or manage specific event fines (₹${fineSummary.netFine.toLocaleString('en-IN')}) for this college`}
                                >
                                  Waive
                                </Button>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => handleOpenFineModal(col)}
                                  disabled={isProcessing}
                                  className="h-7 px-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                  title="Apply administrative fine with amount & reason"
                                >
                                  Fine
                                </Button>
                              )}

                              {/* Details Modal Trigger */}
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setSelectedCollegeForDetail(col)}
                                className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                                title="View Full Institution Details & Quotas"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Info Row */}
        <div className="bg-[var(--bg-subtle)] px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>
            Showing <strong className="text-[var(--text-primary)]">{filteredColleges.length}</strong> of{' '}
            {metrics.totalColleges} institutions
          </span>
          <span className="font-mono">
            {metrics.overrideCount > 0 ? (
              <span className="text-amber-500 font-semibold">⚠️ {metrics.overrideCount} college(s) unlocked</span>
            ) : (
              'All institutions standard locked'
            )}
          </span>
        </div>
      </div>

      {/* 4. QUICK COLLEGE DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedCollegeForDetail)}
        onClose={() => setSelectedCollegeForDetail(null)}
        title={selectedCollegeForDetail ? `${selectedCollegeForDetail.name} (#${selectedCollegeForDetail.affl_no})` : 'Institution Details'}
        description="Comprehensive coordinator contacts, institution address, and category student strength quotas."
        maxWidth="2xl"
      >
        {selectedCollegeForDetail && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Header Identity Badge Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  Affiliation #{selectedCollegeForDetail.affl_no}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  Code: {selectedCollegeForDetail.short_name || selectedCollegeForDetail.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-amber-500/10 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-amber-500/30">
                  Type: {selectedCollegeForDetail.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedCollegeForDetail.manual_lock_override && (
                  <Badge variant="amber" size="sm">
                    Unlocked
                  </Badge>
                )}
                {selectedCollegeForDetail.fine_status ? (
                  <Badge variant="destructive" size="sm">
                    Late Fine Applied
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    Fine Clear
                  </Badge>
                )}
              </div>
            </div>

            {/* Address & Union Info */}
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5">
              <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Institution Location & Union
              </h4>
              <p className="text-[var(--text-secondary)]">
                {selectedCollegeForDetail.address || 'Address not registered in database.'}
              </p>
              {selectedCollegeForDetail.union_name && (
                <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--text-muted)]">
                  <span>Union: <strong>{selectedCollegeForDetail.union_name}</strong></span>
                  {selectedCollegeForDetail.union_email && (
                    <span>Email: <strong>{selectedCollegeForDetail.union_email}</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* Contact Personnel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Staff Coordinator */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Staff Coordinator
                </p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {selectedCollegeForDetail.staff_coordinator_name || selectedCollegeForDetail.coordinator_name || '—'}
                </p>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                  {selectedCollegeForDetail.staff_coordinator_phone || selectedCollegeForDetail.coordinator_phone || '—'}
                </div>
              </div>

              {/* Team Manager */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Team Manager
                </p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {selectedCollegeForDetail.team_manager_name || '—'}
                </p>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-sky-500" />
                  {selectedCollegeForDetail.team_manager_phone || '—'}
                </div>
              </div>

              {/* Assistant Team Manager */}
              {selectedCollegeForDetail.asst_team_manager_name && (
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Assistant Team Manager
                  </p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {selectedCollegeForDetail.asst_team_manager_name}
                  </p>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-500" />
                    {selectedCollegeForDetail.asst_team_manager_phone || '—'}
                  </div>
                </div>
              )}
            </div>

            {/* Student Strength Quotas */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <h4 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5 text-xs">
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> Category Student Quotas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Pre-Foundation</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_pre_foundation || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Foundation</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_foundation || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Thamheediyya</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_thamheediya || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Aliya</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_aliya || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">PG</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_pg || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant={selectedCollegeForDetail.manual_lock_override ? 'destructive' : 'outline'}
                  onClick={async () => {
                    await handleToggleOverride(selectedCollegeForDetail.affl_no);
                    const fresh = festService.getCollege(selectedCollegeForDetail.affl_no);
                    if (fresh) setSelectedCollegeForDetail(fresh);
                  }}
                >
                  {selectedCollegeForDetail.manual_lock_override ? 'Lock College' : 'Unlock College'}
                </Button>
                {(() => {
                  const summary = festService.getCollegeFineSummary(selectedCollegeForDetail.affl_no);
                  return summary.hasActiveFine ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleOpenWaiveModal(selectedCollegeForDetail)}
                      className="border-rose-400/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Waive Fines (₹{summary.netFine.toLocaleString('en-IN')})
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleOpenFineModal(selectedCollegeForDetail)}
                      className="cursor-pointer"
                    >
                      Apply Fine
                    </Button>
                  );
                })()}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setSelectedCollegeForDetail(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* APPLY FINE MODAL */}
      {collegeForFineModal && (
        <Modal
          isOpen={Boolean(collegeForFineModal)}
          onClose={() => setCollegeForFineModal(null)}
          title={`Apply Fine: #${collegeForFineModal.affl_no} ${collegeForFineModal.name}`}
          description="Allocate an administrative penalty amount and specify the official committee reason."
          maxWidth="md"
        >
          <form onSubmit={handleApplyFineSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Fine Amount (₹)
              </label>
              <div className="flex items-center gap-2 mb-2">
                {[500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFineModalAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      fineModalAmount === amt
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] border-transparent shadow-xs'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={fineModalAmount}
                onChange={e => setFineModalAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                placeholder="Enter fine amount..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Official Penalty Reason
              </label>
              <input
                type="text"
                value={fineModalReason}
                onChange={e => setFineModalReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                placeholder="e.g. Late stage reporting, Roster dispute, Disciplinary fee..."
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCollegeForFineModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isProcessing}
                className="font-semibold cursor-pointer"
              >
                Apply Fine • ₹{fineModalAmount.toLocaleString('en-IN')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* WAIVE & MANAGE EVENT FINES MODAL */}
      {collegeForWaiveModal && (() => {
        const summary = festService.getCollegeFineSummary(collegeForWaiveModal.affl_no);
        return (
          <Modal
            isOpen={Boolean(collegeForWaiveModal)}
            onClose={() => setCollegeForWaiveModal(null)}
            title={`Manage & Waive Fines: #${collegeForWaiveModal.affl_no} ${collegeForWaiveModal.name}`}
            description="Selectively remove or waive fines for specific events, or forgive all institutional penalties."
            maxWidth="3xl"
          >
            <div className="space-y-4">
              {/* Summary KPIs & Waive All Button */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Net Outstanding</div>
                    <div className="text-base font-black font-mono text-rose-500 mt-0.5">
                      ₹{summary.netFine.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Late Reg Fines</div>
                    <div className="text-sm font-bold font-mono text-[var(--text-primary)] mt-0.5">
                      ₹{summary.pendingAutoFine.toLocaleString('en-IN')}
                      {summary.waivedAutoFine > 0 && (
                        <span className="text-[10px] text-emerald-500 font-normal ml-1">
                          (₹{summary.waivedAutoFine.toLocaleString('en-IN')} waived)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Manual Fine</div>
                    <div className="text-sm font-bold font-mono text-[var(--text-primary)] mt-0.5">
                      ₹{summary.manualFine.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {summary.netFine > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleWaiveAllFromModal}
                    disabled={isProcessing}
                    className="shrink-0 font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
                    title="Waive all late entry and manual fines for this college in one click"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Waive All (₹{summary.netFine.toLocaleString('en-IN')})
                  </Button>
                )}
              </div>

              {/* Specific Fined Events Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-heading">
                      Fined Events ({eventFineGroups.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Selectively waive or reinstate specific event fines
                  </span>
                </div>

                {eventFineGroups.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-center space-y-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      No Itemized Event Late Registrations
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] max-w-md mx-auto">
                      There are no registered events stamped with late fines for this institution.
                    </p>
                    {collegeForWaiveModal.fine_status && summary.manualFine === 0 && (
                      <div className="pt-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={handleWaiveAllFromModal}
                          disabled={isProcessing}
                          className="border-rose-400/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Clear Institutional Fine Flag
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {eventFineGroups.map(group => (
                      <div
                        key={group.itemId}
                        className={`p-3 rounded-xl border transition-all ${
                          group.pendingAmount === 0
                            ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
                        }`}
                      >
                        {/* Event Header Row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                              {group.itemCode}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {group.itemName}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">
                              {group.category}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize py-0">
                              {group.mode}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {group.pendingAmount > 0 ? (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold">
                                Pending: ₹{group.pendingAmount.toLocaleString('en-IN')}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                                <Check className="w-3 h-3 mr-1 inline" /> All Waived (₹{group.waivedAmount.toLocaleString('en-IN')})
                              </Badge>
                            )}

                            {/* Event-Level Bulk Waiver Button */}
                            <Button
                              size="xs"
                              variant={group.pendingAmount > 0 ? 'destructive' : 'outline'}
                              disabled={isProcessing}
                              onClick={() => handleToggleEventWaiver(group.itemId, group.pendingAmount > 0)}
                              className={`h-6 px-2 text-[11px] font-semibold cursor-pointer ${
                                group.pendingAmount > 0
                                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                              title={
                                group.pendingAmount > 0
                                  ? `Waive fines for all entries in ${group.itemCode}`
                                  : `Reinstate fines for ${group.itemCode}`
                              }
                            >
                              {group.pendingAmount > 0 ? (
                                <>Waive Event (₹{group.pendingAmount.toLocaleString('en-IN')})</>
                              ) : (
                                <>Reinstate Event</>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Itemized Participant Entries under Event */}
                        <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-subtle)]/60">
                          {group.entries.map((entry, idx) => (
                            <div
                              key={entry.id || `${group.itemId}-${entry.chestNo}-${idx}`}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[var(--bg-subtle)]/60 hover:bg-[var(--bg-subtle)] transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-[11px] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                                  {entry.chestNo}
                                </span>
                                {entry.studentName && (
                                  <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-[240px]">
                                    {entry.studentName}
                                  </span>
                                )}
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                                  entry.fineTier === 'super_fine'
                                    ? 'bg-orange-500/15 text-orange-600 border border-orange-500/30'
                                    : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                }`}>
                                  {entry.fineTier === 'super_fine' ? 'Super Fine' : 'Late Fine'}
                                </span>
                                {entry.registeredAt && (
                                  <span className="text-[10px] text-[var(--text-muted)] hidden md:inline">
                                    {formatIstDisplay(entry.registeredAt)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono font-bold text-[11px] ${
                                  entry.isWaived ? 'line-through text-[var(--text-muted)]' : 'text-rose-500'
                                }`}>
                                  ₹{entry.fineAmount.toLocaleString('en-IN')}
                                </span>

                                <Button
                                  size="xs"
                                  variant="ghost"
                                  disabled={isProcessing}
                                  onClick={() => handleToggleEntryWaiver(entry.raw, !entry.isWaived)}
                                  className={`h-5 px-1.5 text-[10px] font-semibold cursor-pointer ${
                                    entry.isWaived
                                      ? 'text-[var(--text-muted)] hover:text-amber-500'
                                      : 'text-rose-500 hover:bg-rose-500/10'
                                  }`}
                                  title={entry.isWaived ? 'Reinstate fine for this entry' : 'Waive fine for this specific student entry'}
                                >
                                  {entry.isWaived ? 'Reinstate' : 'Waive'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Administrative Penalty Card */}
              {(Number(collegeForWaiveModal.manual_fine_amount) || 0) > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span>Manual Administrative Fine:</span>
                        <span className="font-mono text-rose-500 font-bold">
                          ₹{(Number(collegeForWaiveModal.manual_fine_amount) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Reason: {collegeForWaiveModal.fine_reason || 'Administrative Committee Penalty'}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={handleWaiveManualFine}
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer font-semibold shrink-0"
                  >
                    Waive Manual Fine
                  </Button>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.netFine === 0 ? (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All institution fines cleared
                    </span>
                  ) : (
                    <span>
                      Pending Net Total: <strong className="font-mono text-rose-500">₹{summary.netFine.toLocaleString('en-IN')}</strong>
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCollegeForWaiveModal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
