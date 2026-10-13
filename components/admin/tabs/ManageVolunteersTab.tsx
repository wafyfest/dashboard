'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  UserPlus,
  Trash2,
  Printer,
  Sparkles,
  Phone,
  Shirt,
  Info,
  ShieldCheck,
  Award,
  AlertCircle,
  Edit2,
  X,
  Filter,
  Building2,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  College,
  Student,
  Volunteer,
  isAliyaOrPgPhase,
  getStudentVolunteerPhase
} from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';

interface ManageVolunteersTabProps {
  colleges: College[];
  students: Student[];
  refreshKey?: number;
  onRefresh?: () => void;
}

const VOLUNTEER_DUTIES = [
  'Stage Coordination & Backstage',
  'Hospitality & VIP Protocol',
  'Crowd Management & Security',
  'Registration Desk & Helpdesk',
  'Venue Logistics & Sound/Light',
  'Media, IT & PR',
  'Food & Refreshments',
  'General Fest Volunteer'
];

const TSHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

export function ManageVolunteersTab({
  colleges,
  students,
  refreshKey,
  onRefresh
}: ManageVolunteersTabProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(() =>
    festService.getVolunteers()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'aliya' | 'pg'>('all');
  const [dutyFilter, setDutyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [editDuty, setEditDuty] = useState(VOLUNTEER_DUTIES[0]);
  const [editStatus, setEditStatus] = useState<'Registered' | 'Approved' | 'Standby'>('Registered');
  const [editPhone, setEditPhone] = useState('');
  const [editTshirt, setEditTshirt] = useState('L');
  const [editNotes, setEditNotes] = useState('');

  // Add Volunteer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCollegeAffl, setNewCollegeAffl] = useState<number>(
    colleges[0]?.affl_no || 11
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [newDuty, setNewDuty] = useState(VOLUNTEER_DUTIES[0]);
  const [newStatus, setNewStatus] = useState<'Registered' | 'Approved' | 'Standby'>('Approved');
  const [newPhone, setNewPhone] = useState('');
  const [newTshirt, setNewTshirt] = useState('L');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-Channel Real-Time Synchronization Callback
  const syncVolunteers = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    // 1. Immediately read cached memory / local storage
    const cached = festService.getVolunteers();
    setVolunteers(cached);

    // 2. Fetch fresh from Supabase if connected
    try {
      const fresh = await festService.fetchAllVolunteers();
      if (fresh) setVolunteers(fresh);
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  // Multi-Channel Real-Time Listeners (BroadcastChannel + Storage + Realtime WS + Polling Heartbeat)
  useEffect(() => {
    syncVolunteers();

    // 1. Cross-Tab / Cross-Window BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('wsf_volunteers_sync');
        bc.onmessage = () => {
          syncVolunteers();
        };
      } catch (e) {}
    }

    // 2. LocalStorage storage event listener (triggers across browser tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wsf_volunteers' || e.key === 'wsf_volunteers_updated') {
        syncVolunteers();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Custom in-tab DOM event listener
    const handleCustomChange = () => {
      syncVolunteers();
    };
    window.addEventListener('wsf_volunteers_change', handleCustomChange);

    // 4. Supabase Realtime WebSocket Channel
    let unsubRealtime: (() => void) | null = null;
    const supabase = createClient();
    if (supabase) {
      const channel = supabase
        .channel(`admin_volunteers_live_${Math.random()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'volunteers' },
          (payload: any) => {
            console.log('⚡ [Admin Volunteers Live] DB change detected:', payload);
            syncVolunteers();
          }
        )
        .on(
          'broadcast',
          { event: 'volunteer_change' },
          () => {
            syncVolunteers();
          }
        )
        .subscribe();

      unsubRealtime = () => {
        supabase.removeChannel(channel);
      };
    }

    // 5. Active Heartbeat (every 2.5s) to guarantee instant visibility while viewing tab
    const heartbeat = setInterval(() => {
      syncVolunteers();
    }, 2500);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('wsf_volunteers_change', handleCustomChange);
      unsubRealtime?.();
      clearInterval(heartbeat);
    };
  }, [refreshKey, syncVolunteers]);

  // Map colleges by affl_no for fast lookup
  const collegeMap = useMemo(() => {
    const map = new Map<number, College>();
    colleges.forEach(c => map.set(c.affl_no, c));
    return map;
  }, [colleges]);

  // Candidates for manual enrollment in selected college
  const availableCandidatesForNew = useMemo(() => {
    const registeredStudentIds = new Set(volunteers.map(v => v.student_id));
    return students.filter(s => {
      if (s.college_affl_no !== newCollegeAffl) return false;
      if (!isAliyaOrPgPhase(s.phase || s.category, s.class)) return false;
      if (registeredStudentIds.has(s.id)) return false;
      return true;
    });
  }, [students, newCollegeAffl, volunteers]);

  // Filtered Volunteers List
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(vol => {
      const student =
        vol.student || students.find(s => s.id === vol.student_id);
      const studentPhase = student
        ? getStudentVolunteerPhase(student.phase || student.category, student.class)
        : 'Aliya';

      // College filter
      if (collegeFilter !== 'all' && String(vol.college_affl_no) !== collegeFilter) {
        return false;
      }

      // Phase filter
      if (phaseFilter === 'aliya' && studentPhase !== 'Aliya') return false;
      if (phaseFilter === 'pg' && studentPhase !== 'PG') return false;

      // Duty filter
      if (dutyFilter !== 'all' && vol.duty_preference !== dutyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && vol.status !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (
          student?.name || student?.full_name || ''
        ).toLowerCase();
        const cic = String(
          student?.admission_no ?? student?.cic_no ?? ''
        ).toLowerCase();
        const col = collegeMap.get(vol.college_affl_no);
        const colName = (col?.name || '').toLowerCase();
        const colCode = (col?.short_name || '').toLowerCase();
        const phone = (vol.phone || student?.phone || '').toLowerCase();
        const duty = (vol.duty_preference || '').toLowerCase();
        const notes = (vol.notes || '').toLowerCase();

        const matches =
          studentName.includes(q) ||
          cic.includes(q) ||
          colName.includes(q) ||
          colCode.includes(q) ||
          phone.includes(q) ||
          duty.includes(q) ||
          notes.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    volunteers,
    students,
    collegeMap,
    collegeFilter,
    phaseFilter,
    dutyFilter,
    statusFilter,
    searchQuery
  ]);

  // Statistics
  const totalVolunteersCount = volunteers.length;
  const approvedCount = volunteers.filter(v => v.status === 'Approved').length;
  const registeredCount = volunteers.filter(v => v.status === 'Registered').length;
  const standbyCount = volunteers.filter(v => v.status === 'Standby').length;

  const participatingCollegesCount = useMemo(() => {
    const set = new Set(volunteers.map(v => v.college_affl_no));
    return set.size;
  }, [volunteers]);

  // T-Shirt Distribution Summary
  const tshirtBreakdown = useMemo(() => {
    const counts: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
    volunteers.forEach(v => {
      const size = (v.tshirt_size || 'L').toUpperCase();
      if (counts[size] !== undefined) counts[size]++;
      else counts['L']++;
    });
    return counts;
  }, [volunteers]);

  // Open Edit Modal
  const handleOpenEdit = (vol: Volunteer) => {
    const student =
      vol.student || students.find(s => s.id === vol.student_id);
    setEditingVolunteer(vol);
    setEditDuty(vol.duty_preference || VOLUNTEER_DUTIES[0]);
    setEditStatus(vol.status || 'Registered');
    setEditPhone(vol.phone || student?.phone || '');
    setEditTshirt(vol.tshirt_size || 'L');
    setEditNotes(vol.notes || '');
    setIsEditModalOpen(true);
  };

  // Save Edit Volunteer
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolunteer) return;

    setIsSubmitting(true);
    try {
      const res = await festService.updateVolunteer(editingVolunteer.id, {
        duty_preference: editDuty,
        status: editStatus,
        phone: editPhone.trim(),
        tshirt_size: editTshirt,
        notes: editNotes.trim()
      });

      if (!res.success) {
        alert(res.error || 'Failed to update volunteer details');
        return;
      }

      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      setIsEditModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Error updating volunteer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle (e.g. Approve inline)
  const handleQuickStatusChange = async (
    volunteerId: string,
    newStatus: 'Registered' | 'Approved' | 'Standby'
  ) => {
    const res = await festService.updateVolunteer(volunteerId, { status: newStatus });
    if (res.success) {
      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      onRefresh?.();
    } else {
      alert(res.error || 'Failed to update status');
    }
  };

  // Unregister Volunteer
  const handleDeleteVolunteer = async (vol: Volunteer) => {
    const student = vol.student || students.find(s => s.id === vol.student_id);
    const name = student?.name || student?.full_name || 'this scholar';

    if (!confirm(`Are you sure you want to remove "${name}" from the festival volunteer roster?`)) {
      return;
    }

    const res = await festService.unregisterVolunteer(vol.id);
    if (res.success) {
      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      onRefresh?.();
    } else {
      alert(res.error || 'Failed to delete volunteer');
    }
  };

  // Add New Volunteer Manually (Admin Action)
  const handleSaveNewVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Please select an Aliya or PG scholar to enroll.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stu = students.find(s => s.id === selectedStudentId);
      const res = await festService.registerVolunteer({
        college_affl_no: newCollegeAffl,
        student_id: selectedStudentId,
        duty_preference: newDuty,
        status: newStatus,
        phone: newPhone.trim() || stu?.phone || '',
        tshirt_size: newTshirt,
        notes: newNotes.trim()
      });

      if (!res.success) {
        alert(res.error || 'Failed to enroll volunteer');
        return;
      }

      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      setIsAddModalOpen(false);
      setSelectedStudentId('');
      setNewPhone('');
      setNewNotes('');
      onRefresh?.();
      alert('Volunteer successfully registered by Fest Executive Admin.');
    } catch (err: any) {
      alert(err.message || 'Error creating volunteer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Status Change
  const handleBatchStatus = async (status: 'Approved' | 'Standby') => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await festService.updateVolunteer(id, { status });
      }
      setSelectedIds(new Set());
      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      onRefresh?.();
      alert(`Updated status for ${selectedIds.size} volunteers.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected volunteers from the roster?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await festService.unregisterVolunteer(id);
      }
      setSelectedIds(new Set());
      const refreshed = festService.getVolunteers();
      setVolunteers(refreshed);
      onRefresh?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Master Roster
  const handlePrintMasterRoster = () => {
    if (filteredVolunteers.length === 0) {
      alert('No volunteers found matching current filter to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up blocked. Please allow pop-ups to print the volunteer roster.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master Volunteer Roster - WSF Arts Fest</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 22px; margin-bottom: 4px; text-transform: uppercase; color: #0f172a; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th { background: #f8fafc; text-align: left; padding: 7px 9px; border: 1px solid #cbd5e1; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #334155; }
            td { padding: 7px 9px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; }
            .sig-line { margin-top: 35px; border-top: 1px solid #94a3b8; width: 190px; text-align: center; padding-top: 4px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1>WSF Arts Fest — Master Volunteer Directory</h1>
              <div class="sub">Central Executive Manifest (Aliya & PG Wings) • Total Certified Volunteers: ${filteredVolunteers.length}</div>
            </div>
            <div style="text-align:right;">
              <span class="badge">APPROVED: ${filteredVolunteers.filter(v => v.status === 'Approved').length} / ${filteredVolunteers.length}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:25px;">#</th>
                <th>CIC No</th>
                <th>Scholar Name</th>
                <th>Institution</th>
                <th>Phase / Class</th>
                <th>Assigned Duty</th>
                <th>Size</th>
                <th>Contact Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredVolunteers.map((vol, idx) => {
                const s = vol.student || students.find(x => x.id === vol.student_id);
                const col = collegeMap.get(vol.college_affl_no);
                const phase = s ? getStudentVolunteerPhase(s.phase, s.class) : 'Aliya';
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td style="font-family:monospace; font-weight:bold;">${getCanonicalChestNo(s)}</td>
                    <td style="font-weight:600;">${s?.name || s?.full_name || 'Scholar'}</td>
                    <td>${col?.short_name || `Col #${vol.college_affl_no}`}</td>
                    <td>${phase} (${s?.class || '—'})</td>
                    <td><strong>${vol.duty_preference}</strong></td>
                    <td style="text-align:center;">${vol.tshirt_size || 'L'}</td>
                    <td>${vol.phone || s?.phone || '—'}</td>
                    <td><span style="font-weight:bold; color:${vol.status === 'Approved' ? '#047857' : '#b45309'}">${vol.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div>
              <div>Issued by: Fest Executive Committee & Volunteer Directorate</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
            <div style="display:flex; gap:40px;">
              <div class="sig-line">Volunteer Convener Signature</div>
              <div class="sig-line">General Secretary / Fest Director</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Admin Management */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#132238] dark:bg-[#1A2E4A] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#1E3558] dark:border-[#2E476B]/60">
            <HeartHandshake className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Volunteer Directorate & Duty Allotment
              </h3>
              <Badge variant="navy" size="sm">
                Executive Desk
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Review institutional volunteer submissions (Aliya & PG scholars), approve rosters, and manage departmental assignments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncVolunteers(true)}
            disabled={isSyncing}
            className="text-xs"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Live Sync'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintMasterRoster}
            className="text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Master Roster
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Volunteer
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Total Volunteers
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {totalVolunteersCount}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            Across all 25 participating colleges
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Approved & Active
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {approvedCount}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            {registeredCount} pending • {standbyCount} standby
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Participating Colleges
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {participatingCollegesCount} <span className="text-sm font-normal text-[var(--text-muted)]">/ {colleges.length}</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            Colleges with enrolled volunteers
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              T-Shirt Logistics (Total: {totalVolunteersCount})
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shirt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {TSHIRT_SIZES.map(s => (
              <span
                key={s}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {s}: {tshirtBreakdown[s] || 0}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">
            Procurement sizing matrix
          </p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#132238] dark:text-slate-300" />
              All Volunteer Registrations
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {filteredVolunteers.length} Records
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-secondary)] mt-0.5">
              Filter by institution, phase, duty department, and verification status.
            </CardDescription>
          </div>

          {/* Batch Controls */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="success"
                onClick={() => handleBatchStatus('Approved')}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchStatus('Standby')}
                disabled={isSubmitting}
                className="text-xs h-8 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                Set Standby
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs h-8 text-[var(--text-muted)]"
              >
                Clear
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Toolbar: Search & Filters */}
        <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search volunteer by scholar name, CIC, phone, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#132238] font-medium"
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

          {/* College Dropdown */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={collegeFilter}
              onChange={e => setCollegeFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="all">All Colleges ({colleges.length})</option>
              {colleges.map(c => (
                <option key={c.affl_no} value={String(c.affl_no)}>
                  #{c.affl_no} - {c.short_name || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phase Filter (All / Aliya / PG) */}
          <div className="flex items-center rounded-lg p-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setPhaseFilter('all')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                phaseFilter === 'all'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Phases
            </button>
            <button
              onClick={() => setPhaseFilter('aliya')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                phaseFilter === 'aliya'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Aliya
            </button>
            <button
              onClick={() => setPhaseFilter('pg')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                phaseFilter === 'pg'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              PG
            </button>
          </div>

          {/* Duty Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={dutyFilter}
              onChange={e => setDutyFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">All Duties</option>
              {VOLUNTEER_DUTIES.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Registered">Registered (Pending)</option>
              <option value="Standby">Standby</option>
            </select>
          </div>
        </div>

        {/* Volunteers Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[var(--bg-subtle)]/75">
              <TableRow className="border-b border-[var(--border-subtle)]">
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredVolunteers.length > 0 &&
                      filteredVolunteers.every(v => selectedIds.has(v.id))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredVolunteers.map(v => v.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-[var(--border-medium)] text-[#132238] focus:ring-[#132238]/30 w-3.5 h-3.5 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-12 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">#</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Scholar & CIC</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Institution</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Phase / Class</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Duty Assignment</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Size & Phone</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
                        <HeartHandshake className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        No Volunteer Records Found
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {searchQuery
                          ? `No records found matching "${searchQuery}".`
                          : 'No volunteers enrolled matching current filters.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVolunteers.map((vol, idx) => {
                  const student =
                    vol.student || students.find(s => s.id === vol.student_id);
                  const col = collegeMap.get(vol.college_affl_no);
                  const isSelected = selectedIds.has(vol.id);
                  const studentPhase = student
                    ? getStudentVolunteerPhase(student.phase || student.category, student.class)
                    : 'Aliya';
                  const isPg = studentPhase === 'PG';

                  return (
                    <TableRow
                      key={vol.id || idx}
                      className={`hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] ${
                        vol.status === 'Approved' ? 'bg-emerald-500/5 dark:bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            const copy = new Set(selectedIds);
                            if (e.target.checked) copy.add(vol.id);
                            else copy.delete(vol.id);
                            setSelectedIds(copy);
                          }}
                          className="rounded border-[var(--border-medium)] text-[#132238] focus:ring-[#132238]/30 w-3.5 h-3.5 cursor-pointer"
                        />
                      </TableCell>

                      {/* Index */}
                      <TableCell className="text-center text-xs font-mono text-[var(--text-muted)]">
                        {idx + 1}
                      </TableCell>

                      {/* Scholar Info */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                              isPg
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-[#132238]/10 dark:bg-[#1A2E4A] text-[#132238] dark:text-slate-200 border-[#132238]/20'
                            }`}
                          >
                            {(student?.name || student?.full_name || 'V').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {student?.name || student?.full_name || 'Enrolled Scholar'}
                            </div>
                            <span className="font-mono text-[10px] text-[#132238] dark:text-slate-300 font-semibold">
                              {getCanonicalChestNo(student)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Institution */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1 max-w-[180px]">
                            {col?.name || `College #${vol.college_affl_no}`}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            Affl #{vol.college_affl_no}
                          </span>
                        </div>
                      </TableCell>

                      {/* Phase & Class */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant={isPg ? 'warning' : 'navy'} size="sm" className="uppercase text-[9px]">
                            {studentPhase}
                          </Badge>
                          {student?.class && (
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">
                              {student.class}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Assigned Duty */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                            {vol.duty_preference}
                          </span>
                          {vol.notes && (
                            <p className="text-[10px] text-[var(--text-muted)] italic line-clamp-1 max-w-[200px]">
                              {vol.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Size & Phone */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1">
                            <Shirt className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                              Size {vol.tshirt_size || 'L'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <Phone className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                            <span>{vol.phone || student?.phone || '—'}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {vol.status === 'Approved' ? (
                          <Badge variant="success" size="sm" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Approved
                          </Badge>
                        ) : vol.status === 'Standby' ? (
                          <Badge variant="warning" size="sm" className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Standby
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Registered
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {vol.status !== 'Approved' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleQuickStatusChange(vol.id, 'Approved')}
                              className="text-[11px] text-emerald-700 border-emerald-300 dark:text-emerald-300 hover:bg-emerald-500/10"
                              title="Approve volunteer"
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenEdit(vol)}
                            className="text-[11px]"
                            title="Edit details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteVolunteer(vol)}
                            className="text-[11px] text-rose-600 hover:bg-rose-500/10 p-1"
                            title="Remove volunteer"
                          >
                            <Trash2 className="w-3 h-3" />
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
      </Card>

      {/* Edit Volunteer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Volunteer Assignment"
        description="Update fest duty department, approval status, and logistical notes."
      >
        {editingVolunteer && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {editingVolunteer.student?.name || editingVolunteer.student?.full_name || 'Scholar'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {collegeMap.get(editingVolunteer.college_affl_no)?.name || `College #${editingVolunteer.college_affl_no}`}
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-[#132238] dark:text-slate-300">
                {getCanonicalChestNo(editingVolunteer.student)}
              </span>
            </div>

            {/* Duty & Status Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Duty Assignment
                </label>
                <select
                  value={editDuty}
                  onChange={e => setEditDuty(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
                  required
                >
                  {VOLUNTEER_DUTIES.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Volunteer Status
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
                >
                  <option value="Approved">Approved</option>
                  <option value="Registered">Registered (Pending)</option>
                  <option value="Standby">Standby</option>
                </select>
              </div>
            </div>

            {/* Phone & T-Shirt Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  T-Shirt Size
                </label>
                <div className="flex items-center gap-1">
                  {TSHIRT_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setEditTshirt(size)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        editTshirt === size
                          ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white border-[#132238] dark:border-[#1A2E4A]'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Admin Notes / Special Instructions
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="e.g. Assigned to Kalam Hall stage queue, speaks fluent Arabic..."
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Updates'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add New Volunteer Modal (Admin Manual Enrollment) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Admin Volunteer Direct Enrollment"
        description="Select an Aliya or PG scholar from any institution to enroll as fest volunteer."
      >
        <form onSubmit={handleSaveNewVolunteer} className="space-y-4">
          {/* College Selection */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Select Institution <span className="text-rose-500">*</span>
            </label>
            <select
              value={newCollegeAffl}
              onChange={e => {
                setNewCollegeAffl(Number(e.target.value));
                setSelectedStudentId('');
              }}
              className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
              required
            >
              {colleges.map(c => (
                <option key={c.affl_no} value={c.affl_no}>
                  #{c.affl_no} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scholar Selection (Aliya & PG only) */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Select Scholar (Aliya & PG Only) <span className="text-rose-500">*</span>
            </label>
            {availableCandidatesForNew.length === 0 ? (
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] text-xs border border-[var(--border-subtle)]">
                No eligible unassigned Aliya or PG scholars available for this institution.
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={e => {
                  setSelectedStudentId(e.target.value);
                  const stu = students.find(s => s.id === e.target.value);
                  if (stu?.phone) setNewPhone(stu.phone);
                }}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
                required
              >
                <option value="">— Choose Scholar ({availableCandidatesForNew.length} Available) —</option>
                {availableCandidatesForNew.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.full_name} ({getCanonicalChestNo(s)} • {getStudentVolunteerPhase(s.phase, s.class)} - {s.class || 'Final'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Duty & Status Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Duty Department
              </label>
              <select
                value={newDuty}
                onChange={e => setNewDuty(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
                required
              >
                {VOLUNTEER_DUTIES.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Approval Status
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
              >
                <option value="Approved">Approved (Verified)</option>
                <option value="Registered">Registered (Pending)</option>
                <option value="Standby">Standby</option>
              </select>
            </div>
          </div>

          {/* Phone & T-Shirt Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Contact Phone / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="e.g. 9847123456"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Fest T-Shirt Size
              </label>
              <div className="flex items-center gap-1">
                {TSHIRT_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setNewTshirt(size)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      newTshirt === size
                        ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white border-[#132238] dark:border-[#1A2E4A]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Special Skills / Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Admin Remarks / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Direct admin allocation for VIP Protocol..."
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-300 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || availableCandidatesForNew.length === 0}
            >
              {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
