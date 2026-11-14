'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  ShieldAlert,
  Flame,
  Layers,
  Save,
  Power,
  PowerOff,
  Link as LinkIcon,
  Download,
  Building2,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { EventKind, EventDeadlineSetting, LateRegistration, Registration, College, Item, Student, getEventKind } from '@/lib/types/fest';
import {
  formatIstDisplay,
  formatToIstInput,
  parseIstInputToIso,
  evaluateEventDeadlineSetting
} from '@/lib/utils/istDate';
import { findStudentByIdentifier } from '@/lib/utils/studentIdentity';

const EVENT_KIND_LABELS: Record<EventKind, { name: string; icon: any; color: string; desc: string }> = {
  screening: { 
    name: 'Screening', 
    icon: Sparkles, 
    color: 'text-amber-500',
    desc: 'Audio/Video preliminary screening events (YouTube links & registrations).'
  },
  submission: { 
    name: 'Digital Submission', 
    icon: Layers, 
    color: 'text-purple-500',
    desc: 'Digital pre-fest submissions (Drive links, files, manuscript uploads).'
  },
  onstage: { 
    name: 'On-Stage', 
    icon: Flame, 
    color: 'text-rose-500',
    desc: 'Live stage performances (Elocution, Song, Debate, Drama, etc.).'
  },
  offstage: { 
    name: 'Off-Stage', 
    icon: SlidersHorizontal, 
    color: 'text-indigo-500',
    desc: 'Writing, painting, quiz, and campus competitive events.'
  },
  general: { 
    name: 'General Fest', 
    icon: Calendar, 
    color: 'text-emerald-500',
    desc: 'Baseline fest registrations schedule and default fallbacks.'
  },
};

