'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
  ExternalLink,
  Award,
  Building2,
  Trophy,
  Star,
  Medal,
} from 'lucide-react';
import { StudentTab } from '@/components/roles/StudentView';

interface SlideItem {
  title: string;
  subtitle: string;
  badge: string;
  theme: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StudentDashboardTabProps {
  slides: SlideItem[];
  activeSlide: number;
  setActiveSlide: React.Dispatch<React.SetStateAction<number>>;
  onNavigateTab: (tab: StudentTab) => void;
  rulebookUrl?: string | null;
  studentCollege: any;
  myCollegeResults: any[];
  notableStars: any[];
  topCollegesDisplay: {
    list: any[];
  };
  userAfflNo?: number;
  publishedResults: any[];
  displayedLatestResults: any[];
  resultsDisplayCount: number;
  setResultsDisplayCount: React.Dispatch<React.SetStateAction<number>>;
}

export function StudentDashboardTab({
  slides,
  activeSlide,
  setActiveSlide,
  onNavigateTab,
  rulebookUrl,
  studentCollege,
  myCollegeResults,
  notableStars,
  topCollegesDisplay,
  userAfflNo,
  publishedResults,
  displayedLatestResults,
  resultsDisplayCount,
  setResultsDisplayCount,
}: StudentDashboardTabProps) {
  const currentSlide = slides[activeSlide] || slides[0];

  return (
    <div className="space-y-6">
      {/* A. Highlighted Images Slideshow */}
      <div className="relative rounded-3xl overflow-hidden shadow-elevated border border-[var(--border-subtle)] [box-shadow:var(--shadow-elevated),var(--glass-highlight)]">
        <div
          className={`p-8 sm:p-12 bg-gradient-to-br ${currentSlide.theme} text-white min-h-[220px] flex flex-col justify-between transition-all duration-500 relative`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-300 text-xs font-heading font-bold border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentSlide.badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight leading-tight text-white">
              {currentSlide.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none ${
                    activeSlide === idx ? 'w-8 bg-[var(--f-saffron)] shadow-[0_0_10px_var(--f-saffron)]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveSlide(prev => (prev + 1) % slides.length)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* B. Quick Links Bar (Live, Manual, Appeal Form) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateTab('schedule')}
          className="p-4 rounded-2xl bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-subtle)] hover:border-amber-500/40 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:-translate-y-0.5 flex items-center justify-between group transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-heading font-bold text-[var(--text-primary)] group-hover:text-[var(--f-saffron-text)] transition-colors">
                Live Stage Tracking
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-sans">Check current venue timings</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--f-saffron-text)] group-hover:translate-x-0.5 transition-all" />
        </button>

        {rulebookUrl ? (
          <a
            href={rulebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-subtle)] hover:border-amber-500/40 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:-translate-y-0.5 flex items-center justify-between group transition-all text-left focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-heading font-bold text-[var(--text-primary)] group-hover:text-[var(--f-saffron-text)] transition-colors">
                  Official Fest Manual
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-sans">Download rulebook & criteria</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--f-saffron-text)] group-hover:translate-x-0.5 transition-all" />
          </a>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] opacity-70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-heading font-bold text-[var(--text-primary)]">Official Fest Manual</div>
              <div className="text-[11px] text-[var(--text-muted)] font-sans">Distributed via College Coordinator</div>
            </div>
          </div>
        )}

        <button
          onClick={() => onNavigateTab('my_results')}
          className="p-4 rounded-2xl bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-subtle)] hover:border-amber-500/40 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:-translate-y-0.5 flex items-center justify-between group transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-heading font-bold text-[var(--text-primary)] group-hover:text-[var(--f-saffron-text)] transition-colors">
                My Results & Social Poster
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-sans">Download & share achievement poster</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--f-saffron-text)] group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* C. Two Column Section: My College Results & Notable Stars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My College Results */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--f-saffron)]" />
                  <span>My College Results</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 font-sans">
                  Published ranks won by <strong>{studentCollege?.short_name || studentCollege?.name || 'My College'}</strong>
                </CardDescription>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                {myCollegeResults.length} Wins
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myCollegeResults.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <Trophy className="w-7 h-7 text-[var(--text-muted)] mx-auto opacity-40" />
                <p className="text-xs text-[var(--text-muted)] font-medium font-sans">
                  No published results for your college yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {myCollegeResults.slice(0, 5).map(res => (
                  <div key={res.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-[var(--text-primary)] truncate">
                        {res.item?.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        {res.chest_no} • {res.grade ? `Grade ${res.grade}` : 'Published'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                          res.rank === 1
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/35'
                            : res.rank === 2
                            ? 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200 border border-neutral-500/30'
                            : 'bg-orange-500/15 text-orange-900 dark:text-orange-300 border border-orange-500/30'
                        }`}
                      >
                        {res.rank === 1 ? '🥇 1st' : res.rank === 2 ? '🥈 2nd' : '🥉 3rd'}
                      </span>
                      <span className="font-mono font-extrabold text-[var(--text-primary)]">
                        +{res.points || 0} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notable Stars */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-bold flex items-center gap-2">
                  <Star className="w-4 h-4 text-[var(--f-saffron)]" />
                  <span>Notable Stars</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 font-sans">
                  Leading point contributors for <strong>{studentCollege?.short_name || 'My College'}</strong>
                </CardDescription>
              </div>
              <span className="text-[11px] font-heading font-semibold text-[var(--f-saffron-text)]">
                Leaderboard
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notableStars.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Star className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                <p className="text-xs text-[var(--text-muted)] font-medium font-sans">
                  Points tally will appear as competitions conclude.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {notableStars.map((star, idx) => (
                  <div key={star.student.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/35'
                            : idx === 1
                            ? 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200 border border-neutral-500/30'
                            : idx === 2
                            ? 'bg-orange-500/15 text-orange-900 dark:text-orange-300 border border-orange-500/30'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-heading font-bold text-[var(--text-primary)] truncate">
                          {star.student.full_name || star.student.name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          Adm: {star.student.admission_no} • {star.student.phase}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-sm text-[var(--text-primary)]">
                        {star.points} pts
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        🥇{star.golds} 🥈{star.silvers} 🥉{star.bronzes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* D. Two Column Section: Top Colleges & Latest Published Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Colleges */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <CardTitle className="text-sm font-heading font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--f-saffron)]" />
                <span>Top Colleges Standings</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 font-sans">
                Overall trophy race & aggregate points table
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading font-semibold">Rank & College</TableHead>
                  <TableHead className="text-right font-heading font-semibold">Medals</TableHead>
                  <TableHead className="text-right font-heading font-semibold">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCollegesDisplay.list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                      Leaderboard will populate as stage results are ratified.
                    </TableCell>
                  </TableRow>
                ) : (
                  topCollegesDisplay.list.map((entry, index) => {
                    const isUserCol = Number(entry.college.affl_no) === Number(userAfflNo);
                    return (
                      <TableRow
                        key={entry.college.id || index}
                        className={isUserCol ? 'bg-amber-500/10 dark:bg-amber-500/15 font-semibold' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                                entry.rank === 1
                                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/35'
                                  : entry.rank === 2
                                  ? 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200 border border-neutral-500/30'
                                  : entry.rank === 3
                                  ? 'bg-orange-500/15 text-orange-900 dark:text-orange-300 border border-orange-500/30'
                                  : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-bold'
                              }`}
                            >
                              #{entry.rank}
                            </span>
                            <div>
                              <div className="font-heading font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>{entry.college.code || entry.college.short_name}</span>
                                {isUserCol && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300 font-heading font-semibold border border-amber-500/30">
                                    My College
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px] font-sans">
                                {entry.college.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-mono text-[var(--text-secondary)]">
                          🥇{entry.gold} 🥈{entry.silver} 🥉{entry.bronze}
                        </TableCell>
                        <TableCell className="text-right font-black font-mono text-sm text-[var(--text-primary)]">
                          {entry.points}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Latest Published Results */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-bold flex items-center gap-2">
                  <Medal className="w-4 h-4 text-[var(--f-saffron)]" />
                  <span>Latest Competition Results</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 font-sans">
                  Recently ratified stage rankings
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Showing {displayedLatestResults.length} of {publishedResults.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayedLatestResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-sans">
                No results have been officially published yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {displayedLatestResults.map(res => (
                  <div key={res.id} className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-[var(--text-primary)]">
                        {res.item?.name}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {res.item?.phase} • {res.item?.item_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)] font-sans">
                        Winner: <strong className="text-[var(--text-primary)] font-heading">{res.college?.code || res.college?.short_name}</strong> ({res.chest_no})
                      </span>
                      <span className="font-heading font-semibold text-[var(--f-saffron-text)]">
                        Rank #{res.rank} ({res.points} pts)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show More / Show Less Button */}
            {publishedResults.length > 5 && (
              <div className="p-3 border-t border-[var(--border-subtle)] text-center bg-[var(--bg-subtle)]">
                {resultsDisplayCount < publishedResults.length ? (
                  <button
                    onClick={() => setResultsDisplayCount(prev => prev + 5)}
                    className="text-xs font-heading font-bold text-[var(--f-saffron-text)] hover:text-[var(--f-saffron-text-strong)] hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
                  >
                    Show More Results ({publishedResults.length - resultsDisplayCount} remaining) ↓
                  </button>
                ) : (
                  <button
                    onClick={() => setResultsDisplayCount(5)}
                    className="text-xs font-heading font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
                  >
                    Show Less ↑
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

