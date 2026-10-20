'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, StageStatusBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  GraduationCap,
  Printer,
  Calendar,
  Award,
  Clock,
  QrCode,
  Trophy,
  Star,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Medal,
  Users,
  Compass
} from 'lucide-react';
import { Student, Result, College, Item, Appeal } from '@/lib/types/fest';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  registrationContainsStudent
} from '@/lib/utils/studentIdentity';

export type StudentTab = 'dashboard' | 'schedule' | 'admit_card' | 'results' | 'appeals';

interface StudentViewProps {
  activeTab?: StudentTab;
  onTabChange?: (tab: StudentTab) => void;
}

// Curated fest showcase slides
const HIGHLIGHT_SLIDES = [
  {
    title: '14th Wafy Arts Fest Grand Stage',
    subtitle: 'Celebrating intellectual eloquence, Quranic scholarship & multifaceted arts',
    badge: 'Kalam Grand Auditorium',
    theme: 'from-emerald-950 via-slate-900 to-slate-950',
    accent: 'emerald',
    icon: Sparkles
  },
  {
    title: 'Inter-Collegiate Literary & Oratory Contests',
    subtitle: 'Over 1,700 scholars competing across Arabic, English, Urdu & Malayalam',
    badge: 'Live Across 4 Stages',
    theme: 'from-blue-950 via-slate-900 to-slate-950',
    accent: 'sky',
    icon: Award
  },
  {
    title: 'Wafy Students Federation Championship',
    subtitle: '25+ affiliated institutions striving for the prestigious Ever-Rolling Trophy',
    badge: 'Championship Trophy',
    theme: 'from-amber-950 via-slate-900 to-slate-950',
    accent: 'amber',
    icon: Trophy
  }
];

