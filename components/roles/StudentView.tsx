'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Button } from '../ui/button';
import {
  GraduationCap,
  Share2,
  Award,
  Trophy,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { Student, College, Item, LeaderboardEntry, formatStudentCategory } from '@/lib/types/fest';
import { ResultPosterModal, PosterInitialData } from '@/components/student/ResultPosterModal';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  registrationContainsStudent,
} from '@/lib/utils/studentIdentity';
import { StudentDashboardTab } from '../student/tabs/StudentDashboardTab';
import { StudentScheduleTab } from '../student/tabs/StudentScheduleTab';
import { StudentMyResultsTab } from '../student/tabs/StudentMyResultsTab';
import { StudentAllResultsTab } from '../student/tabs/StudentAllResultsTab';

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
    theme: 'from-[#140b02] via-[#101728] to-[#090d1a]',
    accent: 'saffron',
    icon: Sparkles,
  },
  {
    title: 'Inter-Collegiate Literary & Oratory Contests',
    subtitle: 'Over 1,700 scholars competing across Arabic, English, Urdu & Malayalam',
    badge: 'Live Across 4 Stages',
    theme: 'from-[#03151f] via-[#0d1c2e] to-[#090d1a]',
    accent: 'sky',
    icon: Award,
  },
  {
    title: 'Wafy Students Federation Championship',
    subtitle: '25+ affiliated institutions striving for the prestigious Ever-Rolling Trophy',
    badge: 'Championship Trophy',
    theme: 'from-[#1a1002] via-[#1a1424] to-[#090d1a]',
    accent: 'amber',
    icon: Trophy,
  },
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

  // State: Logged-in student identity (loaded on mount from localStorage session synchronously)
  const [loggedInStudent, setLoggedInStudent] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('arts_fest_student_session');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });

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
    chestNo: '',
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

  // Sync logged-in student session on mount / storage changes
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

  const { currentCollegeAfflNo, currentRole, refreshKey } = useFest();

  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);
  const registrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const results = useMemo(() => festService.getResults(), [refreshKey]);
  const [serverLeaderboard, setServerLeaderboard] = useState<LeaderboardEntry[]>(() =>
    festService.getLeaderboard()
  );

  // Fetch server-computed leaderboard on mount or reactive refresh
  useEffect(() => {
    let isMounted = true;
    festService.fetchServerLeaderboard().then(data => {
      if (isMounted && data && data.length > 0) {
        setServerLeaderboard(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const leaderboard = serverLeaderboard.length > 0 ? serverLeaderboard : festService.getLeaderboard();
  const festSettings = useMemo(() => festService.getFestSettings(), [refreshKey]);

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

  // Strict numeric resolution of student college affiliation, never defaulting blindly to 1
  const userAfflNo: number | undefined = useMemo(() => {
    const raw =
      targetStu?.college_affl_no ??
      loggedInStudent?.college_affl_no ??
      (currentRole === 'student' ? currentCollegeAfflNo : undefined) ??
      (typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('arts_fest_student_session') || '{}')?.college_affl_no
        : undefined);
    return raw !== undefined && raw !== null && raw !== '' ? Number(raw) : undefined;
  }, [targetStu, loggedInStudent, currentRole, currentCollegeAfflNo]);

  const studentCollege: College | undefined = useMemo(() => {
    if (userAfflNo !== undefined) {
      const found = colleges.find(c => Number(c.affl_no) === Number(userAfflNo) || c.id === targetStu?.college_id);
      if (found) return found;
      if (loggedInStudent?.college_name || loggedInStudent?.college_short_name) {
        return {
          id: `col-${userAfflNo}`,
          affl_no: userAfflNo,
          name: loggedInStudent.college_name || `College #${userAfflNo}`,
          short_name: loggedInStudent.college_short_name || `AFFL #${userAfflNo}`,
        } as College;
      }
    }
    // Only fallback if NOT logged in (pure guest viewer mode)
    if (!loggedInStudent && colleges.length > 0) {
      return colleges.find(c => Number(c.affl_no) === 1) || colleges[0];
    }
    return undefined;
  }, [colleges, userAfflNo, targetStu, loggedInStudent]);

  // Events this student is registered for
  const studentRegistrations = targetStu
    ? registrations.filter(r => registrationContainsStudent(r, targetStu, students))
    : [];
  const studentItemIds = new Set(studentRegistrations.map(r => r.item_id));
  const studentSchedules = schedules.filter(s => studentItemIds.has(s.item_id));

  // 1. My College Results
  const myCollegeResults = useMemo(() => {
    if (!userAfflNo) return [];
    return results.filter(r => r.published && Number(r.college_affl_no) === Number(userAfflNo));
  }, [results, userAfflNo]);

  // 2. Notable Stars
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
      .filter(s => s.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 4);
  }, [students, results, userAfflNo]);

  // 3. Latest Published Results
  const publishedResults = useMemo(() => {
    return results
      .filter(r => r.published && r.rank && r.rank <= 3)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [results]);

  const displayedLatestResults = useMemo(() => {
    return publishedResults.slice(0, resultsDisplayCount);
  }, [publishedResults, resultsDisplayCount]);

  // 4. Top Colleges Leaderboard
  const topCollegesDisplay = useMemo(() => {
    const fullLeaderboard = festService.getLeaderboard();
    const top3 = fullLeaderboard.slice(0, 3);
    const userCollegeInTop3 = top3.some(c => Number(c.college.affl_no) === Number(userAfflNo));

    if (userCollegeInTop3 || !userAfflNo) {
      return { list: top3, isUserInTop3: true, userEntry: null };
    }

    const userEntry = fullLeaderboard.find(c => Number(c.college.affl_no) === Number(userAfflNo));
    if (userEntry) {
      return { list: [...top3, userEntry], isUserInTop3: false, userEntry };
    }

    return { list: top3, isUserInTop3: false, userEntry: null };
  }, [leaderboard, userAfflNo]);

  // Matching wins / results for the target student
  const myResults = useMemo(() => {
    if (!targetStu) return [];
    return results.filter(r => {
      if (!r.published) return false;
      const isDirectChest = r.chest_no && (r.chest_no === targetStu.chest_no || r.chest_no === `ST-${targetStu.cic_no}`);
      const isStudentMatch = Boolean(targetStu.id && ((r as any).student_id === targetStu.id || r.student?.id === targetStu.id));
      return isDirectChest || isStudentMatch;
    });
  }, [results, targetStu]);

  // Quick lookup handler for guests
  const handleGuestLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestSearchQuery.trim()) return;

    const matched = findStudentByIdentifier(students, guestSearchQuery.trim());
    if (matched) {
      setGuestStudent(matched);
    } else {
      alert(`No student found for "${guestSearchQuery}". Please verify chest number or CIC.`);
    }
  };

  // Open poster from specific result
  const openPosterForResult = (res: any) => {
    const itm = festService.getItem(res.item_id);
    const prizeStr = res.rank === 1 ? 'First Prize 🥇' : res.rank === 2 ? 'Second Prize 🥈' : res.rank === 3 ? 'Third Prize 🥉' : (res.grade ? `Grade ${res.grade}` : 'Honorary Mention');

    setSelectedPosterData({
      studentName: targetStu?.full_name || targetStu?.name || 'Participant',
      itemEnglish: itm?.name_eng || itm?.name || 'Arts Fest Event',
      phase: itm?.phase || itm?.category || (targetStu?.phase ? formatStudentCategory(targetStu.phase) : 'Senior'),
      prize: prizeStr,
      collegeName: studentCollege?.name || studentCollege?.short_name || '',
      chestNo: targetStu ? getCanonicalChestNo(targetStu) : (res.chest_no || ''),
    });
    setIsPosterOpen(true);
  };

  // Open custom poster generator directly
  const openCustomPoster = () => {
    setSelectedPosterData({
      studentName: targetStu?.full_name || targetStu?.name || 'Participant Name',
      itemEnglish: 'Select or Enter Event',
      phase: targetStu?.phase ? formatStudentCategory(targetStu.phase) : 'Senior',
      prize: 'First Prize 🥇',
      collegeName: studentCollege?.name || studentCollege?.short_name || '',
      chestNo: targetStu ? getCanonicalChestNo(targetStu) : 'ST-1001',
    });
    setIsPosterOpen(true);
  };

  const handleSharePortal = () => {
    if (navigator.share) {
      navigator.share({
        title: '14th Wafy Arts Fest Student Login',
        text: 'Track my events, results, and celebration posters live on the Wafy Arts Fest portal!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Student link copied to clipboard!');
    }
  };

  const handleStudentSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arts_fest_student_session');
      localStorage.removeItem('arts_fest_active_role');
      localStorage.removeItem('arts_fest_active_affl_no');
      document.cookie = 'arts_fest_student_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_student_cic=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_active_role=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'arts_fest_active_affl_no=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/student-login';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Active Student Identity / Guest Lookup Bar ── */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold text-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-heading font-black text-[var(--text-primary)] tracking-tight">
                {targetStu?.full_name || targetStu?.name || (loggedInStudent ? 'Student Participant' : 'Student Login')}
              </h1>
              {targetStu && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-xs font-bold border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                  {getCanonicalChestNo(targetStu)}
                </span>
              )}
              {loggedInStudent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-heading font-semibold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-300 text-[11px] font-heading font-semibold border border-sky-500/30">
                  Guest / Viewer Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
              College: <strong className="text-[var(--text-primary)]">
                {studentCollege?.name || (userAfflNo ? (loggedInStudent?.college_name || `College #${userAfflNo}`) : (loggedInStudent ? 'Student College' : 'General / Public Access'))}
              </strong>{' '}
              {studentCollege?.short_name && `(${studentCollege.short_name})`}
              {targetStu && (
                <>
                  {' '}• CIC No:{' '}
                  <span className="font-mono font-semibold text-[var(--text-secondary)]">
                    {targetStu?.admission_no || targetStu?.cic_no}
                  </span>
                </>
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
                className="text-xs font-heading font-semibold flex items-center gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
              >
                <Award className="w-3.5 h-3.5" />
                <span>My Results</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSharePortal}
                className="text-xs font-heading font-semibold flex items-center gap-1.5 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </Button>
              <button
                onClick={handleStudentSignOut}
                className="text-xs font-heading font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/student-login">
              <Button
                size="sm"
                variant="primary"
                className="text-xs font-heading font-semibold flex items-center gap-1.5 bg-[var(--f-saffron)] text-[#090d1a] hover:bg-[var(--f-saffron-hover)] cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Student Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Tab Views ── */}
      {activeTab === 'dashboard' && (
        <StudentDashboardTab
          slides={HIGHLIGHT_SLIDES}
          activeSlide={activeSlide}
          setActiveSlide={setActiveSlide}
          onNavigateTab={setActiveTab}
          rulebookUrl={festSettings.rulebook_url}
          studentCollege={studentCollege}
          myCollegeResults={myCollegeResults}
          notableStars={notableStars}
          topCollegesDisplay={topCollegesDisplay}
          userAfflNo={userAfflNo}
          publishedResults={publishedResults}
          displayedLatestResults={displayedLatestResults}
          resultsDisplayCount={resultsDisplayCount}
          setResultsDisplayCount={setResultsDisplayCount}
        />
      )}

      {activeTab === 'schedule' && (
        <StudentScheduleTab
          loggedInStudent={loggedInStudent}
          targetStu={targetStu}
          studentSchedules={studentSchedules}
          studentRegistrations={studentRegistrations}
        />
      )}

      {activeTab === 'my_results' && (
        <StudentMyResultsTab
          targetStu={targetStu || null}
          guestStudent={guestStudent}
          guestSearchQuery={guestSearchQuery}
          setGuestSearchQuery={setGuestSearchQuery}
          setGuestStudent={setGuestStudent}
          handleGuestLookup={handleGuestLookup}
          myResults={myResults}
          openCustomPoster={openCustomPoster}
          openPosterForResult={openPosterForResult}
        />
      )}

      {activeTab === 'results' && (
        <StudentAllResultsTab
          results={results}
          leaderboard={leaderboard}
        />
      )}

      {/* Result Poster Generation Modal */}
      <ResultPosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        initialData={selectedPosterData}
      />
    </div>
  );
}
