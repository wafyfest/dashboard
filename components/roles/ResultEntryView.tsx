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
} from 'lucide-react';
import { StageStatus, isScreeningEvent, isNonTabulationEvent } from '@/lib/types/fest';
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

  // Distinct phases for filtering
  const distinctPhases = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.phase) set.add(i.phase);
      else if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

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
        return {
          item,
          schedule: sch,
          stage,
          status: sch?.status || 'Upcoming',
        };
      })
      .filter(({ item }) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !query ||
          (item.item_code || item.code || '').toLowerCase().includes(query) ||
          (item.name_eng || item.name || '').toLowerCase().includes(query) ||
          (item.name_mal || '').toLowerCase().includes(query);

        const itemPhase = item.phase || item.category || 'General';
        const matchesPhase = selectedPhase === 'all' || itemPhase.toLowerCase() === selectedPhase.toLowerCase();

        return matchesQuery && matchesPhase;
      })
      .sort((a, b) => {
        const codeA = a.item.item_code || a.item.code || '';
        const codeB = b.item.item_code || b.item.code || '';
        return codeA.localeCompare(codeB);
      });
  }, [items, schedules, stages, searchQuery, selectedPhase]);

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
      .filter(({ item }) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !query ||
          (item.item_code || item.code || '').toLowerCase().includes(query) ||
          (item.name_eng || item.name || '').toLowerCase().includes(query);

        const itemPhase = item.phase || item.category || 'General';
        const matchesPhase = selectedPhase === 'all' || itemPhase.toLowerCase() === selectedPhase.toLowerCase();

        return matchesQuery && matchesPhase;
      })
      .sort((a, b) => (a.item.item_code || '').localeCompare(b.item.item_code || ''));
  }, [items, schedules, allRegistrations, allCodeLetters, allResults, searchQuery, selectedPhase]);

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

      const codeLetters = festService.getCodeLetters(selectedEventId);
      const existingResults = (fetchedResults || []).filter(r => Number(r.item_id) === Number(selectedEventId));

      // Build rows for each assigned code letter
      const distinctLetters = Array.from(
        new Set(codeLetters.map(cl => (cl.code_letter || '').trim().toUpperCase()).filter(Boolean))
      ).sort();

      const initialRows: ScoreEntryRow[] = distinctLetters.map(letter => {
        const existing = existingResults.find(r => (r.code_letter || '').trim().toUpperCase() === letter);
        const matchingCode = codeLetters.find(c => (c.code_letter || '').trim().toUpperCase() === letter);

        const marks = existing?.mark_percentage !== null && existing?.mark_percentage !== undefined ? Number(existing.mark_percentage) : 75;
        const grade = existing?.grade || (marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B' : 'C');
        const rank = existing?.rank ? Number(existing.rank) : null;
        const pts = isNonTabulationEvent(selectedScoringItem)
          ? 0
          : existing?.points !== null && existing?.points !== undefined
            ? Number(existing.points)
            : festService.calculatePoints(selectedScoringItem?.phase, selectedScoringItem?.category, grade, rank, selectedScoringItem?.tabulation);

        return {
          code_letter: letter,
          mark_percentage: marks,
          grade,
          rank,
          points: pts,
        };
      });

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
    if (isSelectedEventPublished) return;

    setScoreRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'mark_percentage') {
        const num = Math.min(100, Math.max(0, parseFloat(value) || 0));
        target.mark_percentage = num;
        if (!target.grade || target.grade === 'Auto') {
          target.grade = num >= 90 ? 'A+' : num >= 80 ? 'A' : num >= 70 ? 'B' : 'C';
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
      alert('No code letters available to score.');
      return;
    }

    setIsSubmittingScores(true);
    try {
      const res = await festService.submitResultEntry(selectedEventId, scoreRows);
      if (res.success) {
        showTemporaryMessage('Scores successfully saved and recorded to the database!');
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
      const query = searchQuery.trim().toLowerCase();
      const item = agg.item;
      const matchesQuery =
        !query ||
        (item?.item_code || item?.code || '').toLowerCase().includes(query) ||
        (item?.name_eng || item?.name || '').toLowerCase().includes(query);

      const itemPhase = item?.phase || item?.category || 'General';
      const matchesPhase = selectedPhase === 'all' || itemPhase.toLowerCase() === selectedPhase.toLowerCase();

      return matchesQuery && matchesPhase;
    });
  }, [aggregatedResults, searchQuery, selectedPhase]);

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
        const query = searchQuery.trim().toLowerCase();
        const item = agg.item;
        const matchesQuery =
          !query ||
          (item?.item_code || item?.code || '').toLowerCase().includes(query) ||
          (item?.name_eng || item?.name || '').toLowerCase().includes(query);

        const itemPhase = item?.phase || item?.category || 'General';
        const matchesPhase = selectedPhase === 'all' || itemPhase.toLowerCase() === selectedPhase.toLowerCase();

        return matchesQuery && matchesPhase;
      })
      .map(agg => {
        const enrichedParticipants = agg.results.map(res => {
          const col = colleges.find(c => Number(c.affl_no) === Number(res.college_affl_no));
          const stu = findStudentByIdentifier(students, res.chest_no, res.college_affl_no || undefined);

            const stuChest = stu ? getCanonicalChestNo(stu) : '';
            return {
              ...res,
              studentName: stu?.full_name || stu?.name || `Candidate (${res.chest_no || res.code_letter})`,
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
  }, [aggregatedResults, colleges, students, searchQuery, selectedPhase]);

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

      {/* Global Search & Phase Filter Header */}
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
                    {activeTab === 'score-entry' && 'BLIND SCORING'}
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

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search event code or title..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <select
                value={selectedPhase}
                onChange={e => setSelectedPhase(e.target.value)}
                aria-label="Filter by Phase / Category"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
              >
                <option value="all">All Phases / Categories</option>
                {distinctPhases.map(phase => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
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