export function EventDeadlinesTab() {
  const { refreshKey, triggerRefresh } = useFest();
  const [settingsList, setSettingsList] = useState<EventDeadlineSetting[]>(() => festService.getEventDeadlineSettings());
  const [activeTab, setActiveTab] = useState<EventKind>('screening');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Top View Switcher: 'deadlines' vs 'late_fines'
  const [mainSection, setMainSection] = useState<'deadlines' | 'late_fines'>('deadlines');

  // Late Registrations & Fines Data
  const [lateRegistrations, setLateRegistrations] = useState<LateRegistration[]>(() => festService.getLateRegistrations());
  const [registrations, setRegistrations] = useState<Registration[]>(() => festService.getRegistrations());
  const [colleges, setColleges] = useState<College[]>(() => festService.getColleges());
  const [items, setItems] = useState<Item[]>(() => festService.getItems());
  const [students, setStudents] = useState<Student[]>(() => festService.getStudents());

  // Late Registrations Filters
  const [lateTierFilter, setLateTierFilter] = useState<'all' | 'fine' | 'super_fine'>('all');
  const [lateSearchQuery, setLateSearchQuery] = useState<string>('');
  const [collapsedColleges, setCollapsedColleges] = useState<Record<number, boolean>>({});

  // Form state for current selected category
  const currentSetting = useMemo(() => {
    const found = settingsList.find(s => s.event_kind === activeTab);
    return found || settingsList[0];
  }, [settingsList, activeTab]);

  const [startTime, setStartTime] = useState('');
  const [noFineDeadline, setNoFineDeadline] = useState('');
  const [fineDeadline, setFineDeadline] = useState('');
  const [fineAmount, setFineAmount] = useState<number>(500);
  const [hasSuperFine, setHasSuperFine] = useState<boolean>(false);
  const [superFineDeadline, setSuperFineDeadline] = useState('');
  const [superFineAmount, setSuperFineAmount] = useState<number>(1000);
  const [linkSubmissionDeadline, setLinkSubmissionDeadline] = useState('');
  const [linkStartTime, setLinkStartTime] = useState('');
  const [linkNoFineDeadline, setLinkNoFineDeadline] = useState('');
  const [linkFineDeadline, setLinkFineDeadline] = useState('');
  const [linkFineAmount, setLinkFineAmount] = useState<number>(100);
  const [linkHasSuperFine, setLinkHasSuperFine] = useState<boolean>(false);
  const [linkSuperFineDeadline, setLinkSuperFineDeadline] = useState('');
  const [linkSuperFineAmount, setLinkSuperFineAmount] = useState<number>(250);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Sync state when activeTab or currentSetting changes
  useEffect(() => {
    if (!currentSetting) return;
    setStartTime(currentSetting.start_time ? formatToIstInput(currentSetting.start_time) : '');
    setNoFineDeadline(currentSetting.no_fine_deadline ? formatToIstInput(currentSetting.no_fine_deadline) : '');
    setFineDeadline(currentSetting.fine_deadline ? formatToIstInput(currentSetting.fine_deadline) : '');
    setFineAmount(currentSetting.fine_amount ?? 500);
    setHasSuperFine(Boolean(currentSetting.has_super_fine));
    setSuperFineDeadline(currentSetting.super_fine_deadline ? formatToIstInput(currentSetting.super_fine_deadline) : '');
    setSuperFineAmount(currentSetting.super_fine_amount ?? 1000);
    setLinkSubmissionDeadline(currentSetting.link_submission_deadline ? formatToIstInput(currentSetting.link_submission_deadline) : '');
    setLinkStartTime(
      currentSetting.link_start_time
        ? formatToIstInput(currentSetting.link_start_time)
        : (currentSetting.no_fine_deadline ? formatToIstInput(currentSetting.no_fine_deadline) : '')
    );
    setLinkNoFineDeadline(
      currentSetting.link_no_fine_deadline
        ? formatToIstInput(currentSetting.link_no_fine_deadline)
        : (currentSetting.link_submission_deadline
            ? formatToIstInput(currentSetting.link_submission_deadline)
            : (currentSetting.no_fine_deadline ? formatToIstInput(currentSetting.no_fine_deadline) : ''))
    );
    setLinkFineDeadline(
      currentSetting.link_fine_deadline
        ? formatToIstInput(currentSetting.link_fine_deadline)
        : (currentSetting.link_submission_deadline
            ? formatToIstInput(currentSetting.link_submission_deadline)
            : (currentSetting.fine_deadline ? formatToIstInput(currentSetting.fine_deadline) : ''))
    );
    setLinkFineAmount(currentSetting.link_fine_amount ?? 100);
    setLinkHasSuperFine(Boolean(currentSetting.link_has_super_fine));
    setLinkSuperFineDeadline(
      currentSetting.link_super_fine_deadline ? formatToIstInput(currentSetting.link_super_fine_deadline) : ''
    );
    setLinkSuperFineAmount(currentSetting.link_super_fine_amount ?? 250);
    setIsActive(currentSetting.is_active ?? true);
  }, [currentSetting, activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  // Load latest data from API & sync server
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Trigger background sync on server to ensure remote DB late_registrations table is complete
      fetch('/api/admin/event-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      }).catch(() => null);

      const [deadlinesRes, lateList, regsList] = await Promise.all([
        fetch('/api/admin/event-deadlines').then(r => r.ok ? r.json() : null).catch(() => null),
        festService.fetchLateRegistrationsForCollege().catch(() => []),
        festService.fetchRegistrationsForCollege().catch(() => [])
      ]);

      if (deadlinesRes?.settings && Array.isArray(deadlinesRes.settings)) {
        setSettingsList(deadlinesRes.settings);
      }
      if (Array.isArray(lateList) && lateList.length > 0) {
        setLateRegistrations(lateList);
      } else {
        setLateRegistrations(festService.getLateRegistrations());
      }
      if (Array.isArray(regsList) && regsList.length > 0) {
        setRegistrations(regsList);
      } else {
        setRegistrations(festService.getRegistrations());
      }
      setColleges(festService.getColleges());
      setItems(festService.getItems());
      setStudents(festService.getStudents());
    } catch {
      // Retain cached data
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-index maps for performance
  const collegeMap = useMemo(() => new Map(colleges.map(c => [Number(c.affl_no), c])), [colleges]);
  const itemMap = useMemo(() => new Map(items.map(i => [Number(i.item_id || i.id), i])), [items]);
  const settingsByKind = useMemo(() => new Map(settingsList.map(s => [s.event_kind, s])), [settingsList]);

  // Enriched late entries: combines persistent late_registrations table records with all registrations submitted post-deadline
  const enrichedLateEntries = useMemo(() => {
    const combined: Array<any> = [];
    const seenKeys = new Set<string>();

    // 1. Process persisted late registrations first (respects manual waivers & exact DB timestamps)
    lateRegistrations.forEach(l => {
      const key = `${Number(l.college_affl_no)}_${Number(l.item_id)}_${String(l.chest_no).trim()}`;
      seenKeys.add(key);

      const col = collegeMap.get(Number(l.college_affl_no));
      const itm = itemMap.get(Number(l.item_id));
      const matchedStudent = findStudentByIdentifier(students, (l as any).cic_no || l.chest_no, Number(l.college_affl_no));
      const studentName = matchedStudent?.name?.trim() ? matchedStudent.name.trim() : null;
      const fineTier = (l.fine_tier as 'fine' | 'super_fine') || 'fine';
      const fineAmount = Number(l.fine_amount) || (fineTier === 'super_fine' ? 1000 : 500);

      combined.push({
        ...l,
        college_name: col?.name || `College #${l.college_affl_no}`,
        college_place: (col as any)?.place || col?.address || '',
        event_code: itm?.item_code || itm?.code || `ITM-${l.item_id}`,
        event_name: itm?.name_eng || itm?.name || `Item #${l.item_id}`,
        event_category: itm?.category || 'General',
        event_mode: itm?.mode || 'onstage',
        student_name: studentName,
        fine_tier: fineTier,
        fine_amount: fineAmount,
      });
    });

    // 2. Also evaluate all live registrations to ensure zero omitted late entries
    registrations.forEach(r => {
      const key = `${Number(r.college_affl_no)}_${Number(r.item_id)}_${String(r.chest_no).trim()}`;
      if (seenKeys.has(key)) return; // Already present from late_registrations

      const itm = itemMap.get(Number(r.item_id));
      const col = collegeMap.get(Number(r.college_affl_no));
      if (!itm) return;

      const kind = getEventKind(itm);
      const setting = settingsByKind.get(kind) || festService.getEventDeadlineSetting(kind);
      const regTime = r.created_at ? new Date(r.created_at) : null;
      const validRegTime = regTime && !Number.isNaN(regTime.getTime()) ? regTime : null;

      if (!validRegTime || !setting?.no_fine_deadline) return;

      const noFineMs = new Date(setting.no_fine_deadline).getTime();
      const fineMs = setting.fine_deadline ? new Date(setting.fine_deadline).getTime() : noFineMs;

      // A registration is strictly late ONLY IF its timestamp was past the normal registration deadline cutoff
      if (validRegTime.getTime() <= noFineMs) {
        return;
      }

      seenKeys.add(key);
      const matchedStudent = findStudentByIdentifier(students, (r as any).cic_no || r.chest_no, Number(r.college_affl_no));
      const studentName = matchedStudent?.name?.trim() ? matchedStudent.name.trim() : null;

      let fineTier: 'fine' | 'super_fine' = 'fine';
      let fineAmount = Number(setting.fine_amount) || 500;
      let lateReason = `Fine Period (₹${fineAmount.toLocaleString('en-IN')}) — within fine window`;

      if (validRegTime.getTime() > fineMs) {
        fineTier = 'super_fine';
        fineAmount = Number(setting.super_fine_amount) || 1000;
        lateReason = `Super Fine Period (₹${fineAmount.toLocaleString('en-IN')}) — super fine window`;
      }

      combined.push({
        id: r.id || `${r.college_affl_no}-${r.item_id}-${r.chest_no}`,
        item_id: Number(r.item_id),
        college_affl_no: Number(r.college_affl_no),
        chest_no: r.chest_no,
        cic_no: (r as any).cic_no || null,
        college_name: col?.name || `College #${r.college_affl_no}`,
        college_place: (col as any)?.place || col?.address || '',
        event_code: itm?.item_code || itm?.code || `ITM-${r.item_id}`,
        event_name: itm?.name_eng || itm?.name || `Item #${r.item_id}`,
        event_category: itm?.category || 'General',
        event_mode: itm?.mode || 'onstage',
        student_name: studentName,
        fine_tier: fineTier,
        fine_amount: fineAmount,
        registered_at: r.created_at || new Date().toISOString(),
        effective_deadline: setting.no_fine_deadline,
        late_reason: lateReason,
        is_waived: false,
        waived_at: null,
        waived_by: null,
      });
    });

    return combined;
  }, [lateRegistrations, registrations, settingsByKind, collegeMap, itemMap, students]);

  // Group late entries by college (Down-to-down list)
  const collegeGroups = useMemo(() => {
    const map = new Map<number, {
      affl_no: number;
      name: string;
      place: string;
      entriesCount: number;
      fineCount: number;
      superFineCount: number;
      totalFines: number;
      entries: typeof enrichedLateEntries;
    }>();

    enrichedLateEntries.forEach(entry => {
      const affl = Number(entry.college_affl_no);
      if (!map.has(affl)) {
        map.set(affl, {
          affl_no: affl,
          name: entry.college_name,
          place: entry.college_place,
          entriesCount: 0,
          fineCount: 0,
          superFineCount: 0,
          totalFines: 0,
          entries: []
        });
      }
      const rec = map.get(affl)!;
      rec.entriesCount += 1;
      rec.totalFines += entry.fine_amount;
      if (entry.fine_tier === 'super_fine') {
        rec.superFineCount += 1;
      } else {
        rec.fineCount += 1;
      }
      rec.entries.push(entry);
    });

    return Array.from(map.values()).sort((a, b) => b.totalFines - a.totalFines);
  }, [enrichedLateEntries]);

  // Filtered College Groups based on search and tier filter
  const filteredCollegeGroups = useMemo(() => {
    return collegeGroups.map(col => {
      const filteredEntries = col.entries.filter(entry => {
        if (lateTierFilter !== 'all' && entry.fine_tier !== lateTierFilter) {
          return false;
        }
        if (lateSearchQuery.trim()) {
          const q = lateSearchQuery.toLowerCase();
          const matchesEvent = entry.event_name.toLowerCase().includes(q) || entry.event_code.toLowerCase().includes(q);
          const matchesCollege = entry.college_name.toLowerCase().includes(q) || String(entry.college_affl_no).includes(q);
          const matchesStudent = (entry.student_name || '').toLowerCase().includes(q) || String(entry.chest_no).includes(q);
          const matchesReason = (entry.late_reason || '').toLowerCase().includes(q);
          if (!matchesEvent && !matchesCollege && !matchesStudent && !matchesReason) {
            return false;
          }
        }
        return true;
      });

      if (filteredEntries.length === 0) return null;

      const groupTotal = filteredEntries.reduce((s, e) => s + e.fine_amount, 0);

      return {
        ...col,
        entries: filteredEntries,
        groupTotal
      };
    }).filter(Boolean) as (typeof collegeGroups[0] & { groupTotal: number })[];
  }, [collegeGroups, lateTierFilter, lateSearchQuery]);

  const totalFinesOverall = useMemo(() => {
    return collegeGroups.reduce((sum, c) => sum + c.totalFines, 0);
  }, [collegeGroups]);

  const toggleCollegeCollapse = (affl_no: number) => {
    setCollapsedColleges(prev => ({
      ...prev,
      [affl_no]: !prev[affl_no]
    }));
  };

  const handleExpandAll = () => setCollapsedColleges({});
  const handleCollapseAll = () => {
    const allCollapsed: Record<number, boolean> = {};
    collegeGroups.forEach(c => { allCollapsed[c.affl_no] = true; });
    setCollapsedColleges(allCollapsed);
  };

  // CSV Exporter
  const handleExportLateRegistrationsCsv = () => {
    const allFilteredEntries = filteredCollegeGroups.flatMap(g => g.entries);
    if (allFilteredEntries.length === 0) return;
    const headers = [
      'College Affiliation No',
      'College Name',
      'Chest / CIC No',
      'Student Name',
      'Event Code',
      'Event Name',
      'Event Category',
      'Event Mode',
      'Fine Tier',
      'Fine Amount (INR)',
      'Registered At (IST)',
      'Effective Deadline (IST)',
      'Late Reason'
    ];

    const rows = allFilteredEntries.map(e => [
      e.college_affl_no,
      `"${(e.college_name || '').replace(/"/g, '""')}"`,
      `"${e.chest_no || ''}"`,
      `"${(e.student_name || 'Unmapped Participant').replace(/"/g, '""')}"`,
      `"${e.event_code || ''}"`,
      `"${(e.event_name || '').replace(/"/g, '""')}"`,
      `"${e.event_category || ''}"`,
      `"${e.event_mode || ''}"`,
      `"${e.fine_tier || 'fine'}"`,
      e.fine_amount || 0,
      `"${e.registered_at ? formatIstDisplay(e.registered_at) : ''}"`,
      `"${e.effective_deadline ? formatIstDisplay(e.effective_deadline) : ''}"`,
      `"${(e.late_reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WafyFest_College_Late_Registrations_and_Fines_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToast(null);

    const isSpecialLinkKind = activeTab === 'screening' || activeTab === 'submission';
    const payload: Partial<EventDeadlineSetting> = {
      event_kind: activeTab,
      display_name: EVENT_KIND_LABELS[activeTab]?.name || activeTab,
      description: EVENT_KIND_LABELS[activeTab]?.desc,
      start_time: startTime ? parseIstInputToIso(startTime) : new Date().toISOString(),
      no_fine_deadline: noFineDeadline ? parseIstInputToIso(noFineDeadline) : new Date().toISOString(),
      fine_deadline: fineDeadline ? parseIstInputToIso(fineDeadline) : new Date().toISOString(),
      fine_amount: Number(fineAmount) >= 0 ? Number(fineAmount) : 500,
      has_super_fine: hasSuperFine,
      super_fine_deadline: hasSuperFine && superFineDeadline ? parseIstInputToIso(superFineDeadline) : null,
      super_fine_amount: hasSuperFine && Number(superFineAmount) >= 0 ? Number(superFineAmount) : null,
      link_start_time: isSpecialLinkKind && linkStartTime ? parseIstInputToIso(linkStartTime) : null,
      link_no_fine_deadline: isSpecialLinkKind && linkNoFineDeadline ? parseIstInputToIso(linkNoFineDeadline) : null,
      link_fine_deadline: isSpecialLinkKind && linkFineDeadline ? parseIstInputToIso(linkFineDeadline) : null,
      link_fine_amount: isSpecialLinkKind && Number(linkFineAmount) >= 0 ? Number(linkFineAmount) : 0,
      link_has_super_fine: isSpecialLinkKind ? linkHasSuperFine : false,
      link_super_fine_deadline: isSpecialLinkKind && linkHasSuperFine && linkSuperFineDeadline ? parseIstInputToIso(linkSuperFineDeadline) : null,
      link_super_fine_amount: isSpecialLinkKind && linkHasSuperFine && Number(linkSuperFineAmount) >= 0 ? Number(linkSuperFineAmount) : 0,
      link_submission_deadline: isSpecialLinkKind
        ? (linkHasSuperFine && linkSuperFineDeadline
            ? parseIstInputToIso(linkSuperFineDeadline)
            : (linkFineDeadline
                ? parseIstInputToIso(linkFineDeadline)
                : (linkNoFineDeadline
                    ? parseIstInputToIso(linkNoFineDeadline)
                    : (linkSubmissionDeadline ? parseIstInputToIso(linkSubmissionDeadline) : null))))
        : null,
      is_active: isActive,
    };

    const res = await festService.updateEventDeadlineSetting(payload);
    setIsSaving(false);

    if (!res.success) {
      setToast({ type: 'error', message: res.error || 'Failed to update deadlines.' });
    } else {
      setToast({ type: 'success', message: `${EVENT_KIND_LABELS[activeTab].name} deadlines & fine policy saved successfully!` });
      if (res.setting) {
        setSettingsList(prev => {
          const idx = prev.findIndex(s => s.event_kind === activeTab);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.setting!;
            return next;
          }
          return [...prev, res.setting!];
        });
      }
      triggerRefresh();
    }
  };

  const liveEval = useMemo(() => {
    return evaluateEventDeadlineSetting({
      start_time: startTime ? parseIstInputToIso(startTime) : null,
      no_fine_deadline: noFineDeadline ? parseIstInputToIso(noFineDeadline) : null,
      fine_deadline: fineDeadline ? parseIstInputToIso(fineDeadline) : null,
      fine_amount: fineAmount,
      has_super_fine: hasSuperFine,
      super_fine_deadline: hasSuperFine && superFineDeadline ? parseIstInputToIso(superFineDeadline) : null,
      super_fine_amount: hasSuperFine ? superFineAmount : null,
      is_active: isActive,
    });
  }, [startTime, noFineDeadline, fineDeadline, fineAmount, hasSuperFine, superFineDeadline, superFineAmount, isActive]);

  const isLinkEligible = activeTab === 'screening' || activeTab === 'submission';

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header Bar: Title + Segmented Switcher + Refresh (Fully responsive across Mobile, Tablet, Desktop) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)] truncate">
              Deadlines & Fines Management
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure cutoff schedules, late fees, link submission windows, and review college late registrations.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Segmented Switcher */}
          <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMainSection('deadlines')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                mainSection === 'deadlines'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Deadlines Setup</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('late_fines')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                mainSection === 'late_fines'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Colleges & Fines</span>
              {enrichedLateEntries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white">
                  ₹{totalFinesOverall.toLocaleString()}
                </span>
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs font-semibold gap-1 px-2.5 flex-shrink-0"
            title="Reload latest data from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="font-bold underline ml-3 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: DEADLINES & FINE POLICY CONFIGURATION                         */}
      {/* ========================================================================= */}
      {mainSection === 'deadlines' && (
        <div className="space-y-4">
          {/* Category Tabs Strip - Smooth Horizontal Touch Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {(['screening', 'submission', 'onstage', 'offstage', 'general'] as EventKind[]).map((kind) => {
              const info = EVENT_KIND_LABELS[kind];
              const IconComponent = info.icon;
              const isSelected = activeTab === kind;
              const row = settingsList.find(s => s.event_kind === kind);
              const ev = evaluateEventDeadlineSetting(row);
              const isRowActive = row?.is_active ?? true;

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveTab(kind)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{info.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      !isRowActive
                        ? 'bg-rose-500'
                        : ev.tier === 'open'
                        ? 'bg-emerald-500'
                        : ev.tier === 'fine'
                        ? 'bg-amber-500'
                        : ev.tier === 'super_fine'
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`}
                    title={!isRowActive ? 'Disabled' : ev.label}
                  />
                </button>
              );
            })}
          </div>

          {/* Unified Compact Editor Card */}
          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-sm">
            {/* Header: Title + Responsive Action Bar */}
            <div className="px-3.5 py-3 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${EVENT_KIND_LABELS[activeTab].color} text-lg leading-none flex-shrink-0`}>●</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {EVENT_KIND_LABELS[activeTab].name} Deadlines & Policy
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                    {EVENT_KIND_LABELS[activeTab].desc}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsActive(prev => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                  title={isActive ? 'Click to Disable registrations' : 'Click to Enable registrations'}
                >
                  {isActive ? <Power className="w-3 h-3 text-emerald-500" /> : <PowerOff className="w-3 h-3 text-rose-500" />}
                  <span>{isActive ? 'Enabled' : 'Disabled'}</span>
                </button>

                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${liveEval.badgeClass}`}>
                  {liveEval.label}
                </span>

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-7.5 px-3.5 gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Policy'}</span>
                </Button>
              </div>
            </div>

            <CardContent className="p-3 sm:p-4 space-y-4">
              {!isActive && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Registrations for <strong>{EVENT_KIND_LABELS[activeTab].name}</strong> are currently <strong>DISABLED</strong>.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className="font-bold underline text-xs cursor-pointer self-start sm:self-auto"
                  >
                    Enable Now
                  </button>
                </div>
              )}

              {/* PANEL 1: Participant Registration Window */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>1. Participant Registration Window & Late Fines</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block truncate">
                      Opens (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                      required
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <label className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                      Free Cutoff (₹0 Fine) (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={noFineDeadline}
                      onChange={e => setNoFineDeadline(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-emerald-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                      required
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 block truncate">
                        Late Fine Cutoff (IST)
                      </label>
                      <span className="text-[10px] font-mono font-bold text-amber-500">₹{fineAmount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="datetime-local"
                        value={fineDeadline}
                        onChange={e => setFineDeadline(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-amber-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={fineAmount}
                        onChange={e => setFineAmount(Number(e.target.value))}
                        title="Fine ₹ per event"
                        className="w-16 flex-shrink-0 px-1 py-1.5 text-xs rounded-lg border border-amber-500/40 bg-[var(--bg-surface)] text-amber-500 font-mono font-bold text-center"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                        <input
                          type="checkbox"
                          checked={hasSuperFine}
                          onChange={e => setHasSuperFine(e.target.checked)}
                          className="rounded text-rose-500 cursor-pointer flex-shrink-0"
                        />
                        <span className="truncate">Super Fine Cutoff</span>
                      </label>
                      {hasSuperFine && (
                        <span className="text-[10px] font-mono font-bold text-rose-500">₹{superFineAmount}</span>
                      )}
                    </div>
                    {hasSuperFine ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="datetime-local"
                          value={superFineDeadline}
                          onChange={e => setSuperFineDeadline(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-rose-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                          required={hasSuperFine}
                        />
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={superFineAmount}
                          onChange={e => setSuperFineAmount(Number(e.target.value))}
                          title="Super Fine ₹ per event"
                          className="w-16 flex-shrink-0 px-1 py-1.5 text-xs rounded-lg border border-rose-500/40 bg-[var(--bg-surface)] text-rose-500 font-mono font-bold text-center"
                          required={hasSuperFine}
                        />
                      </div>
                    ) : (
                      <div className="h-8.5 px-2.5 flex items-center rounded-lg border border-dashed border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] italic truncate">
                        Super Fine disabled (Locks at late cutoff)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PANEL 2: Link / Video Submission Window */}
              {isLinkEligible && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        2. {activeTab === 'screening' ? 'Preliminary Video (YouTube Link)' : 'Digital File / Drive Link'} Submission Window
                      </span>
                    </div>
                    <span className="text-[10.5px] text-[var(--text-muted)]">
                      Independent upload cutoff & fine tiers
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/20">
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block truncate">
                        Upload Opens (IST)
                      </label>
                      <input
                        type="datetime-local"
                        value={linkStartTime}
                        onChange={e => setLinkStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                        Free Link Cutoff (₹0 Fine) (IST)
                      </label>
                      <input
                        type="datetime-local"
                        value={linkNoFineDeadline}
                        onChange={e => setLinkNoFineDeadline(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-emerald-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 block truncate">
                          Late Link Cutoff (IST)
                        </label>
                        <span className="text-[10px] font-mono font-bold text-amber-500">₹{linkFineAmount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="datetime-local"
                          value={linkFineDeadline}
                          onChange={e => setLinkFineDeadline(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-amber-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                        />
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={linkFineAmount}
                          onChange={e => setLinkFineAmount(Number(e.target.value))}
                          title="Link Fine ₹ per entry"
                          className="w-16 flex-shrink-0 px-1 py-1.5 text-xs rounded-lg border border-amber-500/40 bg-[var(--bg-surface)] text-amber-500 font-mono font-bold text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                          <input
                            type="checkbox"
                            checked={linkHasSuperFine}
                            onChange={e => setLinkHasSuperFine(e.target.checked)}
                            className="rounded text-rose-500 cursor-pointer flex-shrink-0"
                          />
                          <span className="truncate">Link Super Fine</span>
                        </label>
                        {linkHasSuperFine && (
                          <span className="text-[10px] font-mono font-bold text-rose-500">₹{linkSuperFineAmount}</span>
                        )}
                      </div>
                      {linkHasSuperFine ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="datetime-local"
                            value={linkSuperFineDeadline}
                            onChange={e => setLinkSuperFineDeadline(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-rose-500/40 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono min-w-0"
                            required={linkHasSuperFine}
                          />
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={linkSuperFineAmount}
                            onChange={e => setLinkSuperFineAmount(Number(e.target.value))}
                            title="Link Super Fine ₹ per entry"
                            className="w-16 flex-shrink-0 px-1 py-1.5 text-xs rounded-lg border border-rose-500/40 bg-[var(--bg-surface)] text-rose-500 font-mono font-bold text-center"
                            required={linkHasSuperFine}
                          />
                        </div>
                      ) : (
                        <div className="h-8.5 px-2.5 flex items-center rounded-lg border border-dashed border-cyan-500/30 text-[11px] text-[var(--text-muted)] italic truncate">
                          Link Super Fine disabled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Callout to College Fines List */}
          <div className="px-3.5 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                <strong>₹{totalFinesOverall.toLocaleString()} total late fines</strong> incurred across <strong>{collegeGroups.length} colleges</strong> ({enrichedLateEntries.length} late registrations).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMainSection('late_fines')}
              className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto flex-shrink-0"
            >
              <span>View College List Down-to-Down</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: COLLEGES LIST DOWN-TO-DOWN WITH FULL ITEM DETAILS INSIDE        */}
      {/* ========================================================================= */}
      {mainSection === 'late_fines' && (
        <div className="space-y-4">
          {/* Summary Strip & Action Bar */}
          <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Total Fines:</span>
                <span className="font-mono font-black text-amber-500 text-sm">
                  ₹{totalFinesOverall.toLocaleString()}
                </span>
              </div>
              <span className="text-[var(--border-subtle)] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Late Entries:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {enrichedLateEntries.length}
                </span>
              </div>
              <span className="text-[var(--border-subtle)] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Penalized Colleges:</span>
                <span className="font-mono font-bold text-purple-500">
                  {collegeGroups.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExpandAll}
                className="h-7 text-xs font-semibold px-2 text-[var(--text-secondary)]"
              >
                Expand All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCollapseAll}
                className="h-7 text-xs font-semibold px-2 text-[var(--text-secondary)]"
              >
                Collapse All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportLateRegistrationsCsv}
                className="h-7 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search college name, affiliation #, student name, chest #, or event..."
                value={lateSearchQuery}
                onChange={e => setLateSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              />
              {lateSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLateSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={lateTierFilter}
              onChange={e => setLateTierFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium"
            >
              <option value="all">All Fine Tiers</option>
              <option value="fine">Late Fine Only (₹500)</option>
              <option value="super_fine">Super Fine Only (₹1,000)</option>
            </select>
          </div>

          {/* Colleges List Down-To-Down */}
          {filteredCollegeGroups.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60 mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                No matching college late registration records found.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Try adjusting your search query or tier filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollegeGroups.map((college) => {
                const isCollapsed = Boolean(collapsedColleges[college.affl_no]);

                return (
                  <div
                    key={college.affl_no}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs overflow-hidden transition-all"
                  >
                    {/* College Banner Header */}
                    <div
                      onClick={() => toggleCollegeCollapse(college.affl_no)}
                      className="p-3 sm:p-3.5 bg-[var(--bg-subtle)]/70 hover:bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2.5 cursor-pointer select-none"
                    >
                      {/* Left: Affiliation & Name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-shrink-0">
                          #{college.affl_no}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {college.name}
                          </h3>
                          {college.place && (
                            <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                              {college.place}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Summary Figures & Collapse Arrow */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-[var(--text-secondary)] hidden md:inline">
                          {college.entries.length} Late Entry{college.entries.length > 1 ? 's' : ''}
                        </span>

                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-500 text-black shadow-xs whitespace-nowrap">
                          ₹{college.groupTotal.toLocaleString()}
                        </span>

                        <div className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* College Details Table (Visible when not collapsed) */}
                    {!isCollapsed && (
                      <div className="p-0">
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-xs text-left min-w-[640px]">
                            <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)]">
                              <tr>
                                <th className="py-2.5 px-3 w-8">#</th>
                                <th className="py-2.5 px-3">Student / Participant</th>
                                <th className="py-2.5 px-3">Event Details</th>
                                <th className="py-2.5 px-3">Registered (IST)</th>
                                <th className="py-2.5 px-3">Deadline Cutoff (IST)</th>
                                <th className="py-2.5 px-3">Fine Tier & Amount</th>
                                <th className="py-2.5 px-3">Late Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                              {college.entries.map((entry, idx) => (
                                <tr key={entry.id || idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-[var(--text-muted)] text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                      {entry.student_name ? (
                                        <span>{entry.student_name}</span>
                                      ) : (
                                        <span className="text-[var(--text-muted)] font-normal italic text-[11px]">
                                          Unmapped Participant
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-[var(--text-muted)] ml-5">
                                      Chest #{entry.chest_no}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                      <span className="font-mono text-amber-500 text-[11px] font-bold">
                                        {entry.event_code}
                                      </span>
                                      <span>{entry.event_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[9px] px-1 py-0 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                        Cat {entry.event_category}
                                      </span>
                                      <span className="text-[9px] px-1 py-0 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] uppercase">
                                        {entry.event_mode}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-primary)]">
                                    {entry.registered_at ? formatIstDisplay(entry.registered_at) : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                                    {entry.effective_deadline ? formatIstDisplay(entry.effective_deadline) : '—'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border inline-block whitespace-nowrap ${
                                        entry.fine_tier === 'super_fine'
                                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                          : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                      }`}
                                    >
                                      ₹{entry.fine_amount} {entry.fine_tier === 'super_fine' ? 'Super Fine' : 'Late Fine'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)] max-w-xs truncate" title={entry.late_reason}>
                                    {entry.late_reason || 'Registered In Late Window'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* College Bottom Subtotal Footer */}
                        <div className="px-3 py-2 bg-[var(--bg-subtle)]/40 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-3 text-[11px]">
                            <span>
                              Late Fine Count: <strong>{college.entries.filter(e => e.fine_tier !== 'super_fine').length}</strong>
                            </span>
                            {college.entries.filter(e => e.fine_tier === 'super_fine').length > 0 && (
                              <span>
                                Super Fine Count: <strong>{college.entries.filter(e => e.fine_tier === 'super_fine').length}</strong>
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            Subtotal: <span className="text-amber-500 font-black">₹{college.groupTotal.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