export function StudentView({ activeTab: controlledTab, onTabChange }: StudentViewProps = {}) {
  const [internalTab, setInternalTab] = useState<StudentTab>('dashboard');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: StudentTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [resultsDisplayCount, setResultsDisplayCount] = useState(5);

  // Appeal Form State
  const [appealItemId, setAppealItemId] = useState<string>('');
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState<string | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HIGHLIGHT_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Retrieve logged-in student session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('arts_fest_student_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLoggedInStudent(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const students = festService.getStudents();
  const colleges = festService.getColleges();
  const items = festService.getItems();
  const schedules = festService.getSchedules();
  const registrations = festService.getRegistrations();
  const results = festService.getResults();
  const leaderboard = festService.getLeaderboard();
  const festSettings = festService.getFestSettings();

  const { currentCollegeAfflNo } = useFest();

  // Resolve current student strictly from authenticated session
  const currentStudent: Student | undefined = useMemo(() => {
    if (loggedInStudent) {
      return (
        findStudentByIdentifier(students, String(loggedInStudent.cic_no || loggedInStudent.id)) ||
        students.find(s => s.id === loggedInStudent.id || String(s.cic_no) === String(loggedInStudent.cic_no)) ||
        loggedInStudent
      );
    }
    return undefined;
  }, [loggedInStudent, students]);

  const targetStu = currentStudent;
  const userAfflNo = targetStu?.college_affl_no || (loggedInStudent?.college_affl_no) || currentCollegeAfflNo || 1;
  const studentCollege: College | undefined = colleges.find(
    c => c.affl_no === userAfflNo || c.id === targetStu?.college_id
  ) || colleges.find(c => c.affl_no === 1);

  // Events this student is registered for
  const studentRegistrations = targetStu
    ? registrations.filter(r => registrationContainsStudent(r, targetStu, students))
    : [];
  const studentItemIds = new Set(studentRegistrations.map(r => r.item_id));
  const studentSchedules = schedules.filter(s => studentItemIds.has(s.item_id));

  // 1. My College Results (Strictly filtered by the logged-in user's college)
  const myCollegeResults = useMemo(() => {
    if (!userAfflNo) return [];
    return results.filter(r => r.published && Number(r.college_affl_no) === Number(userAfflNo));
  }, [results, userAfflNo]);

  // 2. Notable Stars (Leading point holders in my college)
  const notableStars = useMemo(() => {
    if (!userAfflNo) return [];
    const collegeStudents = students.filter(s => Number(s.college_affl_no) === Number(userAfflNo));
    const studentPointsMap = new Map<string, { student: Student; points: number; golds: number; silvers: number; bronzes: number }>();

    collegeStudents.forEach(s => {
      const key = s.id || String(s.cic_no);
      studentPointsMap.set(key, { student: s, points: 0, golds: 0, silvers: 0, bronzes: 0 });
    });

    results.forEach(res => {
      if (res.published && Number(res.college_affl_no) === Number(userAfflNo) && res.chest_no) {
        const stu = findStudentByIdentifier(collegeStudents, res.chest_no, Number(userAfflNo));
        if (stu) {
          const key = stu.id || String(stu.cic_no);
          const current = studentPointsMap.get(key) || { student: stu, points: 0, golds: 0, silvers: 0, bronzes: 0 };
          current.points += Number(res.points) || 0;
          if (res.rank === 1) current.golds += 1;
          else if (res.rank === 2) current.silvers += 1;
          else if (res.rank === 3) current.bronzes += 1;
          studentPointsMap.set(key, current);
        }
      }
    });

    return Array.from(studentPointsMap.values())
      .filter(item => item.points > 0 || (item.golds + item.silvers + item.bronzes) > 0)
      .sort((a, b) => b.points - a.points || b.golds - a.golds)
      .slice(0, 5);
  }, [students, results, userAfflNo]);

  // 3. Latest Published Results (All published results with pagination)
  const publishedResults = useMemo(() => {
    return results.filter(r => r.published);
  }, [results]);

  const displayedLatestResults = useMemo(() => {
    return publishedResults.slice(0, resultsDisplayCount);
  }, [publishedResults, resultsDisplayCount]);

  // 4. Top Colleges Leaderboard (Top 3 + User's College as 4th if outside Top 3)
  const topCollegesDisplay = useMemo(() => {
    const fullLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    const top3 = fullLeaderboard.slice(0, 3);
    const userCollegeInTop3 = top3.some(c => Number(c.college.affl_no) === Number(userAfflNo));

    if (userCollegeInTop3 || !userAfflNo) {
      return { list: top3, isUserInTop3: true, userEntry: null };
    }

    const userEntry = fullLeaderboard.find(c => Number(c.college.affl_no) === Number(userAfflNo));
    if (userEntry) {
      return { list: [...top3, userEntry], isUserInTop3: false, userEntry };
    }

    return { list: top3, isUserInTop3: true, userEntry: null };
  }, [leaderboard, userAfflNo]);

  // Handle Appeal Submission
  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppealError(null);
    setAppealSuccess(null);
    setAppealSubmitting(true);

    if (!appealItemId) {
      setAppealError('Please select a competition event.');
      setAppealSubmitting(false);
      return;
    }

    if (!appealReason.trim()) {
      setAppealError('Please provide specific grounds for your appeal.');
      setAppealSubmitting(false);
      return;
    }

    try {
      const resp = await festService.submitAppeal({
        college_affl_no: userAfflNo,
        item_id: Number(appealItemId),
        participant_name: targetStu?.full_name || targetStu?.name,
        chest_no: getCanonicalChestNo(targetStu),
        appeal_description: appealReason.trim(),
        reason_for_appeal: appealReason.trim(),
        payment_mode: 'Cash',
        current_status: 'Pending'
      });

      if (resp.success) {
        setAppealSuccess('Your appeal has been submitted successfully to the Fest Executive Committee.');
        setAppealReason('');
        setAppealItemId('');
      } else {
        setAppealError(resp.error || 'Failed to submit appeal. Please try again.');
      }
    } catch (err: any) {
      setAppealError(err?.message || 'Error communicating with appeals server.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleStudentSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arts_fest_student_session');
      document.cookie = 'arts_fest_student_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_student_cic=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/student-login';
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top User Header Card ─────────────────────────────────────── */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xl border border-slate-700/30 shadow-xs">
            <GraduationCap className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {targetStu?.full_name || targetStu?.name || (loggedInStudent ? 'Student Participant' : 'Student Portal')}
              </h1>
              {targetStu && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-navy)] text-emerald-400 font-mono text-xs font-bold border border-slate-700/40">
                  {getCanonicalChestNo(targetStu)}
                </span>
              )}
              {loggedInStudent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold border border-blue-500/20">
                  Guest / Viewer Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              College: <strong className="text-[var(--text-primary)]">{studentCollege?.name || 'KKHM ISLAMIC & ARTS COLLEGE'}</strong>{' '}
              {studentCollege?.short_name && `(${studentCollege.short_name})`}
              {targetStu && (
                <> • CIC No: <span className="font-mono font-semibold text-[var(--text-secondary)]">{targetStu?.admission_no || targetStu?.cic_no}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {loggedInStudent ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('admit_card')}
                className="text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Admit Card</span>
              </Button>
              <button
                onClick={handleStudentSignOut}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/student-login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* ─── Navigation Pills ─────────────────────────────────────────── */}
      {/* <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-2xs overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Fest Highlights & Overview' },
          { id: 'schedule', label: `My Schedule (${studentSchedules.length})` },
          { id: 'admit_card', label: 'Official Admit Card' },
          { id: 'results', label: 'Results & Leaderboard' },
          { id: 'appeals', label: 'File Appeal' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--brand-navy)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div> */}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. OVERVIEW & HIGHLIGHTS DASHBOARD (NEW STUDENT PORTAL HOME)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* A. Highlighted Images Slideshow */}
          <div className="relative rounded-3xl overflow-hidden shadow-elevated border border-[var(--border-subtle)]">
            <div className={`p-8 sm:p-12 bg-gradient-to-br ${HIGHLIGHT_SLIDES[activeSlide].theme} text-white min-h-[220px] flex flex-col justify-between transition-all duration-500 relative`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-3 relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/15">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{HIGHLIGHT_SLIDES[activeSlide].badge}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {HIGHLIGHT_SLIDES[activeSlide].title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {HIGHLIGHT_SLIDES[activeSlide].subtitle}
                </p>
              </div>

              {/* Slider Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10 relative z-10">
                <div className="flex items-center gap-2">
                  {HIGHLIGHT_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlide === idx ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveSlide(prev => (prev === 0 ? HIGHLIGHT_SLIDES.length - 1 : prev - 1))}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveSlide(prev => (prev + 1) % HIGHLIGHT_SLIDES.length)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
              onClick={() => setActiveTab('schedule')}
              className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 shadow-card flex items-center justify-between group transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
                    Live Stage Tracking
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Check current venue timings</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {festSettings.rulebook_url ? (
              <a
                href={festSettings.rulebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 shadow-card flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-sky-500 transition-colors">
                      Official Fest Manual
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">Download rulebook & criteria</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] opacity-70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Official Fest Manual</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Distributed via College Coordinator</div>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveTab('appeals')}
              className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-rose-500/40 shadow-card flex items-center justify-between group transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-rose-500 transition-colors">
                    Official Appeal Form
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">File judgement review petition</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* C. Two Column Section: My College Results & Notable Stars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My College Results */}
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span>My College Results</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Published ranks won by <strong>{studentCollege?.short_name || studentCollege?.name || 'My College'}</strong>
                    </CardDescription>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                    {myCollegeResults.length} Wins
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {myCollegeResults.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Trophy className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      No published results for your college yet.
                    </p>
                    <p className="text-[11px] text-[var(--text-disabled)]">
                      Winners will be ratified and displayed as stage judges submit tabulations.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {myCollegeResults.slice(0, 5).map(res => (
                      <div key={res.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate">
                            {res.item?.name}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                            {res.chest_no} • {res.grade ? `Grade ${res.grade}` : 'Published'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                              res.rank === 1
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : res.rank === 2
                                ? 'bg-slate-400/15 text-slate-700 dark:text-slate-300 border border-slate-400/30'
                                : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
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
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>Notable Stars</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Leading point contributors for <strong>{studentCollege?.short_name || 'My College'}</strong>
                    </CardDescription>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-500">
                    Leaderboard
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {notableStars.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Star className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      Points tally will appear as competitions conclude.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {notableStars.map((star, idx) => (
                      <div key={star.student.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : idx === 2
                                ? 'bg-orange-500 text-white'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--text-primary)] truncate">
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
            {/* Top Colleges (Top 3 + User's College as 4th if outside top 3) */}
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Top Colleges Standings</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Overall trophy race & aggregate points table
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank & College</TableHead>
                      <TableHead className="text-right">Medals</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCollegesDisplay.list.map((entry, index) => {
                      const isUserCol = Number(entry.college.affl_no) === Number(userAfflNo);
                      return (
                        <TableRow
                          key={entry.college.id || index}
                          className={isUserCol ? 'bg-emerald-500/10 font-semibold' : ''}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  entry.rank === 1
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : entry.rank === 2
                                    ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                    : entry.rank === 3
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                    : 'bg-emerald-500 text-white'
                                }`}
                              >
                                #{entry.rank}
                              </span>
                              <div>
                                <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                  <span>{entry.college.code || entry.college.short_name}</span>
                                  {isUserCol && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-normal">
                                      My College
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
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
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Latest Published Results (with Show More button) */}
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Medal className="w-4 h-4 text-emerald-500" />
                      <span>Latest Competition Results</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
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
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    No results have been officially published yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {displayedLatestResults.map(res => (
                      <div key={res.id} className="p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--text-primary)]">
                            {res.item?.name}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">
                            {res.item?.phase} • {res.item?.item_code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-secondary)]">
                            Winner: <strong>{res.college?.code || res.college?.short_name}</strong> ({res.chest_no})
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
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
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Show More Results ({publishedResults.length - resultsDisplayCount} remaining) ↓
                      </button>
                    ) : (
                      <button
                        onClick={() => setResultsDisplayCount(5)}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:underline cursor-pointer"
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. MY COMPETITION SCHEDULE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'schedule' && (
        !loggedInStudent || !targetStu ? (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-4 max-w-xl mx-auto shadow-card rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Personal Schedule Requires Sign In</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Sign in with your student CIC Number to access your personalized stage schedule, reporting slots, and blind chest codes.
              </p>
            </div>
            <div>
              <Link
                href="/student-login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Sign In with CIC Number</span>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <CardHeader>
              <div>
                <CardTitle className="text-base font-bold text-[var(--text-primary)]">
                  My Competition Schedule & Venues
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Official stage timetable, reporting slots, and blind allotment codes for {targetStu?.full_name || 'your profile'}
                </CardDescription>
              </div>
            </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Code & Title</TableHead>
                  <TableHead>Assigned Venue</TableHead>
                  <TableHead>Reporting Time</TableHead>
                  <TableHead>Blind Code</TableHead>
                  <TableHead>Stage Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                      No scheduled competitions found for this student.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentSchedules.map(sch => {
                    const reg = studentRegistrations.find(r => r.item_id === sch.item_id);
                    return (
                      <TableRow key={sch.id}>
                        <TableCell>
                          <div className="font-semibold text-[var(--text-primary)]">{sch.item?.name}</div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{sch.item?.item_code || sch.item?.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[var(--text-primary)]">{sch.stage?.name}</div>
                          <span className="text-[11px] text-[var(--text-muted)]">{sch.stage?.location}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                          {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          {reg?.code_letter ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-bold text-xs border border-blue-500/20">
                              {reg.code_letter}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs">Assigned at Stage</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StageStatusBadge status={sch.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. OFFICIAL ADMIT CARD VIEW                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'admit_card' && (
        !loggedInStudent || !targetStu ? (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-4 max-w-xl mx-auto shadow-card rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <Printer className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Student Authentication Required</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Please log in with your CIC Number & password to generate and print your official 14th Wafy Arts Fest Student Participant Admit Card.
              </p>
            </div>
            <div>
              <Link
                href="/student-login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Sign In to Access Admit Card</span>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => window.print()} className="flex items-center gap-1.5 text-xs">
                <Printer className="w-3.5 h-3.5" /> Print Admit Card
              </Button>
            </div>

          <div className="bg-white text-slate-900 rounded-3xl border-2 border-slate-300 p-6 shadow-elevated print:border-black print:shadow-none space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                  14TH WAFY ARTS FEST
                </span>
                <h3 className="text-base font-extrabold text-[#132238]">STUDENT PARTICIPANT PASS</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">CHEST NO</span>
                <div className="font-mono text-xl font-black px-3 py-1 rounded-xl bg-[#132238] text-white inline-block">
                  {getCanonicalChestNo(targetStu)}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex gap-4 items-center">
              {targetStu.photo_url ? (
                <img
                  src={targetStu.photo_url}
                  alt={targetStu.full_name || targetStu.name || 'Participant portrait photograph'}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                  PHOTO
                </div>
              )}
              <div className="space-y-1 text-xs">
                <h4 className="text-base font-bold text-[#132238]">{targetStu.full_name || targetStu.name}</h4>
                <div className="text-slate-600">Institution: <strong className="text-slate-800">{studentCollege?.name}</strong></div>
                <div className="text-slate-600">Admission No: <span className="font-mono">{targetStu.admission_no}</span></div>
                <div className="pt-1">
                  <CategoryBadge category={targetStu.category || targetStu.phase || 'Senior'} />
                </div>
              </div>
            </div>

            {/* Registered Events */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-2">
                Authorized Competitions & Stages:
              </span>
              <div className="space-y-1.5">
                {studentRegistrations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No registrations recorded.</p>
                ) : (
                  studentRegistrations.map(r => {
                    const sch = schedules.find(s => s.item_id === r.item_id);
                    return (
                      <div
                        key={r.id}
                        className="text-xs flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{r.item?.name}</div>
                          <span className="text-[10px] text-slate-500 font-mono">{r.item?.code || r.item?.item_code}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-800">{sch?.stage?.name.split(':')[0] || 'TBA'}</div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {sch ? new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer Barcode Simulation */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span className="font-mono">VERIFIED: {targetStu.id.slice(0, 8)}</span>
              </div>
              <div className="text-right">
                <span className="block font-medium text-slate-700">Wafy Students Federation (WSF)</span>
                <span className="text-[10px]">Valid with official student ID card</span>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. RESULTS & LEADERBOARD TAB                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader>
                <div>
                  <CardTitle className="text-base font-bold text-[var(--text-primary)]">
                    Published Event Results
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Officially finalized competition rankings & grade points
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>🥇 First Place</TableHead>
                      <TableHead>🥈 Second Place</TableHead>
                      <TableHead>🥉 Third Place</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.filter(r => r.published).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-xs">
                          Results will appear here as soon as they are officially ratified.
                        </TableCell>
                      </TableRow>
                    ) : (
                      results
                        .filter(r => r.published)
                        .map(res => (
                          <TableRow key={res.id}>
                            <TableCell className="font-semibold text-[var(--text-primary)]">{res.item?.name}</TableCell>
                            <TableCell>
                              <div className="font-bold text-amber-500">{res.first_reg?.college?.code || res.first_reg?.college?.short_name || '-'}</div>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {res.first_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-400">{res.second_reg?.college?.code || res.second_reg?.college?.short_name || '-'}</div>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {res.second_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-orange-500">{res.third_reg?.college?.code || res.third_reg?.college?.short_name || '-'}</div>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {res.third_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <CardHeader>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>College Championship Trophy</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Aggregate leaderboard points table
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank & College</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, idx) => (
                    <TableRow key={entry.college.id || idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{entry.college.code || entry.college.short_name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                              {entry.college.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-[var(--text-primary)] text-sm">
                        {entry.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. OFFICIAL APPEAL SUBMISSION FORM                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'appeals' && (
        !loggedInStudent || !targetStu ? (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-4 max-w-xl mx-auto shadow-card rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Sign In Required to File Appeal</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Only authenticated participants can submit formal evaluation appeals to the Arts Fest Appellate Board.
              </p>
            </div>
            <div>
              <Link
                href="/student-login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Sign In with CIC Number</span>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardHeader>
                <div>
                  <CardTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    <span>File Competition Result Appeal</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Students may petition the Appellate Board regarding evaluation disputes within the designated review window.
                  </CardDescription>
                </div>
              </CardHeader>

            <CardContent>
              {appealSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{appealSuccess}</span>
                </div>
              )}

              {appealError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{appealError}</span>
                </div>
              )}

              <form onSubmit={handleAppealSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Participant Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={targetStu?.full_name || targetStu?.name || ''}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Chest Number
                    </label>
                    <input
                      type="text"
                      disabled
                      value={getCanonicalChestNo(targetStu)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Select Disputed Competition Event *
                  </label>
                  <select
                    value={appealItemId}
                    onChange={e => setAppealItemId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose competition event --</option>
                    {studentRegistrations.map(r => (
                      <option key={r.id} value={r.item_id}>
                        {r.item?.name} ({r.item?.item_code || r.item?.code || `ID:${r.item_id}`})
                      </option>
                    ))}
                    {studentRegistrations.length === 0 && (
                      items.map(item => (
                        <option key={item.item_id} value={item.item_id}>
                          {item.name} ({item.item_code})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Detailed Grounds for Appeal *
                  </label>
                  <textarea
                    rows={4}
                    value={appealReason}
                    onChange={e => setAppealReason(e.target.value)}
                    placeholder="Specify discrepancies in timing, criteria, rules infraction, or scoring disparity..."
                    required
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Formal statutory appeal fee of ₹500 applies as per the official Fest Manual.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={appealSubmitting}
                    className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{appealSubmitting ? 'Submitting Petition...' : 'Submit Appeal to Executive Board'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        )
      )}
    </div>
  );
}
