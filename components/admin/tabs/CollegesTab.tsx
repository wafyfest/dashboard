'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
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
import { College } from '@/lib/types/fest';
import {
  Building2,
  Search,
  X,
  ShieldAlert,
  AlertTriangle,
  Unlock,
  Lock,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Eye,
  ArrowUpDown,
  GraduationCap,
  Users,
  CheckCircle2,
  Info,
  DollarSign
} from 'lucide-react';

interface CollegesTabProps {
  onManageRegistrations?: (afflNo: number) => void;
  onOpenMatrix?: () => void;
  hideMetrics?: boolean;
}

type FilterType = 'all' | 'override' | 'fine' | 'clear';
type SortType = 'affl_asc' | 'affl_desc' | 'name_asc';

export function CollegesTab({ onManageRegistrations, onOpenMatrix, hideMetrics = false }: CollegesTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('affl_asc');
  const [selectedCollegeForDetail, setSelectedCollegeForDetail] = useState<College | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reactive colleges from festService keyed to refreshKey
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);

  // Calculate live registration counts per college
  const allRegistrations = useMemo(() => festService.getRegistrations(), [refreshKey]);

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

  const handleToggleFine = async (afflNo: number) => {
    setIsProcessing(true);
    try {
      await festService.toggleCollegeFine(afflNo);
      triggerRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeAllOverrides = async () => {
    if (metrics.overrideCount === 0) return;
    if (
      window.confirm(
        `🚨 Are you sure you want to REVOKE manual lock overrides from all ${metrics.overrideCount} colleges?\n\nThis will immediately re-enforce all festival deadlines and event locks across these institutions.`
      )
    ) {
      setIsProcessing(true);
      try {
        const revoked = await festService.revokeAllCollegeLockOverrides();
        triggerRefresh();
        alert(`Successfully revoked lock overrides from ${revoked} institutions.`);
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
          <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Participating Colleges
                </p>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {metrics.totalColleges}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> All institutions active
            </div>
          </Card>

          {/* Active Overrides */}
          <Card className={`p-4 border transition-all ${
            metrics.overrideCount > 0
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Lock Overrides Active
                </p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {metrics.overrideCount}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              {metrics.overrideCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Bypassing deadlines & locks
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">All standard gates enforced</span>
              )}
            </div>
          </Card>

          {/* Late Fines Flagged */}
          <Card className={`p-4 border transition-all ${
            metrics.fineCount > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
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
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <span>{metrics.fineCount} institution(s) penalized</span>
            </div>
          </Card>

          {/* Total Student Registrations */}
          <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Total Registrations
                </p>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {metrics.totalRegistrations}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-sky-500" /> Across all colleges
            </div>
          </Card>
        </div>
      )}

      {/* 2. TOOLBAR: SEARCH, FILTERS & ACTION CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Affl #, college name, code, coordinator..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
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
          <div className="flex items-center rounded-lg p-0.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({metrics.totalColleges})
            </button>
            <button
              onClick={() => setActiveFilter('override')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                activeFilter === 'override'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Overrides ({metrics.overrideCount})
            </button>
            <button
              onClick={() => setActiveFilter('fine')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                activeFilter === 'fine'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Fines ({metrics.fineCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-[var(--bg-canvas)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="affl_asc">Affl # Ascending</option>
              <option value="affl_desc">Affl # Descending</option>
              <option value="name_asc">Name (A → Z)</option>
            </select>
          </div>

          {/* Bulk Revoke Overrides (Only shown if overrides exist) */}
          {metrics.overrideCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRevokeAllOverrides}
              disabled={isProcessing}
              className="text-xs h-8 px-2.5 font-semibold shadow-xs"
              title="Revoke all active lock overrides across all colleges"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Revoke All Overrides ({metrics.overrideCount})
            </Button>
          )}

          {/* View Locks Matrix Button */}
          {onOpenMatrix && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenMatrix}
              className="text-xs h-8 px-2.5 font-medium border-[var(--border-medium)] hover:bg-[var(--bg-canvas)]"
            >
              <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              View 2D Matrix
            </Button>
          )}
        </div>
      </div>

      {/* 3. COMPACT, SCREEN-FITTED TABLE */}
      <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
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
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-sm">No colleges match the selected filter or search.</p>
                    <p className="text-xs mt-1">Try resetting the search query or status filter.</p>
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
                      className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60 transition-colors"
                    >
                      {/* Affl # & Code */}
                      <TableCell className="py-2.5 pl-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm leading-tight">
                            #{col.affl_no}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
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
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
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
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5 text-emerald-500" />
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
                            title={`Category Quotas: Pre-Foundation: ${col.st_pre_foundation || 0} | Foundation: ${col.st_foundation || 0} | Thamheediya: ${col.st_thamheediya || 0} | Aliya: ${col.st_aliya || 0} | PG: ${col.st_pg || 0}`}
                          >
                            Quota: {totalQuota > 0 ? totalQuota : '—'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badges */}
                      <TableCell className="py-2.5 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          {col.manual_lock_override ? (
                            <Badge variant="amber" size="sm" className="text-[10px] px-1.5 py-0 leading-tight">
                              Override Active
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              Standard Lock
                            </span>
                          )}

                          {col.fine_status ? (
                            <Badge variant="destructive" size="sm" className="text-[10px] px-1.5 py-0 leading-tight">
                              Fine Flagged
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Fine Clear
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Controls Buttons */}
                      <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Manage Registrations */}
                          {onManageRegistrations && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => onManageRegistrations(col.affl_no)}
                              className="h-7 px-2 text-xs font-semibold"
                              title="Open Student Event Registration Roster"
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Manage
                            </Button>
                          )}

                          {/* Override Toggle */}
                          <Button
                            size="xs"
                            variant={col.manual_lock_override ? 'destructive' : 'outline'}
                            onClick={() => handleToggleOverride(col.affl_no)}
                            disabled={isProcessing}
                            className={`h-7 px-2 text-xs font-semibold ${
                              col.manual_lock_override
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
                                : 'text-[var(--text-secondary)] hover:text-amber-500 hover:border-amber-500/40'
                            }`}
                            title={
                              col.manual_lock_override
                                ? 'Revoke emergency lock override'
                                : 'Grant emergency lock override bypassing deadlines'
                            }
                          >
                            {col.manual_lock_override ? (
                              <>
                                <Lock className="w-3 h-3 mr-1" /> Revoke
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 mr-1" /> Override
                              </>
                            )}
                          </Button>

                          {/* Fine Toggle */}
                          <Button
                            size="xs"
                            variant={col.fine_status ? 'outline' : 'secondary'}
                            onClick={() => handleToggleFine(col.affl_no)}
                            disabled={isProcessing}
                            className={`h-7 px-2 text-xs font-semibold ${
                              col.fine_status
                                ? 'border-rose-400/40 text-rose-500 hover:bg-rose-500/10'
                                : 'text-[var(--text-secondary)]'
                            }`}
                            title={col.fine_status ? 'Waive late registration fine' : 'Apply late registration fine'}
                          >
                            {col.fine_status ? 'Waive Fine' : 'Apply Fine'}
                          </Button>

                          {/* Details Modal Trigger */}
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedCollegeForDetail(col)}
                            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="View Full Institution Details & Quotas"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Info Row */}
        <div className="bg-[var(--bg-canvas)] px-4 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>
            Showing <strong className="text-[var(--text-primary)]">{filteredColleges.length}</strong> of{' '}
            {metrics.totalColleges} institutions
          </span>
          <span className="font-mono">
            {metrics.overrideCount > 0 ? (
              <span className="text-amber-500 font-semibold">⚠️ {metrics.overrideCount} override(s) active</span>
            ) : (
              'All institutions strictly locked to deadlines'
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
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-emerald-500">
                  Affiliation #{selectedCollegeForDetail.affl_no}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-slate-500/10 text-slate-400">
                  Code: {selectedCollegeForDetail.short_name || selectedCollegeForDetail.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-emerald-500/10 text-emerald-500">
                  Type: {selectedCollegeForDetail.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedCollegeForDetail.manual_lock_override && (
                  <Badge variant="amber" size="sm">
                    Lock Override Active
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
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
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
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Staff Coordinator
                </p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {selectedCollegeForDetail.staff_coordinator_name || selectedCollegeForDetail.coordinator_name || '—'}
                </p>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  {selectedCollegeForDetail.staff_coordinator_phone || selectedCollegeForDetail.coordinator_phone || '—'}
                </div>
              </div>

              {/* Team Manager */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
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
                <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1 sm:col-span-2">
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
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <h4 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5 text-xs">
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> Category Student Quotas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
                <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Pre-Foundation</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_pre_foundation || 0}
                  </div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Foundation</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_foundation || 0}
                  </div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Thamheediya</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_thamheediya || 0}
                  </div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">Aliya</div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {selectedCollegeForDetail.st_aliya || 0}
                  </div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
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
                    setSelectedCollegeForDetail(prev => prev ? { ...prev, manual_lock_override: !prev.manual_lock_override } : null);
                  }}
                >
                  {selectedCollegeForDetail.manual_lock_override ? 'Disable Override' : 'Allow Override'}
                </Button>
                <Button
                  size="xs"
                  variant={selectedCollegeForDetail.fine_status ? 'outline' : 'secondary'}
                  onClick={async () => {
                    await handleToggleFine(selectedCollegeForDetail.affl_no);
                    setSelectedCollegeForDetail(prev => prev ? { ...prev, fine_status: !prev.fine_status } : null);
                  }}
                >
                  {selectedCollegeForDetail.fine_status ? 'Waive Fine' : 'Apply Fine'}
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {onManageRegistrations && (
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => {
                      onManageRegistrations(selectedCollegeForDetail.affl_no);
                      setSelectedCollegeForDetail(null);
                    }}
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Manage Registrations
                  </Button>
                )}
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
    </div>
  );
}
