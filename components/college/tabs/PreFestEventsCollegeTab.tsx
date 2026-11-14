'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Lock,
  Plus,
  SquarePen,
  Trash2,
  ChevronDown,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Play,
  Layers,
  Video,
  X,
  CalendarCheck
} from 'lucide-react';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import {
  Item,
  Registration,
  SubmissionEntry,
  Student,
  College,
  SpecialEventType,
  isSubmissionEvent,
  isScreeningEvent,
  isItemEligibleForCollege,
  getItemParticipantBounds
} from '@/lib/types/fest';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import {
  isValidYouTubeUrl,
  getYouTubeEmbedUrl,
  YOUTUBE_UI
} from '@/lib/utils/youtube';
import { evaluateEventDeadlineSetting, evaluateLinkSubmissionDeadline, formatIstDisplay } from '@/lib/utils/istDate';

function YouTubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface PreFestEventsCollegeTabProps {
  currentCollegeId?: string;
  currentCollegeAfflNo?: number;
  college?: College;
  registrations: Registration[];
  submissions?: SubmissionEntry[];
  students?: Student[];
  allItems?: Item[];
  registrationStatusByItem?: Map<number, RegistrationStatus>;
  onOpenRegistrationModal: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  onRefresh?: () => void;
}

export function PreFestEventsCollegeTab({
  currentCollegeId,
  currentCollegeAfflNo,
  college,
  registrations = [],
  submissions = [],
  students = [],
  allItems: propsItems,
  registrationStatusByItem,
  onOpenRegistrationModal,
  onUnregisterRegistration,
  onRefresh
}: PreFestEventsCollegeTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const [activeSection, setActiveSection] = useState<SpecialEventType>('SCREENING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'enrolled' | 'link_submitted' | 'link_pending' | 'not_enrolled'>('All');
  const [selectedMode, setSelectedMode] = useState<'All' | 'onstage' | 'offstage'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // YouTube Submission Modal State
  const [submissionModalTarget, setSubmissionModalTarget] = useState<{
    item: Item;
    rosterParticipants: Student[];
    registrationId?: string;
    existingUrl?: string | null;
  } | null>(null);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState<string>('');
  const [isSubmittingLink, setIsSubmittingLink] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Watch Video Modal State
  const [watchModalVideo, setWatchModalVideo] = useState<{
    url: string;
    itemName: string;
    itemCode: string;
  } | null>(null);

  // Live prefest registrations & submissions from server API
  const [settingsList, setSettingsList] = useState<any[]>(() => festService.getSpecialEventSettings());
  const [preFestRegs, setPreFestRegs] = useState<any[]>([]);
  const [preFestSubs, setPreFestSubs] = useState<any[]>([]);

  // Fetch prefest records to ensure accurate registration IDs & submission status
  const loadPreFestData = async () => {
    try {
      const res = await fetch('/api/prefest-events');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettingsList(data.settings);
        if (data.registrations) setPreFestRegs(data.registrations);
        if (data.submissions) setPreFestSubs(data.submissions);
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    loadPreFestData();
  }, [refreshKey]);

  const currentSettings = useMemo(() => {
    return settingsList.find(s => s.event_type === activeSection);
  }, [settingsList, activeSection]);

  const scheduleStatus = useMemo(() => {
    const kind = activeSection === 'SCREENING' ? 'screening' : 'submission';
    const dlSetting = festService.getEventDeadlineSetting(kind);
    return evaluateEventDeadlineSetting(dlSetting);
  }, [activeSection, refreshKey]);

  const linkScheduleStatus = useMemo(() => {
    const kind = activeSection === 'SCREENING' ? 'screening' : 'submission';
    const dlSetting = festService.getEventDeadlineSetting(kind);
    return evaluateLinkSubmissionDeadline(dlSetting);
  }, [activeSection, refreshKey]);

  const registeredItemIds = useMemo(() => {
    return new Set(registrations.map(r => r.item_id).filter(Boolean));
  }, [registrations]);

  // Available catalog events from props or festService fallback, filtered by college phase eligibility
  const items = useMemo(() => {
    const rawItems = propsItems && propsItems.length > 0 ? propsItems : festService.getItems();
    if ((students && students.length > 0) || college) {
      return rawItems.filter(item =>
        isItemEligibleForCollege(item, students, college, registeredItemIds)
      );
    }
    return rawItems;
  }, [propsItems, students, college, registeredItemIds, refreshKey]);

  // Section events (Screening vs Submission)
  const sectionEvents = useMemo(() => {
    return items.filter(e => {
      if (activeSection === 'SCREENING') return Boolean(isScreeningEvent(e) || e.is_screening || (e.mode as string) === 'screening');
      if (activeSection === 'SUBMISSION') return Boolean(isSubmissionEvent(e) || e.is_submission || (e.mode as string) === 'submission');
      return false;
    });
  }, [items, activeSection]);

  // Available categories in active section
  const categoryOptions = useMemo(() => {
    return Array.from(new Set(sectionEvents.map(e => e.phase || e.category).filter(Boolean)));
  }, [sectionEvents]);

  // Map of registrations by item_id
  const registrationsByItemId = useMemo(() => {
    const map = new Map<number, Registration[]>();
    for (const r of registrations) {
      const itmId = Number(r.item_id);
      if (!isNaN(itmId)) {
        const list = map.get(itmId) || [];
        list.push(r);
        map.set(itmId, list);
      }
    }
    return map;
  }, [registrations]);

  // Map of submissions by item_id (synthesized from preFestSubs and submissions)
  const submissionsByItemId = useMemo(() => {
    const map = new Map<number, { url: string; status?: string }>();
    for (const s of submissions) {
      const itmId = Number(s.item_id);
      if (!isNaN(itmId) && s.file_url) {
        map.set(itmId, { url: s.file_url, status: s.status });
      }
    }
    for (const ps of preFestSubs) {
      const itm = items.find(i => String(i.id) === String(ps.event_id) || Number(i.item_id) === Number(ps.event_id));
      if (itm && ps.youtube_url) {
        map.set(Number(itm.item_id || itm.id), { url: ps.youtube_url, status: ps.submission_status || 'submitted' });
      }
    }
    return map;
  }, [submissions, preFestSubs, items]);

  // Telemetry metrics
  const registeredCount = useMemo(() => {
    let count = 0;
    for (const ev of sectionEvents) {
      const itmId = Number(ev.item_id || ev.id);
      if (registrationsByItemId.has(itmId)) count++;
    }
    return count;
  }, [sectionEvents, registrationsByItemId]);

  const submittedLinksCount = useMemo(() => {
    let count = 0;
    for (const ev of sectionEvents) {
      const itmId = Number(ev.item_id || ev.id);
      if (registrationsByItemId.has(itmId) && submissionsByItemId.has(itmId)) count++;
    }
    return count;
  }, [sectionEvents, registrationsByItemId, submissionsByItemId]);

  const pendingLinksCount = Math.max(0, registeredCount - submittedLinksCount);

  // Filtered displayed items
  const displayedItems = useMemo(() => {
    return sectionEvents.filter(ev => {
      const itmId = Number(ev.item_id || ev.id);
      const isReg = registrationsByItemId.has(itmId);
      const hasSub = submissionsByItemId.has(itmId);

      if (statusFilter === 'enrolled' && !isReg) return false;
      if (statusFilter === 'not_enrolled' && isReg) return false;
      if (statusFilter === 'link_submitted' && (!isReg || !hasSub)) return false;
      if (statusFilter === 'link_pending' && (!isReg || hasSub)) return false;

      if (selectedMode !== 'All') {
        const m = (ev.mode || '').toLowerCase();
        if (selectedMode === 'onstage' && m !== 'onstage') return false;
        if (selectedMode === 'offstage' && m !== 'offstage') return false;
      }
      if (selectedCategory !== 'All') {
        const cat = ev.phase || ev.category;
        if (cat !== selectedCategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (ev.item_code || ev.code || '').toLowerCase().includes(q);
        const nameMatch = (ev.name_eng || ev.name || '').toLowerCase().includes(q);
        const malMatch = (ev.name_mal || '').toLowerCase().includes(q);
        return codeMatch || nameMatch || malMatch;
      }
      return true;
    });
  }, [sectionEvents, registrationsByItemId, submissionsByItemId, statusFilter, selectedMode, selectedCategory, searchQuery]);

  // Handle open submission modal
  const handleOpenSubmissionModal = (item: Item, roster: Student[]) => {
    const itmId = Number(item.item_id || item.id);
    const existingSub = submissionsByItemId.get(itmId);

    // Find prefest_registration id if exists
    const pfReg = preFestRegs.find(
      r => String(r.event_id) === String(item.id) || Number(r.event_id) === itmId
    );

    setSubmissionModalTarget({
      item,
      rosterParticipants: roster,
      registrationId: pfReg?.id,
      existingUrl: existingSub?.url || null
    });
    setYoutubeInputUrl(existingSub?.url || '');
    setSubmitError(null);
  };

  // Handle save YouTube link
  const handleSaveYouTubeLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionModalTarget) return;

    const trimmedUrl = youtubeInputUrl.trim();
    if (!isValidYouTubeUrl(trimmedUrl)) {
      setSubmitError('Please enter a valid YouTube video URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }

    setIsSubmittingLink(true);
    setSubmitError(null);

    try {
      let regId = submissionModalTarget.registrationId;

      // If no prefest_registration id yet, ensure one is registered on the server first
      if (!regId) {
        const regRes = await festService.registerPreFestEvent(
          submissionModalTarget.item.id,
          currentCollegeId || `col-${currentCollegeAfflNo}`,
          currentCollegeAfflNo || 0
        );
        if (!regRes.success) {
          throw new Error(regRes.error || 'Failed to initialize pre-fest registration record.');
        }
        regId = regRes.registration?.id;
      }

      if (!regId) {
        throw new Error('Registration ID could not be resolved.');
      }

      const res = await festService.submitPreFestYouTube(regId, trimmedUrl);
      if (!res.success) {
        throw new Error(res.error || 'Failed to submit YouTube link.');
      }

      setSubmissionModalTarget(null);
      await loadPreFestData();
      triggerRefresh();
      onRefresh?.();
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting YouTube video link.');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Pre-Fest Registration
            </CardTitle>
            <Badge variant="saffron" className="font-mono font-bold">
              {registeredCount} / {sectionEvents.length} Enrolled ({sectionEvents.length > 0 ? Math.round((registeredCount / sectionEvents.length) * 100) : 0}%)
            </Badge>
            <Badge variant="outline" className="font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-bold">
              {submittedLinksCount} / {registeredCount} Links
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Screening preliminary videos and digital file submissions with embedded YouTube review
          </CardDescription>
        </div>

        {/* Right side: Segmented Section Switcher + Refresh Button */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveSection('SCREENING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                activeSection === 'SCREENING'
                  ? 'bg-amber-500 text-[#090d1a] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Screening ({items.filter(e => isScreeningEvent(e) || e.is_screening || (e.mode as string) === 'screening').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('SUBMISSION')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                activeSection === 'SUBMISSION'
                  ? 'bg-amber-500 text-[#090d1a] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Submission ({items.filter(e => isSubmissionEvent(e) || e.is_submission || (e.mode as string) === 'submission').length})
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              triggerRefresh();
              loadPreFestData();
              onRefresh?.();
            }}
            className="h-8 px-2.5 rounded-xl cursor-pointer"
            title="Refresh Pre-Fest Events"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Schedule & Deadline Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${scheduleStatus.badgeClass}`}>
              <span className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-sans">
                Enrollment
              </span>
              <span className="font-semibold">{scheduleStatus.label}</span>
              <span className="text-[11px] opacity-75 font-sans">({scheduleStatus.timeRemainingText})</span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${linkScheduleStatus.badgeClass}`}>
              <span className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-sans">
                Link Submission
              </span>
              <span className="font-semibold">{linkScheduleStatus.label}</span>
              <span className="text-[11px] opacity-75 font-sans">({linkScheduleStatus.timeRemainingText})</span>
            </div>
          </div>

          <div className="text-xs font-sans text-[var(--text-secondary)]">
            Viewing: <strong className="text-[var(--text-primary)] font-heading">{activeSection === 'SCREENING' ? 'Screening Events' : 'Digital Submissions'}</strong>
          </div>
        </div>

        {/* Full-width Filters Toolbar matching all other tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search event name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-sans font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Status (Enrolled & Pending)</option>
              <option value="enrolled">Enrolled Only</option>
              <option value="link_submitted">YouTube Link Submitted</option>
              <option value="link_pending">Pending Video Link</option>
              <option value="not_enrolled">Not Enrolled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Stage Mode Filter */}
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Stage Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-2 pr-7 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {/* Pending Links Notification Banner */}
        {pendingLinksCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs">
            <div className="flex items-start sm:items-center gap-2 text-rose-900 dark:text-rose-200">
              <YouTubeIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="font-heading font-bold">{pendingLinksCount}</strong> registered {activeSection.toLowerCase()} {pendingLinksCount === 1 ? 'event still needs' : 'events still need'} a YouTube video link. Click <strong className="font-semibold">Submit YouTube Link</strong> in the actions column.
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-300">
              {submittedLinksCount} / {registeredCount} Links Uploaded
            </span>
          </div>
        )}

        {/* Events Table */}
        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-x-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-[32%]">Event Name & Roster</TableHead>
              <TableHead className="whitespace-nowrap">Category</TableHead>
              <TableHead className="text-center whitespace-nowrap">Type / Mode</TableHead>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="text-center whitespace-nowrap">Registered</TableHead>
              <TableHead className="text-center whitespace-nowrap">YouTube Video</TableHead>
              <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-xs">
                  <div className="max-w-md mx-auto space-y-2">
                    <CalendarCheck className="w-8 h-8 mx-auto opacity-40 text-[var(--text-muted)]" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      No {activeSection.toLowerCase()} events found matching your search or filters.
                    </p>
                    {(searchQuery || statusFilter !== 'All' || selectedMode !== 'All' || selectedCategory !== 'All') && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="mt-2 text-xs font-heading cursor-pointer"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                          setSelectedMode('All');
                          setSelectedCategory('All');
                        }}
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedItems.map((item, index) => {
                const itmId = Number(item.item_id || item.id);
                const matchingRegs = registrationsByItemId.get(itmId) || [];
                const isRegistered = matchingRegs.length > 0;

                // Resolve roster participants from registrations and students
                const rosterParticipants: Student[] = [];
                matchingRegs.forEach(reg => {
                  if (reg.participants && reg.participants.length > 0) {
                    reg.participants.forEach(p => {
                      const found = findStudentByIdentifier(students, (p as any).cic_no || p.chest_no || p.admission_no || p.id || '', currentCollegeAfflNo);
                      const candidate = found || p;
                      const cKey = candidate.id || (candidate as any).cic_no || candidate.chest_no;
                      if (!rosterParticipants.some(rp => (rp.id && rp.id === cKey) || (rp.cic_no && (candidate as any).cic_no && rp.cic_no === (candidate as any).cic_no) || (rp.chest_no && candidate.chest_no && rp.chest_no === candidate.chest_no))) {
                        rosterParticipants.push(candidate);
                      }
                    });
                  } else {
                    const found = findStudentByIdentifier(students, reg.cic_no || reg.chest_no || '', currentCollegeAfflNo);
                    const candidate = found || reg.student || ({
                      id: `reg-${reg.id || reg.chest_no || reg.cic_no}`,
                      full_name: reg.chest_no ? `Chest #${reg.chest_no}` : (reg.cic_no ? `CIC: ${reg.cic_no}` : 'Participant'),
                      name: reg.chest_no ? `Chest #${reg.chest_no}` : (reg.cic_no ? `CIC: ${reg.cic_no}` : 'Participant'),
                      chest_no: reg.chest_no,
                      cic_no: reg.cic_no,
                    } as any);
                    if (!rosterParticipants.some(rp => (rp.id && rp.id === candidate.id) || (rp.cic_no && candidate.cic_no && rp.cic_no === candidate.cic_no) || (rp.chest_no && candidate.chest_no && rp.chest_no === candidate.chest_no))) {
                      rosterParticipants.push(candidate);
                    }
                  }
                });

                // Lock check via registration locks matrix
                const lockCheck = registrationStatusByItem?.get(itmId)
                  || festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId || 0, itmId);
                const isLocked = !lockCheck.canRegister;
                const lockReason = lockCheck.reason || 'Registration Closed (Locked)';

                // Submission entry for this item
                const subEntry = submissionsByItemId.get(itmId);

                const itemCategory = item.phase || item.category;
                const itemType = item.point_type
                  ? (item.point_type.toLowerCase() === 'group' ? 'Group' : 'Individual')
                  : (item.item_type === 'Group' ? 'Group' : 'Individual');
                const { min: minCount, max: maxCount, isOpen: isOpenParticipants } = getItemParticipantBounds(item);
                const registeredCount = isRegistered
                  ? Math.max(rosterParticipants.length, matchingRegs.length, 1)
                  : 0;

                return (
                  <TableRow key={item.id} className={isRegistered ? 'bg-amber-500/[0.02]' : undefined}>
                    {/* Index */}
                    <TableCell className="text-center font-mono font-medium text-[var(--text-muted)]">
                      {index + 1}
                    </TableCell>

                    {/* Event Name & Active Roster */}
                    <TableCell>
                      <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                        {item.name_eng || item.name}
                      </div>
                      {item.name_mal && (
                        <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5 font-malayalam">
                          {item.name_mal}
                        </div>
                      )}

                      {/* Display registered participants */}
                      {isRegistered && (
                        <div className="text-[11px] font-sans text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Roster:
                          </span>
                          {rosterParticipants.length > 0 ? (
                            rosterParticipants.map((p, pIdx) => {
                              const chest = getCanonicalChestNo(p);
                              const idLabel = chest !== '—' ? `#${chest}` : `CIC: ${p.admission_no || p.cic_no || (p as any).cic_number || 'N/A'}`;
                              return (
                                <span
                                  key={p.id || pIdx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10.5px] font-medium text-[var(--text-secondary)] font-sans"
                                >
                                  {p.full_name || p.name} <span className="ml-1 text-[var(--text-muted)] font-mono text-[9.5px]">({idLabel})</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[var(--text-secondary)] font-mono text-[10.5px]">
                              {matchingRegs[0]?.chest_no ? `Chest #${matchingRegs[0].chest_no}` : 'Enrolled'}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Category Badge */}
                    <TableCell>
                      <CategoryBadge category={itemCategory} />
                    </TableCell>

                    {/* Type / Mode Badge */}
                    <TableCell className="text-center">
                      <ItemTypeBadge
                        type={itemType}
                        mode={item.mode}
                        isSubmission={isSubmissionEvent(item)}
                        isScreening={isScreeningEvent(item)}
                      />
                    </TableCell>

                    {/* Item Code */}
                    <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                      {item.item_code || item.code}
                    </TableCell>

                    {/* Registered Status */}
                    <TableCell className="text-center">
                      {isRegistered ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {registeredCount}/{isOpenParticipants ? 'Open' : maxCount}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`font-mono font-bold text-xs ${isLocked ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}
                          title={isLocked ? lockReason : 'Not enrolled'}
                        >
                          0/{isOpenParticipants ? 'Open' : maxCount}
                        </span>
                      )}
                    </TableCell>

                    {/* YouTube Video Column */}
                    <TableCell className="text-center">
                      {isRegistered ? (
                        subEntry?.url ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setWatchModalVideo({
                                  url: subEntry.url,
                                  itemName: item.name_eng || item.name || 'Event Video',
                                  itemCode: item.item_code || item.code || ''
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-2xs"
                              title="Watch Submitted Video"
                            >
                              <YouTubeIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>Watch Video</span>
                            </button>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${
                                subEntry.status === 'late'
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                  : subEntry.status === 'fine'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {subEntry.status === 'late' ? 'Late' : subEntry.status === 'fine' ? 'Late Fine' : 'Submitted'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-medium border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            YouTube Link Needed
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isRegistered ? (
                          <>
                            {/* Submit / Edit YouTube Link Button */}
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={!linkScheduleStatus.canSubmitLink}
                              className={`h-8 px-2.5 rounded-lg text-xs font-heading font-semibold hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 ${
                                !linkScheduleStatus.canSubmitLink ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title={
                                !linkScheduleStatus.canSubmitLink
                                  ? 'Link submission deadline has passed (Locked)'
                                  : subEntry?.url
                                  ? 'Edit Submitted YouTube Link'
                                  : 'Submit YouTube Video Link'
                              }
                              onClick={() => linkScheduleStatus.canSubmitLink && handleOpenSubmissionModal(item, rosterParticipants)}
                            >
                              <YouTubeIcon className="w-3.5 h-3.5 mr-1 text-rose-500" />
                              {subEntry?.url ? 'Edit Link' : 'Submit Link'}
                            </Button>

                            {/* Edit Roster Button */}
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-8 px-2 rounded-lg text-xs font-heading font-semibold hover:border-[var(--f-saffron)] hover:text-[var(--f-saffron-text)]"
                              title={isLocked ? 'Registration Closed (Locked)' : 'Edit Participant Roster'}
                              disabled={isLocked}
                              onClick={() => !isLocked && onOpenRegistrationModal(item)}
                            >
                              {isLocked ? (
                                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              ) : (
                                <>
                                  <SquarePen className="w-3.5 h-3.5 mr-1" />
                                  Edit
                                </>
                              )}
                            </Button>

                            {/* Remove / Cancel Registration Button */}
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 shrink-0"
                              title={isLocked ? 'Registration Closed (Locked)' : 'Cancel / Remove Event Entry'}
                              disabled={isLocked}
                              onClick={() => {
                                if (isLocked) return;
                                onUnregisterRegistration?.(item);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </Button>
                          </>
                        ) : (
                          /* Register Button */
                          <Button
                            size="xs"
                            variant={isLocked ? 'secondary' : 'saffron'}
                            disabled={isLocked}
                            className="h-8 px-2.5 rounded-lg text-xs font-heading font-bold transition-all"
                            title={!isLocked ? 'Register Entry' : lockReason}
                            onClick={() => !isLocked && onOpenRegistrationModal(item)}
                          >
                            {isLocked ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1" />
                                Locked
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Register
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {isLocked && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-medium font-sans border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                            title={lockReason}
                          >
                            {lockReason}
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* YouTube Submission Modal with live URL validation & embed preview */}
      <Modal
        isOpen={Boolean(submissionModalTarget)}
        onClose={() => setSubmissionModalTarget(null)}
        title={`Submit YouTube Link: ${submissionModalTarget?.item.item_code || ''} - ${submissionModalTarget?.item.name_eng || submissionModalTarget?.item.name || ''}`}
        description="Provide a public or unlisted YouTube video link for this pre-fest submission."
        maxWidth="lg"
      >
        {submissionModalTarget && (
          <form onSubmit={handleSaveYouTubeLink} className="space-y-4 font-sans">
            {/* Guidelines banner */}
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-heading font-bold flex items-center gap-1.5">
                <YouTubeIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>YouTube Submission Guidelines</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Ensure the video privacy is set to <strong>Public</strong> or <strong>Unlisted</strong> (not Private).</li>
                <li>Link formats supported: <code>youtube.com/watch?v=...</code>, <code>youtu.be/...</code>, or <code>youtube.com/shorts/...</code></li>
                <li>The preview below must load your video before clicking Submit.</li>
              </ul>
            </div>

            {/* Enrolled participants list */}
            <div className="text-xs bg-[var(--bg-subtle)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <span className="font-heading font-semibold text-[var(--text-secondary)]">Assigned Roster: </span>
              <span className="text-[var(--text-primary)] font-medium">
                {submissionModalTarget.rosterParticipants.length > 0
                  ? submissionModalTarget.rosterParticipants.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p) !== '—' ? `#${getCanonicalChestNo(p)}` : `CIC:${p.admission_no || p.cic_no || 'N/A'}`})`).join(', ')
                  : 'College Team / Participants'}
              </span>
            </div>

            {/* YouTube URL input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                {YOUTUBE_UI.FIELD_LABEL} <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder={YOUTUBE_UI.PLACEHOLDER}
                value={youtubeInputUrl}
                onChange={e => setYoutubeInputUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Live YouTube embed preview */}
            {youtubeInputUrl.trim() && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading font-semibold text-[var(--text-secondary)]">Video Preview:</span>
                  {isValidYouTubeUrl(youtubeInputUrl) ? (
                    <Badge variant="success" size="sm" className="text-[10px]">Valid Link</Badge>
                  ) : (
                    <Badge variant="destructive" size="sm" className="text-[10px]">Invalid YouTube URL</Badge>
                  )}
                </div>

                {isValidYouTubeUrl(youtubeInputUrl) && getYouTubeEmbedUrl(youtubeInputUrl) ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-black shadow-inner">
                    <iframe
                      src={getYouTubeEmbedUrl(youtubeInputUrl)!}
                      title="YouTube video preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                    Enter a valid YouTube URL to see the live video preview.
                  </div>
                )}
              </div>
            )}

            {/* Expired Link Submission Warning */}
            {!linkScheduleStatus.canSubmitLink && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Link submission deadline has passed. New submissions and URL edits are currently locked.</span>
              </div>
            )}

            {submitError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubmissionModalTarget(null)}
                disabled={isSubmittingLink}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="saffron"
                size="sm"
                disabled={isSubmittingLink || !isValidYouTubeUrl(youtubeInputUrl) || !linkScheduleStatus.canSubmitLink}
                className="font-heading font-bold"
              >
                {isSubmittingLink ? 'Saving...' : YOUTUBE_UI.BUTTON_SUBMIT}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Watch Video Modal */}
      <Modal
        isOpen={Boolean(watchModalVideo)}
        onClose={() => setWatchModalVideo(null)}
        title={watchModalVideo ? `${watchModalVideo.itemCode} - ${watchModalVideo.itemName}` : 'Watch Video'}
        description="Submitted YouTube Video Entry"
        maxWidth="2xl"
      >
        {watchModalVideo && getYouTubeEmbedUrl(watchModalVideo.url) && (
          <div className="space-y-3 font-sans">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-black shadow-lg">
              <iframe
                src={getYouTubeEmbedUrl(watchModalVideo.url)!}
                title="Submitted YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <a
                href={watchModalVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in YouTube</span>
              </a>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setWatchModalVideo(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
