'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Search,
  Sparkles,
  Building2,
  Layers,
  Star,
  Percent,
  TrendingUp,
  Flame
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { College, Item, Result, isNonTabulationEvent, isSpecialEvent, normalizeCategoryKey } from '@/lib/types/fest';

export type PointTableViewMode = 'overall' | 'foundation' | 'thamheediyya' | 'aliya' | 'general' | 'special';

interface PointTableTabProps {
  colleges: College[];
  items: Item[];
  results: Result[];
}

interface CollegeStanding {
  college: College;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  totalMedals: number;
  eventsCount: number;
  // Specific to overall championship percentage formula (Rule 1 & 2):
  eligibleEventsCount: number;
  maxPossibleMarks: number;
  percentage: number;
}

export function PointTableTab({ colleges, items, results }: PointTableTabProps) {
  const [activeSection, setActiveSection] = useState<PointTableViewMode>('overall');
  const [searchQuery, setSearchQuery] = useState('');

  // Map items by item_id
  const itemsById = useMemo(() => {
    return new Map<number, Item>(items.map(i => [Number(i.item_id || i.id), i]));
  }, [items]);

  // Only published results contribute to the official points table
  const publishedResults = useMemo(() => {
    return results.filter(r => r.published);
  }, [results]);

  // Pre-calculate maximum possible points for each event (Winning 1st place with Grade A+)
  // Rule 8 & 10:
  //   Cat A: 12 + 7 = 19
  //   Cat B: 10 + 7 = 17
  //   Cat C: 20 + 7 = 27
  //   Cat D: 0
  const eventMaxMarks = useMemo(() => {
    const map = new Map<number, number>();
    items.forEach(itm => {
      const id = Number(itm.item_id || itm.id);
      if (isNonTabulationEvent(itm)) {
        map.set(id, 0);
        return;
      }
      const cat = (itm.category || '').trim().toUpperCase();
      let maxPts = 17; // default Cat B
      if (cat === 'A') maxPts = 19;
      else if (cat === 'C') maxPts = 27;
      else if (cat === 'D') maxPts = 0;
      map.set(id, maxPts);
    });
    return map;
  }, [items]);

  // Check if a college offers/participates in a specific phase
  const collegeHasPhase = (col: College, section: PointTableViewMode): boolean => {
    if (section === 'overall' || section === 'special') return true;
    if (section === 'foundation') {
      return (col.st_foundation ?? 0) > 0 || (col.st_pre_foundation ?? 0) > 0;
    }
    if (section === 'thamheediyya') {
      return (col.st_thamheediya ?? 0) > 0;
    }
    if (section === 'aliya') {
      return (col.st_aliya ?? 0) > 0;
    }
    if (section === 'general') {
      // General phase is open to Thamheediyya and Aliya colleges
      return (col.st_thamheediya ?? 0) > 0 || (col.st_aliya ?? 0) > 0;
    }
    return true;
  };

  // Determine eligible events for a college in Overall Championship (Rule 1 & 2: Thamheediyya, Aliya, General)
  const getEligibleOverallEventsForCollege = (col: College): Item[] => {
    const hasTh = (col.st_thamheediya ?? 0) > 0;
    const hasAl = (col.st_aliya ?? 0) > 0;

    return items.filter(itm => {
      // Rule 3: Foundation and Special events are strictly excluded from Overall Championship
      if (isSpecialEvent(itm) || isNonTabulationEvent(itm)) return false;
      const normPhase = normalizeCategoryKey(itm.phase || itm.category);
      if (normPhase === 'FOUNDATION' || normPhase === 'SPECIAL_FOUNDATION') return false;

      if (normPhase === 'THAMHEEDIYYA') return hasTh;
      if (normPhase === 'ALIYA') return hasAl;
      if (normPhase === 'GENERAL') return hasTh || hasAl;
      return false;
    });
  };

  // Compute standings per phase/section
  const computeStandings = (section: PointTableViewMode): CollegeStanding[] => {
    const eligibleColleges = colleges.filter(c => collegeHasPhase(c, section));

    const map = new Map<number, { points: number; gold: number; silver: number; bronze: number; events: Set<number> }>();
    eligibleColleges.forEach(c => {
      map.set(c.affl_no, { points: 0, gold: 0, silver: 0, bronze: 0, events: new Set() });
    });

    publishedResults.forEach(res => {
      if (!res.college_affl_no) return;
      const itm = res.item_id != null ? itemsById.get(Number(res.item_id)) : undefined;
      if (!itm) return;

      const normPhase = normalizeCategoryKey(itm.phase || itm.category);
      const isSpec = isSpecialEvent(itm);

      // Section filtering logic
      let matches = false;
      if (section === 'overall') {
        // Overall: Only Thamheediyya, Aliya, General (Foundation & Special excluded)
        matches = !isSpec && !isNonTabulationEvent(itm) && normPhase !== 'FOUNDATION' && normPhase !== 'SPECIAL_FOUNDATION';
      } else if (section === 'foundation') {
        matches = (normPhase === 'FOUNDATION' || normPhase === 'SPECIAL_FOUNDATION') && !isNonTabulationEvent(itm);
      } else if (section === 'thamheediyya') {
        matches = normPhase === 'THAMHEEDIYYA' && !isNonTabulationEvent(itm);
      } else if (section === 'aliya') {
        matches = normPhase === 'ALIYA' && !isNonTabulationEvent(itm);
      } else if (section === 'general') {
        matches = normPhase === 'GENERAL' && !isNonTabulationEvent(itm);
      } else if (section === 'special') {
        matches = isSpec;
      }

      if (!matches) return;

      const standing = map.get(res.college_affl_no);
      if (standing) {
        const pts = (section === 'special' && isNonTabulationEvent(itm)) ? 0 : (res.points || 0);
        standing.points += pts;
        if (res.rank === 1) standing.gold += 1;
        else if (res.rank === 2) standing.silver += 1;
        else if (res.rank === 3) standing.bronze += 1;
        if (res.item_id) standing.events.add(Number(res.item_id));
      }
    });

    const list: CollegeStanding[] = eligibleColleges.map(col => {
      const stats = map.get(col.affl_no) || { points: 0, gold: 0, silver: 0, bronze: 0, events: new Set() };
      
      // Compute percentage metrics for Overall Championship (Rule 1 & 2)
      let eligibleEventsCount = 0;
      let maxPossibleMarks = 0;
      let percentage = 0;

      if (section === 'overall') {
        const eligibleEvents = getEligibleOverallEventsForCollege(col);
        eligibleEventsCount = eligibleEvents.length;
        maxPossibleMarks = eligibleEvents.reduce((acc, itm) => acc + (eventMaxMarks.get(Number(itm.item_id || itm.id)) || 0), 0);
        if (maxPossibleMarks > 0) {
          percentage = (stats.points / maxPossibleMarks) * 100;
        }
      }

      return {
        college: col,
        points: stats.points,
        gold: stats.gold,
        silver: stats.silver,
        bronze: stats.bronze,
        totalMedals: stats.gold + stats.silver + stats.bronze,
        eventsCount: stats.events.size,
        eligibleEventsCount,
        maxPossibleMarks,
        percentage
      };
    });

    // Sorting:
    // If Overall Championship: Sort primarily by Percentage (%) DESC, then by points DESC
    // If Phase Standings: Sort by Points DESC, then gold DESC
    list.sort((a, b) => {
      if (section === 'overall') {
        if (Math.abs(b.percentage - a.percentage) > 0.001) {
          return b.percentage - a.percentage;
        }
      }
      if (b.points !== a.points) return b.points - a.points;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return (a.college.name || '').localeCompare(b.college.name || '');
    });

    return list;
  };

  const currentStandings = useMemo(() => {
    return computeStandings(activeSection);
  }, [activeSection, publishedResults, colleges, itemsById, eventMaxMarks]);

  // Emerging College (Rule 4: Top College from Thamheediyya Oola / 1st year)
  const emergingCollege = useMemo(() => {
    // Filter for Thamheediyya Oola events or Thamheediyya overall
    const thStandings = computeStandings('thamheediyya');
    return thStandings.find(s => s.points > 0);
  }, [publishedResults, colleges, itemsById, eventMaxMarks]);

  // Filter by search query
  const filteredStandings = useMemo(() => {
    if (!searchQuery.trim()) return currentStandings;
    const q = searchQuery.toLowerCase().trim();
    return currentStandings.filter(s =>
      s.college.name?.toLowerCase().includes(q) ||
      s.college.short_name?.toLowerCase().includes(q) ||
      String(s.college.affl_no).includes(q) ||
      s.college.address?.toLowerCase().includes(q)
    );
  }, [currentStandings, searchQuery]);

  // Top overall leader
  const topLeader = currentStandings[0];
  const totalPointsAwarded = useMemo(() => {
    return currentStandings.reduce((sum, s) => sum + s.points, 0);
  }, [currentStandings]);

  // Special Events Specific Results (List items SE090-SE093 with places)
  const specialEventItems = useMemo(() => {
    return items.filter(i => isSpecialEvent(i));
  }, [items]);

  const specialEventResults = useMemo(() => {
    if (activeSection !== 'special') return [];
    return specialEventItems.map(item => {
      const itemResults = publishedResults.filter(r => Number(r.item_id) === Number(item.item_id || item.id));
      const first = itemResults.find(r => r.rank === 1);
      const second = itemResults.find(r => r.rank === 2);
      const third = itemResults.find(r => r.rank === 3);

      const getCollege = (afflNo?: number | null) => colleges.find(c => c.affl_no === afflNo);

      return {
        item,
        first: first ? { res: first, col: getCollege(first.college_affl_no) } : null,
        second: second ? { res: second, col: getCollege(second.college_affl_no) } : null,
        third: third ? { res: third, col: getCollege(third.college_affl_no) } : null,
        published: itemResults.length > 0,
      };
    });
  }, [activeSection, specialEventItems, publishedResults, colleges]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)]">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-heading font-black text-[var(--text-primary)] tracking-tight">
                Festival Points & Championship Table
              </h2>
              <Badge variant="amber" size="sm">
                Official Rulebook Engine
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeSection === 'overall'
                ? 'Overall Championship is decided by percentage of marks obtained out of maximum possible marks across eligible events.'
                : 'Championship points aggregated from published results for this section.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeSection === 'overall' && emergingCollege && (
              <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-right">
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 justify-end">
                  <Flame className="w-3 h-3 text-orange-500" />
                  Emerging College (Thamheediyya)
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[190px] inline-block">
                  {emergingCollege.college.short_name || emergingCollege.college.name} ({emergingCollege.points} pts)
                </span>
              </div>
            )}

            <div className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-right">
              <span className="text-[10px] text-[var(--text-muted)] block font-medium">
                {activeSection === 'overall' ? 'Current Overall Leader' : 'Section Leader'}
              </span>
              <span className="text-xs font-bold text-amber-500 truncate max-w-[180px] inline-block">
                {topLeader?.college.short_name || topLeader?.college.name || 'Pending'}
                {activeSection === 'overall' && topLeader?.percentage
                  ? ` (${topLeader.percentage.toFixed(1)}%)`
                  : ` (${topLeader?.points || 0} pts)`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Navigation Pills: Overall, Foundation, Thamheediyya, Aliya, General, Special */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-6 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveSection('overall')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'overall'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Overall Championship (%)</span>
          </button>

          <button
            onClick={() => setActiveSection('foundation')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'foundation'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Foundation (Trophy)</span>
          </button>

          <button
            onClick={() => setActiveSection('thamheediyya')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'thamheediyya'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Thamheediyya</span>
          </button>

          <button
            onClick={() => setActiveSection('aliya')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'aliya'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Aliya</span>
          </button>

          <button
            onClick={() => setActiveSection('general')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'general'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveSection('special')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'special'
                ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Special Events</span>
          </button>
        </div>
      </div>

      {/* 3. Special Event Highlights (When Special tab is selected) */}
      {activeSection === 'special' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Special Events & Program Winners
            </h3>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Category D / Non-Tabulation & Foundation Expo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialEventResults.map(({ item, first, second, third, published }) => (
              <Card key={item.item_id || item.id} className="p-4 border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)] bg-amber-500/10 px-2 py-0.5 rounded">
                        {item.item_code || item.code}
                      </span>
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        {item.name_eng || item.name}
                      </span>
                    </div>
                    {item.name_mal && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.name_mal}</div>
                    )}
                  </div>
                  {published ? (
                    <Badge variant="success" size="sm">Published</Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">Awaiting Results</Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* 1st Place */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      🥇 1st Place
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                      {first?.col?.name || first?.col?.short_name || 'Not yet awarded'}
                    </span>
                  </div>

                  {/* 2nd Place */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      🥈 2nd Place
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                      {second?.col?.name || second?.col?.short_name || 'Not yet awarded'}
                    </span>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <span className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                      🥉 3rd Place
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                      {third?.col?.name || third?.col?.short_name || 'Not yet awarded'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. Search and Main Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search college name, code, or place..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:border-amber-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono">
            {activeSection === 'overall' && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                Formula: (ലഭിച്ച മാർക്ക് / പരമാവധി മാർക്ക്) × 100
              </span>
            )}
            <span>Showing {filteredStandings.length} Colleges</span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">Rank</TableHead>
                <TableHead className="min-w-[220px]">College</TableHead>
                <TableHead className="w-20 text-center">Code</TableHead>

                {activeSection === 'overall' ? (
                  <>
                    <TableHead className="w-24 text-center" title="പങ്കെടുക്കാവുന്ന മത്സരങ്ങളുടെ എണ്ണം">
                      Eligible
                    </TableHead>
                    <TableHead className="w-28 text-center" title="പരമാവധി ലഭിക്കുന്ന മാർക്ക്">
                      Max Marks
                    </TableHead>
                    <TableHead className="w-28 text-center" title="ലഭിച്ച മാർക്ക്">
                      Obtained
                    </TableHead>
                    <TableHead className="w-32 text-center" title="ശതമാനം">
                      Percentage (%)
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="w-20 text-center">🥇 1st</TableHead>
                    <TableHead className="w-20 text-center">🥈 2nd</TableHead>
                    <TableHead className="w-20 text-center">🥉 3rd</TableHead>
                    <TableHead className="w-24 text-center">Events</TableHead>
                    <TableHead className="w-32 text-right pr-6">Phase Points</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStandings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activeSection === 'overall' ? 7 : 8}
                    className="text-center py-8 text-xs text-[var(--text-muted)]"
                  >
                    No colleges match your search query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStandings.map((standing, index) => {
                  const hasPoints = standing.points > 0 || standing.percentage > 0;
                  return (
                    <TableRow
                      key={standing.college.affl_no || standing.college.id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${
                        index === 0 && hasPoints ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Rank */}
                      <TableCell className="text-center font-bold">
                        {index === 0 && hasPoints ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs mx-auto font-black shadow-xs">
                            1
                          </span>
                        ) : index === 1 && hasPoints ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-black dark:text-white flex items-center justify-center text-xs mx-auto font-black">
                            2
                          </span>
                        ) : index === 2 && hasPoints ? (
                          <span className="w-6 h-6 rounded-full bg-orange-400 text-black flex items-center justify-center text-xs mx-auto font-black">
                            3
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {index + 1}
                          </span>
                        )}
                      </TableCell>

                      {/* College Name & Place */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[var(--text-primary)] truncate">
                              {standing.college.name}
                            </div>
                            {standing.college.address && (
                              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                                {standing.college.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Affiliation Code */}
                      <TableCell className="text-center font-mono text-xs font-semibold text-[var(--text-secondary)]">
                        {standing.college.short_name || standing.college.affl_no}
                      </TableCell>

                      {/* Overall Mode Columns */}
                      {activeSection === 'overall' ? (
                        <>
                          {/* Eligible Events Count */}
                          <TableCell className="text-center font-mono text-xs text-[var(--text-secondary)]">
                            {standing.eligibleEventsCount}
                          </TableCell>

                          {/* Max Possible Marks */}
                          <TableCell className="text-center font-mono text-xs text-[var(--text-muted)]">
                            {standing.maxPossibleMarks}
                          </TableCell>

                          {/* Obtained Marks */}
                          <TableCell className="text-center font-mono text-xs font-bold text-[var(--text-primary)]">
                            {standing.points}
                          </TableCell>

                          {/* Percentage (%) */}
                          <TableCell className="text-center font-mono font-black text-sm">
                            <span
                              className={
                                standing.percentage > 0
                                  ? 'text-amber-600 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10'
                                  : 'text-[var(--text-muted)]'
                              }
                            >
                              {standing.percentage > 0 ? `${standing.percentage.toFixed(2)}%` : '0.00%'}
                            </span>
                          </TableCell>
                        </>
                      ) : (
                        /* Phase Mode Columns */
                        <>
                          {/* 1st Places */}
                          <TableCell className="text-center font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {standing.gold}
                          </TableCell>

                          {/* 2nd Places */}
                          <TableCell className="text-center font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {standing.silver}
                          </TableCell>

                          {/* 3rd Places */}
                          <TableCell className="text-center font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                            {standing.bronze}
                          </TableCell>

                          {/* Events Count */}
                          <TableCell className="text-center font-mono text-xs text-[var(--text-muted)]">
                            {standing.eventsCount}
                          </TableCell>

                          {/* Total Points */}
                          <TableCell className="text-right pr-6 font-mono font-black text-sm text-[var(--text-primary)]">
                            <span className={standing.points > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}>
                              {standing.points}
                            </span>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
