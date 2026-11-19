'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Badge } from '../ui/badge';
import {
  Radio,
  ClipboardPen,
  Globe,
  FileCheck2,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Layers,
  Users,
  RotateCcw,
} from 'lucide-react';
import {
  Item,
  StageStatus,
  isScreeningEvent,
  isSubmissionEvent,
  isNonTabulationEvent,
  isSpecialGroupEvent,
  getEffectiveStageMode,
  normalizeCategoryKey,
} from '@/lib/types/fest';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { TilePattern } from '@/components/fest/FestPattern';
import { EventStatusTab } from '../result-entry/tabs/EventStatusTab';
import { ScoreEntryTab, ScoreEntryRow } from '../result-entry/tabs/ScoreEntryTab';
import { ResultPublishingTab } from '../result-entry/tabs/ResultPublishingTab';
import { ResultVerificationTab } from '../result-entry/tabs/ResultVerificationTab';

export type ResultEntryTab = 'event-status' | 'score-entry' | 'result-publishing' | 'result-verification';
export type ResultEntryTabType = ResultEntryTab;

interface ResultEntryViewProps {
  activeTab?: ResultEntryTabType;
  onTabChange?: (tab: ResultEntryTabType) => void;
}

export function ResultEntryView({ activeTab = 'event-status', onTabChange }: ResultEntryViewProps) {
  const { refreshKey, triggerRefresh } = useFest();

  // Core fest data
  const items = useMemo(() => festService.getItems(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);
  const stages = useMemo(() => festService.getStages(), [refreshKey]);
  const allRegistrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const allCodeLetters = useMemo(() => festService.getCodeLetters(), [refreshKey]);
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const allResults = useMemo(() => festService.getResults(), [refreshKey]);
  const aggregatedResults = useMemo(() => festService.getAggregatedEventResults(), [refreshKey, allResults]);

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedPhase !== 'all' ||
    selectedMode !== 'all' ||
    selectedType !== 'all' ||
    selectedStatus !== 'all'
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedPhase('all');
    setSelectedMode('all');
    setSelectedType('all');
    setSelectedStatus('all');
  };

  // State: Score Entry Console
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [scoreRows, setScoreRows] = useState<ScoreEntryRow[]>([]);
  const [isLoadingEventData, setIsLoadingEventData] = useState(false);
  const [isSubmittingScores, setIsSubmittingScores] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showTemporaryMessage = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Distinct canonical phases for filtering
  const distinctPhases = useMemo(() => {
    const defaultPhases = ['Foundation', 'Thamheediyya', 'Aliya', 'PG', 'General', 'Special', 'Special - Foundation'];
    const set = new Set<string>(defaultPhases);
    items.forEach(i => {
      const p = i.phase || i.category;
      if (p && !['A', 'B', 'C', 'D'].includes(p.trim().toUpperCase())) {
        set.add(p);
      }
    });
    return Array.from(set);
  }, [items]);

  // Master multi-criteria filter helper
  const matchesItemFilters = (
    item: Item | undefined,
    query: string,
    phase: string,
    mode: string,
    type: string,
    statusFilter: string,
    isScored?: boolean,
    isPublished?: boolean
  ) => {
    if (!item) return false;

    // 1. Search Query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const code = (item.item_code || item.code || '').toLowerCase();
      const eng = (item.name_eng || item.name || '').toLowerCase();
      const mal = (item.name_mal || '').toLowerCase();
      if (!code.includes(q) && !eng.includes(q) && !mal.includes(q)) {
        return false;
      }
    }

    // 2. Phase Filter
    if (phase !== 'all') {
      const itemPhase = item.phase || item.category || 'General';
      if (normalizeCategoryKey(itemPhase) !== normalizeCategoryKey(phase)) {
        return false;
      }
    }

    // 3. Event Mode Filter (onstage, offstage, screening, submission)
    if (mode !== 'all') {
      if (mode === 'screening' && !isScreeningEvent(item)) return false;
      if (mode === 'submission' && !isSubmissionEvent(item)) return false;
      if (mode === 'onstage' && getEffectiveStageMode(item) !== 'onstage') return false;
      if (mode === 'offstage' && getEffectiveStageMode(item) !== 'offstage') return false;
    }

    // 4. Participation Type Filter (single vs group)
    if (type !== 'all') {
      const isGroup = item.point_type === 'group' || item.item_type === 'Group';
      if (type === 'group' && !isGroup) return false;
      if (type === 'single' && isGroup) return false;
    }

    // 5. Scoring / Publishing Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'published' && !isPublished) return false;
      if (statusFilter === 'scored' && (!isScored || isPublished)) return false;
      if (statusFilter === 'pending' && isScored) return false;
    }

    return true;
  };

  // Initial live sync for results and points matrix
  useEffect(() => {
    festService.fetchResults();
    festService.fetchPointsMatrix();
  }, [refreshKey]);

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format time helper
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // -------------------------------------------------------------
  // TAB 1: EVENT STATUS DATA
  // -------------------------------------------------------------
  const filteredEventStatusList = useMemo(() => {
    return items
      .map(item => {
        const sch = schedules.find(s => Number(s.item_id) === Number(item.item_id));
        const stage = stages.find(st => Number(st.stage_number) === Number(sch?.stage_number));
        const eventResults = allResults.filter(r => Number(r.item_id) === Number(item.item_id));
        const isScored = eventResults.length > 0;
        const isPublished = eventResults.some(r => Boolean(r.published));
        return {
          item,
          schedule: sch,
          stage,
          status: sch?.status || 'Upcoming',
          isScored,
          isPublished,
        };
      })
      .filter(({ item, isScored, isPublished }) =>
        matchesItemFilters(item, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus, isScored, isPublished)
      )
      .sort((a, b) => {
        const codeA = a.item.item_code || a.item.code || '';
        const codeB = b.item.item_code || b.item.code || '';
        return codeA.localeCompare(codeB);
      });
  }, [items, schedules, stages, allResults, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus]);

  const handleUpdateEventStatus = async (itemId: number, newStatus: StageStatus) => {
    try {
      await festService.updateScheduleStatus(itemId, newStatus);
      showTemporaryMessage(`Event status updated to "${newStatus.replace(/_/g, ' ')}"`);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // -------------------------------------------------------------
  // TAB 2: SCORE ENTRY DATA
  // -------------------------------------------------------------
  const filteredScoreEntryItems = useMemo(() => {
    return items
      .map(item => {
        const sch = schedules.find(s => Number(s.item_id) === Number(item.item_id));
        const regs = allRegistrations.filter(
          r => Number(r.item_id) === Number(item.item_id) &&
            (!isScreeningEvent(item) || r.screening_status === 'qualified')
        );
        const codes = allCodeLetters.filter(c => Number(c.item_id) === Number(item.item_id));
        const eventResults = allResults.filter(r => Number(r.item_id) === Number(item.item_id));
        const isScored = eventResults.length > 0;
        const isPublished = eventResults.some(r => Boolean(r.published));

        return {
          item,
          schedule: sch,
          registrationsCount: regs.length,
          codesCount: codes.length,
          isScored,
          isPublished,
          status: sch?.status || 'Upcoming',
        };
      })
      .filter(({ item, isScored, isPublished }) =>
        matchesItemFilters(item, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus, isScored, isPublished)
      )
      .sort((a, b) => (a.item.item_code || '').localeCompare(b.item.item_code || ''));
  }, [items, schedules, allRegistrations, allCodeLetters, allResults, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus]);

  const selectedScoringItem = items.find(i => Number(i.item_id) === Number(selectedEventId));
  const isSelectedEventPublished = useMemo(() => {
    if (!selectedEventId) return false;
    return allResults.some(r => Number(r.item_id) === Number(selectedEventId) && Boolean(r.published));
  }, [selectedEventId, allResults]);

  // When an event is selected, fetch participants, code letters, and existing results
  useEffect(() => {
    if (!selectedEventId) return;
    let isCancelled = false;
    setIsLoadingEventData(true);

    Promise.all([
      festService.fetchEventParticipantsData(selectedEventId),
      festService.fetchResults(selectedEventId),
      festService.fetchPointsMatrix(),
    ]).then(([participantsData, fetchedResults]) => {
      if (isCancelled) return;

      const isOffStage = selectedScoringItem ? getEffectiveStageMode(selectedScoringItem) === 'offstage' : false;
      const codeLetters = festService.getCodeLetters(selectedEventId);
      const existingResults = (fetchedResults || []).filter(r => Number(r.item_id) === Number(selectedEventId));

      let initialRows: ScoreEntryRow[] = [];

      if (!isOffStage && codeLetters.length > 0) {
        // ON-STAGE: Build rows for each assigned blind code letter
        const distinctLetters = Array.from(
          new Set(codeLetters.map(cl => (cl.code_letter || '').trim().toUpperCase()).filter(Boolean))
        ).sort();

        initialRows = distinctLetters.map(letter => {
          const existing = existingResults.find(r => (r.code_letter || '').trim().toUpperCase() === letter);
          const matchingCode = codeLetters.find(c => (c.code_letter || '').trim().toUpperCase() === letter);
          const cleanChest = existing?.chest_no || matchingCode?.chest_no || undefined;
          const stu = cleanChest ? findStudentByIdentifier(students, cleanChest) : undefined;
          const col = matchingCode?.college_affl_no ? colleges.find(c => Number(c.affl_no) === Number(matchingCode.college_affl_no)) : undefined;

          const marks = existing?.mark_percentage !== null && existing?.mark_percentage !== undefined ? Number(existing.mark_percentage) : 0;
          const grade = existing?.grade || 'None';
          const rank = existing?.rank ? Number(existing.rank) : null;
          const pts = isNonTabulationEvent(selectedScoringItem)
            ? 0
            : existing?.points !== null && existing?.points !== undefined
              ? Number(existing.points)
              : festService.calculatePoints(selectedScoringItem?.phase, selectedScoringItem?.category, grade, rank, selectedScoringItem?.tabulation);

          return {
            code_letter: letter,
            chest_no: cleanChest,
            college_affl_no: matchingCode?.college_affl_no || existing?.college_affl_no || undefined,
            studentName: stu?.full_name || stu?.name,
            collegeName: col?.name,
            collegeCode: col?.short_name || col?.code,
            mark_percentage: marks,
            grade,
            rank,
            points: pts,
          };
        });
      } else {
        // OFF-STAGE: Build rows directly from registered participants / chest numbers
        const regs = (participantsData?.registrations || allRegistrations).filter(
          r => Number(r.item_id) === Number(selectedEventId) &&
            (!isScreeningEvent(selectedScoringItem) || r.screening_status === 'qualified')
        );

        // Deduplicate by chest_no (or college_affl_no for special group items)
        const seen = new Set<string>();
        const uniqueRegs = regs.filter(r => {
          const key = (r.chest_no || '').trim().toUpperCase() || `col-${r.college_affl_no}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Sort unique registrations by numeric or string chest number
        uniqueRegs.sort((a, b) => {
          const chestA = parseInt((a.chest_no || '').replace(/\D/g, ''), 10);
          const chestB = parseInt((b.chest_no || '').replace(/\D/g, ''), 10);
          if (!isNaN(chestA) && !isNaN(chestB)) return chestA - chestB;
          return (a.chest_no || '').localeCompare(b.chest_no || '');
        });

        initialRows = uniqueRegs.map(reg => {
          const cleanChest = (reg.chest_no || '').trim().toUpperCase();
          const existing = existingResults.find(r =>
            (cleanChest && (r.chest_no || '').trim().toUpperCase() === cleanChest) ||
            (Number(r.college_affl_no) === Number(reg.college_affl_no) && isSpecialGroupEvent(selectedScoringItem))
          );
          const stu = reg.student || (cleanChest ? findStudentByIdentifier(students, cleanChest, reg.college_affl_no) : undefined);
          const col = reg.college || colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));

          const marks = existing?.mark_percentage !== null && existing?.mark_percentage !== undefined ? Number(existing.mark_percentage) : 0;
          const grade = existing?.grade || 'None';
          const rank = existing?.rank ? Number(existing.rank) : null;
          const pts = isNonTabulationEvent(selectedScoringItem)
            ? 0
            : existing?.points !== null && existing?.points !== undefined
              ? Number(existing.points)
              : festService.calculatePoints(selectedScoringItem?.phase, selectedScoringItem?.category, grade, rank, selectedScoringItem?.tabulation);

          return {
            code_letter: existing?.code_letter || '',
            chest_no: cleanChest || undefined,
            college_affl_no: Number(reg.college_affl_no),
            studentName: stu?.full_name || stu?.name || (isSpecialGroupEvent(selectedScoringItem) ? col?.name : undefined),
            collegeName: col?.name,
            collegeCode: col?.short_name || col?.code,
            mark_percentage: marks,
            grade,
            rank,
            points: pts,
          };
        });
      }

      setScoreRows(initialRows);
      setIsLoadingEventData(false);
    }).catch(err => {
      console.error(err);
      if (!isCancelled) setIsLoadingEventData(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedEventId]);

  // Handle score row edits with live automatic points calculation
  const handleScoreRowChange = (
    index: number,
    field: 'mark_percentage' | 'grade' | 'rank',
    value: any
  ) => {
    setScoreRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'mark_percentage') {
        const num = Math.min(100, Math.max(0, parseFloat(value) || 0));
        target.mark_percentage = num;
        if (!target.grade || target.grade === 'Auto' || target.grade === 'None') {
          if (num > 0) {
            target.grade = num >= 90 ? 'A+' : num >= 80 ? 'A' : num >= 70 ? 'B' : 'C';
          }
        }
      } else if (field === 'grade') {
        target.grade = value;
      } else if (field === 'rank') {
        target.rank = value === '' || value === 'none' ? null : Number(value);
      }

      target.points = festService.calculatePoints(
        selectedScoringItem?.phase,
        selectedScoringItem?.category,
        target.grade,
        target.rank,
        selectedScoringItem?.tabulation
      );

      updated[index] = target;
      return updated;
    });
  };

  const handleSaveScores = async () => {
    if (!selectedEventId) return;
    if (scoreRows.length === 0) {
      alert('No participants or code letters available to score.');
      return;
    }

    setIsSubmittingScores(true);
    try {
      const res = await festService.submitResultEntry(selectedEventId, scoreRows, false);
      if (res.success) {
        showTemporaryMessage('Scores successfully saved as draft! Go to the Result Publishing tab to publish.');
        setSelectedEventId(null);
        triggerRefresh();
      } else {
        alert(res.error || 'Failed to save scores');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving scores');
    } finally {
      setIsSubmittingScores(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: RESULT PUBLISHING DATA
  // -------------------------------------------------------------
  const filteredPublishingList = useMemo(() => {
    return aggregatedResults.filter(agg => {
      const isScored = agg.results.length > 0;
      const isPublished = agg.is_published;
      return matchesItemFilters(agg.item, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus, isScored, isPublished);
    });
  }, [aggregatedResults, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus]);

  const handleTogglePublish = async (itemId: number, currentPublishedState: boolean) => {
    try {
      const newState = !currentPublishedState;
      const success = await festService.publishResult(itemId, newState);
      if (success) {
        showTemporaryMessage(
          newState
            ? 'Results successfully published to the official public board!'
            : 'Results successfully unpublished to draft mode.'
        );
        triggerRefresh();
      } else {
        alert('Failed to update result publication state.');
      }
    } catch (err: any) {
      alert(err.message || 'Error publishing result');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: RESULT VERIFICATION DATA
  // -------------------------------------------------------------
  const filteredVerificationList = useMemo(() => {
    return aggregatedResults
      .filter(agg => {
        const isScored = agg.results.length > 0;
        const isPublished = agg.is_published;
        return matchesItemFilters(agg.item, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus, isScored, isPublished);
      })
      .map(agg => {
        const enrichedParticipants = agg.results.map(res => {
          const col = colleges.find(c => Number(c.affl_no) === Number(res.college_affl_no));
          const isInstitutional = (res.chest_no && res.chest_no.startsWith('COL-')) || isSpecialGroupEvent(agg.item);
          const stu = !isInstitutional ? findStudentByIdentifier(students, res.chest_no, res.college_affl_no || undefined) : undefined;

          const stuChest = stu ? getCanonicalChestNo(stu) : '';
          return {
            ...res,
            studentName: isInstitutional
              ? `${col?.name || `College #${res.college_affl_no}`} (Institutional Entry)`
              : (stu?.full_name || stu?.name || `Candidate (${res.chest_no || res.code_letter})`),
            collegeName: col?.name || `College #${res.college_affl_no || 'N/A'}`,
            collegeCode: col?.code || col?.short_name || `#${res.college_affl_no || ''}`,
            displayChestNo: (stuChest && stuChest !== '—') ? stuChest : (res.chest_no || '—'),
          };
        });

        const totalPoints = agg.results.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

        return {
          ...agg,
          enrichedParticipants,
          totalPoints,
        };
      });
  }, [aggregatedResults, colleges, students, searchQuery, selectedPhase, selectedMode, selectedType, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Toast Alert Message */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-emerald-500/40 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold [box-shadow:var(--shadow-elevated),var(--glass-highlight)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Global Search & Multi-Filter Header */}
      {(!selectedEventId || activeTab !== 'score-entry') && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 [box-shadow:var(--shadow-card),var(--glass-highlight)] space-y-4">
          <TilePattern id="result-entry-hero-pattern" className="opacity-10 text-[var(--f-saffron)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold text-lg shrink-0">
                {activeTab === 'event-status' && <Radio className="w-6 h-6 text-emerald-500" />}
                {activeTab === 'score-entry' && <ClipboardPen className="w-6 h-6 text-[var(--f-saffron-text)]" />}
                {activeTab === 'result-publishing' && <Globe className="w-6 h-6 text-sky-500" />}
                {activeTab === 'result-verification' && <FileCheck2 className="w-6 h-6 text-indigo-500" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono tracking-widest text-[var(--f-saffron-text)] font-bold">
                    RESULT ENTRY DIVISION
                  </span>
                  <Badge variant="saffron" size="sm">
                    {activeTab === 'event-status' && 'LIVE TIMETABLE'}
                    {activeTab === 'score-entry' && 'SCORING CONSOLE'}
                    {activeTab === 'result-publishing' && 'OFFICIAL RELEASE'}
                    {activeTab === 'result-verification' && 'AUDIT & VERIFICATION'}
                  </Badge>
                </div>
                <h2 className="text-xl font-heading font-black text-[var(--text-primary)] tracking-tight mt-0.5">
                  {activeTab === 'event-status' && 'Event Status Management'}
                  {activeTab === 'score-entry' && 'Score Entry Console'}
                  {activeTab === 'result-publishing' && 'Result Publishing Registry'}
                  {activeTab === 'result-verification' && 'Result Verification & Standings'}
                </h2>
              </div>
            </div>

            {/* Quick Refresh Button */}
            <button
              onClick={() => {
                festService.fetchResults();
                festService.fetchPointsMatrix();
                triggerRefresh();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] hover:border-amber-500/40 transition-colors cursor-pointer self-start md:self-auto focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Fest Data</span>
            </button>
          </div>

          {/* Multi-Criteria Filters Bar */}
          <div className="relative z-10 space-y-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Search Query */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search code or title..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>

              {/* 2. Phase Filter */}
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <select
                  value={selectedPhase}
                  onChange={e => setSelectedPhase(e.target.value)}
                  aria-label="Filter by Phase"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
                >
                  <option value="all">All Phases</option>
                  {distinctPhases.map(phase => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Event Mode Filter (On-Stage / Off-Stage / Submission / Screening) */}
              <div className="relative">
                <Radio className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <select
                  value={selectedMode}
                  onChange={e => setSelectedMode(e.target.value)}
                  aria-label="Filter by Stage Mode"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
                >
                  <option value="all">All Event Modes</option>
                  <option value="onstage">On-Stage (Live)</option>
                  <option value="offstage">Off-Stage (Hall/Direct)</option>
                  <option value="screening">Pre-Fest Screening</option>
                  <option value="submission">Digital Submission</option>
                </select>
              </div>

              {/* 4. Participation Type Filter (Single vs Group) */}
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  aria-label="Filter by Participation Type"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
                >
                  <option value="all">All Types (Single / Group)</option>
                  <option value="single">Single / Individual</option>
                  <option value="group">Group Events</option>
                </select>
              </div>

              {/* 5. Scoring / Publishing Status Filter */}
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  aria-label="Filter by Scoring Status"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
                >
                  <option value="all">All Scoring Status</option>
                  <option value="pending">Pending Scoring</option>
                  <option value="scored">Scored (Draft)</option>
                  <option value="published">Official Published</option>
                </select>
              </div>
            </div>

            {/* Active Filters Pill Bar & Reset button */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Active filters:</span>
                  {selectedPhase !== 'all' && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1">
                      <span>Phase: {selectedPhase}</span>
                      <button onClick={() => setSelectedPhase('all')} className="hover:text-red-500 cursor-pointer">×</button>
                    </Badge>
                  )}
                  {selectedMode !== 'all' && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1">
                      <span>Mode: {selectedMode}</span>
                      <button onClick={() => setSelectedMode('all')} className="hover:text-red-500 cursor-pointer">×</button>
                    </Badge>
                  )}
                  {selectedType !== 'all' && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1">
                      <span>Type: {selectedType}</span>
                      <button onClick={() => setSelectedType('all')} className="hover:text-red-500 cursor-pointer">×</button>
                    </Badge>
                  )}
                  {selectedStatus !== 'all' && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1">
                      <span>Status: {selectedStatus}</span>
                      <button onClick={() => setSelectedStatus('all')} className="hover:text-red-500 cursor-pointer">×</button>
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] gap-1">
                      <span>Query: "{searchQuery}"</span>
                      <button onClick={() => setSearchQuery('')} className="hover:text-red-500 cursor-pointer">×</button>
                    </Badge>
                  )}
                </div>

                <button
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--f-saffron-text)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Renderers */}
      {activeTab === 'event-status' && (
        <EventStatusTab
          events={filteredEventStatusList}
          onUpdateStatus={handleUpdateEventStatus}
          formatDate={formatDate}
          formatTime={formatTime}
        />
      )}

      {activeTab === 'score-entry' && (
        <ScoreEntryTab
          items={filteredScoreEntryItems}
          selectedEventId={selectedEventId}
          selectedScoringItem={selectedScoringItem}
          isSelectedEventPublished={isSelectedEventPublished}
          scoreRows={scoreRows}
          isLoadingEventData={isLoadingEventData}
          isSubmittingScores={isSubmittingScores}
          onSelectEvent={setSelectedEventId}
          onScoreRowChange={handleScoreRowChange}
          onSaveScores={handleSaveScores}
        />
      )}

      {activeTab === 'result-publishing' && (
        <ResultPublishingTab
          aggregatedResults={filteredPublishingList}
          onTogglePublish={handleTogglePublish}
        />
      )}

      {activeTab === 'result-verification' && (
        <ResultVerificationTab
          verificationList={filteredVerificationList}
        />
      )}
    </div>
  );
}
