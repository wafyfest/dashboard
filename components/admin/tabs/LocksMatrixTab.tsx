'use client';

import React, { useState, useMemo, startTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge, ItemModeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  Layers
} from 'lucide-react';
import { EntryLock, getEffectiveStageMode, isSubmissionEvent, isScreeningEvent } from '@/lib/types/fest';

export function LocksMatrixTab() {
  const { refreshKey, triggerRefresh } = useFest();

  // Sort colleges numerically ascending by Affiliation Number (affl_no)
  const colleges = useMemo(() => {
    return [...festService.getColleges()].sort((a, b) => a.affl_no - b.affl_no);
  }, [refreshKey]);

  // Sort items letter-wise by code
  const items = useMemo(() => {
    return [...festService.getItems()].sort((a, b) => {
      const codeA = a.item_code || a.code || '';
      const codeB = b.item_code || b.code || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [refreshKey]);

  // Memoize entry locks to prevent heavy recomputations on keystrokes
  const locks = useMemo(() => {
    return festService.getEntryLocks();
  }, [refreshKey]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<'All' | 'onstage' | 'offstage' | 'submission' | 'screening'>('All');

  // Expanded Accordion State (open event IDs)
  const [expandedItemIds, setExpandedItemIds] = useState<Set<number>>(() => {
    return new Set(items.slice(0, 2).map(i => i.item_id));
  });

  // Individual College Filter Search inside expanded dropdowns
  const [collegeSearchQuery, setCollegeSearchQuery] = useState<{ [itemId: number]: string }>({});

  // Fast O(1) lock map
  const lockMap = useMemo(() => {
    const map = new Map<string, EntryLock>();
    locks.forEach(l => {
      map.set(`${l.item_id}:${l.college_affl_no}`, l);
    });
    return map;
  }, [locks]);

  // Distinct phases for filter tabs
  const availablePhases = useMemo(() => {
    const phases = new Set<string>();
    items.forEach(i => {
      if (i.phase) phases.add(i.phase);
    });
    return ['All', ...Array.from(phases)];
  }, [items]);

  // Filtered items based on search query, phase tab & mode
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchPhase = selectedPhase === 'All' || item.phase === selectedPhase;
      const m = getEffectiveStageMode(item);
      const matchMode =
        selectedMode === 'All' ||
        (selectedMode === 'submission'
          ? isSubmissionEvent(item)
          : selectedMode === 'screening'
          ? isScreeningEvent(item)
          : m === selectedMode);
      const q = searchQuery.toLowerCase().trim();
      const itemCodeStr = (item.item_code || item.code || '').toLowerCase();
      const matchSearch =
        !q ||
        (item.name_eng && item.name_eng.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        itemCodeStr.includes(q) ||
        String(item.item_id).includes(q) ||
        (item.name_mal && item.name_mal.includes(q));

      return matchPhase && matchMode && matchSearch;
    });
  }, [items, selectedPhase, selectedMode, searchQuery]);

  const toggleExpand = (itemId: number) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedItemIds(new Set(filteredItems.map(i => i.item_id)));
  };

  const collapseAll = () => {
    setExpandedItemIds(new Set());
  };

  return (
    <div className="space-y-5">
      {/* Header Panel - Minimalist Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-heading font-bold text-[var(--text-primary)]">
                Registration Lock
              </CardTitle>
              <Badge variant="saffron" size="sm" className="font-heading font-medium">
                Permissions Grid
              </Badge>
            </div>
            <CardDescription className="text-xs text-[var(--text-muted)] font-sans mt-1">
              Select an event to open or lock registration access per college.
            </CardDescription>
          </div>

          {/* Master Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              className="text-xs font-heading font-semibold border-[var(--border-subtle)] hover:border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              onClick={async () => {
                await festService.setAllEntryLocks(true);
                startTransition(() => {
                  triggerRefresh();
                });
              }}
            >
              <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Open All
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="text-xs font-heading font-semibold border-[var(--border-subtle)] hover:border-rose-500/40 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400"
              onClick={async () => {
                await festService.setAllEntryLocks(false);
                startTransition(() => {
                  triggerRefresh();
                });
              }}
            >
              <Lock className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" /> Lock All
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-heading"
              onClick={expandedItemIds.size === filteredItems.length ? collapseAll : expandAll}
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              {expandedItemIds.size === filteredItems.length ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
        </CardHeader>

        {/* Search & Phase Filters */}
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Minimalist Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search event..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search events"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Minimalist Filter Pills: Phases & Modes */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category / Phase Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {availablePhases.map(phase => (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setSelectedPhase(phase)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${selectedPhase === phase
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                  >
                    {phase}
                  </button>
                ))}
              </div>

              {/* Mode Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pl-2 border-l border-[var(--border-subtle)]">
                {(['All', 'onstage', 'offstage', 'submission', 'screening'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${selectedMode === m
                        ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                  >
                    {m === 'All' ? 'All Modes' : m === 'onstage' ? 'On Stage' : m === 'offstage' ? 'Off Stage' : m === 'submission' ? 'Submission' : 'Screening'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Dropdown Cards List - Clean Minimalist Style */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-[var(--text-muted)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl">
            <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-sans">No events found matching your filter criteria.</p>
          </Card>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedItemIds.has(item.item_id);

            // Item Code (e.g. FN001)
            const itemCodeDisplay = item.item_code || item.code || `ITM-${String(item.item_id).padStart(2, '0')}`;
            const itemIdDisplay = `#${String(item.item_id).padStart(2, '0')}`;

            // Compute college permissions summary for this event
            const openCollegesCount = colleges.filter(col => {
              const cell = lockMap.get(`${item.item_id}:${col.affl_no}`);
              return cell ? cell.is_open : !item.is_locked;
            }).length;

            const isAllOpen = openCollegesCount === colleges.length;
            const isAllClosed = openCollegesCount === 0;

            // Search query for colleges inside this event's expanded panel
            const colQuery = (collegeSearchQuery[item.item_id] || '').toLowerCase().trim();
            const filteredCollegesForEvent = colleges.filter(col => {
              if (!colQuery) return true;
              return (
                col.name.toLowerCase().includes(colQuery) ||
                col.short_name?.toLowerCase().includes(colQuery) ||
                String(col.affl_no).includes(colQuery) ||
                col.code?.toLowerCase().includes(colQuery)
              );
            });

            return (
              <Card
                key={item.id}
                className={`transition-all rounded-2xl overflow-hidden border ${isExpanded
                    ? 'border-[var(--f-saffron)]/40 bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                  }`}
              >
                {/* Event Header */}
                <div
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(item.item_id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Neutral Code & ID Badges */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] border border-[var(--border-subtle)] shrink-0">
                      {itemCodeDisplay}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-muted)] shrink-0">
                      {itemIdDisplay}
                    </span>

                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] truncate" title={item.name_eng || item.name}>
                        {item.name_eng || item.name}
                      </h3>
                      {item.name_mal && (
                        <span className="text-xs text-[var(--text-muted)] font-malayalam">({item.name_mal})</span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[11px] font-sans">
                          {item.phase || item.category}
                        </span>
                        <ItemModeBadge mode={item.mode} isSubmission={isSubmissionEvent(item)} isScreening={isScreeningEvent(item)} size="sm" />
                        <span>•</span>
                        <span className="text-[11px] font-sans">
                          {item.point_type === 'group' || item.item_type === 'Group' ? 'Group' : 'Single'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Row Lock Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Status Badge */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${isAllOpen
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : isAllClosed
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      }`}>
                      {openCollegesCount}/{colleges.length} Open
                    </span>

                    {/* Row Toggle */}
                    <button
                      type="button"
                      onClick={async () => {
                        const targetOpen = openCollegesCount === 0;
                        await festService.setEntryLockRow(item.item_id, targetOpen);
                        startTransition(() => {
                          triggerRefresh();
                        });
                      }}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-heading font-semibold flex items-center gap-1 transition-all cursor-pointer ${openCollegesCount > 0
                          ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-500/30'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/30'
                        }`}
                    >
                      {openCollegesCount > 0 ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Open ({openCollegesCount})</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(item.item_id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Dropdown Panel - Clean Grid */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-3">
                    {/* Control Bar inside Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="relative max-w-xs flex-1">
                        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Filter colleges..."
                          aria-label="Filter colleges for this event"
                          value={collegeSearchQuery[item.item_id] || ''}
                          onChange={e =>
                            setCollegeSearchQuery(prev => ({
                              ...prev,
                              [item.item_id]: e.target.value
                            }))
                          }
                          className="w-full pl-7 pr-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-sans"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                          onClick={async () => {
                            await festService.setEntryLockRow(item.item_id, true);
                            startTransition(() => {
                              triggerRefresh();
                            });
                          }}
                        >
                          Open All
                        </button>
                        <span className="text-[var(--border-subtle)]">•</span>
                        <button
                          type="button"
                          className="text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-rose-700 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          onClick={async () => {
                            await festService.setEntryLockRow(item.item_id, false);
                            startTransition(() => {
                              triggerRefresh();
                            });
                          }}
                        >
                          Lock All
                        </button>
                      </div>
                    </div>

                    {/* Column-Wise Colleges Flow Layout */}
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
                      {filteredCollegesForEvent.map(col => {
                        const cell = lockMap.get(`${item.item_id}:${col.affl_no}`);
                        const isOpen = cell ? cell.is_open : !item.is_locked;

                        return (
                          <div
                            key={col.id}
                            className={`break-inside-avoid p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${isOpen
                                ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]'
                                : 'border-rose-500/20 bg-rose-500/5'
                              }`}
                          >
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shrink-0">
                                #{col.affl_no}
                              </span>
                              <span className="text-xs font-sans font-medium text-[var(--text-primary)] truncate" title={col.name}>
                                {col.short_name || col.code || col.name}
                              </span>
                            </div>

                            {/* College Toggle Button */}
                            <button
                              type="button"
                              onClick={async () => {
                                await festService.setEntryLockCell(item.item_id, col.affl_no, !isOpen);
                                startTransition(() => {
                                  triggerRefresh();
                                });
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-heading font-bold transition-all border shrink-0 cursor-pointer ${isOpen
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                                }`}
                            >
                              {isOpen ? 'Open' : 'Closed'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
