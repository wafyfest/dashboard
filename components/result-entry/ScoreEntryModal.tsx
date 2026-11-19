'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge, CategoryBadge, ScreeningBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Send,
  Search,
  Award,
  Users,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Item, isScreeningEvent, isNonTabulationEvent } from '@/lib/types/fest';
import { ScoreEntryRow } from './tabs/ScoreEntryTab';

interface ScoreEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Item | undefined;
  scoreRows: ScoreEntryRow[];
  isLoading: boolean;
  isSubmitting: boolean;
  isPublished: boolean;
  onScoreRowChange: (index: number, field: 'mark_percentage' | 'grade' | 'rank', value: any) => void;
  onSaveScores: () => void;
}

export function ScoreEntryModal({
  isOpen,
  onClose,
  selectedEvent,
  scoreRows,
  isLoading,
  isSubmitting,
  isPublished,
  onScoreRowChange,
  onSaveScores,
}: ScoreEntryModalProps) {
  const [modalSearch, setModalSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'podium' | 'graded'>('all');

  // Compute live podium positions from scoreRows
  const firstPlace = useMemo(() => scoreRows.find(r => Number(r.rank) === 1), [scoreRows]);
  const secondPlace = useMemo(() => scoreRows.find(r => Number(r.rank) === 2), [scoreRows]);
  const thirdPlace = useMemo(() => scoreRows.find(r => Number(r.rank) === 3), [scoreRows]);

  // Check for duplicate ranks (ties)
  const duplicateRanks = useMemo(() => {
    const counts: Record<number, number> = {};
    scoreRows.forEach(r => {
      if (r.rank && [1, 2, 3].includes(Number(r.rank))) {
        counts[Number(r.rank)] = (counts[Number(r.rank)] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([rank]) => Number(rank));
  }, [scoreRows]);

  // Count participants with places or grades
  const gradedCount = useMemo(() => {
    return scoreRows.filter(r => r.grade && r.grade !== 'None').length;
  }, [scoreRows]);

  const placedCount = useMemo(() => {
    return scoreRows.filter(r => r.rank && [1, 2, 3].includes(Number(r.rank))).length;
  }, [scoreRows]);

  // Filtered rows for the modal table
  const filteredRows = useMemo(() => {
    return scoreRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        // Text search
        if (modalSearch.trim()) {
          const q = modalSearch.trim().toLowerCase();
          const chest = (row.chest_no || '').toLowerCase();
          const code = (row.code_letter || '').toLowerCase();
          const name = (row.studentName || '').toLowerCase();
          const college = (row.collegeName || row.collegeCode || '').toLowerCase();
          if (!chest.includes(q) && !code.includes(q) && !name.includes(q) && !college.includes(q)) {
            return false;
          }
        }

        // Quick category filter
        if (filterMode === 'podium') {
          return Boolean(row.rank && [1, 2, 3].includes(Number(row.rank)));
        }
        if (filterMode === 'graded') {
          return Boolean((row.grade && row.grade !== 'None') || (row.rank && [1, 2, 3].includes(Number(row.rank))));
        }

        return true;
      });
  }, [scoreRows, modalSearch, filterMode]);

  if (!selectedEvent) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="5xl"
    >
      <div className="space-y-5 -mt-3">
        {/* 1. Event Header Banner */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)] bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                  {selectedEvent.item_code || selectedEvent.code}
                </span>
                <CategoryBadge category={selectedEvent.phase || selectedEvent.category || 'General'} />
                <Badge variant={selectedEvent.point_type === 'group' ? 'purple' : 'secondary'} size="sm">
                  {selectedEvent.point_type === 'group' ? 'Group Event' : 'Single Event'}
                </Badge>
                {isScreeningEvent(selectedEvent) && <ScreeningBadge size="sm" />}
                {isNonTabulationEvent(selectedEvent) && (
                  <Badge variant="outline" size="sm" className="font-semibold text-rose-500 border-rose-500/30">
                    Non-Tabulation (0 Pts)
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-heading font-black text-[var(--text-primary)] tracking-tight">
                {selectedEvent.name_eng || selectedEvent.name}
              </h2>
              {selectedEvent.name_mal && (
                <p className="text-xs text-[var(--text-secondary)]">{selectedEvent.name_mal}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPublished ? (
                <Badge variant="success" size="sm" className="gap-1.5 px-3 py-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Published (Live)</span>
                </Badge>
              ) : (
                <Badge variant="amber" size="sm" className="gap-1.5 px-3 py-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Draft (Unpublished)</span>
                </Badge>
              )}
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                {scoreRows.length} Participants
              </span>
            </div>
          </div>
        </div>

        {/* 2. Live Podium Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1st Place */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 [box-shadow:var(--shadow-card)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                1st Place (Winner)
              </span>
              {firstPlace?.points ? (
                <Badge variant="saffron" size="sm" className="font-mono text-xs font-bold">
                  {firstPlace.points} Pts
                </Badge>
              ) : null}
            </div>
            <div className="mt-2">
              {firstPlace ? (
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                    {firstPlace.studentName || (firstPlace.chest_no ? `Chest #${firstPlace.chest_no}` : `Code [${firstPlace.code_letter}]`)}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {firstPlace.collegeName || firstPlace.collegeCode || 'College Affiliated'} • Grade: {firstPlace.grade || 'None'}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">Not yet assigned</span>
              )}
            </div>
          </div>

          {/* 2nd Place */}
          <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-slate-400" />
                2nd Place
              </span>
              {secondPlace?.points ? (
                <Badge variant="secondary" size="sm" className="font-mono text-xs font-bold">
                  {secondPlace.points} Pts
                </Badge>
              ) : null}
            </div>
            <div className="mt-2">
              {secondPlace ? (
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                    {secondPlace.studentName || (secondPlace.chest_no ? `Chest #${secondPlace.chest_no}` : `Code [${secondPlace.code_letter}]`)}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {secondPlace.collegeName || secondPlace.collegeCode || 'College Affiliated'} • Grade: {secondPlace.grade || 'None'}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">Not yet assigned</span>
              )}
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-3.5 rounded-xl border border-amber-800/30 bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-600 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-700 dark:text-amber-600" />
                3rd Place
              </span>
              {thirdPlace?.points ? (
                <Badge variant="outline" size="sm" className="font-mono text-xs font-bold">
                  {thirdPlace.points} Pts
                </Badge>
              ) : null}
            </div>
            <div className="mt-2">
              {thirdPlace ? (
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                    {thirdPlace.studentName || (thirdPlace.chest_no ? `Chest #${thirdPlace.chest_no}` : `Code [${thirdPlace.code_letter}]`)}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {thirdPlace.collegeName || thirdPlace.collegeCode || 'College Affiliated'} • Grade: {thirdPlace.grade || 'None'}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">Not yet assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Non-blocking Joint Tie Notice */}
        {duplicateRanks.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Joint Tie Notice:</strong> Multiple participants have been assigned rank{' '}
              {duplicateRanks.map(r => `${r === 1 ? '1st' : r === 2 ? '2nd' : '3rd'}`).join(', ')}. Points will be awarded accordingly.
            </span>
          </div>
        )}

        {/* 4. Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search candidate by name, chest #, or code..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:border-amber-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({scoreRows.length})
            </button>
            <button
              onClick={() => setFilterMode('podium')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                filterMode === 'podium'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Places ({placedCount})
            </button>
            <button
              onClick={() => setFilterMode('graded')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                filterMode === 'graded'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Graded ({gradedCount})
            </button>
          </div>
        </div>

        {/* 5. Participants Scoring Table */}
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              <SkeletonTableRows rows={5} cols={5} />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-1">
              <p className="font-semibold text-sm text-[var(--text-primary)]">No participants match the filter.</p>
              <p>Try clearing your search query or switching to "All".</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">Participant</TableHead>
                  <TableHead className="w-44">Place (Rank)</TableHead>
                  <TableHead className="w-36">Grade</TableHead>
                  <TableHead className="w-28 text-center">Points (Auto)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ row, originalIndex }, idx) => (
                  <TableRow key={row.code_letter || row.chest_no || originalIndex} className="hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-center font-mono text-xs text-[var(--text-muted)]">
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.code_letter && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-extrabold text-xs shrink-0">
                            {row.code_letter}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                            {row.chest_no && (
                              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                                #{row.chest_no}
                              </span>
                            )}
                            <span className="truncate">{row.studentName || 'Participant'}</span>
                          </div>
                          {(row.collegeName || row.collegeCode) && (
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">
                              {row.collegeName || row.collegeCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Place / Rank Selector */}
                    <TableCell>
                      <select
                        value={row.rank === null ? 'none' : String(row.rank)}
                        onChange={e => onScoreRowChange(originalIndex, 'rank', e.target.value)}
                        aria-label={`Rank for ${row.studentName || row.chest_no}`}
                        className="w-full text-xs font-semibold rounded-lg px-2 py-1.5 border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                      >
                        <option value="none">No Place</option>
                        <option value="1">🥇 1st Place</option>
                        <option value="2">🥈 2nd Place</option>
                        <option value="3">🥉 3rd Place</option>
                      </select>
                    </TableCell>

                    {/* Grade Selector */}
                    <TableCell>
                      <select
                        value={row.grade || 'None'}
                        onChange={e => onScoreRowChange(originalIndex, 'grade', e.target.value)}
                        aria-label={`Grade for ${row.studentName || row.chest_no}`}
                        className="w-full text-xs font-semibold rounded-lg px-2 py-1.5 border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                      >
                        <option value="None">No Grade</option>
                        <option value="A+">Grade A+</option>
                        <option value="A">Grade A</option>
                        <option value="B">Grade B</option>
                        <option value="C">Grade C</option>
                      </select>
                    </TableCell>

                    {/* Auto Computed Points */}
                    <TableCell className="text-center">
                      <Badge
                        variant={row.points > 0 ? 'success' : 'outline'}
                        className="font-mono text-xs font-bold px-2 py-0.5"
                      >
                        {row.points} Pts
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 6. Footer Controls */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Scores will be saved as draft. To make them visible to colleges and students, publish the event in the <strong>Result Publishing</strong> tab.</span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs font-semibold px-4"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="saffron"
              size="sm"
              disabled={isSubmitting || scoreRows.length === 0}
              onClick={onSaveScores}
              className="font-bold text-xs gap-2 px-5 focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Draft...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Scores (Draft)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
