'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Radio,
  ClipboardPen,
  Globe,
  FileCheck2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  Send,
  Lock,
  Trophy,
  Sparkles,
  Loader2,
  Building2,
  UserCheck,
  RefreshCw,
  Award,
  ChevronDown
} from 'lucide-react';
import { Item, StageStatus, Result, Registration } from '@/lib/types/fest';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';

export type ResultEntryTab = 'event-status' | 'score-entry' | 'result-publishing' | 'result-verification';

interface ScoreEntryRow {
  code_letter: string;
  chest_no?: string;
  college_affl_no?: number;
  mark_percentage: number;
  grade: string;
  rank: number | null;
  points: number;
}

interface ResultEntryViewProps {
  activeTab?: ResultEntryTab;
  onTabChange?: (tab: ResultEntryTab) => void;
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
  // TAB 1: EVENT STATUS LOGIC
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
          status: sch?.status || 'Upcoming'
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
  // TAB 2: SCORE ENTRY LOGIC
  // -------------------------------------------------------------
  const filteredScoreEntryItems = useMemo(() => {
    return items
      .map(item => {
        const sch = schedules.find(s => Number(s.item_id) === Number(item.item_id));
        const regs = allRegistrations.filter(r => Number(r.item_id) === Number(item.item_id));
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
          status: sch?.status || 'Upcoming'
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
  const selectedScoringSchedule = schedules.find(s => Number(s.item_id) === Number(selectedEventId));
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
      festService.fetchPointsMatrix()
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
        const pts = existing?.points !== null && existing?.points !== undefined
          ? Number(existing.points)
          : festService.calculatePoints(selectedScoringItem?.phase, selectedScoringItem?.category, grade, rank);

        return {
          code_letter: letter,
          chest_no: existing?.chest_no || matchingCode?.chest_no,
          college_affl_no: existing?.college_affl_no || matchingCode?.college_affl_no,
          mark_percentage: marks,
          grade,
          rank,
          points: pts
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
        // Auto assign grade if default
        if (!target.grade || target.grade === 'Auto') {
          target.grade = num >= 90 ? 'A+' : num >= 80 ? 'A' : num >= 70 ? 'B' : 'C';
        }
      } else if (field === 'grade') {
        target.grade = value;
      } else if (field === 'rank') {
        target.rank = value === '' || value === 'none' ? null : Number(value);
      }

      // Auto calculate points matching points_matrix (phase, category, grade, rank, points)
      target.points = festService.calculatePoints(
        selectedScoringItem?.phase,
        selectedScoringItem?.category,
        target.grade,
        target.rank
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
  // TAB 3: RESULT PUBLISHING LOGIC
  // -------------------------------------------------------------
  // Show ONLY available results, with exactly 1 row per event (no repeated data)
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
  // TAB 4: RESULT VERIFICATION LOGIC
  // -------------------------------------------------------------
  // Filter items that have results updated, and resolve full student and college info
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
        // Enrich participant details
        const enrichedParticipants = agg.results.map(res => {
          const col = colleges.find(c => Number(c.affl_no) === Number(res.college_affl_no));
          const stu = findStudentByIdentifier(students, res.chest_no, res.college_affl_no || undefined);

          return {
            ...res,
            studentName: stu?.full_name || stu?.name || `Candidate (${res.chest_no || res.code_letter})`,
            collegeName: col?.name || `College #${res.college_affl_no || 'N/A'}`,
            collegeCode: col?.code || col?.short_name || `#${res.college_affl_no || ''}`,
            displayChestNo: stu ? getCanonicalChestNo(stu) : (res.chest_no || '—')
          };
        });

        const totalPoints = agg.results.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

        return {
          ...agg,
          enrichedParticipants,
          totalPoints
        };
      });
  }, [aggregatedResults, colleges, students, searchQuery, selectedPhase]);

  return (
    <div className="space-y-6">
      {/* Toast Alert Message */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{actionSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Global Search & Phase Filter Header */}
      {(!selectedEventId || activeTab !== 'score-entry') && (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-lg shadow-sm border border-slate-700/30">
                {activeTab === 'event-status' && <Radio className="w-6 h-6 text-emerald-400" />}
                {activeTab === 'score-entry' && <ClipboardPen className="w-6 h-6 text-amber-400" />}
                {activeTab === 'result-publishing' && <Globe className="w-6 h-6 text-sky-400" />}
                {activeTab === 'result-verification' && <FileCheck2 className="w-6 h-6 text-indigo-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                    RESULT ENTRY DIVISION
                  </span>
                  <Badge variant="navy" size="sm">
                    {activeTab === 'event-status' && 'LIVE TIMETABLE'}
                    {activeTab === 'score-entry' && 'BLIND SCORING'}
                    {activeTab === 'result-publishing' && 'OFFICIAL RELEASE'}
                    {activeTab === 'result-verification' && 'AUDIT & VERIFICATION'}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
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
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-600 bg-[var(--bg-subtle)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sync Live Database</span>
            </button>
          </div>

          {/* Search bar and Category filter controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Item Code or Event Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <select
                value={selectedPhase}
                onChange={e => setSelectedPhase(e.target.value)}
                className="w-full sm:w-44 text-xs font-semibold rounded-xl px-3 py-2.5 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">All Phases / Categories</option>
                {distinctPhases.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. EVENT STATUS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'event-status' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                Events Status Timetable
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect schedule and update live event status. Only the status dropdown is editable.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Showing {filteredEventStatusList.length} Events
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Phase / Category</TableHead>
                  <TableHead>Stage Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Start - End</TableHead>
                  <TableHead className="w-44">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEventStatusList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                      No events match the search or filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEventStatusList.map(({ item, schedule, stage, status }, idx) => (
                    <TableRow key={item.id} className="hover:bg-[var(--bg-hover)]">
                      <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {item.item_code || item.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {item.name_eng || item.name}
                        </div>
                        {item.name_mal && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {item.name_mal}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={item.phase || item.category || 'General'} />
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)]">
                        {stage?.name || (schedule?.stage_number ? `Stage ${schedule.stage_number}` : 'TBD')}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                        {formatDate(schedule?.starting)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {formatTime(schedule?.starting)} - {formatTime(schedule?.ending)}
                      </TableCell>
                      <TableCell>
                        <select
                          value={status}
                          onChange={e => handleUpdateEventStatus(Number(item.item_id), e.target.value as StageStatus)}
                          className="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-emerald-400/60 dark:border-emerald-700 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Starting_Soon">Starting Soon</option>
                          <option value="Next_Item">Next Item</option>
                          <option value="On_Going">On Going (Live)</option>
                          <option value="Ended">Ended</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SCORE ENTRY TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'score-entry' && (
        <div>
          {/* Subview 2A: Event Selection List */}
          {!selectedEventId && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardPen className="w-4 h-4 text-amber-500" />
                    Select Event to Enter Scores
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose an event to view registered blind code letters and input participant scores, grades, and ranks.
                  </CardDescription>
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {filteredScoreEntryItems.length} Events Available
                </span>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Phase / Category</TableHead>
                      <TableHead>Stage Status</TableHead>
                      <TableHead className="text-center">Code Letters</TableHead>
                      <TableHead className="text-center">Scoring Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScoreEntryItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                          No events match the search query.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredScoreEntryItems.map(({ item, schedule, codesCount, registrationsCount, isScored, isPublished, status }, idx) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                          onClick={() => setSelectedEventId(Number(item.item_id))}
                        >
                          <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {item.item_code || item.code}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {item.name_eng || item.name}
                            </div>
                            {item.name_mal && (
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                {item.name_mal}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={item.phase || item.category || 'General'} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm" className="font-semibold text-xs">
                              {status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              {codesCount} / {registrationsCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isPublished ? (
                              <Badge variant="navy" size="sm" className="font-semibold">
                                Published
                              </Badge>
                            ) : isScored ? (
                              <Badge variant="success" size="sm" className="font-semibold">
                                Scored
                              </Badge>
                            ) : (
                              <Badge variant="amber" size="sm" className="font-semibold">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => setSelectedEventId(Number(item.item_id))}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-2xs gap-1.5"
                            >
                              <span>{isScored ? 'Edit Scores' : 'Enter Scores'} →</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Subview 2B: Scoring Console for Selected Event */}
          {selectedEventId && selectedScoringItem && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Back navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-500 bg-[var(--bg-surface)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Events List</span>
                </button>

                <div className="flex items-center gap-2">
                  {isSelectedEventPublished && (
                    <Badge variant="destructive" className="gap-1.5 px-3 py-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Results Published (Locked)</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Event Header Banner */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xl shadow-sm border border-slate-700/30 shrink-0">
                      <ClipboardPen className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg">
                          {selectedScoringItem.item_code || selectedScoringItem.code}
                        </span>
                        <CategoryBadge category={selectedScoringItem.phase || selectedScoringItem.category} />
                        <Badge variant={selectedScoringItem.point_type === 'group' ? 'purple' : 'secondary'}>
                          {selectedScoringItem.point_type === 'group' ? 'Group Event' : 'Single Event'}
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-1.5">
                        {selectedScoringItem.name_eng || selectedScoringItem.name}
                      </h2>
                      {selectedScoringItem.name_mal && (
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {selectedScoringItem.name_mal}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Blind Letters Count</span>
                      <span className="text-base font-mono font-bold text-[var(--text-primary)]">
                        {scoreRows.length} Registered
                      </span>
                    </div>
                    <div className="h-8 w-px bg-[var(--border-subtle)]" />
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Points Matrix</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Auto Calculated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scoring Table */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Blind Code Score Tabulation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter marks percentage (0-100), select Grade and Rank. Championship points are automatically computed matching the points_matrix.
                    </CardDescription>
                  </div>

                  {!isSelectedEventPublished && (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isSubmittingScores || scoreRows.length === 0}
                      onClick={handleSaveScores}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm gap-2"
                    >
                      {isSubmittingScores ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Save & Record Scores</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  {isLoadingEventData ? (
                    <div className="py-16 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                      <p className="text-xs text-[var(--text-muted)]">
                        Loading registered blind code letters and existing score records...
                      </p>
                    </div>
                  ) : scoreRows.length === 0 ? (
                    <div className="py-14 text-center space-y-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        No code letters allocated yet for this event.
                      </p>
                      <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                        Please open the Stage Controller console to draw anonymous code letters (A, B, C...) for registered candidates before entering scores.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24 text-center">Blind Code</TableHead>
                          <TableHead className="w-48">Mark Percentage (%)</TableHead>
                          <TableHead className="w-36">Grade</TableHead>
                          <TableHead className="w-40">Rank Position</TableHead>
                          <TableHead className="w-36 text-center">Points (Auto)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scoreRows.map((row, idx) => (
                          <TableRow key={row.code_letter} className="hover:bg-[var(--bg-hover)]">
                            <TableCell className="text-center">
                              <div className="w-10 h-10 rounded-xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-extrabold text-lg mx-auto shadow-sm border border-slate-700/30">
                                {row.code_letter}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.5"
                                  disabled={isSelectedEventPublished}
                                  value={row.mark_percentage}
                                  onChange={e => handleScoreRowChange(idx, 'mark_percentage', e.target.value)}
                                  className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                                <span className="text-xs font-semibold text-[var(--text-muted)]">/ 100</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <select
                                value={row.grade}
                                disabled={isSelectedEventPublished}
                                onChange={e => handleScoreRowChange(idx, 'grade', e.target.value)}
                                className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              >
                                <option value="A+">Grade A+</option>
                                <option value="A">Grade A</option>
                                <option value="B">Grade B</option>
                                <option value="C">Grade C</option>
                                <option value="None">No Grade</option>
                              </select>
                            </TableCell>

                            <TableCell>
                              <select
                                value={row.rank === null ? 'none' : String(row.rank)}
                                disabled={isSelectedEventPublished}
                                onChange={e => handleScoreRowChange(idx, 'rank', e.target.value)}
                                className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              >
                                <option value="none">No Rank</option>
                                <option value="1">🥇 1st Place</option>
                                <option value="2">🥈 2nd Place</option>
                                <option value="3">🥉 3rd Place</option>
                              </select>
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant={row.points > 0 ? 'success' : 'outline'}
                                className="font-mono text-sm font-bold px-3 py-1"
                              >
                                {row.points} Pts
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. RESULT PUBLISHING TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'result-publishing' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                Official Result Publishing Console
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle publication of scored events. Published results immediately reflect on public scoreboards and college dashboards.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {filteredPublishingList.filter(a => a.is_published).length} Published / {filteredPublishingList.length} Scored
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Event Code & Name</TableHead>
                  <TableHead>Category / Phase</TableHead>
                  <TableHead>1st Place (Winner)</TableHead>
                  <TableHead>2nd Place</TableHead>
                  <TableHead>3rd Place</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Publish Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublishingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                      No scored events available yet. Enter scores in the Score Entry tab to make them available for publishing.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPublishingList.map((agg, idx) => {
                    const item = agg.item;
                    const isPub = agg.is_published;

                    return (
                      <TableRow key={agg.item_id} className="hover:bg-[var(--bg-hover)]">
                        <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {item?.item_code || item?.code}
                          </div>
                          <div className="font-semibold text-xs text-[var(--text-primary)] mt-0.5">
                            {item?.name_eng || item?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={item?.phase || item?.category || 'General'} />
                        </TableCell>
                        <TableCell>
                          {agg.first ? (
                            <div>
                              <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                Code [{agg.first.code_letter}]
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] block">
                                Chest: {agg.first.chest_no || 'N/A'} • {agg.first.points} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {agg.second ? (
                            <div>
                              <span className="font-bold text-xs text-[var(--text-primary)]">
                                Code [{agg.second.code_letter}]
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] block">
                                Chest: {agg.second.chest_no || 'N/A'} • {agg.second.points} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {agg.third ? (
                            <div>
                              <span className="font-bold text-xs text-[var(--text-primary)]">
                                Code [{agg.third.code_letter}]
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] block">
                                Chest: {agg.third.chest_no || 'N/A'} • {agg.third.points} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPub ? (
                            <Badge variant="success" size="sm" className="font-bold gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Published</span>
                            </Badge>
                          ) : (
                            <Badge variant="amber" size="sm" className="font-bold">
                              <span>Draft</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="xs"
                            variant={isPub ? 'destructive' : 'primary'}
                            onClick={() => handleTogglePublish(agg.item_id, isPub)}
                            className={`font-semibold shadow-2xs ${
                              isPub
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isPub ? 'Unpublish' : 'Publish Result'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. RESULT VERIFICATION TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'result-verification' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-500" />
                  Result Verification & Audit Standings
                </CardTitle>
                <CardDescription className="text-xs">
                  Review finalized standings with resolved candidate names, college affiliations, and awarded points for each scored event.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {filteredVerificationList.length} Events With Scored Results
              </span>
            </CardHeader>
          </Card>

          {filteredVerificationList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--text-muted)] text-sm">
                No updated results found to verify. Enter scores in the Score Entry tab to audit them here.
              </CardContent>
            </Card>
          ) : (
            filteredVerificationList.map(agg => {
              const item = agg.item;

              return (
                <Card key={agg.item_id} className="overflow-hidden">
                  <div className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {item?.item_code || item?.code}
                          </span>
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {item?.name_eng || item?.name}
                          </span>
                          <CategoryBadge category={item?.phase || item?.category || 'General'} />
                        </div>
                        {item?.name_mal && (
                          <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                            {item.name_mal}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg">
                        Total {agg.totalPoints} Championship Pts
                      </span>
                      {agg.is_published ? (
                        <Badge variant="success" size="sm" className="font-semibold">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm" className="font-semibold">
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">Rank</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>College / Institution</TableHead>
                          <TableHead>Chest No</TableHead>
                          <TableHead className="text-center">Blind Code</TableHead>
                          <TableHead className="text-center">Mark (%)</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-right">Points Got</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agg.enrichedParticipants.map(p => (
                          <TableRow key={p.id || p.code_letter} className="hover:bg-[var(--bg-hover)]">
                            <TableCell className="text-center">
                              {Number(p.rank) === 1 ? (
                                <Badge variant="amber" size="sm" className="font-bold">
                                  🥇 1st
                                </Badge>
                              ) : Number(p.rank) === 2 ? (
                                <Badge variant="outline" size="sm" className="font-bold text-slate-600">
                                  🥈 2nd
                                </Badge>
                              ) : Number(p.rank) === 3 ? (
                                <Badge variant="secondary" size="sm" className="font-bold">
                                  🥉 3rd
                                </Badge>
                              ) : (
                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                  {p.rank ? `Rank ${p.rank}` : '—'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-xs text-[var(--text-primary)]">
                                {p.studentName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-xs text-[var(--text-primary)]">
                                {p.collegeName}
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                {p.collegeCode}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              {p.displayChestNo}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--brand-navy)] text-white font-mono font-extrabold text-xs">
                                {p.code_letter}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs font-semibold text-[var(--text-primary)]">
                              {p.mark_percentage}%
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                {p.grade || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg">
                                {p.points} pts
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
