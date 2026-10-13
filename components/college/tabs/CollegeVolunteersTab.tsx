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
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Student,
  College,
  Volunteer,
  isAliyaOrPgPhase,
  getStudentVolunteerPhase
} from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';

interface CollegeVolunteersTabProps {
  college?: College;
  collegeAfflNo: number;
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

export function CollegeVolunteersTab({
  college,
  collegeAfflNo,
  students,
  refreshKey,
  onRefresh
}: CollegeVolunteersTabProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(() =>
    festService.getVolunteers(collegeAfflNo)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'aliya' | 'pg'>('all');
  const [dutyFilter, setDutyFilter] = useState<string>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [dutyPreference, setDutyPreference] = useState(VOLUNTEER_DUTIES[0]);
  const [contactPhone, setContactPhone] = useState('');
  const [tshirtSize, setTshirtSize] = useState('L');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Multi-Channel Real-Time Synchronization Callback
  const syncVolunteers = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    // 1. Immediately read cached memory / local storage
    const cached = festService.getVolunteers(collegeAfflNo);
    setVolunteers(cached);

    // 2. Fetch fresh from Supabase if connected
    try {
      if (collegeAfflNo) {
        const fresh = await festService.fetchVolunteersForCollege(collegeAfflNo);
        if (fresh) setVolunteers(fresh);
      }
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, [collegeAfflNo]);

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
        .channel(`college_volunteers_live_${collegeAfflNo}_${Math.random().toString(36).substring(2, 7)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'volunteers' },
          (payload: any) => {
            console.log('⚡ [College Volunteers Live] DB change detected:', payload);
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
  }, [collegeAfflNo, refreshKey, syncVolunteers]);

  // Scoped to Aliya & PG phase students for this college
  const eligibleStudents = useMemo(() => {
    return students.filter(s => {
      // Must match this college
      const isThisCollege =
        s.college_affl_no === collegeAfflNo ||
        (college && s.college_id === college.id);
      if (!isThisCollege) return false;

      // Must be in Aliya or PG phase
      return isAliyaOrPgPhase(s.phase || s.category, s.class);
    });
  }, [students, collegeAfflNo, college]);

  const aliyaCount = useMemo(() => {
    return eligibleStudents.filter(
      s => getStudentVolunteerPhase(s.phase || s.category, s.class) === 'Aliya'
    ).length;
  }, [eligibleStudents]);

  const pgCount = useMemo(() => {
    return eligibleStudents.filter(
      s => getStudentVolunteerPhase(s.phase || s.category, s.class) === 'PG'
    ).length;
  }, [eligibleStudents]);

  // Map of registered volunteers by student_id or cic
  const volunteerMap = useMemo(() => {
    const map = new Map<string, Volunteer>();
    volunteers.forEach(v => {
      if (v.student_id) map.set(v.student_id, v);
      if (v.student?.id) map.set(v.student.id, v);
      if (v.student?.cic_no) map.set(String(v.student.cic_no), v);
    });
    return map;
  }, [volunteers]);

  // Filtered students based on search, status, and phase
  const displayedStudents = useMemo(() => {
    return eligibleStudents.filter(student => {
      const vol =
        volunteerMap.get(student.id) ||
        (student.cic_no ? volunteerMap.get(String(student.cic_no)) : undefined);
      const isRegistered = !!vol;
      const studentPhase = getStudentVolunteerPhase(student.phase || student.category, student.class);

      // Phase filter
      if (phaseFilter === 'aliya' && studentPhase !== 'Aliya') return false;
      if (phaseFilter === 'pg' && studentPhase !== 'PG') return false;

      // Status filter
      if (statusFilter === 'registered' && !isRegistered) return false;
      if (statusFilter === 'unregistered' && isRegistered) return false;

      // Duty filter
      if (dutyFilter !== 'all') {
        if (!isRegistered || vol?.duty_preference !== dutyFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (student.name || student.full_name || '').toLowerCase();
        const cic = String(student.admission_no ?? student.cic_no ?? '').toLowerCase();
        const cls = String(student.class || '').toLowerCase();
        const phase = studentPhase.toLowerCase();
        const duty = vol?.duty_preference?.toLowerCase() || '';

        const matches =
          name.includes(q) ||
          cic.includes(q) ||
          cls.includes(q) ||
          phase.includes(q) ||
          duty.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [eligibleStudents, volunteerMap, statusFilter, phaseFilter, dutyFilter, searchQuery]);

  const registeredCount = useMemo(() => {
    return eligibleStudents.filter(
      s => volunteerMap.has(s.id) || (s.cic_no && volunteerMap.has(String(s.cic_no)))
    ).length;
  }, [eligibleStudents, volunteerMap]);

  const availableCount = Math.max(0, eligibleStudents.length - registeredCount);

  // Open modal for registration
  const handleOpenRegister = (student: Student) => {
    const existing =
      volunteerMap.get(student.id) ||
      (student.cic_no ? volunteerMap.get(String(student.cic_no)) : null);

    setTargetStudent(student);
    if (existing) {
      setEditingVolunteer(existing);
      setDutyPreference(existing.duty_preference || VOLUNTEER_DUTIES[0]);
      setContactPhone(existing.phone || student.phone || '');
      setTshirtSize(existing.tshirt_size || 'L');
      setNotes(existing.notes || '');
    } else {
      setEditingVolunteer(null);
      setDutyPreference(VOLUNTEER_DUTIES[0]);
      setContactPhone(student.phone || '');
      setTshirtSize('L');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  // Submit volunteer registration
  const handleSaveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    setIsSubmitting(true);
    try {
      if (editingVolunteer) {
        const res = await festService.updateVolunteer(editingVolunteer.id, {
          duty_preference: dutyPreference,
          phone: contactPhone.trim(),
          tshirt_size: tshirtSize,
          notes: notes.trim()
        });
        if (!res.success) {
          alert(res.error || 'Failed to update volunteer details');
          return;
        }
      } else {
        const res = await festService.registerVolunteer({
          college_affl_no: collegeAfflNo,
          student_id: targetStudent.id,
          duty_preference: dutyPreference,
          phone: contactPhone.trim(),
          tshirt_size: tshirtSize,
          status: 'Registered',
          notes: notes.trim()
        });
        if (!res.success) {
          alert(res.error || 'Failed to register volunteer');
          return;
        }
      }

      const refreshed = festService.getVolunteers(collegeAfflNo);
      setVolunteers(refreshed);
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Error saving volunteer registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unregister volunteer
  const handleUnregister = async (student: Student) => {
    const vol =
      volunteerMap.get(student.id) ||
      (student.cic_no ? volunteerMap.get(String(student.cic_no)) : null);
    if (!vol) return;

    if (
      !confirm(
        `Are you sure you want to remove "${student.name || student.full_name}" from the fest volunteer list?`
      )
    ) {
      return;
    }

    const res = await festService.unregisterVolunteer(vol.id);
    if (res.success) {
      const refreshed = festService.getVolunteers(collegeAfflNo);
      setVolunteers(refreshed);
      onRefresh?.();
    } else {
      alert(res.error || 'Failed to unregister volunteer');
    }
  };

  // Batch register selected students
  const handleBatchRegister = async () => {
    if (selectedStudentIds.size === 0) return;

    const count = selectedStudentIds.size;
    if (!confirm(`Register all ${count} selected scholars as General Volunteers?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      for (const studentId of Array.from(selectedStudentIds)) {
        const stu = eligibleStudents.find(s => s.id === studentId);
        if (stu && !volunteerMap.has(stu.id)) {
          await festService.registerVolunteer({
            college_affl_no: collegeAfflNo,
            student_id: stu.id,
            duty_preference: 'General Fest Volunteer',
            phone: stu.phone || '',
            tshirt_size: 'L',
            status: 'Registered'
          });
        }
      }
      setSelectedStudentIds(new Set());
      const refreshed = festService.getVolunteers(collegeAfflNo);
      setVolunteers(refreshed);
      onRefresh?.();
      alert(`Successfully registered ${count} scholars as volunteers!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print volunteer roster
  const handlePrintRoster = () => {
    const registered = eligibleStudents
      .map(s => ({
        student: s,
        volunteer:
          volunteerMap.get(s.id) ||
          (s.cic_no ? volunteerMap.get(String(s.cic_no)) : null)
      }))
      .filter(item => item.volunteer !== null);

    if (registered.length === 0) {
      alert('No registered volunteers found to print. Please register volunteers first.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up blocked. Please enable pop-ups to print the roster.');
      return;
    }

    const collegeTitle = college?.name || `College #${collegeAfflNo}`;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Volunteer Roster - ${collegeTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; text-transform: uppercase; color: #1e293b; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600; text-transform: uppercase; font-size: 11px; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; }
            .sig-line { margin-top: 35px; border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 4px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1>${collegeTitle}</h1>
              <div class="sub">Official WSF Arts Fest Volunteer Roster (Aliya & PG Phases) • Affiliation No: #${collegeAfflNo}</div>
            </div>
            <div style="text-align:right;">
              <span class="badge">TOTAL VOLUNTEERS: ${registered.length}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30px;">#</th>
                <th>CIC No / Chest No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Phase</th>
                <th>Assigned Duty</th>
                <th>T-Shirt</th>
                <th>Contact Phone</th>
              </tr>
            </thead>
            <tbody>
              ${registered.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-family:monospace; font-weight:bold;">${getCanonicalChestNo(item.student)}</td>
                  <td style="font-weight:600;">${item.student.name || item.student.full_name}</td>
                  <td>${item.student.class || 'Aliya/PG'}</td>
                  <td>${getStudentVolunteerPhase(item.student.phase, item.student.class)}</td>
                  <td>${item.volunteer?.duty_preference || 'General Duty'}</td>
                  <td>${item.volunteer?.tshirt_size || 'L'}</td>
                  <td>${item.volunteer?.phone || item.student.phone || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div>
              <div>Report Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
              <div>Certified by Participating Institution</div>
            </div>
            <div style="display:flex; gap:40px;">
              <div class="sig-line">Staff Coordinator Signature</div>
              <div class="sig-line">Principal / Dean Seal</div>
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
      {/* Top Banner Notice: Aliya & PG Phase Scoping */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#132238] dark:bg-[#1A2E4A] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#1E3558] dark:border-[#2E476B]/60">
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Volunteer Registration (Aliya & PG Phases)
              </h3>
              <Badge variant="navy" size="sm">
                Senior & PG Wings
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Only scholars enrolled in the <strong>Aliya or PG phases</strong> ({college?.name || `College #${collegeAfflNo}`}) are eligible for official Fest Volunteer duties.
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
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Live Sync'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintRoster}
            className="text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Volunteer List
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Eligible Scholars
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {eligibleStudents.length}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            {aliyaCount} Aliya {pgCount > 0 ? `• ${pgCount} PG` : ''}
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Registered Volunteers
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {registeredCount}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            Assigned to active fest duties
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Available to Register
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {availableCount}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            Unassigned Aliya/PG scholars
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Enrolled Ratio
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {Math.min(
              100,
              Math.round((registeredCount / Math.max(1, eligibleStudents.length)) * 100)
            )}%
          </div>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 mt-2 overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="bg-[#132238] dark:bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (registeredCount / Math.max(1, eligibleStudents.length)) * 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#132238] dark:text-slate-300" />
              Aliya & PG Volunteer Directory
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {displayedStudents.length} Scholars
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-secondary)] mt-0.5">
              Filter and enroll Aliya & PG scholars as volunteers for venue, stage, reception, and hospitality duties.
            </CardDescription>
          </div>

          {/* Batch Action */}
          {selectedStudentIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {selectedStudentIds.size} selected
              </span>
              <Button
                size="sm"
                variant="success"
                onClick={handleBatchRegister}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Register Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStudentIds(new Set())}
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
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search scholar by name, CIC No, class, or phase..."
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

          {/* Phase Segmented Filter */}
          <div className="flex items-center rounded-lg p-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setPhaseFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                phaseFilter === 'all'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({eligibleStudents.length})
            </button>
            <button
              onClick={() => setPhaseFilter('aliya')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                phaseFilter === 'aliya'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Aliya ({aliyaCount})
            </button>
            {pgCount > 0 && (
              <button
                onClick={() => setPhaseFilter('pg')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  phaseFilter === 'pg'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                PG ({pgCount})
              </button>
            )}
          </div>

          {/* Status Segmented Filter */}
          <div className="flex items-center rounded-lg p-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Status: All
            </button>
            <button
              onClick={() => setStatusFilter('registered')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'registered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Registered ({registeredCount})
            </button>
            <button
              onClick={() => setStatusFilter('unregistered')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'unregistered'
                  ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Available ({availableCount})
            </button>
          </div>

          {/* Duty Filter Dropdown */}
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
                      displayedStudents.length > 0 &&
                      displayedStudents.every(s => selectedStudentIds.has(s.id))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        const unregistered = displayedStudents
                          .filter(s => !volunteerMap.has(s.id))
                          .map(s => s.id);
                        setSelectedStudentIds(new Set(unregistered));
                      } else {
                        setSelectedStudentIds(new Set());
                      }
                    }}
                    className="rounded border-[var(--border-medium)] text-[#132238] focus:ring-[#132238]/30 w-3.5 h-3.5 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-12 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">#</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Scholar & CIC Identifier</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Class & Phase</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Volunteer Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Assigned Duty</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contact / T-Shirt</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
                        <HeartHandshake className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        No Scholars Match Filter
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {searchQuery
                          ? `No scholars found matching "${searchQuery}".`
                          : 'No Aliya or PG scholars match the selected filter criteria.'}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="text-xs mt-2"
                        >
                          Clear Search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedStudents.map((student, idx) => {
                  const vol =
                    volunteerMap.get(student.id) ||
                    (student.cic_no ? volunteerMap.get(String(student.cic_no)) : undefined);
                  const isRegistered = !!vol;
                  const isSelected = selectedStudentIds.has(student.id);
                  const studentPhase = getStudentVolunteerPhase(
                    student.phase || student.category,
                    student.class
                  );
                  const isPg = studentPhase === 'PG';

                  return (
                    <TableRow
                      key={student.id || idx}
                      className={`hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] ${
                        isRegistered ? 'bg-emerald-500/5 dark:bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isRegistered}
                          onChange={e => {
                            const copy = new Set(selectedStudentIds);
                            if (e.target.checked) copy.add(student.id);
                            else copy.delete(student.id);
                            setSelectedStudentIds(copy);
                          }}
                          className="rounded border-[var(--border-medium)] text-[#132238] focus:ring-[#132238]/30 w-3.5 h-3.5 disabled:opacity-30 cursor-pointer"
                        />
                      </TableCell>

                      {/* Index */}
                      <TableCell className="text-center text-xs font-mono text-[var(--text-muted)]">
                        {idx + 1}
                      </TableCell>

                      {/* Scholar Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                              isPg
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-[#132238]/10 dark:bg-[#1A2E4A] text-[#132238] dark:text-slate-200 border-[#132238]/20'
                            }`}
                          >
                            {(student.name || student.full_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              {student.name || student.full_name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                                  isPg
                                    ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20'
                                    : 'text-[#132238] dark:text-slate-300 bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                                }`}
                              >
                                {getCanonicalChestNo(student)}
                              </span>
                              {student.admission_no && (
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  Adm: {student.admission_no}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Class & Phase */}
                      <TableCell>
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                            {student.class || (isPg ? 'PG-Final' : 'AL-Final')}
                          </span>
                          <div>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${
                                isPg
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {isPg ? 'Post Graduate (PG)' : 'Aliya Phase'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Volunteer Status */}
                      <TableCell>
                        {isRegistered ? (
                          <Badge variant="success" size="sm" className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Registered Volunteer
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                            Eligible Candidate
                          </Badge>
                        )}
                      </TableCell>

                      {/* Assigned Duty */}
                      <TableCell>
                        {isRegistered && vol?.duty_preference ? (
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
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">Not Assigned</span>
                        )}
                      </TableCell>

                      {/* Contact & T-Shirt */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className="font-mono text-[11px]">
                              {vol?.phone || student.phone || '—'}
                            </span>
                          </div>
                          {isRegistered && vol?.tshirt_size && (
                            <div className="flex items-center gap-1">
                              <Shirt className="w-3 h-3 text-[var(--text-muted)]" />
                              <span className="text-[10px] font-semibold text-[var(--text-primary)]">
                                Size: {vol.tshirt_size}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {isRegistered ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenRegister(student)}
                              className="text-xs"
                              title="Edit volunteer duty or contact"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleUnregister(student)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 p-1.5"
                              title="Remove from volunteer roster"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleOpenRegister(student)}
                            className="font-semibold text-xs"
                          >
                            <HeartHandshake className="w-3.5 h-3.5 mr-1" />
                            Register
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Volunteer Registration & Duty Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVolunteer ? 'Edit Volunteer Details' : 'Register Fest Volunteer'}
        description={`Allocate fest duty role for ${targetStudent?.name || targetStudent?.full_name || 'Scholar'}`}
      >
        {targetStudent && (
          <form onSubmit={handleSaveVolunteer} className="space-y-4">
            {/* Scholar Preview Card */}
            {(() => {
              const modalPhase = getStudentVolunteerPhase(
                targetStudent.phase || targetStudent.category,
                targetStudent.class
              );
              const isModalPg = modalPhase === 'PG';

              return (
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {targetStudent.name || targetStudent.full_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-semibold text-[#132238] dark:text-slate-300">
                        {getCanonicalChestNo(targetStudent)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Class: {targetStudent.class || (isModalPg ? 'PG' : 'AL')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={isModalPg ? 'warning' : 'navy'} size="sm">
                    {isModalPg ? 'PG Phase' : 'Aliya Phase'}
                  </Badge>
                </div>
              );
            })()}

            {/* Duty Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Volunteer Duty Assignment <span className="text-rose-500">*</span>
              </label>
              <select
                value={dutyPreference}
                onChange={e => setDutyPreference(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                required
              >
                {VOLUNTEER_DUTIES.map(duty => (
                  <option key={duty} value={duty}>
                    {duty}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Phone & T-Shirt Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Contact Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    placeholder="e.g. 9847123456"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono focus:outline-none focus:ring-1 focus:ring-[#132238]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Fest T-Shirt Size
                </label>
                <div className="flex items-center gap-1.5">
                  {TSHIRT_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTshirtSize(size)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        tshirtSize === size
                          ? 'bg-[#132238] dark:bg-[#1A2E4A] text-white border-[#132238] dark:border-[#2E476B]'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Special Skills / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Fluent in Arabic/English, First Aid, Sound & Audio mixer experience..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
              />
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="text-xs font-semibold"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : editingVolunteer ? (
                  'Update Volunteer'
                ) : (
                  'Confirm Registration'
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
