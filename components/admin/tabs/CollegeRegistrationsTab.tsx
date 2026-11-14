'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemModeBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Award,
  Users,
  UserCheck,
  Search,
  Eye,
  Phone,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Building2,
  Clock,
  Download,
  AlertCircle,
  Filter,
  DollarSign,
  FileText
} from 'lucide-react';
import {
  Item,
  College,
  Student,
  Result,
  Registration,
  RegistrationLog,
  isCategoryMatching,
  normalizeCategoryKey,
  getEffectiveStageMode,
  isSubmissionEvent,
  isScreeningEvent,
  getItemParticipantBounds,
  requiresPreFestSubmission
} from '@/lib/types/fest';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  getRegistrationStudentKey,
  registrationContainsStudent,
  calculateStudentEvents
} from '@/lib/utils/studentIdentity';
import { formatIstDisplay, evaluateEventDeadlineSetting, formatDurationCompact } from '@/lib/utils/istDate';
import { getEventKind } from '@/lib/types/fest';
import { formatPdfItemMode, generateParticipantsListPdf, ParticipantPdfRow } from '@/lib/utils/participantsListPdf';

export interface LateRegistrationEntry {
  id: string;
  registration: Registration;
  item: Item;
  student?: Student;
  college: College;
  regTime?: Date;
  effectiveRegDeadline?: Date;
  effectiveFineDeadline?: Date;
  reason: string;
  delayText: string;
  fineTier: 'fine' | 'super_fine' | 'override';
  fineAmount: number;
  isFinePeriod: boolean;
  isSuperFinePeriod: boolean;
  fineStatus: boolean;
  isWaived: boolean;
  waivedAt?: string | null;
}

interface CollegeRegistrationsTabProps {
  selectedCollegeAffl?: number;
  onSelectCollegeAffl?: (afflNo: number) => void;
}

