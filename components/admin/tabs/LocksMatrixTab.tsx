'use client';

import React, { useState, useMemo, startTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { EntryLock } from '@/lib/types/fest';

export function LocksMatrixTab() {
  const { triggerRefresh } = useFest();

  // Sort colleges numerically ascending by Affiliation Number (affl_no)
  const colleges = useMemo(() => {
    return [...festService.getColleges()].sort((a, b) => a.affl_no - b.affl_no);
  }, []);

  // Sort items numerically by item_id
  const items = useMemo(() => {
    return [...festService.getItems()].sort((a, b) => a.item_id - b.item_id);
  }, []);

  const locks = festService.getEntryLocks();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('All');

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

  // Filtered items based on search query & phase tab
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchPhase = selectedPhase === 'All' || item.phase === selectedPhase;
      const q = searchQuery.toLowerCase().trim();
      const itemCodeStr = (item.item_code || item.code || '').toLowerCase();
      const matchSearch =
        !q ||
        (item.name_eng && item.name_eng.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        itemCodeStr.includes(q) ||
        String(item.item_id).includes(q) ||
        (item.name_mal && item.name_mal.includes(q));

      return matchPhase && matchSearch;
    });
  }, [items, selectedPhase, searchQuery]);

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
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                Entry Locks Matrix
              </CardTitle>
              <Badge variant="navy" className="text-xs font-normal">
                Permissions Grid
              </Badge>
            </div>
            <CardDescription className="text-xs text-[var(--text-muted)] mt-1">
              Select an event to open or lock registration access per college.
            </CardDescription>
          </div>

          {/* Master Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              className="text-xs font-medium border-slate-700 hover:bg-emerald-950/30 hover:text-emerald-400 hover:border-emerald-800"
              onClick={() => {
                festService.setAllEntryLocks(true);
                startTransition(() => {
                  triggerRefresh();
                });
              }}
            >
              <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Open All
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="text-xs font-medium border-slate-700 hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-800"
              onClick={() => {
                festService.setAllEntryLocks(false);
                startTransition(() => {
                  triggerRefresh();
                });
              }}
            >
              <Lock className="w-3.5 h-3.5 mr-1 text-rose-400" /> Lock All
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-slate-400 hover:text-slate-200 text-xs"
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search event..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Minimalist Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {availablePhases.map(phase => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setSelectedPhase(phase)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedPhase === phase
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Dropdown Cards List - Clean Minimalist Style */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No events found matching your filter criteria.</p>
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
                className={`transition-colors border ${
                  isExpanded
                    ? 'border-slate-700 bg-[var(--bg-surface)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-slate-800'
                }`}
              >
                {/* Minimalist Event Header */}
                <div
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(item.item_id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Neutral Code & ID Badges */}
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      {itemCodeDisplay}
                    </span>
                    <span className="font-mono text-xs text-slate-400 shrink-0">
                      {itemIdDisplay}
                    </span>

                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={item.name_eng || item.name}>
                        {item.name_eng || item.name}
                      </h3>
                      {item.name_mal && (
                        <span className="text-xs text-slate-500">({item.name_mal})</span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400 text-[11px]">
                          {item.phase || item.category}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{item.mode}</span>
                        <span>•</span>
                        <span className="text-[11px]">
                          {item.point_type === 'group' || item.item_type === 'Group' ? 'Group' : 'Single'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Minimalist Summary & Row Lock Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Status Badge */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${
                      isAllOpen
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : isAllClosed
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {openCollegesCount}/{colleges.length} Open
                    </span>

                    {/* Minimalist Row Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        festService.setEntryLockRow(item.item_id, !isAllOpen);
                        startTransition(() => {
                          triggerRefresh();
                        });
                      }}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 transition-colors ${
                        isAllOpen
                          ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-800'
                          : 'bg-rose-950/30 text-rose-400 border-rose-800/60 hover:bg-emerald-950/30 hover:text-emerald-400 hover:border-emerald-800'
                      }`}
                    >
                      {isAllOpen ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Open</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(item.item_id)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Dropdown Panel - Clean Grid */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 p-3.5 space-y-3 rounded-b-xl">
                    {/* Control Bar inside Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="relative max-w-xs flex-1">
                        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Filter colleges..."
                          value={collegeSearchQuery[item.item_id] || ''}
                          onChange={e =>
                            setCollegeSearchQuery(prev => ({
                              ...prev,
                              [item.item_id]: e.target.value
                            }))
                          }
                          className="w-full pl-7 pr-3 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            festService.setEntryLockRow(item.item_id, true);
                            startTransition(() => {
                              triggerRefresh();
                            });
                          }}
                        >
                          Open All
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                          onClick={() => {
                            festService.setEntryLockRow(item.item_id, false);
                            startTransition(() => {
                              triggerRefresh();
                            });
                          }}
                        >
                          Lock All
                        </button>
                      </div>
                    </div>

                    {/* Minimalist Column-Wise Colleges Flow Layout */}
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
                      {filteredCollegesForEvent.map(col => {
                        const cell = lockMap.get(`${item.item_id}:${col.affl_no}`);
                        const isOpen = cell ? cell.is_open : !item.is_locked;

                        return (
                          <div
                            key={col.id}
                            className={`break-inside-avoid p-2 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                              isOpen
                                ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                                : 'border-rose-500/20 bg-rose-950/10'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-slate-400 px-1.5 py-0.2 rounded bg-slate-800/80">
                                #{col.affl_no}
                              </span>
                              <span className="text-xs font-medium text-[var(--text-primary)] truncate" title={col.name}>
                                {col.short_name || col.code || col.name}
                              </span>
                            </div>

                            {/* Minimalist College Toggle Button */}
                            <button
                              type="button"
                              onClick={() => {
                                festService.setEntryLockCell(item.item_id, col.affl_no, !isOpen);
                                startTransition(() => {
                                  triggerRefresh();
                                });
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border shrink-0 ${
                                isOpen
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
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
