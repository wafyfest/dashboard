'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, ItemModeBadge, ScreeningStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Video,
  FileCheck,
  Building2,
  Layers,
  Eye,
  SlidersHorizontal,
  Play,
  RotateCcw,
  Download
} from 'lucide-react';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { downloadCsv } from '@/lib/utils/csvExport';
import { ExportModal, ExportType } from '../ExportModal';
import {
  Item,
  Registration,
  SubmissionEntry,
  Student,
  College,
  SpecialEventType,
  SpecialEventSettings,
  ScreeningStatus,
  isSubmissionEvent,
  isScreeningEvent
} from '@/lib/types/fest';
import {
  formatIstDisplay,
  formatToIstInput,
  parseIstInputToIso,
  evaluateEventDeadlineSetting,
  evaluateLinkSubmissionDeadline
} from '@/lib/utils/istDate';
import { getYouTubeEmbedUrl, isValidYouTubeUrl } from '@/lib/utils/youtube';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';

function YouTubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export interface PreFestEventsTabProps {
  mode?: 'all' | 'setup' | 'registrations';
  onNavigateTab?: (tab: string) => void;
}

export function PreFestEventsTab({ mode = 'all', onNavigateTab }: PreFestEventsTabProps = {}) {
  const { refreshKey, triggerRefresh } = useFest();
  const [activeSection, setActiveSection] = useState<SpecialEventType>('SCREENING');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronous cache hydration for 0ms paint
  const [settingsList, setSettingsList] = useState<SpecialEventSettings[]>(() => festService.getSpecialEventSettings());
  const [eventsList, setEventsList] = useState<Item[]>(() => festService.getItems());
  const [registrationsList, setRegistrationsList] = useState<Registration[]>(() => festService.getRegistrations());
  const [submissionsList, setSubmissionsList] = useState<SubmissionEntry[]>(() => festService.getSubmissionEntries());
  const [collegesList, setCollegesList] = useState<College[]>(() => festService.getColleges());
  const [studentsList, setStudentsList] = useState<Student[]>(() => festService.getStudents());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterSubmissionStatus, setFilterSubmissionStatus] = useState<string>('all');
  const [filterScreeningStatus, setFilterScreeningStatus] = useState<string>('all');

  // Unified Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalConfig, setExportModalConfig] = useState<{ eventId?: number; type: ExportType }>({
    type: 'links'
  });

  // Preview Modal for YouTube Video
  const [previewYouTubeUrl, setPreviewYouTubeUrl] = useState<string | null>(null);

  // Screening Shortlist Modal State
  interface ScreeningModalTarget {
    item: Item;
    reg: Registration;
    matchingRegs: Registration[];
    rosterParticipants: Student[];
    submission: SubmissionEntry | undefined;
    currentStatus: ScreeningStatus;
    remarks: string;
  }
  const [screeningModalTarget, setScreeningModalTarget] = useState<ScreeningModalTarget | null>(null);
  const [selectedModalStatus, setSelectedModalStatus] = useState<ScreeningStatus>('qualified');
  const [modalRemarks, setModalRemarks] = useState<string>('');
  const [isSavingDecision, setIsSavingDecision] = useState<boolean>(false);

  const openScreeningModal = (
    item: Item,
    reg: Registration,
    matchingRegs: Registration[],
    rosterParticipants: Student[],
    submission: SubmissionEntry | undefined
  ) => {
    const currStatus = (reg.screening_status as ScreeningStatus) || 'pending';
    setScreeningModalTarget({
      item,
      reg,
      matchingRegs,
      rosterParticipants,
      submission,
      currentStatus: currStatus,
      remarks: reg.screening_remarks || '',
    });
    setSelectedModalStatus(currStatus === 'pending' ? 'qualified' : currStatus);
    setModalRemarks(reg.screening_remarks || '');
  };

  const handleSaveModalDecision = async () => {
    if (!screeningModalTarget) return;
    const regIds = screeningModalTarget.matchingRegs
      .map(x => x.id)
      .filter(Boolean);

    if (regIds.length === 0) return;

    setIsSavingDecision(true);
    try {
      const res = await festService.updateScreeningStatus({
        registrationIds: regIds,
        itemId: Number(screeningModalTarget.item.item_id || screeningModalTarget.item.id),
        status: selectedModalStatus,
        remarks: modalRemarks.trim() || undefined,
      });
      if (!res.success) {
        alert(res.error || 'Failed to update screening status');
      } else {
        // Optimistic local state update
        setRegistrationsList(prev => prev.map(r => {
          if (regIds.includes(r.id)) {
            return {
              ...r,
              screening_status: selectedModalStatus,
              screening_remarks: modalRemarks.trim() || r.screening_remarks
            };
          }
          return r;
        }));
        setScreeningModalTarget(null);
        triggerRefresh();
      }
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Load data from live Supabase / storage
  const loadData = async (showLoading: boolean = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const items = festService.getItems();
      const regs = festService.getRegistrations();
      const preRegs = festService.getPreFestRegistrations();
      const subs = festService.getSubmissionEntries();
      const preSubs = festService.getPreFestSubmissions();
      const cols = festService.getColleges();
      const stus = festService.getStudents();
      const settings = festService.getSpecialEventSettings();

      // Merge prefest_registrations into regs list for complete coverage
      const mergedRegs = [...regs];
      preRegs.forEach((pr: any) => {
        const matchedItem = items.find(i => i.id === pr.event_id || Number(i.item_id) === Number(pr.event_id));
        const itemId = matchedItem ? Number(matchedItem.item_id) : Number(pr.event_id);
        const colAffl = Number(pr.college_affl_no);
        const exists = mergedRegs.some(r => Number(r.college_affl_no) === colAffl && Number(r.item_id) === itemId);
        if (!exists && itemId) {
          mergedRegs.push({
            id: pr.id,
            college_affl_no: colAffl,
            item_id: itemId,
            chest_no: '—',
            created_at: pr.created_at,
          } as any);
        }
      });

      // Merge prefest_submissions into subs list for complete coverage
      const mergedSubs = [...subs];
      preSubs.forEach((ps: any) => {
        const matchedItem = items.find(i => i.id === ps.event_id || Number(i.item_id) === Number(ps.event_id));
        const itemId = matchedItem ? Number(matchedItem.item_id) : Number(ps.event_id);
        const existingIdx = mergedSubs.findIndex(
          s => Number(s.college_affl_no) === Number(ps.college_affl_no) && Number(s.item_id) === itemId
        );
        const subRecord: SubmissionEntry = {
          id: ps.id || `ps-${ps.college_affl_no}-${itemId}`,
          college_affl_no: Number(ps.college_affl_no),
          item_id: itemId,
          chest_no: ps.chest_no || '—',
          status: (ps.submission_status || 'on_time') as any,
          file_url: ps.youtube_url,
          submitted_at: ps.submitted_at || new Date().toISOString()
        };
        if (existingIdx >= 0) {
          mergedSubs[existingIdx] = {
            ...mergedSubs[existingIdx],
            file_url: ps.youtube_url || mergedSubs[existingIdx].file_url,
            status: ps.submission_status || mergedSubs[existingIdx].status,
            submitted_at: ps.submitted_at || mergedSubs[existingIdx].submitted_at
          };
        } else {
          mergedSubs.push(subRecord);
        }
      });

      setEventsList(items);
      setRegistrationsList(mergedRegs);
      setSubmissionsList(mergedSubs);
      setCollegesList(cols);
      setStudentsList(stus);
      setSettingsList(settings);
    } catch (err: any) {
      if (showLoading) setToast({ type: 'error', message: err?.message || 'Failed to refresh data' });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [refreshKey]);

  // Current settings for active section
  const currentSettings = useMemo(() => {
    return (
      settingsList.find(s => s.event_type === activeSection) || {
        id: '',
        event_type: activeSection,
        registration_enabled: true,
        registration_opens_at: null,
        registration_closes_at: null,
        youtube_submission_enabled: true,
        youtube_submission_opens_at: null,
        youtube_submission_closes_at: null,
        disabled_event_ids: []
      }
    );
  }, [settingsList, activeSection]);

  // Live deadline setting from event_deadline_settings
  const currentDeadlineSetting = useMemo(() => {
    const kind = activeSection === 'SCREENING' ? 'screening' : 'submission';
    return festService.getEventDeadlineSetting(kind);
  }, [activeSection, refreshKey]);

  const regScheduleStatus = useMemo(() => {
    return evaluateEventDeadlineSetting(currentDeadlineSetting);
  }, [currentDeadlineSetting]);

  const linkScheduleStatus = useMemo(() => {
    return evaluateLinkSubmissionDeadline(currentDeadlineSetting);
  }, [currentDeadlineSetting]);

  // Filter events by active section
  const sectionEvents = useMemo(() => {
    return eventsList.filter(e => {
      if (activeSection === 'SCREENING') return Boolean(isScreeningEvent(e) || e.is_screening || (e.mode as string) === 'screening');
      if (activeSection === 'SUBMISSION') return Boolean(isSubmissionEvent(e) || e.is_submission || (e.mode as string) === 'submission');
      return false;
    });
  }, [eventsList, activeSection]);

  const sectionEventIds = useMemo(() => {
    return new Set(sectionEvents.map(e => Number(e.item_id || e.id)));
  }, [sectionEvents]);

  // Deduplicated registrations for active section
  const sectionRegistrations = useMemo(() => {
    // Unique by college_affl_no + item_id
    const map = new Map<string, Registration>();
    for (const r of registrationsList) {
      const itmId = Number(r.item_id);
      if (sectionEventIds.has(itmId)) {
        const key = `${r.college_affl_no}:${itmId}`;
        if (!map.has(key)) {
          map.set(key, r);
        }
      }
    }
    return Array.from(map.values());
  }, [registrationsList, sectionEventIds]);

  // Submissions map by college_affl_no + item_id
  const submissionsMap = useMemo(() => {
    const map = new Map<string, SubmissionEntry>();
    for (const s of submissionsList) {
      const key = `${s.college_affl_no}:${s.item_id}`;
      map.set(key, s);
    }
    return map;
  }, [submissionsList]);

  // Telemetry metrics
  const metrics = useMemo(() => {
    const totalEvents = sectionEvents.length;
    const uniqueColleges = new Set(sectionRegistrations.map(r => r.college_affl_no)).size;
    const totalRegs = sectionRegistrations.length;
    let totalSubs = 0;
    for (const r of sectionRegistrations) {
      const key = `${r.college_affl_no}:${r.item_id}`;
      if (submissionsMap.has(key)) totalSubs++;
    }
    const pendingSubs = Math.max(0, totalRegs - totalSubs);

    return {
      totalEvents,
      uniqueColleges,
      totalRegs,
      totalSubs,
      pendingSubs,
      isRegOpen: regScheduleStatus.canRegister,
      isYtOpen: linkScheduleStatus.canSubmitLink,
    };
  }, [
    sectionEvents,
    sectionRegistrations,
    submissionsMap,
    regScheduleStatus.canRegister,
    linkScheduleStatus.canSubmitLink,
  ]);

  // Filtered registrations table rows
  const filteredRegistrations = useMemo(() => {
    return sectionRegistrations.filter(r => {
      const itmId = Number(r.item_id);
      const ev = sectionEvents.find(e => Number(e.item_id || e.id) === itmId);
      const colAffl = Number(r.college_affl_no);
      const col = collegesList.find(c => Number(c.affl_no) === colAffl);

      if (filterEventId !== 'all' && String(itmId) !== filterEventId) return false;
      if (filterMode !== 'all' && ev && (ev.mode || '').toLowerCase() !== filterMode.toLowerCase()) return false;

      const subKey = `${colAffl}:${itmId}`;
      const sub = submissionsMap.get(subKey);
      if (filterSubmissionStatus === 'submitted' && !sub?.file_url) return false;
      if (filterSubmissionStatus === 'pending' && sub?.file_url) return false;

      if (activeSection === 'SCREENING' && filterScreeningStatus !== 'all') {
        const matchingRegs = registrationsList.filter(
          x => Number(x.college_affl_no) === colAffl && Number(x.item_id) === itmId
        );
        const screenStatus = (r.screening_status || matchingRegs.find(x => x.screening_status)?.screening_status || 'pending');
        if (screenStatus !== filterScreeningStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const afflMatch = String(colAffl).includes(q);
        const colMatch = (col?.name || '').toLowerCase().includes(q);
        const codeMatch = (ev?.item_code || ev?.code || '').toLowerCase().includes(q);
        const nameMatch = (ev?.name_eng || ev?.name || '').toLowerCase().includes(q);
        return afflMatch || colMatch || codeMatch || nameMatch;
      }
      return true;
    });
  }, [sectionRegistrations, sectionEvents, collegesList, submissionsMap, filterEventId, filterMode, filterSubmissionStatus, filterScreeningStatus, searchQuery, activeSection, registrationsList]);

  const handleDownloadScreeningCsv = () => {
    const headers = ['Chest No', 'Link', 'Event Name', 'Category'];
    const rows: string[][] = [];

    filteredRegistrations.forEach(reg => {
      const itmId = Number(reg.item_id);
      const colAffl = Number(reg.college_affl_no);
      const ev = eventsList.find(e => Number(e.item_id || e.id) === itmId);
      const subKey = `${colAffl}:${itmId}`;
      const sub = submissionsMap.get(subKey);

      // Resolve roster participants
      const rosterParticipants: Student[] = [];
      if (reg.participants && reg.participants.length > 0) {
        reg.participants.forEach(p => {
          const found = findStudentByIdentifier(studentsList, p.id || p.chest_no || p.admission_no, colAffl);
          if (found && !rosterParticipants.some(rp => rp.id === found.id)) rosterParticipants.push(found);
          else if (p && !rosterParticipants.some(rp => rp.id === p.id)) rosterParticipants.push(p);
        });
      } else if (reg.student) {
        if (!rosterParticipants.some(rp => rp.id === reg.student!.id)) rosterParticipants.push(reg.student);
      } else if (reg.chest_no) {
        const found = findStudentByIdentifier(studentsList, reg.chest_no, colAffl);
        if (found && !rosterParticipants.some(rp => rp.id === found.id)) rosterParticipants.push(found);
      }

      const eventName = ev?.name_eng || ev?.name || (ev?.item_code ? `Event ${ev.item_code}` : `Item #${itmId}`);
      const category = ev?.category ? `${ev.phase || ''} (${ev.category})` : ev?.phase || 'General';
      const link = sub?.file_url || 'Not Submitted';

      if (rosterParticipants.length > 0) {
        rosterParticipants.forEach(p => {
          const chest = getCanonicalChestNo(p);
          const finalChest = chest !== '—' ? chest : (reg.chest_no || `COL-${colAffl}`);
          rows.push([
            String(finalChest),
            link,
            eventName,
            category
          ]);
        });
      } else {
        const finalChest = reg.chest_no && reg.chest_no !== '—' ? reg.chest_no : (sub?.chest_no && sub.chest_no !== '—' ? sub.chest_no : `COL-${colAffl}`);
        rows.push([
          String(finalChest),
          link,
          eventName,
          category
        ]);
      }
    });

    if (rows.length === 0) {
      alert('No registrations found to export.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${activeSection.toLowerCase()}_event_links_${timestampStr}.csv`;
    downloadCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Section Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
              {mode === 'setup' ? 'Pre-Fest Event Catalog & Deadlines' : 'Pre-Fest Registrations & Submissions'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            {mode === 'setup'
              ? 'Configure registration opening/closing schedules, YouTube submission deadlines, and catalog parameters for Screening & Submission events.'
              : 'Centralized oversight for enrolled colleges, registered student rosters, and submitted video links.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Control for Screening vs Submission */}
          <div className="inline-flex p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveSection('SCREENING')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'SCREENING'
                  ? 'bg-amber-500 text-black shadow-md font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Screening Events ({eventsList.filter(e => isScreeningEvent(e) || e.is_screening || (e.mode as string) === 'screening').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('SUBMISSION')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'SUBMISSION'
                  ? 'bg-amber-500 text-black shadow-md font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Submission Events ({eventsList.filter(e => isSubmissionEvent(e) || e.is_submission || (e.mode as string) === 'submission').length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-heading font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-sans ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Telemetry Strip / Status Cards (in Setup & All views) */}
      {(mode === 'all' || mode === 'setup') && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans">
          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Eligible Events</p>
            <p className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">{metrics.totalEvents}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">{activeSection} events in catalog</p>
          </Card>

          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registered Colleges</p>
            <p className="text-2xl font-bold font-mono text-amber-500 mt-1">{metrics.uniqueColleges}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">Institutions enrolled</p>
          </Card>

          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Registrations</p>
            <p className="text-2xl font-bold font-mono text-indigo-500 mt-1">{metrics.totalRegs}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">Active event entries</p>
          </Card>

          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Links Submitted</p>
            <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{metrics.totalSubs}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">Video / digital links uploaded</p>
          </Card>

          <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pending Links</p>
            <p className="text-2xl font-bold font-mono text-rose-500 mt-1">{metrics.pendingSubs}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">Awaiting video / drive link</p>
          </Card>
        </div>
      )}

      {/* Registration & Submission Schedule (Centrally Managed in Deadlines & Fines) */}
      {(mode === 'all' || mode === 'setup') && (
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  <span>{activeSection} Registration & Submission Schedule</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Schedules, fine stages, super fines, and link cutoff windows are managed centrally in the <strong>Deadlines & Fines</strong> tab.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    metrics.isRegOpen
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Registration: {metrics.isRegOpen ? 'OPEN' : 'CLOSED'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    metrics.isYtOpen
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Submissions: {metrics.isYtOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 font-sans space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Registration Window */}
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Registration Window</span>
                  <Badge variant="outline" className={`text-[10px] ${regScheduleStatus.badgeClass}`}>
                    {regScheduleStatus.label}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-[var(--text-primary)] space-y-0.5">
                  <div>Opens: {currentDeadlineSetting?.start_time ? formatIstDisplay(currentDeadlineSetting.start_time) : 'Default'}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Free cutoff: {currentDeadlineSetting?.no_fine_deadline ? formatIstDisplay(currentDeadlineSetting.no_fine_deadline) : 'Default'}
                  </div>
                </div>
              </div>

              {/* Fine Tiers */}
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Late & Super Fine</span>
                  <span className="text-[11px] font-bold text-amber-500">₹{currentDeadlineSetting?.fine_amount ?? 500} Late Fine</span>
                </div>
                <div className="text-xs font-mono text-[var(--text-primary)] space-y-0.5">
                  <div>Late fine until: {currentDeadlineSetting?.fine_deadline ? formatIstDisplay(currentDeadlineSetting.fine_deadline) : 'Default'}</div>
                  {currentDeadlineSetting?.has_super_fine ? (
                    <div className="text-rose-500 font-semibold">
                      Super fine (₹{currentDeadlineSetting.super_fine_amount ?? 1000}) until: {currentDeadlineSetting.super_fine_deadline ? formatIstDisplay(currentDeadlineSetting.super_fine_deadline) : 'Default'}
                    </div>
                  ) : (
                    <div className="text-[var(--text-muted)] italic">Super fine: Disabled</div>
                  )}
                </div>
              </div>

              {/* Link Submission Window */}
              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                    {activeSection === 'SCREENING' ? 'YouTube Video Submissions' : 'Digital Link Submissions'}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${linkScheduleStatus.badgeClass}`}>
                    {linkScheduleStatus.label}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-[var(--text-primary)] space-y-0.5">
                  <div>
                    Opens: {currentDeadlineSetting?.link_start_time ? formatIstDisplay(currentDeadlineSetting.link_start_time) : (currentDeadlineSetting?.start_time ? formatIstDisplay(currentDeadlineSetting.start_time) : 'Default')}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Free cutoff: {currentDeadlineSetting?.link_no_fine_deadline ? formatIstDisplay(currentDeadlineSetting.link_no_fine_deadline) : (currentDeadlineSetting?.link_submission_deadline ? formatIstDisplay(currentDeadlineSetting.link_submission_deadline) : 'Same as Reg')}
                  </div>
                  {Number(currentDeadlineSetting?.link_fine_amount) > 0 && currentDeadlineSetting?.link_fine_deadline && (
                    <div className="text-amber-500">
                      Late fine (₹{currentDeadlineSetting.link_fine_amount}) until {formatIstDisplay(currentDeadlineSetting.link_fine_deadline)}
                    </div>
                  )}
                  {currentDeadlineSetting?.link_has_super_fine && currentDeadlineSetting?.link_super_fine_deadline && (
                    <div className="text-rose-500">
                      Super fine (₹{currentDeadlineSetting.link_super_fine_amount ?? 250}) until {formatIstDisplay(currentDeadlineSetting.link_super_fine_deadline)}
                    </div>
                  )}
                  <div className="text-[10.5px] text-[var(--text-muted)] pt-0.5 font-sans">
                    {linkScheduleStatus.timeRemainingText}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">
                To modify deadlines, late fines, or link cutoff dates, open the central <strong>Deadlines & Fines</strong> manager.
              </p>
              {onNavigateTab && (
                <Button
                  type="button"
                  onClick={() => onNavigateTab('settings')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-1.5 h-auto flex items-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure in Deadlines & Fines</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Catalog Table in Setup */}
      {(mode === 'all' || mode === 'setup') && (
      <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>{activeSection} Events Catalog</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Catalog overview of eligible {activeSection.toLowerCase()} events. Individual event locks are managed under the Registration Locks tab.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
              {sectionEvents.length} Events Total
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="w-28 text-center">Mode</TableHead>
                  <TableHead className="w-32">Phase & Category</TableHead>
                  <TableHead className="w-28 text-center">Registered Colleges</TableHead>
                  <TableHead className="w-28 text-center">Submitted Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionEvents.map((ev, idx) => {
                  const itmId = Number(ev.item_id || ev.id);
                  const regCount = sectionRegistrations.filter(r => Number(r.item_id) === itmId).length;
                  const ytCount = sectionRegistrations.filter(r => {
                    const key = `${r.college_affl_no}:${itmId}`;
                    return submissionsMap.has(key) && Boolean(submissionsMap.get(key)?.file_url);
                  }).length;

                  return (
                    <TableRow key={ev.id} className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--bg-hover)]">
                      <TableCell className="text-center font-mono text-[var(--text-muted)]">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-bold text-amber-500">{ev.item_code || ev.code}</TableCell>
                      <TableCell>
                        <div className="font-bold text-[var(--text-primary)]">{ev.name_eng || ev.name}</div>
                        {ev.name_mal && (
                          <div className="text-[11px] text-[var(--text-muted)] font-malayalam">{ev.name_mal}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <ItemModeBadge mode={ev.mode} />
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-[var(--text-secondary)]">{ev.phase}</span>
                        {ev.category && <span className="ml-1 text-[11px] text-[var(--text-muted)]">({ev.category})</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-indigo-400">{regCount}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-400">{ytCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* College Registrations & Submissions Table under Registrations */}
      {(mode === 'all' || mode === 'registrations') && (
      <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>{activeSection} College Registrations & Submissions</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect registered colleges, verify submitted video/file links, and oversee rosters.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search college / event..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] w-48"
                />
              </div>

              <select
                value={filterEventId}
                onChange={e => setFilterEventId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                <option value="all">All Events</option>
                {sectionEvents.map(ev => (
                  <option key={ev.id} value={String(ev.item_id || ev.id)}>
                    {ev.item_code || ev.code} - {ev.name_eng || ev.name}
                  </option>
                ))}
              </select>

              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                <option value="all">All Modes</option>
                <option value="onstage">On-stage</option>
                <option value="offstage">Off-stage</option>
              </select>

              <select
                value={filterSubmissionStatus}
                onChange={e => setFilterSubmissionStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                <option value="all">All Submission Status</option>
                <option value="submitted">Link Submitted</option>
                <option value="pending">Pending Link</option>
              </select>

              {activeSection === 'SCREENING' && (
                <select
                  value={filterScreeningStatus}
                  onChange={e => setFilterScreeningStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium"
                >
                  <option value="all">All Screening Verdicts</option>
                  <option value="pending">Pending Review</option>
                  <option value="qualified">Qualified (Finals)</option>
                  <option value="eliminated">Not Shortlisted</option>
                </select>
              )}

              <Button
                size="xs"
                variant="saffron"
                onClick={() => {
                  setExportModalConfig({
                    eventId: filterEventId !== 'all' ? Number(filterEventId) : undefined,
                    type: activeSection === 'SCREENING' ? 'screening' : 'submission'
                  });
                  setIsExportModalOpen(true);
                }}
                className="h-8 text-xs font-bold gap-1.5 whitespace-nowrap shadow-xs"
                title={`Export screening/submission links or participant rosters`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export...</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-56">College Institution</TableHead>
                  <TableHead>Event Code & Name</TableHead>
                  <TableHead className="w-44">Registered Participants</TableHead>
                  <TableHead className="w-24 text-center">Mode</TableHead>
                  <TableHead className="w-48 text-center">Submission Link</TableHead>
                  {activeSection === 'SCREENING' && (
                    <TableHead className="w-48 text-center font-heading font-semibold">Screening Shortlist</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeSection === 'SCREENING' ? 7 : 6} className="text-center py-8 text-[var(--text-muted)] italic">
                      No registrations found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((reg, idx) => {
                    const itmId = Number(reg.item_id);
                    const colAffl = Number(reg.college_affl_no);
                    const ev = sectionEvents.find(e => Number(e.item_id || e.id) === itmId);
                    const col = collegesList.find(c => Number(c.affl_no) === colAffl);
                    const subKey = `${colAffl}:${itmId}`;
                    const sub = submissionsMap.get(subKey);

                    // Resolve roster participants
                    const rosterParticipants: Student[] = [];
                    if (reg.participants && reg.participants.length > 0) {
                      reg.participants.forEach(p => {
                        const found = findStudentByIdentifier(studentsList, p.id || p.chest_no || p.admission_no, colAffl);
                        if (found && !rosterParticipants.some(rp => rp.id === found.id)) rosterParticipants.push(found);
                        else if (p && !rosterParticipants.some(rp => rp.id === p.id)) rosterParticipants.push(p);
                      });
                    } else if (reg.student) {
                      if (!rosterParticipants.some(rp => rp.id === reg.student!.id)) rosterParticipants.push(reg.student);
                    } else if (reg.chest_no) {
                      const found = findStudentByIdentifier(studentsList, reg.chest_no, colAffl);
                      if (found && !rosterParticipants.some(rp => rp.id === found.id)) rosterParticipants.push(found);
                    }

                    return (
                      <TableRow key={reg.id || idx} className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--bg-hover)]">
                        <TableCell className="text-center font-mono text-[var(--text-muted)]">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">
                            {col?.name || `College #${colAffl}`}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Affl No: {colAffl} {col?.code ? `• ${col.code}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">
                            <span className="font-mono text-amber-500 mr-1.5">{ev?.item_code || ev?.code || itmId}</span>
                            {ev?.name_eng || ev?.name || 'Unknown Event'}
                          </div>
                          <div className="text-[10.5px] text-[var(--text-muted)]">{ev?.phase}</div>
                        </TableCell>
                        <TableCell>
                          {rosterParticipants.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {rosterParticipants.map((p, pIdx) => {
                                const chest = getCanonicalChestNo(p);
                                const idLabel = chest !== '—' ? `#${chest}` : `CIC:${p.admission_no || p.cic_no || 'N/A'}`;
                                return (
                                  <span key={p.id || pIdx} className="text-[11px] font-medium text-[var(--text-secondary)]">
                                    {p.full_name || p.name} <span className="font-mono text-[10px] text-[var(--text-muted)]">({idLabel})</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              {reg.chest_no ? `#${reg.chest_no}` : 'Enrolled'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <ItemModeBadge mode={ev?.mode} />
                        </TableCell>
                        <TableCell className="text-center">
                          {sub?.file_url ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              {isValidYouTubeUrl(sub.file_url) ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewYouTubeUrl(sub?.file_url || null)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  <YouTubeIcon className="w-3.5 h-3.5" />
                                  <span>Watch Video</span>
                                </button>
                              ) : (
                                <a
                                  href={sub.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-indigo-500/40 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Open Link</span>
                                </a>
                              )}
                              {sub.submitted_at && (
                                <span className="text-[10px] font-mono text-[var(--text-muted)]" suppressHydrationWarning>
                                  {formatIstDisplay(sub.submitted_at)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
                              Pending Link
                            </span>
                          )}
                        </TableCell>

                        {/* Screening Shortlist Decision Column */}
                        {activeSection === 'SCREENING' && (() => {
                          const matchingRegs = registrationsList.filter(
                            r => Number(r.college_affl_no) === colAffl && Number(r.item_id) === itmId
                          );
                          const screenStatus = (reg.screening_status || matchingRegs.find(r => r.screening_status)?.screening_status || 'pending') as ScreeningStatus;
                          const hasValidSub = Boolean(sub?.file_url && sub.file_url.trim());

                          return (
                            <TableCell className="text-center align-middle">
                              <div className="flex flex-col items-center gap-1.5">
                                <ScreeningStatusBadge status={screenStatus} size="sm" />
                                {hasValidSub ? (
                                  <button
                                    type="button"
                                    onClick={() => openScreeningModal(ev || (reg as any), reg, matchingRegs, rosterParticipants, sub)}
                                    className="px-2 py-0.5 rounded text-[10.5px] font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 cursor-pointer inline-flex items-center gap-1 transition-colors shadow-xs"
                                    title="Open screening review & decision window"
                                  >
                                    {screenStatus === 'pending' ? (
                                      <>
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Review & Decide</span>
                                      </>
                                    ) : (
                                      <span>Change Decision</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-[var(--text-muted)] italic">Awaiting link</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })()}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* YouTube Video Player Modal */}
      {previewYouTubeUrl && (
        <Modal
          isOpen={Boolean(previewYouTubeUrl)}
          onClose={() => setPreviewYouTubeUrl(null)}
          title="Submitted YouTube Video"
        >
          <div className="space-y-4">
            <div className="relative w-full pb-[56.25%] bg-black rounded-xl overflow-hidden border border-[var(--border-subtle)]">
              {getYouTubeEmbedUrl(previewYouTubeUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(previewYouTubeUrl) || ''}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center text-rose-400 text-xs h-full">
                  Unable to parse video ID from URL.
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <a
                href={previewYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline flex items-center gap-1 font-mono"
              >
                <span>{previewYouTubeUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <Button size="xs" variant="outline" onClick={() => setPreviewYouTubeUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Screening Shortlist & Video Review Modal */}
      {screeningModalTarget && (
        <Modal
          isOpen={Boolean(screeningModalTarget)}
          onClose={() => setScreeningModalTarget(null)}
          title="Pre-Fest Screening Shortlist Review"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[var(--text-muted)]">
                Status:{' '}
                <span className="font-semibold capitalize text-[var(--text-primary)]">
                  {selectedModalStatus}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScreeningModalTarget(null)}
                  disabled={isSavingDecision}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="saffron"
                  onClick={handleSaveModalDecision}
                  disabled={isSavingDecision}
                  className="font-heading font-bold"
                >
                  {isSavingDecision ? 'Saving...' : 'Save Decision'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header Details */}
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                    {screeningModalTarget.item.name_eng || screeningModalTarget.item.name || 'Event'}
                  </div>
                  <div className="font-heading font-bold text-sm text-[var(--text-primary)] truncate">
                    {screeningModalTarget.rosterParticipants
                      .map(m => m.full_name || m.name || 'Participant')
                      .join(', ') || 'College Delegation'}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                    <span>
                      Chest:{' '}
                      {screeningModalTarget.rosterParticipants
                        .map(m => getCanonicalChestNo(m))
                        .join(', ') || screeningModalTarget.reg.chest_no || '—'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wide">College</div>
                  <div className="font-heading font-bold text-xs text-[var(--text-primary)]">
                    #{screeningModalTarget.reg.college_affl_no}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] max-w-[200px] truncate">
                    {collegesList.find(c => Number(c.affl_no) === Number(screeningModalTarget.reg.college_affl_no))?.name || `College #${screeningModalTarget.reg.college_affl_no}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Submission Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-indigo-500" />
                  Submitted Performance Video
                </span>
                <div className="flex items-center gap-2">
                  {screeningModalTarget.submission?.submitted_at && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]" suppressHydrationWarning>
                      Uploaded: {formatIstDisplay(screeningModalTarget.submission.submitted_at)}
                    </span>
                  )}
                  {screeningModalTarget.submission?.file_url && (
                    <a
                      href={screeningModalTarget.submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Open link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {screeningModalTarget.submission?.file_url && isValidYouTubeUrl(screeningModalTarget.submission.file_url) ? (
                <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden border border-[var(--border-subtle)] shadow-xs">
                  <iframe
                    src={getYouTubeEmbedUrl(screeningModalTarget.submission.file_url) || ''}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full border-0"
                  />
                </div>
              ) : screeningModalTarget.submission?.file_url ? (
                <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">External performance link uploaded:</p>
                  <a
                    href={screeningModalTarget.submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Submission in New Tab
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center text-[var(--text-muted)] italic">
                  No submission URL available
                </div>
              )}
            </div>

            {/* Decision Selection Radio Cards */}
            <div className="space-y-1.5">
              <label className="font-heading font-semibold text-xs text-[var(--text-primary)]">
                Screening Verdict
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Qualify Option */}
                <button
                  type="button"
                  onClick={() => setSelectedModalStatus('qualified')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedModalStatus === 'qualified'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:border-emerald-500/40 text-[var(--text-secondary)]'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      selectedModalStatus === 'qualified'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs">Qualify</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                      Shortlist as finalist for the stage competition
                    </div>
                  </div>
                </button>

                {/* Eliminate Option */}
                <button
                  type="button"
                  onClick={() => setSelectedModalStatus('eliminated')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedModalStatus === 'eliminated'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:border-rose-500/40 text-[var(--text-secondary)]'
                  }`}
                >
                  <XCircle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      selectedModalStatus === 'eliminated'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs">Eliminate</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                      Mark as not shortlisted for stage finals
                    </div>
                  </div>
                </button>

                {/* Reset to Pending Option */}
                <button
                  type="button"
                  onClick={() => setSelectedModalStatus('pending')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedModalStatus === 'pending'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:border-amber-500/40 text-[var(--text-secondary)]'
                  }`}
                >
                  <RotateCcw
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      selectedModalStatus === 'pending'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs">Pending</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                      Leave under review / decide later
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Optional Remarks Textarea */}
            <div className="space-y-1">
              <label className="font-heading font-semibold text-xs text-[var(--text-primary)] flex items-center justify-between">
                <span>Evaluation Notes / Remarks (Optional)</span>
                <span className="text-[10px] font-normal text-[var(--text-muted)] font-mono">Visible to organizers</span>
              </label>
              <textarea
                value={modalRemarks}
                onChange={e => setModalRemarks(e.target.value)}
                placeholder="e.g. Scored 86/100, excellent performance, qualified for stage finals..."
                rows={2}
                className="w-full text-xs p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Unified Export Modal Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialEventId={exportModalConfig.eventId}
        initialType={exportModalConfig.type}
        items={eventsList}
        colleges={collegesList}
        registrations={registrationsList}
        submissions={submissionsList}
        students={studentsList}
      />
    </div>
  );
}