export function CollegeRegistrationsTab({
  selectedCollegeAffl,
  onSelectCollegeAffl
}: CollegeRegistrationsTabProps) {
  const { festSettings, refreshKey, triggerRefresh } = useFest();

  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  // Pre-Fest screening & submission events are managed exclusively in PreFestEventsTab
  const items = useMemo(
    () => festService.getItems().filter(item => !requiresPreFestSubmission(item)),
    [refreshKey]
  );
  const itemMap = useMemo(() => new Map(items.map(i => [Number(i.item_id), i])), [items]);
  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const registrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const locks = useMemo(() => festService.getExplicitEntryLocks(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);
  const registrationLogs = useMemo(() => festService.getRegistrationLogs(), [refreshKey]);
  const lateRegistrationsFromTable = useMemo(() => festService.getLateRegistrations(), [refreshKey]);

  // Selected College State
  const [internalSelectedAffl, setInternalSelectedAffl] = useState<number>(() => {
    return selectedCollegeAffl || (colleges.length > 0 ? colleges[0].affl_no : 1);
  });

  const activeCollegeAffl = selectedCollegeAffl ?? internalSelectedAffl;

  const handleCollegeChange = (affl: number) => {
    if (onSelectCollegeAffl) {
      onSelectCollegeAffl(affl);
    } else {
      setInternalSelectedAffl(affl);
    }
  };

  // Sync state if colleges load
  useEffect(() => {
    if (colleges.length > 0 && !colleges.some(c => c.affl_no === activeCollegeAffl)) {
      handleCollegeChange(colleges[0].affl_no);
    }
  }, [colleges.length, activeCollegeAffl]);

  // Fetch Supabase data for the college
  const [isLoadingCollegeData, setIsLoadingCollegeData] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const affl = activeCollegeAffl;
    if (!affl) return;

    setIsLoadingCollegeData(true);
    Promise.all([
      festService.fetchStudentsForCollege(affl),
      festService.fetchRegistrationsForCollege(affl),
      festService.fetchLateRegistrationsForCollege(affl)
    ])
      .then(() => {
        if (isMounted) {
          triggerRefresh();
          setIsLoadingCollegeData(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingCollegeData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollegeAffl]);

  // Active College Object & Records
  const currentCol = useMemo(() => {
    return colleges.find(c => Number(c.affl_no) === Number(activeCollegeAffl)) || colleges[0];
  }, [colleges, activeCollegeAffl]);

  const currentColAffl = Number(currentCol?.affl_no) || 11;
  const collegeRegs = useMemo(() => {
    return registrations.filter(
      r => Number(r.college_affl_no) === currentColAffl && itemMap.has(Number(r.item_id))
    );
  }, [registrations, currentColAffl, itemMap]);

  const collegeStudents = useMemo(() => {
    return students.filter(s => Number(s.college_affl_no) === currentColAffl);
  }, [students, currentColAffl]);

  const registeredItemIds = useMemo(() => {
    return new Set(collegeRegs.map(r => r.item_id));
  }, [collegeRegs]);

  const activeStudentChestNos = useMemo(() => {
    return new Set(collegeRegs.map(r => r.chest_no));
  }, [collegeRegs]);

  // Metrics
  const totalEventsCount = items.length;
  const registeredEventsCount = registeredItemIds.size;
  const regPercentage = totalEventsCount > 0 ? Math.round((registeredEventsCount / totalEventsCount) * 100) : 0;
  const singleEventsCount = items.filter(i => i.item_type === 'Single' && registeredItemIds.has(i.item_id)).length;
  const groupEventsCount = items.filter(i => i.item_type === 'Group' && registeredItemIds.has(i.item_id)).length;

  // View Mode & Filters
  const [mainTab, setMainTab] = useState<'events' | 'students' | 'late_registrations'>('events');

  // Search & Filters for Events Table
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCategoryFilter, setRegCategoryFilter] = useState('All');
  const [regModeFilter, setRegModeFilter] = useState<'All' | 'onstage' | 'offstage' | 'submission' | 'screening'>('All');
  const [regStatusFilter, setRegStatusFilter] = useState<'All' | 'Registered' | 'Late' | 'Unregistered'>('All');

  // Search & Filters for Students View
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCategoryFilter, setStudentCategoryFilter] = useState('All');
  const [studentRegStatusFilter, setStudentRegStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All');

  // Search & Filters for Late Registrations View
  const [lateScope, setLateScope] = useState<'current' | 'all'>('current');
  const [lateSearchQuery, setLateSearchQuery] = useState('');
  const [lateFineFilter, setLateFineFilter] = useState<'all' | 'fine' | 'waived'>('all');
  const [lateTierFilter, setLateTierFilter] = useState<'all' | 'fine' | 'super_fine'>('all');
  const [lateCategoryFilter, setLateCategoryFilter] = useState('All');

  // Modals State
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  // View-only roster modal state (admin does not register students for colleges)
  const [viewRosterItem, setViewRosterItem] = useState<Item | null>(null);

  // Pre-index maps for late evaluation performance
  const collegeMap = useMemo(() => new Map(colleges.map(c => [Number(c.affl_no), c])), [colleges]);

  // Helper to determine if a registration is late
  const computeLateEntry = (
    r: Registration,
    itemLookup: Map<number, Item>,
    colLookup: Map<number, College>,
    studentList: Student[]
  ): LateRegistrationEntry | null => {
    const item = itemLookup.get(Number(r.item_id));
    const college = colLookup.get(Number(r.college_affl_no));
    if (!item || !college) return null;

    const student =
      findStudentByIdentifier(collegeStudents, r.cic_no || r.chest_no) ||
      findStudentByIdentifier(studentList, r.cic_no || r.chest_no);

    const tableRow = lateRegistrationsFromTable.find(
      l => Number(l.item_id) === Number(r.item_id) && l.chest_no === r.chest_no
    );

    const logMatch = !r.created_at
      ? registrationLogs.find(
        log =>
          log.process === 'ADD' &&
          Number(log.item_id) === Number(r.item_id) &&
          Number(log.college_affl_no) === Number(r.college_affl_no) &&
          log.chest_no === r.chest_no
      )
      : undefined;

    const rawTimestamp = r.created_at || logMatch?.timestamp || tableRow?.created_at;
    const regTime = rawTimestamp ? new Date(rawTimestamp) : undefined;
    const validRegTime = regTime && !Number.isNaN(regTime.getTime()) ? regTime : undefined;

    const kind = getEventKind(item);
    const deadlineSetting = festService.getEventDeadlineSetting(kind);
    const effectiveRegDeadline = deadlineSetting.no_fine_deadline ? new Date(deadlineSetting.no_fine_deadline) : (item.reg_deadline ? new Date(item.reg_deadline) : undefined);
    const effectiveFineDeadline = deadlineSetting.has_super_fine && deadlineSetting.super_fine_deadline
      ? new Date(deadlineSetting.super_fine_deadline)
      : (deadlineSetting.fine_deadline ? new Date(deadlineSetting.fine_deadline) : undefined);

    // Strictly check if registration timestamp was past normal deadline
    const isAfterRegDeadline = Boolean(
      effectiveRegDeadline &&
      validRegTime &&
      validRegTime.getTime() > effectiveRegDeadline.getTime()
    );

    const isLate = Boolean(tableRow) || isAfterRegDeadline;

    if (!isLate) return null;

    const tierAtReg = validRegTime ? evaluateEventDeadlineSetting(deadlineSetting, validRegTime) : null;

    let fineTier: 'fine' | 'super_fine' | 'override' = 'fine';
    let fineAmount: number = tierAtReg?.fineAmount ?? 500;
    let reason = tableRow?.late_reason || 'Late Registration';
    let delayText = 'Late Submission';

    if (tableRow?.fine_tier === 'super_fine' || (tableRow?.fine_amount != null && Number(tableRow.fine_amount) >= 1000)) {
      fineTier = 'super_fine';
      fineAmount = Number(tableRow?.fine_amount) || 1000;
    } else if (tableRow?.fine_tier === 'fine' || (tableRow?.fine_amount != null && Number(tableRow.fine_amount) > 0)) {
      fineTier = 'fine';
      fineAmount = Number(tableRow?.fine_amount) || 500;
    } else if (tierAtReg && (tierAtReg.tier === 'super_fine' || tierAtReg.tier === 'closed')) {
      fineTier = 'super_fine';
      fineAmount = tierAtReg.fineAmount;
    } else if (tierAtReg && tierAtReg.tier === 'fine') {
      fineTier = 'fine';
      fineAmount = tierAtReg.fineAmount;
    } else if (college.manual_lock_override && !isAfterRegDeadline) {
      fineTier = 'override';
      fineAmount = 0;
    }

    if (tierAtReg && isAfterRegDeadline) {
      delayText = `+${formatDurationCompact(tierAtReg.diffMs)} late`;
    }

    if (tableRow?.late_reason) {
      reason = tableRow.late_reason;
    } else if (tierAtReg?.tier === 'fine') {
      reason = `Fine Period (₹${fineAmount.toLocaleString('en-IN')}) — within fine window`;
    } else if (tierAtReg?.tier === 'super_fine') {
      reason = `Super Fine Period (₹${fineAmount.toLocaleString('en-IN')}) — super fine window`;
    } else if (tierAtReg?.tier === 'closed') {
      reason = `Admin Entry Past Cutoff (₹${fineAmount.toLocaleString('en-IN')})`;
    } else if (college.fine_status) {
      reason = 'Late Fine Flagged on Institution';
      delayText = 'Fine Status Active';
    } else if (college.manual_lock_override) {
      reason = 'Admin Clearance';
      delayText = 'Unlocked';
    }

    return {
      id: r.id || `${r.college_affl_no}-${r.item_id}-${r.chest_no}`,
      registration: r,
      item,
      student,
      college,
      regTime: validRegTime,
      effectiveRegDeadline,
      effectiveFineDeadline,
      reason,
      delayText,
      fineTier,
      fineAmount,
      isFinePeriod: fineTier === 'fine',
      isSuperFinePeriod: fineTier === 'super_fine',
      fineStatus: Boolean(college.fine_status),
      isWaived: Boolean(tableRow?.is_waived),
      waivedAt: tableRow?.waived_at,
    };
  };

  // Fest-wide late entries
  const allFestLateEntries = useMemo(() => {
    const list: LateRegistrationEntry[] = [];
    registrations.forEach(r => {
      const entry = computeLateEntry(r, itemMap, collegeMap, students);
      if (entry) list.push(entry);
    });
    return list;
  }, [registrations, itemMap, collegeMap, students, registrationLogs, festSettings]);

  // Current college late entries
  const activeCollegeLateEntries = useMemo(() => {
    return allFestLateEntries.filter(e => Number(e.college.affl_no) === currentColAffl);
  }, [allFestLateEntries, currentColAffl]);

  const activeCollegeLateItemIds = useMemo(() => {
    return new Set(activeCollegeLateEntries.map(e => Number(e.item.item_id)));
  }, [activeCollegeLateEntries]);

  const activeCollegeLateByItemMap = useMemo(() => {
    const map = new Map<number, LateRegistrationEntry>();
    activeCollegeLateEntries.forEach(entry => {
      const existing = map.get(Number(entry.item.item_id));
      if (!existing || entry.fineAmount > existing.fineAmount) {
        map.set(Number(entry.item.item_id), entry);
      }
    });
    return map;
  }, [activeCollegeLateEntries]);

  // Filter Events for the Single Unified Table
  const filteredItems = useMemo(() => {
    const q = regSearchQuery.toLowerCase().trim();
    return items
      .filter(item => {
        const name = item.name || item.name_eng || '';
        const code = item.code || item.item_code || '';
        const matchesSearch =
          !q ||
          name.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) ||
          collegeRegs.some(r => {
            if (r.item_id !== item.item_id) return false;
            if (r.chest_no && r.chest_no.toLowerCase().includes(q)) return true;
            const s =
              findStudentByIdentifier(collegeStudents, r.cic_no || r.chest_no) ||
              findStudentByIdentifier(students, r.cic_no || r.chest_no);
            return s && (s.name || s.full_name || '').toLowerCase().includes(q);
          });

        const itemPhase = item.phase || item.category || '';
        const matchesCategory =
          regCategoryFilter === 'All' ||
          normalizeCategoryKey(itemPhase) === normalizeCategoryKey(regCategoryFilter);
        const itemMode = getEffectiveStageMode(item);
        const matchesMode =
          regModeFilter === 'All' ||
          (regModeFilter === 'submission'
            ? isSubmissionEvent(item)
            : regModeFilter === 'screening'
              ? isScreeningEvent(item)
              : itemMode === regModeFilter);
        const isRegistered = registeredItemIds.has(item.item_id);
        const isLateEvent = activeCollegeLateItemIds.has(Number(item.item_id));
        const matchesStatus =
          regStatusFilter === 'All' ||
          (regStatusFilter === 'Registered' && isRegistered) ||
          (regStatusFilter === 'Late' && isLateEvent) ||
          (regStatusFilter === 'Unregistered' && !isRegistered);
        return matchesSearch && matchesCategory && matchesMode && matchesStatus;
      })
      .sort((a, b) => {
        const codeA = a.code || a.item_code || '';
        const codeB = b.code || b.item_code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [items, regSearchQuery, regCategoryFilter, regModeFilter, regStatusFilter, registeredItemIds, activeCollegeLateItemIds, collegeRegs, collegeStudents, students]);

  const categories = ['All', 'Foundation', 'Thamheediyya', 'Aliya', 'PG', 'General', 'Special', 'Special - Foundation'];

  const handleDownloadCollegePdf = () => {
    if (!currentCol) return;

    // Collect all registered student entries for this college
    const rows: ParticipantPdfRow[] = [];

    // Map item lookups for fast access
    items.forEach(itm => {
      const itemRegs = collegeRegs.filter(r => Number(r.item_id) === Number(itm.item_id));
      if (itemRegs.length === 0) return;

      itemRegs.forEach(reg => {
        const student =
          findStudentByIdentifier(collegeStudents, reg.cic_no || reg.chest_no) ||
          findStudentByIdentifier(students, reg.cic_no || reg.chest_no);

        rows.push({
          studentName: student?.name || student?.full_name || 'Participant',
          cicNo: String(student?.admission_no || '—'),
          chestNo: reg.chest_no || getCanonicalChestNo(student),
          category: student?.phase || itm.phase || itm.category || '—',
          itemName: itm.name || itm.name_eng || `Item #${itm.item_id}`,
          itemCode: itm.code || itm.item_code || `ITM-${itm.item_id}`,
          itemType: itm.item_type || ((itm.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
          itemMode: formatPdfItemMode(itm),
          blindCode: reg.code_letter || 'Unassigned'
        });
      });
    });

    if (rows.length === 0) {
      alert(`No registered students found for ${currentCol.name} (#${currentCol.affl_no}).`);
      return;
    }

    // Sort by student name, then item code
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.itemCode.localeCompare(b.itemCode));

    const doc = generateParticipantsListPdf({
      collegeName: `${currentCol.name} (#${currentCol.affl_no})`,
      collegeAfflNo: currentCol.affl_no,
      participants: rows,
      festName: festSettings?.fest_name || '14th Wafy Arts Fest',
      filterSummary: `${rows.length} total event registration entries across ${registeredEventsCount} events`
    });

    doc.save(`Registered_Students_Col_${currentCol.affl_no}_${currentCol.short_name || 'College'}.pdf`);
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. LOADING BANNER */}
      {isLoadingCollegeData && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-medium animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-500" />
          <span>Synchronizing student & registration roster for #{currentColAffl} from database...</span>
        </div>
      )}

      {/* 2. COMPACT INSTITUTION PROFILE, SWITCHER & QUICK ACTIONS */}
      <Card className="p-4 sm:p-5 border-l-4 border-l-[var(--f-saffron)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Identity & Metadata */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-bold border border-amber-500/30">
                #{currentCol?.affl_no}
              </span>
              <h3 className="text-base sm:text-lg font-heading font-black text-[var(--text-primary)] tracking-tight">
                {currentCol?.name}
              </h3>
              <Badge variant="outline" size="sm" className="uppercase font-mono text-[10px]">
                {currentCol?.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>Code: <strong className="text-[var(--text-secondary)] font-mono">{currentCol?.short_name || currentCol?.code}</strong></span>
              <span>Coordinator: <strong className="text-[var(--text-secondary)]">{currentCol?.coordinator_name || currentCol?.staff_coordinator_name || '—'}</strong></span>
              {(currentCol?.coordinator_phone || currentCol?.staff_coordinator_phone) && (
                <span className="flex items-center gap-1 font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  <Phone className="w-3 h-3" />
                  {currentCol.coordinator_phone || currentCol.staff_coordinator_phone}
                </span>
              )}
              <span>•</span>
              <span className="font-semibold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono">
                {registeredEventsCount} registered ({regPercentage}%)
              </span>
              <span>•</span>
              <span className="font-medium text-[var(--text-secondary)] font-mono">
                {activeStudentChestNos.size} students assigned
              </span>
              {activeCollegeLateEntries.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setMainTab('late_registrations')}
                    className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 font-mono hover:underline cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-500" />
                    {activeCollegeLateEntries.length} late {activeCollegeLateEntries.length === 1 ? 'entry' : 'entries'}
                  </button>
                </>
              )}
              {currentCol?.fine_status && (
                <span className="px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                  Late Fine Flagged
                </span>
              )}
            </div>
          </div>

          {/* College Switcher & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative w-full sm:w-64 lg:w-72">
              <select
                value={activeCollegeAffl}
                onChange={e => handleCollegeChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 cursor-pointer transition-all"
              >
                {colleges.map(c => (
                  <option key={c.affl_no} value={c.affl_no} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    #{c.affl_no} - {c.short_name} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="xs"
                variant={currentCol?.manual_lock_override ? 'destructive' : 'outline'}
                onClick={() => {
                  festService.toggleCollegeLockOverride(currentCol.affl_no);
                  triggerRefresh();
                }}
                className="h-8 text-xs whitespace-nowrap"
                title="Toggle lock status for this college"
              >
                {currentCol?.manual_lock_override ? (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-1 text-rose-400" /> Lock
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Unlock
                  </>
                )}
              </Button>

              <Button
                size="xs"
                variant={currentCol?.fine_status ? 'outline' : 'secondary'}
                onClick={() => {
                  festService.toggleCollegeFine(currentCol.affl_no);
                  triggerRefresh();
                }}
                className="h-8 text-xs whitespace-nowrap"
                title="Toggle fine status"
              >
                {currentCol?.fine_status ? 'Waive Fine' : 'Apply Fine'}
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={handleDownloadCollegePdf}
                className="h-8 text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:bg-amber-500/10 border-amber-500/30 whitespace-nowrap font-medium"
                title={`Download registered students list for ${currentCol?.name} as PDF`}
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-amber-500" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. VIEW MODE SWITCHER: EVENTS TABLE VS STUDENT ROSTER VS LATE REGISTRATIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-subtle)] p-1.5 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setMainTab('events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${mainTab === 'events'
              ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Events & Registration Table</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--bg-surface)] font-mono text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('students')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${mainTab === 'students'
              ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span>Student Roster</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--bg-surface)] font-mono text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {collegeStudents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('late_registrations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${mainTab === 'late_registrations'
              ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Late Registrations</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${activeCollegeLateEntries.length > 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                }`}
            >
              {activeCollegeLateEntries.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] px-2 font-mono">
          {mainTab === 'events'
            ? `${registeredEventsCount} of ${items.length} events registered (${regPercentage}%)`
            : mainTab === 'students'
              ? `${activeStudentChestNos.size} of ${collegeStudents.length} students assigned to events`
              : lateScope === 'current'
                ? `${activeCollegeLateEntries.length} late entry rows for #${currentCol?.affl_no}`
                : `${allFestLateEntries.length} total late entry rows across fest`}
        </div>
      </div>

      {/* 4. UNIFIED ALL-EVENTS REGISTRATION TABLE */}
      {mainTab === 'events' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <Card className="p-3 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events by name or code (e.g. AF065, Elocution)..."
                  value={regSearchQuery}
                  onChange={e => setRegSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-medium transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-xl border border-[var(--border-subtle)] text-xs">
                  {(['All', 'Registered', 'Late', 'Unregistered'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setRegStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${regStatusFilter === status
                        ? status === 'Late'
                          ? 'bg-amber-500 text-[#090d1a] shadow-xs'
                          : 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      {status === 'All'
                        ? `All (${items.length})`
                        : status === 'Registered'
                          ? `Registered (${registeredEventsCount})`
                          : status === 'Late'
                            ? `Late (${activeCollegeLateItemIds.size})`
                            : `Not Enrolled (${items.length - registeredEventsCount})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRegCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all border ${regCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] border-transparent shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-xs border-l border-[var(--border-subtle)] pl-2">
                  {(['All', 'onstage', 'offstage'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRegModeFilter(m)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all border ${regModeFilter === m
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] border-transparent shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      {m === 'All' ? 'All Modes' : m === 'onstage' ? 'On Stage' : 'Off Stage'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Event Registrations Table */}
          <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Fest Events & College Roster</h4>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Showing {filteredItems.length} of {items.length} events for #{currentCol?.affl_no} {currentCol?.short_name}
                </p>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Click any student chip to inspect their profile and full registrations.
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
                  <TableRow>
                    <TableHead className="w-24 font-bold text-xs py-2.5 pl-4">Code / Type</TableHead>
                    <TableHead className="min-w-[180px] max-w-[260px] font-bold text-xs py-2.5">
                      Event Name & Category
                    </TableHead>
                    <TableHead className="w-32 text-center font-bold text-xs py-2.5">Status</TableHead>
                    <TableHead className="min-w-[240px] font-bold text-xs py-2.5">
                      Registered Students / Team
                    </TableHead>
                    <TableHead className="text-right w-36 font-bold text-xs py-2.5 pr-4">Admin Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-[var(--text-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
                          <p className="text-sm font-medium">No events found matching your filter criteria</p>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setRegSearchQuery('');
                              setRegCategoryFilter('All');
                              setRegStatusFilter('All');
                            }}
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => {
                      const itemRegs = collegeRegs.filter(r => r.item_id === item.item_id);
                      const isReg = itemRegs.length > 0;
                      const registeredChestNos = itemRegs.map(r => r.chest_no);
                      const registeredStudentObjects = registeredChestNos
                        .map(
                          cNo =>
                            findStudentByIdentifier(collegeStudents, cNo) ||
                            findStudentByIdentifier(students, cNo)
                        )
                        .filter(Boolean) as Student[];

                      const lock = locks.find(
                        l => l.item_id === item.item_id && l.college_affl_no === currentColAffl
                      );
                      const isCollegeUnlocked = Boolean(currentCol?.manual_lock_override);
                      const isCellExplicitlyOpen = lock?.is_open === true;
                      const isCellExplicitlyClosed = lock?.is_open === false;
                      const isItemLocked = Boolean(item.is_locked);
                      const isUnlocked = isCollegeUnlocked
                        ? (!isCellExplicitlyClosed && !isItemLocked)
                        : isCellExplicitlyOpen;

                      return (
                        <TableRow
                          key={item.item_id || item.id}
                          className={`border-b border-[var(--border-subtle)]/50 transition-colors ${isReg
                            ? 'bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)]/70'
                            : 'hover:bg-[var(--bg-subtle)]/50'
                            }`}
                        >
                          <TableCell className="py-2.5 pl-4 align-middle">
                            <div className="flex flex-col">
                              <span className="font-mono font-black text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-xs">
                                {item.code}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="font-mono text-[9.5px] px-1 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold">
                                  {item.item_type || 'Single'}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  ({(() => {
                                    const b = getItemParticipantBounds(item);
                                    return b.isOpen ? 'Open' : b.min === b.max ? b.min : `${b.min}-${b.max}`;
                                  })()})
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 align-middle max-w-[260px]">
                            <div className="font-bold text-[var(--text-primary)] text-xs truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <CategoryBadge category={item.phase || item.category} />
                              <ItemModeBadge mode={item.mode} isSubmission={isSubmissionEvent(item)} isScreening={isScreeningEvent(item)} size="sm" />
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 align-middle text-center">
                            <div className="flex flex-col items-center gap-1">
                              {isReg ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Enrolled ({registeredChestNos.length})</span>
                                  </span>
                                  {(() => {
                                    const lateInfo = activeCollegeLateByItemMap.get(Number(item.item_id));
                                    if (lateInfo) {
                                      return (
                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${lateInfo.fineTier === 'super_fine'
                                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                            }`}
                                        >
                                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                                          {lateInfo.fineTier === 'super_fine'
                                            ? `Super Fine ₹${(lateInfo.fineAmount ?? 1000).toLocaleString('en-IN')}`
                                            : `Fine ₹${(lateInfo.fineAmount ?? 500).toLocaleString('en-IN')}`}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {itemRegs[0]?.created_at && (
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]" suppressHydrationWarning>
                                      {formatIstDisplay(itemRegs[0].created_at)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10.5px] text-[var(--text-muted)] font-medium">
                                  Not Enrolled
                                </span>
                              )}

                              <div>
                                {isUnlocked ? (
                                  <span className="inline-flex items-center text-[10px] text-[var(--text-secondary)] font-medium">
                                    <Unlock className="w-2.5 h-2.5 mr-1 text-emerald-500" /> Open
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] text-[var(--text-secondary)] font-medium">
                                    <Lock className="w-2.5 h-2.5 mr-1 text-rose-500" /> Locked
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 align-middle">
                            {isReg && registeredStudentObjects.length > 0 ? (
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <div className="relative flex-1 min-w-[170px]">
                                  <select
                                    value=""
                                    onChange={e => {
                                      const chest = e.target.value;
                                      if (!chest) return;
                                      const stu =
                                        findStudentByIdentifier(collegeStudents, chest) ||
                                        findStudentByIdentifier(students, chest);
                                      if (stu) setSelectedStudentForDetails(stu);
                                    }}
                                    className="w-full px-2.5 py-1 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 cursor-pointer truncate shadow-2xs transition-all"
                                    title="Click to view all registered students for this event"
                                  >
                                    <option value="" disabled className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                                      {registeredStudentObjects.length === 1
                                        ? `${getCanonicalChestNo(registeredStudentObjects[0])} - ${registeredStudentObjects[0].name}`
                                        : `👥 ${registeredStudentObjects.length} Students Registered ▾`}
                                    </option>
                                    {registeredStudentObjects.map(stu => {
                                      const stuChest = getCanonicalChestNo(stu);
                                      return (
                                        <option key={stu.id || stuChest} value={stu.id || stuChest} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                                          {stuChest} — {stu.name} ({stu.phase || stu.category || 'Cat'})
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {registeredStudentObjects[0] && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForDetails(registeredStudentObjects[0])}
                                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] hover:bg-[var(--bg-subtle)] transition-all shrink-0 border border-transparent hover:border-[var(--border-subtle)]"
                                    title={`View profile for ${registeredStudentObjects[0].name} (${getCanonicalChestNo(registeredStudentObjects[0])})`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : isReg && registeredChestNos.length > 0 ? (
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <select
                                  value=""
                                  onChange={e => {
                                    const chest = e.target.value;
                                    if (!chest) return;
                                    const stu =
                                      findStudentByIdentifier(collegeStudents, chest) ||
                                      findStudentByIdentifier(students, chest);
                                    if (stu) setSelectedStudentForDetails(stu);
                                  }}
                                  className="w-full px-2.5 py-1 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] font-medium cursor-pointer shadow-2xs focus:outline-none focus:border-[var(--f-saffron)]"
                                >
                                  <option value="" disabled className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                                    👥 {registeredChestNos.length} Enrolled ({registeredChestNos.join(', ')})
                                  </option>
                                  {registeredChestNos.map(cNo => (
                                    <option key={cNo} value={cNo} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                                      {cNo}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)] italic">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                            {isReg ? (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setViewRosterItem(item)}
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                                title="View enrolled students"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                                View Roster
                              </Button>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)] italic pr-2">
                                Not Registered
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIEW BY REGISTERED STUDENTS & DETAILS */}
      {mainTab === 'students' && (() => {
        const filteredStudentsList = collegeStudents.filter(stu => {
          const name = (stu.name || stu.full_name || '').toLowerCase();
          const chest = (stu.chest_no || '').toLowerCase();
          const adm = stu.admission_no != null ? String(stu.admission_no).toLowerCase() : '';
          const query = studentSearchQuery.toLowerCase();
          const matchesSearch = !query || name.includes(query) || chest.includes(query) || adm.includes(query);

          const cat = (stu.phase || stu.category || '').toLowerCase();
          const matchesCategory = studentCategoryFilter === 'All' || cat === studentCategoryFilter.toLowerCase();

          const stuRegs = collegeRegs.filter(r => registrationContainsStudent(r, stu));
          const isEnrolled = stuRegs.length > 0;
          const matchesStatus =
            studentRegStatusFilter === 'All' ||
            (studentRegStatusFilter === 'Registered' && isEnrolled) ||
            (studentRegStatusFilter === 'Unregistered' && !isEnrolled);

          return matchesSearch && matchesCategory && matchesStatus;
        });

        return (
          <div className="space-y-4">
            {/* Student Filter Bar */}
            <Card className="p-3 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search students by name, chest #, or adm #..."
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-medium transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-xl border border-[var(--border-subtle)] text-xs">
                    {(['All', 'Registered', 'Unregistered'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStudentRegStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${studentRegStatusFilter === status
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        {status === 'All'
                          ? `All (${collegeStudents.length})`
                          : status === 'Registered'
                            ? `Enrolled (${activeStudentChestNos.size})`
                            : `Not Enrolled (${collegeStudents.length - activeStudentChestNos.size})`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setStudentCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all border ${studentCategoryFilter.toLowerCase() === cat.toLowerCase()
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] border-transparent shadow-xs'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Registered Students Table */}
            <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
              <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    College Student Roster & Event Enrollments
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Showing {filteredStudentsList.length} of {collegeStudents.length} students from #{currentCol?.affl_no}{' '}
                    {currentCol?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleDownloadCollegePdf}
                    className="h-7 text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:bg-amber-500/10 border-amber-500/30 whitespace-nowrap font-medium"
                    title={`Download registered students roster for ${currentCol?.name} as PDF`}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    <span>Download Roster PDF</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
                    <TableRow>
                      <TableHead className="w-44 font-bold text-xs py-2.5 pl-4">Student & Chest #</TableHead>
                      <TableHead className="w-28 font-bold text-xs py-2.5">Category & Class</TableHead>
                      <TableHead className="w-32 font-bold text-xs py-2.5">Admission / Phone</TableHead>
                      <TableHead className="min-w-[240px] font-bold text-xs py-2.5">Registered Events</TableHead>
                      <TableHead className="w-20 text-center font-bold text-xs py-2.5">Quota</TableHead>
                      <TableHead className="text-right w-28 font-bold text-xs py-2.5 pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudentsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
                            <p className="text-sm font-medium">No students match your filter criteria</p>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setStudentSearchQuery('');
                                setStudentCategoryFilter('All');
                                setStudentRegStatusFilter('All');
                              }}
                            >
                              Clear Filters
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudentsList.map(stu => {
                        const stuRegs = collegeRegs.filter(r => registrationContainsStudent(r, stu));
                        const stuItemIds = new Set(stuRegs.map(r => r.item_id));
                        const enrolledItems = items.filter(i => stuItemIds.has(i.item_id));

                        const initials = (stu.name || stu.full_name || 'ST')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(w => w[0])
                          .join('')
                          .toUpperCase() || 'ST';
                        const chestNo = getCanonicalChestNo(stu);

                        return (
                          <TableRow
                            key={stu.id || stu.chest_no}
                            className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-subtle)]/60 transition-colors"
                          >
                            <TableCell className="py-2.5 pl-4 align-middle">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[170px]" title={stu.name || stu.full_name}>
                                    {stu.name || stu.full_name}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                                      {chestNo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              <div className="space-y-0.5">
                                <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
                                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                  {stu.class || 'Class N/A'}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              <div className="text-xs space-y-0.5">
                                <span className="font-mono text-[var(--text-secondary)] font-medium">
                                  {stu.admission_no || '—'}
                                </span>
                                {stu.phone ? (
                                  <div className="text-[10.5px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                                    <Phone className="w-2.5 h-2.5 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" /> {stu.phone}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[var(--text-muted)]">—</div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              {enrolledItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {enrolledItems.map(itm => (
                                    <div
                                      key={itm.item_id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] shadow-2xs"
                                    >
                                      <span className="font-mono font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-[9px]">
                                        {itm.code}
                                      </span>
                                      <span className="font-medium truncate max-w-[110px]">{itm.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)] italic">
                                  No events registered
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-2.5 align-middle text-center">
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold border bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-subtle)]"
                              >
                                {enrolledItems.length}
                              </span>
                            </TableCell>

                            <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setSelectedStudentForDetails(stu)}
                                className="h-7 px-2.5 text-xs font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)]"
                                title="View full student profile and registered events"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                                <span>Inspect</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6.1. VIEW BY LATE REGISTRATIONS LIST & FINES AUDIT */}
      {mainTab === 'late_registrations' && (() => {
        // Source entries depending on selected scope
        const sourceEntries = lateScope === 'current' ? activeCollegeLateEntries : allFestLateEntries;

        // Apply search, category, and fine status filters
        const filteredLateEntries = sourceEntries.filter(entry => {
          const q = lateSearchQuery.toLowerCase().trim();
          const stuName = (entry.student?.name || entry.student?.full_name || '').toLowerCase();
          const stuChest = (entry.student?.chest_no || entry.registration.chest_no || '').toLowerCase();
          const itmName = (entry.item.name || entry.item.name_eng || '').toLowerCase();
          const itmCode = (entry.item.code || entry.item.item_code || '').toLowerCase();
          const colName = (entry.college.name || '').toLowerCase();
          const colShort = (entry.college.short_name || entry.college.code || '').toLowerCase();
          const colAffl = String(entry.college.affl_no);

          const matchesSearch =
            !q ||
            stuName.includes(q) ||
            stuChest.includes(q) ||
            itmName.includes(q) ||
            itmCode.includes(q) ||
            colName.includes(q) ||
            colShort.includes(q) ||
            colAffl.includes(q);

          const cat = (entry.item.phase || entry.item.category || '').toLowerCase();
          const matchesCategory =
            lateCategoryFilter === 'All' || cat === lateCategoryFilter.toLowerCase();

          const matchesFine =
            lateFineFilter === 'all' ||
            (lateFineFilter === 'fine' && !entry.isWaived) ||
            (lateFineFilter === 'waived' && entry.isWaived);

          const matchesTier =
            lateTierFilter === 'all' || entry.fineTier === lateTierFilter;

          return matchesSearch && matchesCategory && matchesFine && matchesTier;
        });

        const uniqueStudentsCount = new Set(filteredLateEntries.map(e => e.student?.chest_no || e.registration.chest_no)).size;
        const uniqueItemsCount = new Set(filteredLateEntries.map(e => e.item.item_id)).size;
        const fineTierCount = sourceEntries.filter(e => e.fineTier === 'fine').length;
        const superFineTierCount = sourceEntries.filter(e => e.fineTier === 'super_fine').length;
        const totalFineAmountRs = filteredLateEntries.reduce((sum, e) => sum + e.fineAmount, 0);
        const activeFineAmountRs = filteredLateEntries.filter(e => !e.isWaived).reduce((sum, e) => sum + e.fineAmount, 0);
        const fineFlaggedEntriesCount = sourceEntries.filter(e => !e.isWaived).length;
        const fineWaivedEntriesCount = sourceEntries.filter(e => e.isWaived).length;

        // CSV Export Handler
        const handleExportLateRegistrationsCsv = () => {
          if (filteredLateEntries.length === 0) return;

          const headers = [
            'Sl No',
            'College Affl',
            'College Code',
            'College Name',
            'Chest No',
            'Student Name',
            'Class',
            'Category',
            'Event Code',
            'Event Name',
            'Event Type',
            'Registration Time (IST)',
            'Effective Deadline (IST)',
            'Fine Tier',
            'Fine Amount (INR)',
            'Late Reason',
            'Delay',
            'Fine Status'
          ];

          const rows = filteredLateEntries.map((entry, idx) => {
            const tierLabel = entry.fineTier === 'super_fine' ? 'Super Fine' : entry.fineTier === 'fine' ? 'Fine' : 'Unlocked';
            return [
              idx + 1,
              entry.college.affl_no,
              `"${(entry.college.short_name || entry.college.code || '').replace(/"/g, '""')}"`,
              `"${entry.college.name.replace(/"/g, '""')}"`,
              entry.student?.chest_no || entry.registration.chest_no,
              `"${(entry.student?.name || entry.student?.full_name || '').replace(/"/g, '""')}"`,
              `"${(entry.student?.class || '').replace(/"/g, '""')}"`,
              entry.student?.phase || entry.student?.category || entry.item.category || '',
              entry.item.code || entry.item.item_code,
              `"${(entry.item.name || entry.item.name_eng || '').replace(/"/g, '""')}"`,
              entry.item.item_type || 'Single',
              entry.regTime ? `"${formatIstDisplay(entry.regTime)}"` : '"N/A"',
              entry.effectiveRegDeadline ? `"${formatIstDisplay(entry.effectiveRegDeadline)}"` : '"N/A"',
              tierLabel,
              entry.fineAmount,
              `"${entry.reason.replace(/"/g, '""')}"`,
              `"${entry.delayText.replace(/"/g, '""')}"`,
              entry.isWaived ? 'Fine Waived' : 'Active Pending'
            ].join(',');
          });

          const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement('a');
          link.setAttribute('href', encodedUri);
          const filename =
            lateScope === 'current'
              ? `late_registrations_col_${currentColAffl}.csv`
              : 'fest_all_late_registrations.csv';
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div className="space-y-4">
            {/* 1. Header Toolbar & Scope Selector */}
            <Card className="p-4 sm:p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-amber-500/30">
                      <Clock className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-base font-heading font-black text-[var(--text-primary)]">
                      Late Registrations & Fines Clearinghouse
                    </h3>
                    <Badge variant="amber" size="sm" className="font-bold">
                      {sourceEntries.length} Records
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Audit entries submitted after normal deadlines, during the late-fine window, or via administrative clearance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Scope Switcher */}
                  <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-xl border border-[var(--border-subtle)] text-xs">
                    <button
                      type="button"
                      onClick={() => setLateScope('current')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${lateScope === 'current'
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      #{currentCol?.affl_no} {currentCol?.short_name} ({activeCollegeLateEntries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLateScope('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${lateScope === 'all'
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      All Institutions ({allFestLateEntries.length})
                    </button>
                  </div>

                  {filteredLateEntries.length > 0 && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleExportLateRegistrationsCsv}
                      className="h-8 text-xs font-semibold gap-1 whitespace-nowrap text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:bg-amber-500/10 border-amber-500/30"
                      title="Download late registrations as CSV spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-500" />
                      <span>Export CSV</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* KPI Mini Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Late Registrations
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                      {filteredLateEntries.length}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      / {sourceEntries.length} total
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Fine / Super Fine Breakdown
                  </span>
                  <div className="flex items-baseline gap-2 mt-1 font-mono">
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {fineTierCount} × Fine
                    </span>
                    <span className="text-[var(--text-muted)]">/</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {superFineTierCount} × Super Fine
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                    Total: ₹{totalFineAmountRs.toLocaleString('en-IN')} (Pending: ₹{activeFineAmountRs.toLocaleString('en-IN')} | Waived: ₹{(totalFineAmountRs - activeFineAmountRs).toLocaleString('en-IN')})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                      Late Fine Status
                    </span>
                    <div className="mt-1">
                      {lateScope === 'current' ? (() => {
                        const summary = festService.getCollegeFineSummary(currentColAffl);
                        return summary.hasActiveFine ? (
                          <Badge variant="destructive" size="sm" className="font-bold text-[10px] px-1.5 py-0 font-mono">
                            Pending: ₹{summary.netFine.toLocaleString('en-IN')}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" className="font-bold text-[10px] px-1.5 py-0">
                            Fine Clear
                          </Badge>
                        );
                      })() : (
                        <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                          {colleges.filter(c => c.fine_status).length} flagged
                        </span>
                      )}
                    </div>
                  </div>

                  {lateScope === 'current' && (() => {
                    const summary = festService.getCollegeFineSummary(currentColAffl);
                    return summary.hasActiveFine ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={async () => {
                          if (window.confirm(`Waive all pending fines (₹${summary.netFine.toLocaleString('en-IN')}) for ${currentCol?.name}?`)) {
                            await festService.waiveCollegeAllFines(currentColAffl);
                            triggerRefresh();
                          }
                        }}
                        className="h-7 text-[11px] px-2 font-semibold border-rose-400/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Waive all late entry and manual fines for this college"
                      >
                        Waive All
                      </Button>
                    ) : null;
                  })()}
                </div>
              </div>
            </Card>

            {/* 2. Search & Filters Bar */}
            <Card className="p-3 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search late entries by student name, chest #, event code/name, college..."
                    value={lateSearchQuery}
                    onChange={e => setLateSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-medium transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-xl border border-[var(--border-subtle)] text-xs">
                    {(['all', 'fine', 'super_fine'] as const).map(tier => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setLateTierFilter(tier)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${lateTierFilter === tier
                          ? tier === 'super_fine'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        {tier === 'all'
                          ? `All Tiers (${sourceEntries.length})`
                          : tier === 'fine'
                            ? `Fine (${fineTierCount})`
                            : `Super Fine (${superFineTierCount})`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-xl border border-[var(--border-subtle)] text-xs">
                    {(['all', 'fine', 'waived'] as const).map(fStatus => (
                      <button
                        key={fStatus}
                        type="button"
                        onClick={() => setLateFineFilter(fStatus)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${lateFineFilter === fStatus
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        {fStatus === 'all'
                          ? `All (${sourceEntries.length})`
                          : fStatus === 'fine'
                            ? `Fine Flagged (${fineFlaggedEntriesCount})`
                            : `Waived (${fineWaivedEntriesCount})`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setLateCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all border ${lateCategoryFilter.toLowerCase() === cat.toLowerCase()
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] border-transparent shadow-xs'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Late Registrations Table */}
            <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
              <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {lateScope === 'current'
                      ? `Late Registrations for #${currentCol?.affl_no} ${currentCol?.name}`
                      : 'Fest-wide Late Registrations Registry'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Showing {filteredLateEntries.length} of {sourceEntries.length} matching entries
                  </p>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Click any student chip to inspect profile or unregister to revert quotas.
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
                    <TableRow>
                      <TableHead className="w-44 font-bold text-xs py-2.5 pl-4">Student & Chest #</TableHead>
                      {lateScope === 'all' && (
                        <TableHead className="w-36 font-bold text-xs py-2.5">Institution</TableHead>
                      )}
                      <TableHead className="min-w-[180px] max-w-[240px] font-bold text-xs py-2.5">Event Name & Code</TableHead>
                      <TableHead className="w-40 font-bold text-xs py-2.5">Submitted (IST)</TableHead>
                      <TableHead className="w-36 font-bold text-xs py-2.5">Reason & Fine</TableHead>
                      <TableHead className="text-right w-36 font-bold text-xs py-2.5 pr-4">Admin Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLateEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={lateScope === 'all' ? 6 : 5} className="text-center py-12 text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2.5">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-60" />
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              No Late Registrations Found
                            </p>
                            <p className="text-xs text-[var(--text-muted)] max-w-sm text-center">
                              {sourceEntries.length === 0
                                ? lateScope === 'current'
                                : 'No late registration rows match your current search and filter criteria.'}
                            </p>
                            {(lateSearchQuery || lateFineFilter !== 'all' || lateCategoryFilter !== 'All') && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setLateSearchQuery('');
                                  setLateFineFilter('all');
                                  setLateCategoryFilter('All');
                                }}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLateEntries.map(entry => {
                        const stu = entry.student;
                        const itm = entry.item;
                        const col = entry.college;
                        const stuChest = stu ? getCanonicalChestNo(stu) : '';
                        const canonicalChest = (stuChest && stuChest !== '—') ? stuChest : (entry.registration.chest_no || '—');
                        const stuName = stu?.name || stu?.full_name || 'Enrolled Student';
                        const initials = stuName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(w => w[0])
                          .join('')
                          .toUpperCase() || 'ST';

                        return (
                          <TableRow
                            key={entry.id}
                            className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-subtle)]/60 transition-colors"
                          >
                            {/* Student Info */}
                            <TableCell className="py-2.5 pl-4 align-middle">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[150px]" title={stuName}>
                                    {stuName}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                                      {canonicalChest}
                                    </span>
                                    {stu?.class && (
                                      <span className="text-[10px] text-[var(--text-muted)]">
                                        • {stu.class}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Institution (Only in All mode) */}
                            {lateScope === 'all' && (
                              <TableCell className="py-2.5 align-middle">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                      #{col.affl_no}
                                    </span>
                                    <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[110px]" title={col.name}>
                                      {col.short_name || col.code}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]" title={col.name}>
                                    {col.name}
                                  </div>
                                </div>
                              </TableCell>
                            )}

                            {/* Event Name & Code */}
                            <TableCell className="py-2.5 align-middle max-w-[240px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                                  {itm.code || itm.item_code}
                                </span>
                                <span className="font-mono text-[9.5px] px-1 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold">
                                  {itm.item_type || 'Single'}
                                </span>
                              </div>
                              <div className="font-semibold text-xs text-[var(--text-primary)] truncate mt-0.5" title={itm.name}>
                                {itm.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <CategoryBadge category={itm.phase || itm.category} />
                                <ItemModeBadge mode={itm.mode} isSubmission={isSubmissionEvent(itm)} isScreening={isScreeningEvent(itm)} size="sm" />
                              </div>
                            </TableCell>

                            {/* Submission Time & Delay */}
                            <TableCell className="py-2.5 align-middle">
                              <div className="space-y-1">
                                <div className="text-xs font-mono text-[var(--text-secondary)] font-medium">
                                  {entry.regTime ? formatIstDisplay(entry.regTime) : 'Time not logged'}
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-amber-500/30">
                                    <Clock className="w-2.5 h-2.5 mr-1" />
                                    {entry.delayText}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Late Reason, Tier Badge & Fine Status */}
                            <TableCell className="py-2.5 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {entry.isWaived ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      <del className="opacity-60 mr-1">₹{entry.fineAmount.toLocaleString('en-IN')}</del> Waived
                                    </span>
                                  ) : entry.fineTier === 'super_fine' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                      Super Fine • ₹{entry.fineAmount.toLocaleString('en-IN')}
                                    </span>
                                  ) : entry.fineTier === 'fine' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                      Fine • ₹{entry.fineAmount.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                      Unlocked • ₹0
                                    </span>
                                  )}
                                  {entry.isWaived ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Waived / Free
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-medium text-[var(--text-secondary)] leading-tight">
                                  {entry.reason}
                                </div>
                              </div>
                            </TableCell>

                            {/* Admin Actions */}
                            <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                {stu && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => setSelectedStudentForDetails(stu)}
                                    className="h-7 w-7 p-0 hover:bg-[var(--bg-subtle)] hover:text-[var(--f-saffron-text)] dark:hover:text-[var(--f-saffron)] cursor-pointer"
                                    title={`View profile for ${stu.name}`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                )}

                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setViewRosterItem(itm)}
                                  className="h-7 px-2 text-xs font-semibold cursor-pointer"
                                  title="View event roster"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" /> Roster
                                </Button>

                                {/* Per-entry waiver toggle */}
                                <Button
                                  size="xs"
                                  variant={entry.isWaived ? 'secondary' : 'outline'}
                                  onClick={async () => {
                                    await festService.toggleLateRegistrationWaiver(
                                      entry.id,
                                      !entry.isWaived,
                                      col.affl_no,
                                      itm.item_id,
                                      entry.registration.chest_no
                                    );
                                    triggerRefresh();
                                  }}
                                  className={`h-7 px-2 text-[11px] font-semibold cursor-pointer ${entry.isWaived
                                    ? 'text-[var(--text-secondary)] hover:text-rose-500'
                                    : 'border-rose-400/40 text-rose-500 hover:bg-rose-500/10'
                                    }`}
                                  title={entry.isWaived ? 'Reinstate fine for this entry' : 'Waive fine for this specific entry'}
                                >
                                  {entry.isWaived ? 'Reinstate' : `Waive (₹${entry.fineAmount})`}
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
            </div>
          </div>
        );
      })()}

      {/* 7. VIEW-ONLY ROSTER MODAL (Admin Audit View) */}
      {viewRosterItem && (
        <Modal
          isOpen={Boolean(viewRosterItem)}
          onClose={() => setViewRosterItem(null)}
          title={`Enrolled Roster: ${viewRosterItem.name || viewRosterItem.code}`}
          description={`College #${currentCol?.affl_no} ${currentCol?.name} • Code: ${viewRosterItem.code || viewRosterItem.item_code}`}
          maxWidth="lg"
        >
          {(() => {
            const regsForItem = registrations.filter(
              r => r.item_id === viewRosterItem.item_id && Number(r.college_affl_no) === currentColAffl
            );
            const enrolledStudents: Student[] = [];
            regsForItem.forEach(r => {
              const pList = r.participants && r.participants.length > 0
                ? r.participants
                : (r.chest_no ? [{ chest_no: r.chest_no }] : []);
              pList.forEach((p: any) => {
                const s = findStudentByIdentifier(collegeStudents, p.id || p.chest_no || p.admission_no, currentColAffl);
                if (s && !enrolledStudents.some(es => es.id === s.id)) {
                  enrolledStudents.push(s);
                }
              });
            });

            return (
              <div className="space-y-4">
                <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={viewRosterItem.phase || viewRosterItem.category} />
                    <Badge variant={viewRosterItem.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                      {viewRosterItem.item_type}
                    </Badge>
                    <ItemModeBadge mode={viewRosterItem.mode} />
                  </div>
                  <span className="text-[var(--text-secondary)] font-mono">
                    Total Enrolled: <strong className="text-[var(--text-primary)]">{enrolledStudents.length}</strong>
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 p-1">
                  {enrolledStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                      No enrolled participants found for this event.
                    </div>
                  ) : (
                    enrolledStudents.map((student, idx) => {
                      const chestNo = getCanonicalChestNo(student);
                      return (
                        <div
                          key={student.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                              {chestNo !== '—' ? `#${chestNo}` : `CIC:${student.cic_no || student.admission_no}`}
                            </span>
                            <div>
                              <div className="font-semibold text-sm text-[var(--text-primary)]">
                                {student.name || student.full_name}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                                <span>Class: {student.class || 'N/A'}</span>
                                <span>•</span>
                                <span>Phase: {student.phase || student.category}</span>
                                <span>•</span>
                                <span>Adm: {student.admission_no}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex justify-end border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewRosterItem(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* 8. STUDENT DETAILS MODAL */}
      {selectedStudentForDetails && (
        <Modal
          isOpen={Boolean(selectedStudentForDetails)}
          onClose={() => setSelectedStudentForDetails(null)}
          title="Student Registration & Event Details"
          description={`Chest No: ${getCanonicalChestNo(selectedStudentForDetails)} • Admission: ${selectedStudentForDetails.admission_no}`}
          maxWidth="2xl"
        >
          {(() => {
            const stu = selectedStudentForDetails;
            const stuCollege = colleges.find(c => c.affl_no === stu.college_affl_no || c.id === stu.college_id);

            const stats = calculateStudentEvents(stu, registrations, items);
            const stuRegs = stats.events.map(e => e.registration);
            const stuItemIds = new Set(stuRegs.map(r => r.item_id));
            const stuItems = items.filter(i => stuItemIds.has(i.item_id));
            const stuSchedules = schedules.filter(s => stuItemIds.has(s.item_id));

            const quotaLimits = festService.getMaxParticipation();
            const stuCatKey = normalizeCategoryKey(stu.phase || stu.category);
            const quota =
              quotaLimits.find(q => normalizeCategoryKey(q.phase) === stuCatKey) ||
              quotaLimits.find(q => normalizeCategoryKey(q.phase) === 'GENERAL') ||
              quotaLimits[0];
            const totalMax = quota?.total_max || 7;
            const stageMax = quota?.on_max || 3;
            const offstageMax = quota?.off_max || 4;
            const groupMax = quota?.group_max || 4;

            const onstageCount = stats.onstageCount;
            const offstageCount = stats.offstageCount;
            const groupCount = stats.groupCount;
            const individualCount = stats.individualCount;

            return (
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-amber-500/30 flex items-center justify-center font-mono font-black text-base shadow-xs">
                      {getCanonicalChestNo(stu)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{stu.name || stu.full_name}</h4>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-bold border border-amber-500/30">
                          {getCanonicalChestNo(stu)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-2 mt-0.5 font-mono">
                        <span>Adm: <strong className="font-mono text-[var(--text-secondary)]">{stu.admission_no}</strong></span>
                        <span>•</span>
                        <span>College: <strong className="text-[var(--text-secondary)]">{stuCollege?.short_name || stuCollege?.name}</strong> (#{stu.college_affl_no})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end gap-1">
                    <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
                    <span className="text-[11px] text-[var(--text-muted)] font-medium font-mono">
                      Class: <strong className="text-[var(--text-secondary)]">{stu.class || 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                {/* Quota & Participation Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ind. Total</div>
                    <div className="text-base font-black text-[var(--text-primary)] mt-0.5 font-mono">
                      {individualCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {totalMax}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Onstage</div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                      {onstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {stageMax}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Offstage</div>
                    <div className="text-base font-black text-purple-600 dark:text-purple-400 mt-0.5 font-mono">
                      {offstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {offstageMax}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Group</div>
                    <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                      {groupCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {groupMax}</span>
                    </div>
                  </div>
                </div>

                {/* Registered Events Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Registered Events ({stuItems.length})
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {stu.phone ? `Contact: ${stu.phone}` : 'No phone registered'}
                    </span>
                  </div>

                  {stuItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
                      This student is not enrolled in any fest events yet.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
                      <Table className="w-full text-xs">
                        <TableHeader className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
                          <TableRow>
                            <TableHead className="w-20 font-bold py-2">Code</TableHead>
                            <TableHead className="font-bold py-2">Event Name</TableHead>
                            <TableHead className="font-bold py-2">Type / Mode</TableHead>
                            <TableHead className="font-bold py-2">Stage / Schedule</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stuItems.map(item => {
                            const sched = stuSchedules.find(s => s.item_id === item.item_id);
                            return (
                              <TableRow key={item.item_id} className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-subtle)]/60 transition-colors">
                                <TableCell className="font-mono font-black text-xs py-2 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">{item.code}</TableCell>
                                <TableCell className="font-semibold text-xs text-[var(--text-primary)] py-2">
                                  {item.name}
                                </TableCell>
                                <TableCell className="py-2">
                                  <ItemTypeBadge type={item.item_type} mode={item.mode} isSubmission={isSubmissionEvent(item)} isScreening={isScreeningEvent(item)} size="sm" />
                                </TableCell>
                                <TableCell className="text-xs text-[var(--text-muted)] py-2">
                                  {sched ? (
                                    <div>
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        Stage {sched.stage_number}
                                        {sched.stage?.name ? ` (${sched.stage.name})` : ''}
                                      </span>
                                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {sched.starting
                                          ? new Date(sched.starting).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                          : 'Time TBA'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="italic text-[var(--text-muted)]">Not scheduled</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudentForDetails(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
