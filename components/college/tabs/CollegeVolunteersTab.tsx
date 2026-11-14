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
  RefreshCw,
  Lock,
  Unlock
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
  const [dutyFilter, setDutyFilter] = useState<string>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Universal Volunteer Registration Lock State
  const [isVolunteerRegLocked, setIsVolunteerRegLocked] = useState<boolean>(() =>
    festService.isVolunteerRegistrationLocked()
  );

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

  // Batch / Multiple Registration Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchDuty, setBatchDuty] = useState(VOLUNTEER_DUTIES[0]);
  const [batchDrafts, setBatchDrafts] = useState<
    Record<string, { phone: string; tshirt_size: string; notes: string }>
  >({});
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Multi-Channel Real-Time Synchronization Callback
  const syncVolunteers = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    // 1. Immediately read cached memory / local storage
    const cached = festService.getVolunteers(collegeAfflNo);
    setVolunteers(cached);
    setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());

    // 2. Fetch fresh from Supabase if connected
    try {
      if (collegeAfflNo) {
        const fresh = await festService.fetchVolunteersForCollege(collegeAfflNo);
        if (fresh) setVolunteers(fresh);
      }
      setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, [collegeAfflNo]);

  // Multi-Channel Real-Time Listeners (BroadcastChannel + Storage + Realtime WS + Polling Heartbeat)
  useEffect(() => {
    syncVolunteers();

    // 1. Cross-Tab / Cross-Window BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    let settingsBc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('wsf_volunteers_sync');
        bc.onmessage = () => {
          syncVolunteers();
        };
      } catch (e) { }

      try {
        settingsBc = new BroadcastChannel('wsf_settings_sync');
        settingsBc.onmessage = () => {
          setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());
        };
      } catch (e) { }
    }

    // 2. LocalStorage storage event listener (triggers across browser tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wsf_volunteers' || e.key === 'wsf_volunteers_updated') {
        syncVolunteers();
      }
      if (e.key === 'festSettings' || e.key === 'fest_settings') {
        setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Custom in-tab DOM event listener
    const handleCustomChange = () => {
      syncVolunteers();
    };
    window.addEventListener('wsf_volunteers_change', handleCustomChange);

    const handleSettingsUpdated = () => {
      setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());
    };
    window.addEventListener('wsf_settings_updated', handleSettingsUpdated);

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
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fest_settings' },
          () => {
            setIsVolunteerRegLocked(festService.isVolunteerRegistrationLocked());
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
      settingsBc?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('wsf_volunteers_change', handleCustomChange);
      window.removeEventListener('wsf_settings_updated', handleSettingsUpdated);
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

  const getStudentVolunteer = React.useCallback((student: Student) => (
    volunteerMap.get(student.id) ||
    (student.cic_no ? volunteerMap.get(String(student.cic_no)) : undefined)
  ), [volunteerMap]);

  const availableStudents = useMemo(() => {
    return eligibleStudents.filter(s => !getStudentVolunteer(s));
  }, [eligibleStudents, getStudentVolunteer]);

  const selectedAvailableStudents = useMemo(() => {
    return availableStudents.filter(s => selectedStudentIds.has(s.id));
  }, [availableStudents, selectedStudentIds]);

  // Filtered students based on search, status, and phase
  const displayedStudents = useMemo(() => {
    return eligibleStudents.filter(student => {
      const vol = getStudentVolunteer(student);
      const isRegistered = !!vol;
      const studentPhase = getStudentVolunteerPhase(student.phase || student.category, student.class);

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
  }, [eligibleStudents, getStudentVolunteer, statusFilter, dutyFilter, searchQuery]);

  const registeredCount = useMemo(() => {
    return eligibleStudents.filter(s => !!getStudentVolunteer(s)).length;
  }, [eligibleStudents, getStudentVolunteer]);

  const availableCount = Math.max(0, eligibleStudents.length - registeredCount);

  // Open modal for registration
  const handleOpenRegister = (student: Student) => {
    if (isVolunteerRegLocked) {
      alert('Volunteer registration is currently locked for all colleges by fest administration.');
      return;
    }

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
    if (isVolunteerRegLocked) {
      alert('Volunteer registration is locked for all colleges by fest administration.');
      return;
    }
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
      toggleSelectedStudent(targetStudent.id, false);
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
    if (isVolunteerRegLocked) {
      alert('Volunteer registration is locked for all colleges by fest administration.');
      return;
    }
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

  // Open multiple registration modal with selected table students
  const handleOpenBatchModal = () => {
    if (isVolunteerRegLocked) {
      alert('Volunteer registration is locked for all colleges by fest administration.');
      return;
    }
    if (selectedAvailableStudents.length === 0) return;
    const defaultDuty = VOLUNTEER_DUTIES[0];
    const initialDrafts: Record<
      string,
      { phone: string; tshirt_size: string; notes: string }
    > = {};
    selectedAvailableStudents.forEach(stu => {
      initialDrafts[stu.id] = {
        phone: stu.phone || '',
        tshirt_size: 'L',
        notes: ''
      };
    });
    setBatchDuty(defaultDuty);
    setBatchDrafts(initialDrafts);
    setBatchError(null);
    setIsBatchModalOpen(true);
  };

  const updateBatchDraft = (
    studentId: string,
    patch: Partial<{ phone: string; tshirt_size: string; notes: string }>
  ) => {
    setBatchDrafts(prev => ({
      ...prev,
      [studentId]: {
        phone: prev[studentId]?.phone ?? '',
        tshirt_size: prev[studentId]?.tshirt_size || 'L',
        notes: prev[studentId]?.notes ?? '',
        ...patch
      }
    }));
  };

  // Toggle selection for a student in batch/table state
  const toggleSelectedStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  // Batch register selected students with shared duty and per-student details
  const handleBatchRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVolunteerRegLocked) {
      setBatchError('Volunteer registration is locked for all colleges by fest administration.');
      return;
    }
    if (selectedAvailableStudents.length === 0) {
      setBatchError('Please select at least one student to register.');
      return;
    }

    setBatchError(null);
    setIsSubmitting(true);
    let registeredNow = 0;
    const failedNames: string[] = [];

    try {
      for (const stu of selectedAvailableStudents) {
        const draft = batchDrafts[stu.id];
        const res = await festService.registerVolunteer({
          college_affl_no: collegeAfflNo,
          student_id: stu.id,
          duty_preference: batchDuty,
          phone: (draft?.phone ?? stu.phone ?? '').trim(),
          tshirt_size: draft?.tshirt_size || 'L',
          status: 'Registered',
          notes: (draft?.notes ?? '').trim() || null
        });
        if (res.success) {
          registeredNow += 1;
        } else {
          failedNames.push(stu.name || stu.full_name || 'Student');
        }
      }

      const refreshed = festService.getVolunteers(collegeAfflNo);
      setVolunteers(refreshed);
      onRefresh?.();

      if (failedNames.length > 0 && registeredNow === 0) {
        setBatchError(`Could not register selected students: ${failedNames.join(', ')}`);
        return;
      }

      setSelectedStudentIds(new Set());
      setIsBatchModalOpen(false);
      setBatchSuccessMessage(
        failedNames.length > 0
          ? `Registered ${registeredNow} students. Skipped/failed: ${failedNames.join(', ')}.`
          : `Successfully registered ${registeredNow} ${registeredNow === 1 ? 'student' : 'students'} as volunteers.`
      );
    } catch (err: any) {
      setBatchError(err?.message || 'Error during multiple volunteer registration.');
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
              <div class="sub">Official WSF Arts Fest Volunteer Roster (Aliya & PG) • Affiliation No: #${collegeAfflNo}</div>
            </div>
            <div style="text-align:right;">
              <span class="badge">TOTAL VOLUNTEERS: ${registered.length}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30px;">#</th>
                <th>CIC No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Assigned Duty</th>
                <th>T-Shirt</th>
                <th>Contact Phone</th>
              </tr>
            </thead>
            <tbody>
              ${registered.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-family:monospace; font-weight:bold;">${item.student.admission_no || item.student.cic_no || item.student.cic_number || '—'}</td>
                  <td style="font-weight:600;">${item.student.name || item.student.full_name}</td>
                  <td>${item.student.class || 'Aliya/PG'}</td>
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
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-card backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#090d1a] flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 border border-amber-500/30">
            <HeartHandshake className="w-5 h-5 text-[#090d1a]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold font-heading text-[var(--text-primary)]">
                Volunteer Registration (Aliya & PG)
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans ${
                  isVolunteerRegLocked
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isVolunteerRegLocked ? (
                  <>
                    <Lock className="w-3 h-3 text-rose-500" />
                    Registration Locked
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-500" />
                    Registration Open
                  </>
                )}
              </span>
            </div>
            <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
              Only students enrolled in the <strong>Aliya or PG</strong> ({college?.name || `College #${collegeAfflNo}`}) are eligible for official Fest Volunteer duties.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            variant="saffron"
            size="sm"
            onClick={handlePrintRoster}
            className="text-xs font-heading font-bold"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Volunteer List
          </Button>
        </div>
      </div>

      {/* Alert banner when volunteer registration is locked */}
      {isVolunteerRegLocked && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-start gap-3 shadow-sm">
          <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm font-heading">Volunteer Registration is Locked</h4>
            <p className="text-xs mt-0.5 opacity-90 font-sans leading-relaxed">
              Fest administration has closed volunteer registration for all colleges. You can view the assigned roster and print official lists, but new registrations, role updates, and volunteer removals are disabled.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--border-medium)] transition-all rounded-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Eligible Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] flex items-center justify-center border border-amber-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {eligibleStudents.length}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium font-sans">
            {aliyaCount} Aliya {pgCount > 0 ? `• ${pgCount} PG` : ''}
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--border-medium)] transition-all rounded-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Registered Volunteers
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {registeredCount}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium font-sans">
            Assigned to active fest duties
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--border-medium)] transition-all rounded-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Available to Register
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
            {availableCount}
          </div>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--border-medium)] transition-all rounded-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Enrolled Ratio
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] flex items-center justify-center border border-amber-500/20">
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
              className="bg-[var(--f-saffron)] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (registeredCount / Math.max(1, eligibleStudents.length)) * 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[var(--f-saffron)]" />
              Aliya & PG Volunteer Directory
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {displayedStudents.length} Students
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-secondary)] mt-0.5">
              Filter and enroll Aliya & PG students as volunteers for venue, stage, reception, and hospitality duties.
            </CardDescription>
          </div>

          {/* Batch Action (visible when table checkboxes are selected) */}
          {selectedAvailableStudents.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {selectedAvailableStudents.length} selected
              </span>
              <Button
                size="sm"
                variant="saffron"
                onClick={handleOpenBatchModal}
                disabled={isSubmitting || isVolunteerRegLocked}
                className="text-xs h-8 font-heading font-bold disabled:opacity-50"
                title={isVolunteerRegLocked ? 'Volunteer registration is locked' : undefined}
              >
                {isVolunteerRegLocked ? (
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isVolunteerRegLocked ? 'Registration Locked' : `Register Selected (${selectedAvailableStudents.length})`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStudentIds(new Set())}
                className="text-xs h-8 text-[var(--text-muted)] font-heading"
              >
                Clear
              </Button>
            </div>
          )}
        </CardHeader>

        {batchSuccessMessage && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{batchSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBatchSuccessMessage(null)}
              className="p-0.5 rounded hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar: Search & Filters */}
        <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1 sm:min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search student by name, CIC No, or class..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans font-medium"
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

          {/* Status Segmented Filter */}
          <div className="flex flex-wrap items-center rounded-xl p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-heading">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${statusFilter === 'all'
                ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              Status: All
            </button>
            <button
              onClick={() => setStatusFilter('registered')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${statusFilter === 'registered'
                ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              Registered ({registeredCount})
            </button>
            <button
              onClick={() => setStatusFilter('unregistered')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${statusFilter === 'unregistered'
                ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
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
        <Table containerClassName="rounded-none border-x-0 border-b-0 overflow-x-auto">
          <TableHeader className="bg-[var(--bg-subtle)]/75">
            <TableRow className="border-b border-[var(--border-subtle)]">
              <TableHead className="w-10 text-center">
                {(() => {
                  const unregisteredDisplayed = displayedStudents.filter(s => !getStudentVolunteer(s));
                  const allUnregisteredSelected =
                    unregisteredDisplayed.length > 0 &&
                    unregisteredDisplayed.every(s => selectedStudentIds.has(s.id));
                  return (
                    <input
                      type="checkbox"
                      checked={allUnregisteredSelected}
                      disabled={isVolunteerRegLocked || unregisteredDisplayed.length === 0}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedStudentIds(new Set(unregisteredDisplayed.map(s => s.id)));
                        } else {
                          setSelectedStudentIds(new Set());
                        }
                      }}
                      className="rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] accent-amber-500 w-3.5 h-3.5 disabled:opacity-30 cursor-pointer"
                      title={
                        isVolunteerRegLocked
                          ? 'Volunteer registration is locked'
                          : unregisteredDisplayed.length === 0
                          ? 'No unregistered students visible'
                          : 'Select all visible unregistered students'
                      }
                    />
                  );
                })()}
              </TableHead>
              <TableHead className="w-10 text-center whitespace-nowrap">#</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Student &amp; CIC</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Class</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Volunteer Status</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Assigned Duty</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contact / T-Shirt</TableHead>
              <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</TableHead>
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
                    <div className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                      No Students Match Filter
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-sans">
                      {searchQuery
                        ? `No students found matching "${searchQuery}".`
                        : 'No Aliya or PG students match the selected filter criteria.'}
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
                    className={`hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] ${isRegistered ? 'bg-emerald-500/5 dark:bg-emerald-500/5' : ''
                      }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isRegistered || isVolunteerRegLocked}
                        onChange={e => toggleSelectedStudent(student.id, e.target.checked)}
                        className="rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] accent-amber-500 w-3.5 h-3.5 disabled:opacity-30 cursor-pointer"
                        title={isVolunteerRegLocked ? 'Registration is locked' : isRegistered ? 'Already registered' : 'Select for batch registration'}
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
                          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${isPg
                            ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                            }`}
                        >
                          {(student.name || student.full_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                            {student.name || student.full_name}
                          </div>
                          {(student.admission_no || student.cic_no || student.cic_number) && (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                CIC: {student.admission_no || student.cic_no || student.cic_number}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Class */}
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                        {student.class || (isPg ? 'PG-Final' : 'AL-Final')}
                      </span>
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
                    <TableCell>
                      {isRegistered ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isVolunteerRegLocked}
                            onClick={() => handleOpenRegister(student)}
                            className="text-xs disabled:opacity-40"
                            title={isVolunteerRegLocked ? 'Editing locked by fest administration' : 'Edit volunteer duty or contact'}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={isVolunteerRegLocked}
                            onClick={() => handleUnregister(student)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 p-1.5 disabled:opacity-40"
                            title={isVolunteerRegLocked ? 'Removal locked by fest administration' : 'Remove from volunteer roster'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant="saffron"
                          disabled={isVolunteerRegLocked}
                          onClick={() => handleOpenRegister(student)}
                          className="font-heading font-bold text-xs disabled:opacity-50"
                          title={isVolunteerRegLocked ? 'Volunteer registration is locked by fest administration' : 'Register volunteer'}
                        >
                          {isVolunteerRegLocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5 mr-1" />
                              Locked
                            </>
                          ) : (
                            <>
                              <HeartHandshake className="w-3.5 h-3.5 mr-1" />
                              Register
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Volunteer Registration & Duty Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVolunteer ? 'Edit Volunteer Details' : 'Register Fest Volunteer'}
        description={`Allocate fest duty role for ${targetStudent?.name || targetStudent?.full_name || 'Student'}`}
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
                    <div className="text-xs font-bold font-heading text-[var(--text-primary)]">
                      {targetStudent.name || targetStudent.full_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {(targetStudent.admission_no || targetStudent.cic_no || targetStudent.cic_number) && (
                        <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                          CIC: {targetStudent.admission_no || targetStudent.cic_no || targetStudent.cic_number}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Class: {targetStudent.class || (isModalPg ? 'PG' : 'AL')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Duty Selection */}
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Volunteer Duty Assignment <span className="text-rose-500">*</span>
              </label>
              <select
                value={dutyPreference}
                onChange={e => setDutyPreference(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  Contact Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    placeholder="e.g. 9847123456"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  Fest T-Shirt Size
                </label>
                <div className="flex items-center gap-1.5">
                  {TSHIRT_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTshirtSize(size)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${tshirtSize === size
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] border-amber-500 shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-medium)] hover:bg-[var(--bg-subtle)]'
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
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                Special Skills / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Fluent in Arabic/English, First Aid, Sound & Audio mixer experience..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
              />
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-heading"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="saffron"
                size="sm"
                disabled={isSubmitting}
                className="text-xs font-heading font-bold"
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

      {/* Multiple / Batch Volunteer Registration Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => !isSubmitting && setIsBatchModalOpen(false)}
        title={`Register Selected Volunteers (${selectedAvailableStudents.length})`}
        description="Select a shared volunteer duty and enter phone number, T-shirt size, and notes for each selected student"
        maxWidth="4xl"
      >
        <form onSubmit={handleBatchRegister} className="space-y-4">
          {batchError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{batchError}</span>
            </div>
          )}

          {/* Shared Duty Selector */}
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Volunteer Duty Assignment <span className="text-rose-500">*</span>
            </label>
            <select
              value={batchDuty}
              onChange={e => setBatchDuty(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
            >
              {VOLUNTEER_DUTIES.map(duty => (
                <option key={duty} value={duty}>
                  {duty}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Students Per-Row Details Table */}
          <div className="max-h-[52vh] overflow-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead className="bg-[var(--bg-subtle)]/80 sticky top-0 z-10 border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-8 text-center">#</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Student &amp; CIC</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-40">Phone No</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-24">T-Shirt</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Notes</th>
                  <th className="py-2.5 px-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                {selectedAvailableStudents.map((stu, idx) => {
                  const studentCic = stu.admission_no || stu.cic_no || stu.cic_number;
                  const draft = batchDrafts[stu.id] || {
                    phone: stu.phone || '',
                    tshirt_size: 'L',
                    notes: ''
                  };

                  return (
                    <tr key={stu.id} className="hover:bg-[var(--bg-hover)]/50">
                      <td className="py-2 px-3 text-center text-xs font-mono text-[var(--text-muted)]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 min-w-[160px]">
                        <div className="text-xs font-bold font-heading text-[var(--text-primary)]">
                          {stu.name || stu.full_name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-2 mt-0.5">
                          {studentCic && <span>CIC: {studentCic}</span>}
                          {stu.class && <span>{stu.class}</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="tel"
                          placeholder="Phone no"
                          value={draft.phone}
                          onChange={e => updateBatchDraft(stu.id, { phone: e.target.value })}
                          aria-label={`Phone number for ${stu.name || stu.full_name}`}
                          className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-medium)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono focus:outline-none focus:border-[var(--f-saffron)]"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={draft.tshirt_size}
                          onChange={e => updateBatchDraft(stu.id, { tshirt_size: e.target.value })}
                          aria-label={`T-Shirt size for ${stu.name || stu.full_name}`}
                          className="w-full px-2 py-1.5 text-xs font-bold border border-[var(--border-medium)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                        >
                          {TSHIRT_SIZES.map(size => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Optional notes"
                          value={draft.notes}
                          onChange={e => updateBatchDraft(stu.id, { notes: e.target.value })}
                          aria-label={`Notes for ${stu.name || stu.full_name}`}
                          className="w-full min-w-[120px] px-2.5 py-1.5 text-xs border border-[var(--border-medium)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-sans focus:outline-none focus:border-[var(--f-saffron)]"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = selectedAvailableStudents.filter(s => s.id !== stu.id);
                            toggleSelectedStudent(stu.id, false);
                            if (remaining.length === 0) setIsBatchModalOpen(false);
                          }}
                          title="Remove from selection"
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsBatchModalOpen(false)}
              className="text-xs font-heading"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="saffron"
              size="sm"
              disabled={isSubmitting || selectedAvailableStudents.length === 0}
              className="text-xs font-heading font-bold"
            >
              {isSubmitting
                ? 'Registering...'
                : `Confirm Registration (${selectedAvailableStudents.length})`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
