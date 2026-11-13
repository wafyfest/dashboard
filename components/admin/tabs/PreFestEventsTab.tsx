'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, ItemModeBadge } from '@/components/ui/badge';
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
  Trash2,
  RefreshCw,
  Video,
  FileCheck,
  Building2,
  Layers,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import {
  Item,
  Registration,
  SubmissionEntry,
  Student,
  College,
  SpecialEventType,
  SpecialEventSettings,
  isSubmissionEvent,
  isScreeningEvent
} from '@/lib/types/fest';
import { formatIstDisplay, formatToIstInput, parseIstInputToIso } from '@/lib/utils/istDate';
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
}

export function PreFestEventsTab({ mode = 'all' }: PreFestEventsTabProps = {}) {
  const { refreshKey, triggerRefresh } = useFest();
  const [activeSection, setActiveSection] = useState<SpecialEventType>('SCREENING');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
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

  // Preview Modal for YouTube Video
  const [previewYouTubeUrl, setPreviewYouTubeUrl] = useState<string | null>(null);

  // Load data from live Supabase / storage
  const loadData = async (showLoading: boolean = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const items = festService.getItems();
      const regs = festService.getRegistrations();
      const subs = festService.getSubmissionEntries();
      const preSubs = festService.getPreFestSubmissions();
      const cols = festService.getColleges();
      const stus = festService.getStudents();
      const settings = festService.getSpecialEventSettings();

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
            status: ps.submission_status || mergedSubs[existingIdx].status
          };
        } else {
          mergedSubs.push(subRecord);
        }
      });

      setEventsList(items);
      setRegistrationsList(regs);
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

  // Form state for current master settings
  const [regEnabled, setRegEnabled] = useState<boolean>(true);
  const [regOpensAt, setRegOpensAt] = useState<string>('');
  const [regClosesAt, setRegClosesAt] = useState<string>('');
  const [fineClosesAt, setFineClosesAt] = useState<string>('');
  const [fineAmount, setFineAmount] = useState<number>(200);
  const [ytEnabled, setYtEnabled] = useState<boolean>(true);
  const [ytOpensAt, setYtOpensAt] = useState<string>('');
  const [ytClosesAt, setYtClosesAt] = useState<string>('');

  useEffect(() => {
    const kind = activeSection === 'SCREENING' ? 'screening' : 'submission';
    const dlSetting = festService.getEventDeadlineSetting(kind);
    setRegEnabled(dlSetting.is_active ?? (currentSettings.registration_enabled ?? true));
    setRegOpensAt(dlSetting.start_time ? formatToIstInput(dlSetting.start_time) : (currentSettings.registration_opens_at ? formatToIstInput(currentSettings.registration_opens_at) : (activeSection === 'SCREENING' ? '2026-11-15T10:00' : '')));
    setRegClosesAt(dlSetting.no_fine_deadline ? formatToIstInput(dlSetting.no_fine_deadline) : (currentSettings.registration_closes_at ? formatToIstInput(currentSettings.registration_closes_at) : (activeSection === 'SCREENING' ? '2026-11-22T22:00' : '')));
    setFineClosesAt(dlSetting.fine_deadline ? formatToIstInput(dlSetting.fine_deadline) : (currentSettings.fine_closes_at ? formatToIstInput(currentSettings.fine_closes_at) : (activeSection === 'SCREENING' ? '2026-11-24T22:00' : '')));
    setFineAmount(dlSetting.fine_amount ?? (currentSettings.fine_amount ?? (activeSection === 'SCREENING' ? 200 : 500)));
    setYtEnabled(dlSetting.is_active ?? (currentSettings.youtube_submission_enabled ?? true));
    setYtOpensAt(dlSetting.start_time ? formatToIstInput(dlSetting.start_time) : (currentSettings.youtube_submission_opens_at ? formatToIstInput(currentSettings.youtube_submission_opens_at) : ''));
    setYtClosesAt(dlSetting.link_submission_deadline ? formatToIstInput(dlSetting.link_submission_deadline) : (currentSettings.youtube_submission_closes_at ? formatToIstInput(currentSettings.youtube_submission_closes_at) : ''));
  }, [currentSettings, activeSection, refreshKey]);

  const applyOfficialScreeningSchedule = () => {
    setRegEnabled(true);
    setRegOpensAt('2026-11-15T10:00'); // 15/11/2026, 10:00 AM
    setRegClosesAt('2026-11-22T22:00'); // 22/11/2026, 10:00 PM
    setFineClosesAt('2026-11-24T22:00'); // 24/11/2026, 10:00 PM
    setFineAmount(200); // 200 Rs per event
  };

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

    const now = new Date();
    const isRegOpen =
      currentSettings.registration_enabled &&
      (!currentSettings.registration_opens_at || now >= new Date(currentSettings.registration_opens_at)) &&
      (!currentSettings.registration_closes_at || now <= new Date(currentSettings.registration_closes_at));

    const isYtOpen =
      currentSettings.youtube_submission_enabled &&
      (!currentSettings.youtube_submission_opens_at || now >= new Date(currentSettings.youtube_submission_opens_at)) &&
      (!currentSettings.youtube_submission_closes_at || now <= new Date(currentSettings.youtube_submission_closes_at));

    return {
      totalEvents,
      uniqueColleges,
      totalRegs,
      totalSubs,
      pendingSubs,
      isRegOpen,
      isYtOpen
    };
  }, [sectionEvents, sectionRegistrations, submissionsMap, currentSettings]);

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setToast(null);

    const kind = activeSection === 'SCREENING' ? 'screening' : 'submission';
    await festService.updateEventDeadlineSetting({
      event_kind: kind,
      display_name: activeSection === 'SCREENING' ? 'Screening Events' : 'Digital Submission Events',
      start_time: regOpensAt ? parseIstInputToIso(regOpensAt) : new Date().toISOString(),
      no_fine_deadline: regClosesAt ? parseIstInputToIso(regClosesAt) : new Date().toISOString(),
      fine_deadline: fineClosesAt ? parseIstInputToIso(fineClosesAt) : new Date().toISOString(),
      fine_amount: Number(fineAmount) || 0,
      super_fine_deadline: fineClosesAt ? parseIstInputToIso(fineClosesAt) : new Date().toISOString(),
      super_fine_amount: Number(fineAmount) || 0,
      link_submission_deadline: ytClosesAt ? parseIstInputToIso(ytClosesAt) : (fineClosesAt ? parseIstInputToIso(fineClosesAt) : null),
      is_active: regEnabled,
    });

    const res = await festService.updateSpecialEventSettings({
      event_type: activeSection,
      registration_enabled: regEnabled,
      registration_opens_at: regOpensAt ? parseIstInputToIso(regOpensAt) : null,
      registration_closes_at: regClosesAt ? parseIstInputToIso(regClosesAt) : null,
      fine_closes_at: fineClosesAt ? parseIstInputToIso(fineClosesAt) : null,
      fine_amount: Number(fineAmount) || 0,
      youtube_submission_enabled: ytEnabled,
      youtube_submission_opens_at: ytOpensAt ? parseIstInputToIso(ytOpensAt) : null,
      youtube_submission_closes_at: ytClosesAt ? parseIstInputToIso(ytClosesAt) : null,
      disabled_event_ids: []
    });

    setIsSavingSettings(false);
    if (!res.success) {
      setToast({ type: 'error', message: res.error || 'Failed to save settings.' });
    } else {
      setToast({ type: 'success', message: `${activeSection} settings updated successfully.` });
      setSettingsList(prev => {
        const idx = prev.findIndex(s => s.event_type === activeSection);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.settings;
          return updated;
        }
        return [...prev, res.settings];
      });
      triggerRefresh();
    }
  };

  // Admin unregister
  const handleAdminUnregister = async (reg: Registration) => {
    const colAffl = Number(reg.college_affl_no);
    const itmId = Number(reg.item_id);
    const item = eventsList.find(e => Number(e.item_id || e.id) === itmId);
    const col = collegesList.find(c => Number(c.affl_no) === colAffl);
    const colName = col ? `${col.name} (#${col.affl_no})` : `College #${colAffl}`;
    const itemName = item?.name_eng || item?.name || `Item #${itmId}`;

    if (!confirm(`Are you sure you want to remove the registration for "${itemName}" from ${colName}? This will also delete any associated submission link.`)) {
      return;
    }

    const res = await festService.unregisterCollegeForItem(colAffl, itmId);
    if (!res.success) {
      setToast({ type: 'error', message: res.error || 'Failed to remove registration.' });
    } else {
      setToast({ type: 'success', message: 'Registration removed successfully.' });
      triggerRefresh();
      loadData(false);
    }
  };

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
  }, [sectionRegistrations, sectionEvents, collegesList, submissionsMap, filterEventId, filterMode, filterSubmissionStatus, searchQuery]);

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

      {/* Master Controls & Deadlines in Setup */}
      {(mode === 'all' || mode === 'setup') && (
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <span>{activeSection} Master Controls & Deadlines</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Set master registration and link submission schedules specifically for {activeSection} events.
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

        <CardContent className="pt-4 font-sans">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Registration Control */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-heading text-[var(--text-primary)]">
                      1. College Registration Window
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Enable or schedule roster registration for {activeSection} events.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regEnabled}
                      onChange={e => setRegEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Registration Opens (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={regOpensAt}
                      onChange={e => setRegOpensAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Registration Closes (No Fine) (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={regClosesAt}
                      onChange={e => setRegClosesAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Late Fine Period Closes (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={fineClosesAt}
                      onChange={e => setFineClosesAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Late Fine Amount (₹ / event)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={fineAmount}
                      onChange={e => setFineAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </div>

                {activeSection === 'SCREENING' && (
                  <div className="pt-2 border-t border-[var(--border-subtle)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">
                      Circular <span className="font-bold text-amber-500">WSFWF_26_016</span>: 15 Nov 10 AM → 22 Nov 10 PM (Free) → 24 Nov 10 PM (₹200 Fine)
                    </div>
                    <button
                      type="button"
                      onClick={applyOfficialScreeningSchedule}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      Fill Circular Dates
                    </button>
                  </div>
                )}
              </div>

              {/* Box 2: Submission Link Control */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                      <YouTubeIcon className="w-3.5 h-3.5 text-rose-500" />
                      <span>2. Video / Digital Link Submissions</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Enable or schedule video URL / Drive uploads for registered entries.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ytEnabled}
                      onChange={e => setYtEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Submissions Open (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={ytOpensAt}
                      onChange={e => setYtOpensAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Submissions Close (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={ytClosesAt}
                      onChange={e => setYtClosesAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSavingSettings}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5"
              >
                {isSavingSettings ? 'Saving...' : `Save ${activeSection} Master Schedule`}
              </Button>
            </div>
          </form>
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
                  <TableHead className="w-24 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--text-muted)] italic">
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
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${
                                  sub.status === 'late'
                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                    : sub.status === 'fine'
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {sub.status === 'late' ? 'Late' : sub.status === 'fine' ? 'Late Fine' : 'On Time'}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
                              Pending Link
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleAdminUnregister(reg)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
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
    </div>
  );
}
