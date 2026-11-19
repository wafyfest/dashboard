'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Download,
  Sparkles,
  Layers,
  CheckCircle,
  RotateCcw,
  Users,
  FileText,
  Building2,
  Star,
  Filter,
  ArrowUpRight,
  ArrowRight,
  Crown
} from 'lucide-react';
import { College, Item, Registration, Result, Student, LeaderboardEntry } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { generateCollegeResultsPdf, CollegeResultPdfRow } from '@/lib/utils/collegeResultsPdf';

interface CollegeResultsTabProps {
  college?: College;
  collegeAfflNo: number;
  results: Result[];
  registrations: Registration[];
  students: Student[];
  allItems: Item[];
  leaderboard?: LeaderboardEntry[];
  initialSubView?: 'points_table' | 'my_results';
  onRefresh?: () => void;
}

export function CollegeResultsTab({
  college,
  collegeAfflNo,
  results = [],
  registrations = [],
  students = [],
  allItems = [],
  leaderboard,
  initialSubView = 'points_table',
  onRefresh
}: CollegeResultsTabProps) {
  // Subview toggle: Championship Point Table vs My College Results
  const [subView, setSubView] = useState<'points_table' | 'my_results'>(initialSubView);

  // Point Table search & filter state
  const [pointTableSearch, setPointTableSearch] = useState('');
  const [pointTableType, setPointTableType] = useState<'all' | 'wafy' | 'prof'>('all');

  // Search & Filter state for My College Results
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<'all' | '1' | '2' | '3' | 'other'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');

  // Effective Leaderboard
  const effectiveLeaderboard = useMemo(() => {
    if (leaderboard && leaderboard.length > 0) return leaderboard;
    return festService.getLeaderboard();
  }, [leaderboard]);

  // Current College Standing in Leaderboard
  const myCollegeEntry = useMemo(() => {
    return effectiveLeaderboard.find(
      e => Number(e.college.affl_no) === Number(collegeAfflNo) || (college?.id && e.college.id === college.id)
    );
  }, [effectiveLeaderboard, collegeAfflNo, college]);

  // 1st Place Leader
  const firstPlaceEntry = useMemo(() => {
    return effectiveLeaderboard[0] || null;
  }, [effectiveLeaderboard]);

  // Points behind leader
  const pointsBehindLeader = useMemo(() => {
    if (!firstPlaceEntry || !myCollegeEntry) return 0;
    return Math.max(0, firstPlaceEntry.points - myCollegeEntry.points);
  }, [firstPlaceEntry, myCollegeEntry]);

  // Filtered leaderboard rows
  const filteredLeaderboard = useMemo(() => {
    return effectiveLeaderboard.filter(entry => {
      // Type filter
      if (pointTableType === 'wafy' && entry.college.type?.toLowerCase() !== 'wafy') return false;
      if (pointTableType === 'prof' && entry.college.type?.toLowerCase() !== 'prof' && !entry.college.type?.toLowerCase().includes('prof')) return false;

      // Search query
      if (pointTableSearch.trim()) {
        const q = pointTableSearch.toLowerCase().trim();
        const name = (entry.college.name || '').toLowerCase();
        const shortName = (entry.college.short_name || '').toLowerCase();
        const code = (entry.college.code || '').toLowerCase();
        const affl = String(entry.college.affl_no || '');
        return name.includes(q) || shortName.includes(q) || code.includes(q) || affl.includes(q);
      }
      return true;
    });
  }, [effectiveLeaderboard, pointTableType, pointTableSearch]);

  // Compute enriched rows for college results
  const enrichedResults = useMemo(() => {
    return results.map(res => {
      const itm = res.item || allItems.find(i => Number(i.item_id) === Number(res.item_id));
      const colAffl = Number(res.college_affl_no || collegeAfflNo);

      // Resolve participant / student
      const stu = res.student || findStudentByIdentifier(students, res.chest_no, colAffl);
      const canonicalChest = stu ? getCanonicalChestNo(stu) : res.chest_no;
      const chestNo = canonicalChest && canonicalChest !== '—' ? canonicalChest : (res.chest_no || '—');

      // Check if group item and resolve all group members from registrations
      const isGroup = itm?.point_type === 'group' || itm?.item_type === 'Group';
      const eventRegs = isGroup
        ? registrations.filter(
            r => Number(r.item_id) === Number(res.item_id) && Number(r.college_affl_no) === colAffl
          )
        : [];

      const groupMembers: Student[] = [];
      if (isGroup && eventRegs.length > 0) {
        eventRegs.forEach(r => {
          const s = r.student || findStudentByIdentifier(students, r.chest_no, colAffl);
          if (s && !groupMembers.some(gm => gm.id === s.id)) {
            groupMembers.push(s);
          }
        });
      }

      // Rank & Points
      const rankNum = res.rank !== null && res.rank !== undefined ? Number(res.rank) : null;
      const points = res.points !== null && res.points !== undefined ? Number(res.points) : 0;
      const grade = res.grade ? res.grade.trim().toUpperCase() : null;

      return {
        result: res,
        item: itm,
        student: stu,
        chestNo,
        isGroup,
        groupMembers,
        rankNum,
        points,
        grade
      };
    });
  }, [results, allItems, registrations, students, collegeAfflNo]);

  // Aggregate Metrics for My Results
  const metrics = useMemo(() => {
    let totalPts = 0;
    let firstCount = 0;
    let secondCount = 0;
    let thirdCount = 0;

    enrichedResults.forEach(r => {
      totalPts += r.points;
      if (r.rankNum === 1) firstCount++;
      else if (r.rankNum === 2) secondCount++;
      else if (r.rankNum === 3) thirdCount++;
    });

    return {
      totalPts,
      firstCount,
      secondCount,
      thirdCount,
      totalEntries: enrichedResults.length
    };
  }, [enrichedResults]);

  // Unique categories for filter dropdown
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedResults.forEach(r => {
      const cat = r.item?.phase || r.item?.category;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [enrichedResults]);

  // Filtered rows for My Results
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return enrichedResults.filter(r => {
      // Position filter
      if (positionFilter === '1' && r.rankNum !== 1) return false;
      if (positionFilter === '2' && r.rankNum !== 2) return false;
      if (positionFilter === '3' && r.rankNum !== 3) return false;
      if (positionFilter === 'other' && (r.rankNum === 1 || r.rankNum === 2 || r.rankNum === 3)) return false;

      // Category filter
      if (categoryFilter !== 'All') {
        const cat = r.item?.phase || r.item?.category || '';
        if (cat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // Grade filter
      if (gradeFilter !== 'All') {
        if (!r.grade || r.grade !== gradeFilter) return false;
      }

      // Search query
      if (q) {
        const itemCode = (r.item?.item_code || r.item?.code || '').toLowerCase();
        const itemName = (r.item?.name_eng || r.item?.name || '').toLowerCase();
        const stuName = (r.student?.name || r.student?.full_name || '').toLowerCase();
        const chest = String(r.chestNo || '').toLowerCase();
        const adm = String(r.student?.admission_no || r.student?.cic_no || '').toLowerCase();
        const groupMatch = r.groupMembers.some(gm =>
          (gm.name || gm.full_name || '').toLowerCase().includes(q) ||
          String(gm.chest_no || '').toLowerCase().includes(q)
        );

        if (
          !itemCode.includes(q) &&
          !itemName.includes(q) &&
          !stuName.includes(q) &&
          !chest.includes(q) &&
          !adm.includes(q) &&
          !groupMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedResults, searchQuery, positionFilter, categoryFilter, gradeFilter]);

  // Export to PDF
  const handleDownloadPdf = () => {
    const pdfRows: CollegeResultPdfRow[] = filteredRows.map(r => {
      const itemCode = r.item?.item_code || r.item?.code || `ITM-${r.result.item_id}`;
      const itemName = r.item?.name_eng || r.item?.name || 'Arts Event';
      const category = r.item?.phase || r.item?.category || 'General';

      let participantName = r.student?.full_name || r.student?.name || 'Participant';
      if (r.isGroup && r.groupMembers.length > 0) {
        participantName = `${college?.short_name || college?.name || 'College'} Team (${r.groupMembers.map(m => m.name || m.full_name).join(', ')})`;
      }

      const rankText =
        r.rankNum === 1
          ? '1st Prize'
          : r.rankNum === 2
          ? '2nd Prize'
          : r.rankNum === 3
          ? '3rd Prize'
          : '—';

      const gradeText = r.grade || '—';
      const pointsText = r.points > 0 ? `${r.points} Pts` : '0';

      return {
        itemCode,
        itemName,
        category,
        participantName,
        chestNo: r.chestNo !== '—' ? r.chestNo : '',
        rankText,
        gradeText,
        pointsText
      };
    });

    const doc = generateCollegeResultsPdf({
      collegeName: college?.name || `College #${collegeAfflNo}`,
      collegeAfflNo,
      collegeCode: college?.code,
      results: pdfRows,
      totalPoints: metrics.totalPts,
      firstCount: metrics.firstCount,
      secondCount: metrics.secondCount,
      thirdCount: metrics.thirdCount,
      festTitle: 'WAFY ARTS FEST'
    });

    doc.save(`WSF_Results_College_${collegeAfflNo}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--bg-surface)] p-6 sm:p-7 border border-[var(--border-subtle)] border-l-4 border-l-[var(--f-saffron)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-[11px] font-heading font-bold uppercase tracking-wider">
              {subView === 'points_table' ? (
                <>
                  <Trophy className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                  <span>Championship Point Table</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                  <span>Official College Results</span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-[var(--text-primary)]">
              {subView === 'points_table'
                ? 'Festival Championship Leaderboard'
                : `${college?.name || `College #${collegeAfflNo}`} — Published Results`}
            </h2>
            <p className="text-xs text-[var(--text-muted)] max-w-2xl font-sans leading-relaxed">
              {subView === 'points_table'
                ? 'Live inter-collegiate point table, medal tallies, and overall championship standings across all institutions competing in Wafy Arts Fest.'
                : 'Verified scores, awards, grades, and championship points published by the Tabulation Committee exclusively for your registered students and teams.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {subView === 'my_results' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={filteredRows.length === 0}
                className="gap-1.5 text-xs font-heading font-bold hover:border-[var(--f-saffron)] hover:text-[var(--f-saffron-text)] disabled:opacity-50"
                title="Download print-ready official PDF report"
              >
                <Download className="w-3.5 h-3.5 text-[var(--f-saffron-text)]" />
                <span>Download Results PDF</span>
              </Button>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="gap-1 text-xs"
                title="Refresh standings and results"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Subview Segmented View Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center p-1 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setSubView('points_table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all ${
              subView === 'points_table'
                ? 'bg-[var(--bg-surface)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
            <span>Championship Point Table</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold">
              {effectiveLeaderboard.length} Colleges
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('my_results')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all ${
              subView === 'my_results'
                ? 'bg-[var(--bg-surface)] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My College Results</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono font-bold">
              {enrichedResults.length} Events
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CHAMPIONSHIP POINT TABLE */}
      {subView === 'points_table' && (
        <div className="space-y-6">
          {/* 1. YOUR STANDING SPOTLIGHT BANNER */}
          {myCollegeEntry && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)] p-5 sm:p-6 border border-amber-500/30 border-l-4 border-l-[var(--f-saffron)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex flex-col items-center justify-center text-[var(--f-saffron)] shrink-0 shadow-sm">
                    <span className="text-[10px] uppercase font-heading font-bold tracking-wider leading-none text-amber-700 dark:text-amber-300">
                      Rank
                    </span>
                    <span className="text-xl font-mono font-black text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] leading-tight">
                      #{myCollegeEntry.rank}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-heading font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] uppercase tracking-wider">
                        Your Institution Standing
                      </span>
                      <Badge variant="saffron" size="sm">
                        {college?.code || `Affl #${collegeAfflNo}`}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        • Out of {effectiveLeaderboard.length} competing colleges
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-heading font-extrabold text-[var(--text-primary)]">
                      {college?.name || `College #${collegeAfflNo}`}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap pt-0.5">
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-200">
                        🥇 {myCollegeEntry.gold} Gold
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        🥈 {myCollegeEntry.silver} Silver
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-orange-700 dark:text-orange-300">
                        🥉 {myCollegeEntry.bronze} Bronze
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        Total: {myCollegeEntry.total_medals ?? (myCollegeEntry.gold + myCollegeEntry.silver + myCollegeEntry.bronze)} Medals
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[var(--bg-surface)]/90 backdrop-blur-sm p-4 rounded-2xl border border-[var(--border-subtle)] shrink-0">
                  <div className="space-y-0.5 pr-2">
                    <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Total Points
                    </div>
                    <div className="text-3xl font-mono font-black text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                      {myCollegeEntry.points} <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Pts</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {myCollegeEntry.rank === 1 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Leading Championship
                        </span>
                      ) : (
                        <span>
                          {pointsBehindLeader} pts behind 1st place
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSubView('my_results')}
                    className="gap-1.5 text-xs font-heading font-bold border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 shrink-0 self-stretch sm:self-auto"
                  >
                    <span>View Our Entries</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 2. OVERVIEW METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Metric 1: Current Rank */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Current Rank
                </div>
                <div className="text-2xl font-mono font-extrabold text-[var(--text-primary)]">
                  #{myCollegeEntry?.rank || '—'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  of {effectiveLeaderboard.length} colleges
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[var(--f-saffron)] shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 2: Total Points */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Total Points
                </div>
                <div className="text-2xl font-mono font-extrabold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  {myCollegeEntry?.points ?? 0}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  championship score
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[var(--f-saffron)] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 3: Medals Won */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Medals Won
                </div>
                <div className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {myCollegeEntry?.total_medals ?? (myCollegeEntry ? myCollegeEntry.gold + myCollegeEntry.silver + myCollegeEntry.bronze : 0)}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  🥇{myCollegeEntry?.gold || 0} 🥈{myCollegeEntry?.silver || 0} 🥉{myCollegeEntry?.bronze || 0}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Medal className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 4: Festival Leader */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Festival Leader 🥇
                </div>
                <div className="text-base font-heading font-extrabold text-[var(--text-primary)] truncate">
                  {firstPlaceEntry?.college.short_name || firstPlaceEntry?.college.name || '—'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono font-bold text-amber-600 dark:text-amber-400">
                  {firstPlaceEntry?.points ?? 0} Pts ({firstPlaceEntry?.gold ?? 0} Gold)
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 3. CHAMPIONSHIP POINT TABLE CARD */}
          <Card className="border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]" />
                    <span>Inter-Collegiate Championship Standings</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Showing {filteredLeaderboard.length} of {effectiveLeaderboard.length} participating colleges &amp; institutions
                  </CardDescription>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search college name, code, affl..."
                      value={pointTableSearch}
                      onChange={e => setPointTableSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans placeholder:text-[var(--text-muted)] w-56 sm:w-64 focus:outline-none focus:border-[var(--f-saffron)]"
                    />
                  </div>

                  {/* College Type Filter */}
                  <select
                    value={pointTableType}
                    onChange={e => setPointTableType(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans focus:outline-none"
                  >
                    <option value="all">All College Types</option>
                    <option value="wafy">Wafy Colleges</option>
                    <option value="prof">Professional (Prof)</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <TableRow className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60">
                      <TableHead className="w-16 text-center font-heading font-semibold py-2.5">Rank</TableHead>
                      <TableHead className="min-w-[240px] font-heading font-semibold py-2.5">College / Institution</TableHead>
                      <TableHead className="w-24 text-center font-heading font-semibold py-2.5">Type</TableHead>
                      <TableHead className="w-20 text-center font-heading font-semibold py-2.5">Gold 🥇</TableHead>
                      <TableHead className="w-20 text-center font-heading font-semibold py-2.5">Silver 🥈</TableHead>
                      <TableHead className="w-20 text-center font-heading font-semibold py-2.5">Bronze 🥉</TableHead>
                      <TableHead className="w-24 text-center font-heading font-semibold py-2.5">Medals</TableHead>
                      <TableHead className="w-28 text-right font-heading font-semibold py-2.5 pr-5">Total Points</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredLeaderboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                          <div className="max-w-md mx-auto space-y-2">
                            <Trophy className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                            <div className="font-heading font-bold text-sm text-[var(--text-primary)]">
                              No Colleges Found
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                              No colleges match the current search or filters. Try adjusting your search query.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeaderboard.map(entry => {
                        const isCurrent =
                          Number(entry.college.affl_no) === Number(collegeAfflNo) ||
                          (college?.id && entry.college.id === college.id);
                        const totalMedals = entry.total_medals ?? (entry.gold + entry.silver + entry.bronze);

                        return (
                          <TableRow
                            key={entry.college.id || entry.college.affl_no}
                            className={`border-b border-[var(--border-subtle)]/50 transition-colors ${
                              isCurrent
                                ? 'bg-amber-500/10 border-l-4 border-l-[var(--f-saffron)] font-medium'
                                : 'hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            {/* Rank */}
                            <TableCell className="py-3 text-center align-middle">
                              {entry.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-black text-xs border border-amber-500/40">
                                  🥇 1
                                </span>
                              ) : entry.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 font-mono font-black text-xs border border-slate-500/40">
                                  🥈 2
                                </span>
                              ) : entry.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-mono font-black text-xs border border-orange-500/40">
                                  🥉 3
                                </span>
                              ) : (
                                <span className="font-mono text-[var(--text-muted)] font-bold text-xs">
                                  #{entry.rank}
                                </span>
                              )}
                            </TableCell>

                            {/* College Info */}
                            <TableCell className="py-3 align-middle">
                              <div className="space-y-0.5">
                                <div className="font-heading font-bold text-[var(--text-primary)] text-xs flex items-center gap-2 flex-wrap">
                                  <span>{entry.college.name}</span>
                                  {isCurrent && (
                                    <Badge variant="saffron" size="sm">
                                      Your College
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                                  <span>Code: {entry.college.code || entry.college.short_name || '—'}</span>
                                  <span>•</span>
                                  <span>Affl #{entry.college.affl_no}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Type */}
                            <TableCell className="py-3 text-center align-middle">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5">
                                {entry.college.type || 'Wafy'}
                              </Badge>
                            </TableCell>

                            {/* Gold */}
                            <TableCell className="py-3 text-center align-middle font-mono font-bold text-amber-700 dark:text-amber-400">
                              {entry.gold > 0 ? entry.gold : <span className="text-[var(--text-muted)] opacity-60">0</span>}
                            </TableCell>

                            {/* Silver */}
                            <TableCell className="py-3 text-center align-middle font-mono font-bold text-slate-700 dark:text-slate-300">
                              {entry.silver > 0 ? entry.silver : <span className="text-[var(--text-muted)] opacity-60">0</span>}
                            </TableCell>

                            {/* Bronze */}
                            <TableCell className="py-3 text-center align-middle font-mono font-bold text-orange-700 dark:text-orange-400">
                              {entry.bronze > 0 ? entry.bronze : <span className="text-[var(--text-muted)] opacity-60">0</span>}
                            </TableCell>

                            {/* Total Medals */}
                            <TableCell className="py-3 text-center align-middle font-mono font-bold text-[var(--text-secondary)]">
                              {totalMedals}
                            </TableCell>

                            {/* Total Points */}
                            <TableCell className="py-3 text-right pr-5 align-middle">
                              <span className="font-mono font-black text-sm text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                                {entry.points}
                                <span className="text-[10px] font-sans font-semibold text-[var(--text-muted)] ml-1">Pts</span>
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW 2: MY COLLEGE RESULTS */}
      {subView === 'my_results' && (
        <div className="space-y-6">
          {/* Summary Score Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Points */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3 col-span-2 sm:col-span-1">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Total Points
                </div>
                <div className="text-2xl font-mono font-extrabold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                  {metrics.totalPts}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[var(--f-saffron)] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* 1st Prize */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  1st Prize 🥇
                </div>
                <div className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {metrics.firstCount}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {/* 2nd Prize */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  2nd Prize 🥈
                </div>
                <div className="text-2xl font-mono font-extrabold text-slate-700 dark:text-slate-300">
                  {metrics.secondCount}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-500/15 border border-slate-500/30 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <Medal className="w-5 h-5" />
              </div>
            </div>

            {/* 3rd Prize */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  3rd Prize 🥉
                </div>
                <div className="text-2xl font-mono font-extrabold text-orange-600 dark:text-orange-400">
                  {metrics.thirdCount}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* Total Scored Events */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] flex items-center justify-between gap-3 col-span-2 sm:col-span-1">
              <div className="space-y-0.5">
                <div className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Published Events
                </div>
                <div className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                  {metrics.totalEntries}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Results Table Card */}
          <Card className="border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--f-saffron-text)]" />
                    <span>My College Results Registry</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Showing {filteredRows.length} of {enrichedResults.length} published result records
                  </CardDescription>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search student / event..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans placeholder:text-[var(--text-muted)] w-48 sm:w-56 focus:outline-none focus:border-[var(--f-saffron)]"
                    />
                  </div>

                  {/* Position Filter */}
                  <select
                    value={positionFilter}
                    onChange={e => setPositionFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans focus:outline-none"
                  >
                    <option value="all">All Positions</option>
                    <option value="1">1st Prize Only 🥇</option>
                    <option value="2">2nd Prize Only 🥈</option>
                    <option value="3">3rd Prize Only 🥉</option>
                    <option value="other">Grades / Non-Winners</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Grade Filter */}
                  <select
                    value={gradeFilter}
                    onChange={e => setGradeFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans focus:outline-none"
                  >
                    <option value="All">All Grades</option>
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <TableRow className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60">
                      <TableHead className="w-10 text-center font-heading font-semibold py-2.5">#</TableHead>
                      <TableHead className="w-24 font-heading font-semibold py-2.5">Code</TableHead>
                      <TableHead className="w-64 font-heading font-semibold py-2.5">Event Name</TableHead>
                      <TableHead className="w-32 font-heading font-semibold py-2.5">Phase / Cat</TableHead>
                      <TableHead className="w-64 font-heading font-semibold py-2.5">Student / Team</TableHead>
                      <TableHead className="w-32 text-center font-heading font-semibold py-2.5">Position</TableHead>
                      <TableHead className="w-20 text-center font-heading font-semibold py-2.5">Grade</TableHead>
                      <TableHead className="w-24 text-right font-heading font-semibold py-2.5 pr-4">Points</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                          {enrichedResults.length === 0 ? (
                            <div className="max-w-md mx-auto space-y-2">
                              <Trophy className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                              <div className="font-heading font-bold text-sm text-[var(--text-primary)]">
                                No Published Results Yet
                              </div>
                              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Once the Tabulation Committee verifies and publishes results for events in which your students participated, they will appear here with points, grades, and awards.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="font-semibold text-xs text-[var(--text-primary)]">No matching results</div>
                              <div className="text-[11px] text-[var(--text-muted)]">Try adjusting your filters or search keywords.</div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((r, idx) => {
                        const itmCode = r.item?.item_code || r.item?.code || `ITM-${r.result.item_id}`;
                        const itmName = r.item?.name_eng || r.item?.name || 'Arts Event';
                        const phase = r.item?.phase || r.item?.category || 'General';

                        return (
                          <TableRow
                            key={r.result.id || idx}
                            className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-hover)] transition-colors"
                          >
                            {/* Index */}
                            <TableCell className="py-2.5 text-center font-mono text-[var(--text-muted)] text-[11px]">
                              {idx + 1}
                            </TableCell>

                            {/* Event Code */}
                            <TableCell className="py-2.5 font-mono font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                              {itmCode}
                            </TableCell>

                            {/* Event Name */}
                            <TableCell className="py-2.5 align-middle">
                              <div className="font-heading font-bold text-[var(--text-primary)] text-xs">
                                {itmName}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                {r.isGroup ? 'Group Event' : 'Individual Event'}
                              </div>
                            </TableCell>

                            {/* Category */}
                            <TableCell className="py-2.5 align-middle">
                              <CategoryBadge category={phase} />
                            </TableCell>

                            {/* Student / Team */}
                            <TableCell className="py-2.5 align-middle">
                              {r.isGroup ? (
                                <div className="space-y-0.5">
                                  <div className="font-heading font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                                    <Users className="w-3 h-3 text-[var(--f-saffron)]" />
                                    <span>{college?.short_name || college?.name || 'College'} Team</span>
                                  </div>
                                  {r.groupMembers.length > 0 ? (
                                    <div className="text-[10.5px] text-[var(--text-muted)] truncate max-w-[240px]">
                                      {r.groupMembers.map(m => m.name || m.full_name).join(', ')}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-mono text-[var(--text-muted)]">
                                      Chest: {r.chestNo}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="font-heading font-bold text-xs text-[var(--text-primary)]">
                                    {r.student?.full_name || r.student?.name || 'Participant'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                                    <span>#{r.chestNo}</span>
                                    {r.student?.admission_no && (
                                      <span>• CIC: {r.student.admission_no}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </TableCell>

                            {/* Position Badge */}
                            <TableCell className="py-2.5 text-center align-middle">
                              {r.rankNum === 1 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                  🥇 1st Prize
                                </span>
                              ) : r.rankNum === 2 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-500/30 bg-slate-500/15 text-slate-800 dark:text-slate-200">
                                  🥈 2nd Prize
                                </span>
                              ) : r.rankNum === 3 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-orange-500/30 bg-orange-500/15 text-orange-800 dark:text-orange-300">
                                  🥉 3rd Prize
                                </span>
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)] font-mono">—</span>
                              )}
                            </TableCell>

                            {/* Grade Badge */}
                            <TableCell className="py-2.5 text-center align-middle">
                              {r.grade ? (
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                                    r.grade === 'A' || r.grade === 'A+'
                                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : r.grade === 'B'
                                      ? 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                      : 'border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  Grade {r.grade}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)] font-mono">—</span>
                              )}
                            </TableCell>

                            {/* Points Earned */}
                            <TableCell className="py-2.5 text-right pr-4 align-middle">
                              <span
                                className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded ${
                                  r.points > 0
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                                    : 'text-[var(--text-muted)]'
                                }`}
                              >
                                {r.points > 0 ? `+${r.points} Pts` : '0 Pts'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
