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
  Share2,
  Calendar,
  Award,
  Clock,
  Download,
  Trophy,
  Star,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Medal,
  Users,
  Compass
} from 'lucide-react';
import { Student, Result, College, Item, formatStudentCategory } from '@/lib/types/fest';
import { ResultPosterModal, PosterInitialData } from '@/components/student/ResultPosterModal';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  registrationContainsStudent
} from '@/lib/utils/studentIdentity';

export type StudentTab = 'dashboard' | 'schedule' | 'my_results' | 'results';

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

  // Poster Modal & Guest Lookup State
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [selectedPosterData, setSelectedPosterData] = useState<PosterInitialData>({
    studentName: '',
    itemEnglish: '',
    phase: '',
    prize: '',
    collegeName: '',
    chestNo: ''
  });
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [guestStudent, setGuestStudent] = useState<Student | null>(null);





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

  const targetStu = currentStudent || guestStudent || undefined;
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

    // Matching wins / results for the target student
  const myResults = useMemo(() => {
    if (!targetStu) return [];
    const chestNo = getCanonicalChestNo(targetStu).toLowerCase();
    const stuId = String(targetStu.id || '').toLowerCase();
    const cicNo = String(targetStu.admission_no || targetStu.cic_no || '').toLowerCase();
    const targetName = (targetStu.full_name || targetStu.name || '').trim().toLowerCase();

    const matchesStu = (s?: any) => {
      if (!s) return false;
      const sChest = String(s.chest_no || '').toLowerCase();
      const sId = String(s.id || '').toLowerCase();
      const sCic = String(s.cic_no || s.admission_no || '').toLowerCase();
      const sName = String(s.full_name || s.name || '').trim().toLowerCase();
      if (chestNo && sChest && chestNo === sChest) return true;
      if (stuId && sId && stuId === sId) return true;
      if (cicNo && sCic && cicNo === sCic) return true;
      if (targetName && sName && (targetName === sName || sName.includes(targetName) || targetName.includes(sName))) return true;
      return false;
    };

    const matchesReg = (reg?: any) => {
      if (!reg) return false;
      if (reg.participants && Array.isArray(reg.participants)) {
        return reg.participants.some((p: any) => matchesStu(p));
      }
      return matchesStu(reg.student);
    };

    const list: Array<{
      id: string;
      item: Item | undefined;
      rank: number | null;
      grade?: string | null;
      prize: string;
      points?: number | null;
      date?: string;
    }> = [];

    // Check individual and team results
    results.forEach(res => {
      if (!res.published) return;

      // 1. Direct chest / student match
      const directMatch = (res.chest_no && chestNo && res.chest_no.toLowerCase() === chestNo) ||
        (res.student && matchesStu(res.student));

      if (directMatch) {
        const prizeLabel = res.rank === 1 ? 'First Prize' :
          res.rank === 2 ? 'Second Prize' :
          res.rank === 3 ? 'Third Prize' :
          res.grade ? `Grade ${res.grade}` : 'Participant';
        
        list.push({
          id: res.id,
          item: res.item,
          rank: res.rank || null,
          grade: res.grade,
          prize: prizeLabel,
          points: res.points,
          date: res.created_at
        });
        return;
      }

      // 2. Event-level result with first_reg, second_reg, third_reg
      if (res.first_reg && matchesReg(res.first_reg)) {
        list.push({
          id: `${res.id}-1`,
          item: res.item,
          rank: 1,
          prize: 'First Prize',
          points: 5,
          date: res.created_at
        });
      } else if (res.second_reg && matchesReg(res.second_reg)) {
        list.push({
          id: `${res.id}-2`,
          item: res.item,
          rank: 2,
          prize: 'Second Prize',
          points: 3,
          date: res.created_at
        });
      } else if (res.third_reg && matchesReg(res.third_reg)) {
        list.push({
          id: `${res.id}-3`,
          item: res.item,
          rank: 3,
          prize: 'Third Prize',
          points: 1,
          date: res.created_at
        });
      }
    });

    return list;
  }, [results, targetStu]);

  const openPosterForResult = (res: {
    item?: Item;
    prize: string;
    rank?: number | null;
  }) => {
    setSelectedPosterData({
      studentName: targetStu?.full_name || targetStu?.name || 'Student Participant',
      itemEnglish: res.item?.name_eng || res.item?.name || 'Competition Event',
      phase: formatStudentCategory(res.item?.phase || res.item?.category || targetStu?.category || 'General'),
      prize: res.prize || (res.rank === 1 ? 'First Prize' : res.rank === 2 ? 'Second Prize' : res.rank === 3 ? 'Third Prize' : 'Special Mention'),
      collegeName: studentCollege?.name || studentCollege?.short_name || '',
      chestNo: getCanonicalChestNo(targetStu)
    });
    setIsPosterOpen(true);
  };

  const openCustomPoster = () => {
    setSelectedPosterData({
      studentName: targetStu?.full_name || targetStu?.name || '',
      itemEnglish: '',
      phase: formatStudentCategory(targetStu?.category || 'General'),
      prize: 'First Prize',
      collegeName: studentCollege?.name || studentCollege?.short_name || '',
      chestNo: getCanonicalChestNo(targetStu)
    });
    setIsPosterOpen(true);
  };

  const handleGuestLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestSearchQuery.trim()) return;
    const q = guestSearchQuery.trim().toLowerCase();
    const found = students.find(s => 
      String(s.chest_no || '').toLowerCase() === q ||
      String(s.cic_no || s.admission_no || '').toLowerCase() === q ||
      String(s.full_name || s.name || '').toLowerCase().includes(q)
    );
    if (found) {
      setGuestStudent(found);
    } else {
      alert(`No student found matching "${guestSearchQuery}". Please check the chest or CIC number.`);
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
                onClick={() => setActiveTab('my_results')}
                className="text-xs flex items-center gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>My Results & Poster</span>
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
          { id: 'my_results', label: 'My Results & Poster' },
          { id: 'results', label: 'Results & Leaderboard' }
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
              onClick={() => setActiveTab('my_results')}
              className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-amber-500/40 shadow-card flex items-center justify-between group transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-500 transition-colors">
                    My Results & Social Poster
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Download & share achievement poster</div>
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
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 3. MY RESULTS & SOCIAL POSTER VIEW                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'my_results' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-emerald-950 p-6 text-white border border-amber-500/20 shadow-card">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Social Media Poster Generator</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">My Fest Results & Celebration Posters</h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  Download high-resolution official achievement posters tailored with your name, English event title, category phase, and prize won to share directly on WhatsApp and Instagram status.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  onClick={openCustomPoster}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer border-0"
                >
                  <Sliders className="w-4 h-4 text-slate-950" />
                  <span>Custom Poster Designer</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Guest Search Lookup */}
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <form onSubmit={handleGuestLookup} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Lookup by Chest No, Admission/CIC No or Student Name..."
                  value={guestSearchQuery}
                  onChange={e => setGuestSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <Button type="submit" size="sm" className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Find Student
              </Button>
            </form>

            {targetStu && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">Active Profile:</span>
                  <span className="font-bold text-[var(--text-primary)]">{targetStu.full_name || targetStu.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold border border-emerald-500/20">
                    Chest #{getCanonicalChestNo(targetStu)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-[var(--text-secondary)] text-[11px]">
                    Phase: {formatStudentCategory(targetStu.category || 'General')}
                  </span>
                </div>
                {guestStudent && (
                  <button
                    onClick={() => { setGuestStudent(null); setGuestSearchQuery(''); }}
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Results Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500" />
                <span>Published Honors & Prizes</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono">
                  {myResults.length}
                </span>
              </h3>
            </div>

            {myResults.length === 0 ? (
              <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                  <Award className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    No Published Results Yet for {targetStu?.full_name || targetStu?.name || 'this participant'}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                    Evaluation results are announced live once judge score sheets are submitted. You can still generate and preview your celebration poster anytime using the designer below.
                  </p>
                </div>
                <div>
                  <Button
                    onClick={openCustomPoster}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Open Poster Designer</span>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myResults.map(res => {
                  const isFirst = res.rank === 1;
                  const isSecond = res.rank === 2;
                  const isThird = res.rank === 3;
                  const rankColor = isFirst
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent'
                    : isSecond
                    ? 'border-slate-400/40 bg-gradient-to-b from-slate-400/5 to-transparent'
                    : isThird
                    ? 'border-orange-500/40 bg-gradient-to-b from-orange-500/5 to-transparent'
                    : 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent';

                  return (
                    <Card
                      key={res.id}
                      className={`border ${rankColor} bg-[var(--bg-surface)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden`}
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                              isFirst
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : isSecond
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                                : isThird
                                ? 'bg-orange-500 text-white'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {res.prize}
                          </span>
                          {res.points && (
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              +{res.points} Pts
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">
                            {res.item?.item_code || `ITEM #${res.item?.item_id || ''}`}
                          </div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                            {res.item?.name_eng || res.item?.name || 'Competition Event'}
                          </h4>
                          {res.item?.name_eng && res.item?.name && res.item.name !== res.item.name_eng && (
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                              {res.item.name}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold">
                            {formatStudentCategory(res.item?.phase || res.item?.category || 'General')}
                          </span>
                          {res.grade && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold font-mono">
                              Grade {res.grade}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                        <Button
                          onClick={() => openPosterForResult(res)}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xs flex items-center justify-center gap-2 border-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Generate & Download Poster</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Poster Specifications Card */}
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Poster Specifications & Sharing Guide</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)]">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="font-bold text-[var(--text-primary)] mb-1">1. Student Name</div>
                <p className="text-[11px] text-[var(--text-muted)]">Placed front and center in elegant gold typography.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="font-bold text-[var(--text-primary)] mb-1">2. Item Name (English)</div>
                <p className="text-[11px] text-[var(--text-muted)]">Official English title of the participated event.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="font-bold text-[var(--text-primary)] mb-1">3. Phase Category</div>
                <p className="text-[11px] text-[var(--text-muted)]">Category level (Senior, Junior, Sub-Junior, General).</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="font-bold text-[var(--text-primary)] mb-1">4. Prize Won</div>
                <p className="text-[11px] text-[var(--text-muted)]">Distinctive ribbon badge: First, Second, Third or Grade.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
      {/* Result Poster Generation Modal */}
      <ResultPosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        initialData={selectedPosterData}
      />
    </div>
  );
}