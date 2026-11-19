'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ScreeningBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardPen,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Lock,
  Trophy,
  Edit,
  Pencil,
  Clock,
  Layers,
} from 'lucide-react';
import { Item, Schedule, StageStatus, isScreeningEvent, isNonTabulationEvent, getEffectiveStageMode } from '@/lib/types/fest';
import { ScoreEntryModal } from '../ScoreEntryModal';

export interface ScoreEntryRow {
  code_letter: string;
  chest_no?: string;
  college_affl_no?: number;
  studentName?: string;
  collegeName?: string;
  collegeCode?: string;
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
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unscored' | 'scored' | 'published'>('all');

  const statusCounts = useMemo(() => {
    let unscored = 0;
    let scoredDraft = 0;
    let published = 0;

    items.forEach(i => {
      if (i.isPublished) {
        published++;
      } else if (i.isScored) {
        scoredDraft++;
      } else {
        unscored++;
      }
    });

    return {
      total: items.length,
      unscored,
      scoredDraft,
      published,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(({ item, isScored, isPublished }) => {
      if (localSearch.trim()) {
        const q = localSearch.trim().toLowerCase();
        const code = (item.item_code || item.code || '').toLowerCase();
        const eng = (item.name_eng || item.name || '').toLowerCase();
        const mal = (item.name_mal || '').toLowerCase();
        if (!code.includes(q) && !eng.includes(q) && !mal.includes(q)) {
          return false;
        }
      }

      if (statusFilter === 'published' && !isPublished) return false;
      if (statusFilter === 'scored' && (!isScored || isPublished)) return false;
      if (statusFilter === 'unscored' && isScored) return false;

      return true;
    });
  }, [items, localSearch, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 4 Interactive Status Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Events */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'border-amber-500/60 bg-amber-500/10 [box-shadow:0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] [box-shadow:var(--shadow-card)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Events</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-[var(--text-primary)] font-mono">
              {statusCounts.total}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Events</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Full competition catalog</span>
        </button>

        {/* 2. Unscored / Pending */}
        <button
          type="button"
          onClick={() => setStatusFilter('unscored')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'unscored'
              ? 'border-slate-400 bg-slate-500/10 [box-shadow:0_0_15px_rgba(148,163,184,0.15)] ring-1 ring-slate-400'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] [box-shadow:var(--shadow-card)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Unscored / Pending</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-[var(--text-primary)] font-mono">
              {statusCounts.unscored}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Awaiting</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">No score entered yet</span>
        </button>

        {/* 3. Scored (Draft) */}
        <button
          type="button"
          onClick={() => setStatusFilter('scored')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'scored'
              ? 'border-purple-500/60 bg-purple-500/10 [box-shadow:0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] [box-shadow:var(--shadow-card)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400">Scored (Draft)</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-purple-500 dark:text-purple-400 font-mono">
              {statusCounts.scoredDraft}
            </span>
            <span className="text-[11px] text-purple-400/80">Draft</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Ready for publishing</span>
        </button>

        {/* 4. Published (Live) */}
        <button
          type="button"
          onClick={() => setStatusFilter('published')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'published'
              ? 'border-emerald-500/60 bg-emerald-500/10 [box-shadow:0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] [box-shadow:var(--shadow-card)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-500">Published (Live)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {statusCounts.published}
            </span>
            <span className="text-[11px] text-emerald-500/80">Live</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Visible to public & colleges</span>
        </button>
      </div>

      {/* Main Events List */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <ClipboardPen className="w-4 h-4 text-[var(--f-saffron-text)]" />
              Event Results & Score Entry
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-secondary)]">
              Enter participant scores, places, and grades here to save as draft. Then open the <strong>Result Publishing</strong> tab to publish each event to colleges and students.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSelectedEventPublished && (
              <Badge variant="destructive" className="gap-1.5 px-3 py-1 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Results Published (Locked)</span>
              </Badge>
            )}
            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
              {filteredItems.length} / {items.length} Events
            </span>
          </div>
        </CardHeader>

        {/* Local Search and Filter Controls */}
        <div className="px-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search event name, code, or Malayalam..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:border-amber-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-amber-500 text-black shadow-xs font-bold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({statusCounts.total})
            </button>
            <button
              onClick={() => setStatusFilter('unscored')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'unscored'
                  ? 'bg-slate-300 dark:bg-slate-700 text-[var(--text-primary)] shadow-xs font-bold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Unscored ({statusCounts.unscored})
            </button>
            <button
              onClick={() => setStatusFilter('scored')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'scored'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Draft ({statusCounts.scoredDraft})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Published ({statusCounts.published})
            </button>
          </div>
        </div>

        {/* Events Table */}
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-28">Event Code</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead>Phase / Category</TableHead>
                <TableHead>Mode & Type</TableHead>
                <TableHead className="text-center">Participants</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                    No events match the search query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(({ item, schedule, registrationsCount, codesCount, isScored, isPublished, status }, idx) => {
                  const effectiveMode = getEffectiveStageMode(item);

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <TableCell className="text-center font-mono font-medium text-[var(--text-muted)] text-xs">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {item.item_code || item.code}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={effectiveMode === 'onstage' ? 'saffron' : 'outline'} size="sm">
                            {effectiveMode === 'onstage' ? 'Onstage' : 'Offstage'}
                          </Badge>
                          <Badge variant={item.point_type === 'group' ? 'purple' : 'secondary'} size="sm">
                            {item.point_type === 'group' ? 'Group' : 'Single'}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {codesCount > 0 ? `${codesCount} Codes` : `${registrationsCount} Registered`}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        {isPublished ? (
                          <Badge variant="success" size="sm" className="font-semibold gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Published</span>
                          </Badge>
                        ) : isScored ? (
                          <Badge variant="purple" size="sm" className="font-semibold gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Draft (Scored)</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="text-[var(--text-muted)]">
                            Unscored
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          variant={isScored ? 'outline' : 'saffron'}
                          onClick={() => onSelectEvent(Number(item.item_id))}
                          className="font-bold text-xs gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{isScored ? 'Edit Results' : 'Enter Results'}</span>
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

      {/* The Interactive Scoring Popup Window (Modal) */}
      <ScoreEntryModal
        isOpen={Boolean(selectedEventId && selectedScoringItem)}
        onClose={() => onSelectEvent(null)}
        selectedEvent={selectedScoringItem}
        scoreRows={scoreRows}
        isLoading={isLoadingEventData}
        isSubmitting={isSubmittingScores}
        isPublished={isSelectedEventPublished}
        onScoreRowChange={onScoreRowChange}
        onSaveScores={onSaveScores}
      />
    </div>
  );
}
