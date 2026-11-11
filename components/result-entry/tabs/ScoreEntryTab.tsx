'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ScreeningBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import {
  ClipboardPen,
  ArrowLeft,
  Lock,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react';
import { Item, Schedule, StageStatus, isScreeningEvent, isNonTabulationEvent } from '@/lib/types/fest';
import { TilePattern } from '@/components/fest/FestPattern';

export interface ScoreEntryRow {
  code_letter: string;
  chest_no?: string;
  college_affl_no?: number;
  mark_percentage: number;
  grade: string;
  rank: number | null;
  points: number;
}

export interface ScoreEntryItemSummary {
  item: Item;
  schedule?: Schedule;
  registrationsCount: number;
  codesCount: number;
  isScored: boolean;
  isPublished: boolean;
  status: StageStatus;
}

interface ScoreEntryTabProps {
  items: ScoreEntryItemSummary[];
  selectedEventId: number | null;
  selectedScoringItem?: Item;
  isSelectedEventPublished: boolean;
  scoreRows: ScoreEntryRow[];
  isLoadingEventData: boolean;
  isSubmittingScores: boolean;
  onSelectEvent: (eventId: number | null) => void;
  onScoreRowChange: (index: number, field: 'mark_percentage' | 'grade' | 'rank', value: any) => void;
  onSaveScores: () => void;
}

export function ScoreEntryTab({
  items,
  selectedEventId,
  selectedScoringItem,
  isSelectedEventPublished,
  scoreRows,
  isLoadingEventData,
  isSubmittingScores,
  onSelectEvent,
  onScoreRowChange,
  onSaveScores,
}: ScoreEntryTabProps) {
  return (
    <div>
      {/* Subview 2A: Event Selection List */}
      {!selectedEventId && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <ClipboardPen className="w-4 h-4 text-[var(--f-saffron-text)]" />
                Select Event to Enter Scores
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)]">
                Choose an event to view registered blind code letters and input participant scores, grades, and ranks.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {items.length} Events Available
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Event Code</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Phase / Category</TableHead>
                  <TableHead>Stage Status</TableHead>
                  <TableHead className="text-center">Code Letters</TableHead>
                  <TableHead className="text-center">Scoring Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                      No events match the search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(({ item, codesCount, registrationsCount, isScored, isPublished, status }, idx) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                      onClick={() => onSelectEvent(Number(item.item_id))}
                    >
                      <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {item.item_code || item.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.name_eng || item.name}
                          </span>
                          {isScreeningEvent(item) && <ScreeningBadge size="sm" />}
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
                          <Badge variant="saffron" size="sm" className="font-semibold">
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
                          variant="saffron"
                          onClick={() => onSelectEvent(Number(item.item_id))}
                          className="font-semibold gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500"
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
              onClick={() => onSelectEvent(null)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] hover:border-amber-500/30 bg-[var(--bg-surface)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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
          <div className="relative overflow-hidden bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <TilePattern id="score-entry-banner-pattern" className="opacity-10 text-[var(--f-saffron)]" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold text-xl shrink-0">
                  <ClipboardPen className="w-7 h-7 text-[var(--f-saffron-text)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-[var(--f-saffron-text)] bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                      {selectedScoringItem.item_code || selectedScoringItem.code}
                    </span>
                    <CategoryBadge category={selectedScoringItem.phase || selectedScoringItem.category} />
                    <Badge variant={selectedScoringItem.point_type === 'group' ? 'purple' : 'secondary'}>
                      {selectedScoringItem.point_type === 'group' ? 'Group Event' : 'Single Event'}
                    </Badge>
                    {isScreeningEvent(selectedScoringItem) && <ScreeningBadge size="sm" />}
                    {isNonTabulationEvent(selectedScoringItem) && (
                      <Badge variant="outline" size="sm" className="font-semibold">
                        Non-Tabulation (Cat D • 0 Pts)
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-heading font-black text-[var(--text-primary)] tracking-tight mt-1.5">
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
                  <span className="text-xs font-mono font-bold text-[var(--f-saffron-text)]">
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
                <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Sparkles className="w-4 h-4 text-[var(--f-saffron-text)]" />
                  Blind Code Score Tabulation
                </CardTitle>
                <CardDescription className="text-xs text-[var(--text-secondary)]">
                  Enter marks percentage (0-100), select Grade and Rank. Championship points are automatically computed matching the points_matrix.
                </CardDescription>
              </div>

              {!isSelectedEventPublished && (
                <Button
                  size="sm"
                  variant="saffron"
                  disabled={isSubmittingScores || scoreRows.length === 0}
                  onClick={onSaveScores}
                  className="font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-amber-500"
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
                <SkeletonTableRows rows={4} cols={5} />
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
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-extrabold text-lg mx-auto shadow-sm">
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
                              onChange={e => onScoreRowChange(idx, 'mark_percentage', e.target.value)}
                              aria-label={`Mark percentage for code ${row.code_letter}`}
                              className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                            />
                            <span className="text-xs font-semibold text-[var(--text-muted)]">/ 100</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <select
                            value={row.grade}
                            disabled={isSelectedEventPublished}
                            onChange={e => onScoreRowChange(idx, 'grade', e.target.value)}
                            aria-label={`Grade for code ${row.code_letter}`}
                            className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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
                            onChange={e => onScoreRowChange(idx, 'rank', e.target.value)}
                            aria-label={`Rank for code ${row.code_letter}`}
                            className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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
  );
}
