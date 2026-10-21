'use client';

import React, { useState, useMemo } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ClipboardPen,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trophy,
  ShieldAlert,
  BookOpen,
  FileText,
  Award,
  Search,
  X,
  ArrowUpDown,
  ChevronRight,
  ArrowLeft,
  Users
} from 'lucide-react';
import { Item, Registration, Result, normalizeCategoryKey } from '@/lib/types/fest';

export type ResultEntryTab = 'scoring' | 'published' | 'rubrics';

interface ScoreRow {
  code_letter: string;
  reg_id: string;
  criteria_a: number; // e.g. Technique / Skill (Max 40)
  criteria_b: number; // e.g. Presentation / Expression (Max 40)
  criteria_c: number; // e.g. Stage Presence & Time (Max 20)
  total: number;
}

interface ResultEntryViewProps {
  activeTab?: ResultEntryTab;
  onTabChange?: (tab: ResultEntryTab) => void;
}

export function ResultEntryView({ activeTab: controlledTab, onTabChange }: ResultEntryViewProps = {}) {
  const { triggerRefresh } = useFest();
  const items = festService.getItems();
  const [internalTab, setInternalTab] = useState<ResultEntryTab>('scoring');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: ResultEntryTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [modeFilter, setModeFilter] = useState<'All' | 'onstage' | 'offstage' | 'submission'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  const allRegistrations = festService.getRegistrations();
  const allResults = festService.getResults();

  // Extract distinct canonical categories / phases present across all items
  const phaseCategoryOptions = useMemo(() => {
    const canonical = ['All', 'Foundation', 'Thamheediyya', 'Aliya', 'PG', 'General'];
    const extra: string[] = [];
    items.forEach(i => {
      const p = i.phase || i.category;
      if (p && p.trim()) {
        const norm = normalizeCategoryKey(p.trim());
        const isCovered = canonical.some(c => c !== 'All' && normalizeCategoryKey(c) === norm);
        if (!isCovered && !extra.some(e => normalizeCategoryKey(e) === norm)) {
          extra.push(p.trim());
        }
      }
    });
    return [...canonical, ...extra];
  }, [items]);

  const selectableItems = useMemo(() => {
    let filtered = items;

    // Filter by Mode
    if (modeFilter !== 'All') {
      filtered = filtered.filter(i => (i.mode || 'onstage').toLowerCase().trim() === modeFilter);
    }

    // Filter by Phase / Category
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(i => {
        const itemCat = (i.phase || i.category || '').trim();
        if (!itemCat) return categoryFilter.toLowerCase() === 'general';
        if (itemCat.toLowerCase() === categoryFilter.toLowerCase()) return true;
        return normalizeCategoryKey(itemCat) === normalizeCategoryKey(categoryFilter);
      });
    }

    // Filter by Search Query
    if (eventSearchQuery.trim()) {
      const q = eventSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(i => {
        const code = (i.item_code || i.code || '').toLowerCase();
        const name = (i.name_eng || i.name || '').toLowerCase();
        const malName = (i.name_mal || '').toLowerCase();
        const phase = (i.phase || i.category || '').toLowerCase();
        return code.includes(q) || name.includes(q) || malName.includes(q) || phase.includes(q);
      });
    }
    return filtered;
  }, [items, modeFilter, categoryFilter, eventSearchQuery]);

  // Aggregate event metrics for the master table
  const itemSummaries = useMemo(() => {
    return selectableItems.map(item => {
      const idStr = String(item.item_id || item.id);
      const regs = allRegistrations.filter(r => String(r.item_id) === idStr);
      const withCodes = regs.filter(r => Boolean(r.code_letter));
      const res = allResults.filter(r => String(r.item_id) === idStr);
      const isPublished = res.some(r => r.published);
      const hasDraftScores = res.length > 0;

      let statusBadge: 'published' | 'draft' | 'ready' | 'pending_codes' | 'no_roster' = 'pending_codes';
      if (isPublished) {
        statusBadge = 'published';
      } else if (hasDraftScores) {
        statusBadge = 'draft';
      } else if (regs.length > 0 && withCodes.length >= regs.length) {
        statusBadge = 'ready';
      } else if (regs.length === 0) {
        statusBadge = 'no_roster';
      }

      return {
        item,
        totalRegs: regs.length,
        codedRegs: withCodes.length,
        statusBadge,
        isPublished,
        hasDraftScores
      };
    });
  }, [selectableItems, allRegistrations, allResults]);

  const selectedItem = items.find(i => String(i.item_id) === selectedItemId || i.id === selectedItemId);
  const registrations = selectedItemId ? allRegistrations.filter(r => String(r.item_id) === selectedItemId) : [];
  const results = allResults;
  const existingResult = selectedItemId ? results.find(r => String(r.item_id) === selectedItemId) : null;

  // Initialize scoring table from registrations that have code letters assigned
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);

  // Keep scoreRows in sync when selected item changes
  const handleItemChange = (itemId: string | null) => {
    setSelectedItemId(itemId);
    if (!itemId) {
      setScoreRows([]);
      return;
    }
    const itemRegs = festService.getRegistrations().filter(r => String(r.item_id) === itemId);
    const currentRes = festService.getResults().find(r => String(r.item_id) === itemId);

    if (currentRes && currentRes.scores_breakdown && currentRes.scores_breakdown.length > 0) {
      setScoreRows(
        currentRes.scores_breakdown.map(s => ({
          code_letter: s.code_letter,
          reg_id: s.reg_id || '',
          criteria_a: s.criteria_a,
          criteria_b: s.criteria_b,
          criteria_c: s.criteria_c,
          total: s.total
        }))
      );
    } else {
      setScoreRows(
        itemRegs
          .filter(r => Boolean(r.code_letter))
          .map(r => ({
            code_letter: r.code_letter || '?',
            reg_id: r.id,
            criteria_a: 30,
            criteria_b: 30,
            criteria_c: 15,
            total: 75
          }))
      );
    }
  };

  const isLocked = existingResult ? existingResult.published : false;

  const handleScoreChange = (
    index: number,
    field: 'criteria_a' | 'criteria_b' | 'criteria_c',
    val: number
  ) => {
    if (isLocked) return;
    const updated = [...scoreRows];
    updated[index][field] = val;
    updated[index].total =
      (updated[index].criteria_a || 0) +
      (updated[index].criteria_b || 0) +
      (updated[index].criteria_c || 0);
    setScoreRows(updated);
  };

  const handleSubmitScores = () => {
    if (!selectedItemId) {
      alert('Please select an event to score.');
      return;
    }
    if (scoreRows.length === 0) {
      alert('No registrations with blind code letters found for this event.');
      return;
    }

    try {
      festService.submitResultEntry(selectedItemId, scoreRows);
      triggerRefresh();
      alert('Tabulation marks successfully locked and submitted to the Chief Tabulation Officer!');
    } catch (err: any) {
      alert(err.message || 'Error submitting scores');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <ClipboardPen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                TABULATION DIVISION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-mono">
                {activeTab === 'scoring' ? 'WRITE-ONCE SCORE ENTRY' : activeTab === 'published' ? 'FINALIZED STANDINGS' : 'JUDGING RUBRICS'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {activeTab === 'scoring' ? 'Fast Tabular Scoring Console' : activeTab === 'published' ? 'Finalized & Published Standings' : 'Judging Rubrics & Regulations'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeTab === 'scoring'
                ? 'Enter marks strictly according to anonymous code letters. Submitted marks are write-once locked.'
                : activeTab === 'published'
                ? 'Official results published by the Chief Tabulation Officer. All scores are write-locked.'
                : 'Standard evaluation guidelines, criteria weights, and blind scoring compliance standards.'}
            </p>
          </div>
        </div>

        {/* Event Selector Dropdown (Shown in scoring tab) */}
        {activeTab === 'scoring' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Filters:</span>
            {/* Phase / Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-2 text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-amber-500/20 text-[var(--text-primary)] cursor-pointer"
            >
              {phaseCategoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Phases' : cat}
                </option>
              ))}
            </select>
            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-amber-500/20 text-[var(--text-primary)] cursor-pointer"
            >
              <option value="All">All Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
              <option value="submission">Submission</option>
            </select>
            {/* Event Dropdown */}
            <select
              value={selectedItemId || ''}
              onChange={e => handleItemChange(e.target.value || null)}
              className="px-3 py-2 text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-amber-500/20 text-[var(--text-primary)] max-w-xs sm:max-w-sm truncate cursor-pointer"
            >
              <option value="">📋 Master Events Table ({selectableItems.length})</option>
              {selectableItems.map(item => (
                <option key={item.id} value={item.item_id ? String(item.item_id) : item.id}>
                  {item.item_code || item.code}: {item.name_eng || item.name} ({item.phase || item.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. SCORING TAB */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {/* VIEW A: MASTER EVENTS TABLE (LIST OF ALL EVENTS AS ROWS) */}
          {!selectedItemId && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardPen className="w-4 h-4 text-amber-500" />
                    <span>Festival Competition Items & Score Status</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select any event row to open the double-blind score entry card and record evaluator marks.
                  </CardDescription>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={eventSearchQuery}
                      onChange={e => setEventSearchQuery(e.target.value)}
                      placeholder="Search item name, code..."
                      className="pl-8 pr-7 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-44"
                    />
                    {eventSearchQuery && (
                      <button
                        onClick={() => setEventSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Phase / Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] cursor-pointer focus:outline-none"
                  >
                    {phaseCategoryOptions.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Phases' : cat}
                      </option>
                    ))}
                  </select>

                  {/* Mode Filter */}
                  <select
                    value={modeFilter}
                    onChange={e => setModeFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] cursor-pointer focus:outline-none"
                  >
                    <option value="All">All Modes</option>
                    <option value="onstage">On Stage</option>
                    <option value="offstage">Off Stage</option>
                    <option value="submission">Submission</option>
                  </select>

                  {(categoryFilter !== 'All' || modeFilter !== 'All' || eventSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter('All');
                        setModeFilter('All');
                        setEventSearchQuery('');
                      }}
                      className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline px-1 py-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-24">Item Code</TableHead>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Category / Phase</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-center">Blind Code Status</TableHead>
                      <TableHead className="text-center">Tabulation State</TableHead>
                      <TableHead className="text-right w-36">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSummaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                          <p>No events match the selected filters.</p>
                          {(categoryFilter !== 'All' || modeFilter !== 'All' || eventSearchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryFilter('All');
                                setModeFilter('All');
                                setEventSearchQuery('');
                              }}
                              className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              Clear all filters
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemSummaries.map(({ item, totalRegs, codedRegs, statusBadge, isPublished, hasDraftScores }, idx) => {
                        const idStr = String(item.item_id || item.id);
                        return (
                          <TableRow
                            key={idStr}
                            onClick={() => handleItemChange(idStr)}
                            className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                          >
                            <TableCell className="text-center font-mono text-xs text-[var(--text-muted)]">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                              {item.item_code || item.code || `ITM-${item.item_id}`}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-[var(--text-primary)]">
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
                              <span className="capitalize text-xs text-[var(--text-secondary)] font-medium">
                                {item.mode || 'onstage'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {totalRegs === 0 ? (
                                <span className="text-[11px] text-[var(--text-muted)]">No roster</span>
                              ) : codedRegs >= totalRegs ? (
                                <Badge variant="success" size="sm" className="font-mono">
                                  {codedRegs}/{totalRegs} Alloted
                                </Badge>
                              ) : codedRegs > 0 ? (
                                <Badge variant="amber" size="sm" className="font-mono">
                                  {codedRegs}/{totalRegs} Partial
                                </Badge>
                              ) : (
                                <Badge variant="outline" size="sm" className="text-[var(--text-muted)] font-mono">
                                  0/{totalRegs} Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isPublished ? (
                                <Badge variant="success" size="sm" className="font-semibold">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                                </Badge>
                              ) : hasDraftScores ? (
                                <Badge variant="warning" size="sm" className="font-semibold">
                                  Draft Scores Locked
                                </Badge>
                              ) : codedRegs > 0 ? (
                                <Badge variant="outline" size="sm" className="border-sky-500/40 text-sky-600 dark:text-sky-400">
                                  Ready to Score
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)]">Awaiting Stage</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <Button
                                size="xs"
                                variant={isPublished ? 'outline' : hasDraftScores ? 'secondary' : 'primary'}
                                onClick={() => handleItemChange(idStr)}
                                className="font-semibold text-xs"
                              >
                                {isPublished ? 'Inspect' : hasDraftScores ? 'Edit Marks' : 'Enter Scores →'}
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

          {/* VIEW B: ACTIVE SCORE CARD (SHOWN WHEN AN EVENT ROW IS CLICKED) */}
          {selectedItemId && selectedItem && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Back Button Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleItemChange(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-amber-500 bg-[var(--bg-surface)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Events List</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    Event #{selectedItem.item_code || selectedItem.code}
                  </span>
                </div>
              </div>

              {/* Lock Notice or Write-Once Alert */}
              {isLocked ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Scores Finalized & Published (Locked)</h4>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                        This result has been published to the official board. Any revisions require Fest Admin clearance.
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">Write-Protected</Badge>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">Blind Judging Protocol Active</h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Evaluator score cards are indexed solely by Code Letters (A, B, C...). Institution identities are masked.
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">Draft Tabulation</Badge>
                </div>
              )}

              {/* Score Entry Table */}
              <Card>
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{selectedItem?.name_eng || selectedItem?.name}</CardTitle>
                      <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{selectedItem?.item_code || selectedItem?.code}</span>
                      <CategoryBadge category={selectedItem?.phase || selectedItem?.category || 'General'} />
                    </div>
                    <CardDescription>
                      Criteria: Technique (Max 40) | Expression / Execution (Max 40) | Stage Adherence (Max 20) = 100 Total
                    </CardDescription>
                  </div>
                  {!isLocked && (
                    <Button size="sm" onClick={handleSubmitScores} className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Submit & Lock Tabulation
                    </Button>
                  )}
                </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Blind Code</TableHead>
                    <TableHead>Criteria 1: Technique (40)</TableHead>
                    <TableHead>Criteria 2: Expression (40)</TableHead>
                    <TableHead>Criteria 3: Stage Adherence (20)</TableHead>
                    <TableHead>Total Score (/100)</TableHead>
                    <TableHead className="text-right">Projected Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No participants or blind codes allocated yet by Stage Controller.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scoreRows
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((row, index) => {
                        const originalIndex = scoreRows.findIndex(r => r.code_letter === row.code_letter);

                        return (
                          <TableRow key={row.code_letter}>
                            <TableCell>
                              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-black text-base shadow-sm font-mono">
                                {row.code_letter}
                              </div>
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={isLocked}
                                value={row.criteria_a}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_a', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={isLocked}
                                value={row.criteria_b}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_b', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                disabled={isLocked}
                                value={row.criteria_c}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_c', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-base font-black text-[var(--text-primary)]">
                                {row.total}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] ml-1">/ 100</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {index === 0 ? (
                                <Badge variant="amber" className="font-bold">
                                  🥇 1st Place (5 pts)
                                </Badge>
                              ) : index === 1 ? (
                                <Badge variant="default" className="font-bold">
                                  🥈 2nd Place (3 pts)
                                </Badge>
                              ) : index === 2 ? (
                                <Badge variant="secondary" className="font-bold">
                                  🥉 3rd Place (1 pt)
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">Rank {index + 1}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )}

      {/* 2. PUBLISHED RESULTS TAB */}
      {activeTab === 'published' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Official Published Results Registry</CardTitle>
                <CardDescription>
                  Write-locked scores and verified rank standings ready for the public leaderboard
                </CardDescription>
              </div>
              <Badge variant="navy">
                <Lock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {results.filter(r => r.published).length} Published / {results.length} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Code & Name</TableHead>
                    <TableHead>1st Place (5 Pts)</TableHead>
                    <TableHead>2nd Place (3 Pts)</TableHead>
                    <TableHead>3rd Place (1 Pt)</TableHead>
                    <TableHead>Lock Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        No results entered or published yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map(res => (
                      <TableRow key={res.id}>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-[var(--text-muted)]">{res.item?.code}</div>
                          <div className="font-bold text-sm text-[var(--text-primary)]">{res.item?.name}</div>
                          <span className="text-[11px] text-[var(--text-muted)]">{res.item?.category}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {res.first_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {res.first_reg?.college?.name || res.first_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">
                            {res.second_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {res.second_reg?.college?.name || res.second_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">
                            {res.third_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {res.third_reg?.college?.name || res.third_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {res.published ? (
                            <Badge variant="success">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Pending Publish
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItemId(String(res.item_id));
                              setActiveTab('scoring');
                            }}
                          >
                            Inspect Scores
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. RUBRICS & RULES TAB */}
      {activeTab === 'rubrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-sky-500/5 border border-sky-500/20">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold mb-4 font-mono">
                40%
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">Criteria 1: Technique & Core Skill</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Evaluates foundational artistry, technical execution, rhythm, vocal precision, syntax, and mastery of the designated art form. Max 40 points.
              </p>
            </Card>

            <Card className="p-6 bg-indigo-500/5 border border-indigo-500/20">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold mb-4 font-mono">
                40%
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">Criteria 2: Expression & Presentation</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Evaluates emotional depth, interpretive creativity, body language, facial expression, modulation, and audience engagement. Max 40 points.
              </p>
            </Card>

            <Card className="p-6 bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-4 font-mono">
                20%
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">Criteria 3: Adherence & Timing</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Evaluates strict adherence to festival guidelines, stage discipline, costume decorum, and compliance with the allocated time limit. Max 20 points.
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tabulation & Fair Judging Charter</CardTitle>
                <CardDescription>Rules enforced automatically by the festival system</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-[var(--text-secondary)]">
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">Strict Blind Judging Security</h4>
                  <p className="mt-1 leading-relaxed">
                    Evaluators and tabulation operators only record marks against randomly generated Code Letters (A, B, C...). Institution identities, college codes, and participant chest numbers are fully masked in this portal to prevent any unconscious bias.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-start gap-3">
                <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">Write-Once Cryptographic Locking</h4>
                  <p className="mt-1 leading-relaxed">
                    Once tabulation scores are submitted, they enter a write-protected state. Any post-submission dispute or correction requires an official Appeal filed by the College Coordinator and signed off by the Executive Festival Admin.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-start gap-3">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">Championship Points Allotment</h4>
                  <p className="mt-1 leading-relaxed">
                    Points are automatically credited to the college championship tally upon result publishing: 1st Place = 5 points, 2nd Place = 3 points, 3rd Place = 1 point.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
