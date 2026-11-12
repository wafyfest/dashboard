'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Calendar,
  Ticket,
  Star,
} from 'lucide-react';
import { TilePattern } from '@/components/fest/FestPattern';
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
      } catch { }
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

  const router = useRouter();
  const { currentCollegeAfflNo, currentRole, refreshKey, signOut } = useFest();

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

  // Events this student is registered for (memoized to avoid recomputing on carousel ticks)
  const studentRegistrations = useMemo(
    () => (targetStu ? registrations.filter(r => registrationContainsStudent(r, targetStu, students)) : []),
    [registrations, targetStu, students]
  );
  const studentSchedules = useMemo(() => {
    const itemIds = new Set(studentRegistrations.map(r => r.item_id));
    return schedules.filter(s => itemIds.has(s.item_id));
  }, [schedules, studentRegistrations]);

  // 1. My College Results
  const myCollegeResults = useMemo(() => {
    if (!userAfflNo) return [];
    return results.filter(r => r.published && Number(r.college_affl_no) === Number(userAfflNo));
  }, [results, userAfflNo]);

  // 2. Notable Stars (server-computed with client fallback)
  const [serverNotableStars, setServerNotableStars] = useState<
    Array<{ student: Partial<Student>; points: number; golds: number; silvers: number; bronzes: number }>
  >([]);

  useEffect(() => {
    if (!userAfflNo) {
      setServerNotableStars([]);
      return;
    }
    let active = true;
    fetch(`/api/notable-stars?college_affl_no=${encodeURIComponent(String(userAfflNo))}`)
      .then(res => (res.ok ? res.json() : { stars: [] }))
      .then(payload => {
        if (active && Array.isArray(payload?.stars)) {
          setServerNotableStars(payload.stars);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userAfflNo, refreshKey]);

  const clientNotableStars = useMemo(() => {
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

  const notableStars = serverNotableStars.length > 0 ? serverNotableStars : clientNotableStars;

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
      const isDirectChest = Boolean(r.chest_no && targetStu.chest_no && r.chest_no.trim() === targetStu.chest_no.trim());
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

  // Open poster only for published winning results (rank 1, 2, or 3)
  const openPosterForResult = (res: any) => {
    const rankNum = Number(res?.rank);
    if (!res?.published || !Number.isFinite(rankNum) || rankNum < 1 || rankNum > 3) {
      return;
    }

    const itm = festService.getItem(res.item_id);
    const prizeStr = rankNum === 1 ? 'First Prize 🥇' : rankNum === 2 ? 'Second Prize 🥈' : 'Third Prize 🥉';

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

  const handleSharePortal = () => {
    if (navigator.share) {
      navigator.share({
        title: '14th Wafy Arts Fest Student Login',
        text: 'Track my events, results, and celebration posters live on the Wafy Arts Fest portal!',
        url: window.location.href,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Student link copied to clipboard!');
    }
  };

  const handleStudentSignOut = async () => {
    await signOut();
    router.push('/student-login');
  };

  const myTotalPoints = useMemo(
    () => myResults.reduce((sum, r) => sum + (Number(r.points) || 0), 0),
    [myResults]
  );

  const myWinCount = useMemo(
    () => myResults.filter(r => r.published && Number(r.rank) >= 1 && Number(r.rank) <= 3).length,
    [myResults]
  );

  const liveScheduleCount = useMemo(
    () => studentSchedules.filter(s => s.status === 'On_Going').length,
    [studentSchedules]
  );

  return (
    <div className="space-y-4">
      {/* ── Participant Credential Hero Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)] transition-all">
        <TilePattern id="tiles-student-hero" className="text-[var(--text-primary)] opacity-[0.025] dark:opacity-[0.04]" />
        <div
          className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full bg-[var(--f-saffron)] opacity-10 blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative z-10 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="relative w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-amber-500/30 text-[var(--f-saffron)] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
                <GraduationCap className="w-7 h-7" />
                {loggedInStudent && (
                  <span
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]"
                    title="Authenticated Student"
                  />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-heading font-black text-[var(--text-primary)] tracking-tight truncate">
                    {targetStu?.full_name || targetStu?.name || (loggedInStudent ? 'Student Participant' : 'Student Portal')}
                  </h1>
                  {targetStu && getCanonicalChestNo(targetStu) !== '—' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                      Chest #{getCanonicalChestNo(targetStu)}
                    </span>
                  )}
                  {targetStu?.phase && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-heading font-semibold border border-[var(--border-subtle)]">
                      {formatStudentCategory(targetStu.phase)}
                    </span>
                  )}
                  {loggedInStudent ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-heading font-semibold border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-300 text-[11px] font-heading font-semibold border border-sky-500/30">
                      Guest Mode
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)] font-sans flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                  <span>
                    <strong className="text-[var(--text-primary)] font-semibold">
                      {studentCollege?.name || (userAfflNo ? (loggedInStudent?.college_name || `College #${userAfflNo}`) : (loggedInStudent ? 'Student College' : 'Public Access'))}
                    </strong>
                    {studentCollege?.short_name && ` (${studentCollege.short_name})`}
                  </span>
                  {targetStu && (targetStu?.admission_no || targetStu?.cic_no) && (
                    <>
                      <span className="text-[var(--border-strong)]">•</span>
                      <span>
                        CIC:{' '}
                        <span className="font-mono font-semibold text-[var(--text-secondary)]">
                          {targetStu?.admission_no || targetStu?.cic_no}
                        </span>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {loggedInStudent ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('my_results')}
                    className="text-xs font-heading font-semibold flex items-center gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>My Results</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSharePortal}
                    className="text-xs font-heading font-semibold flex items-center gap-1.5 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
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

          {/* Personal Stat Strip */}
          {targetStu && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <div className="rounded-2xl bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] font-sans">Registered</div>
                  <div className="text-base font-mono font-extrabold text-[var(--text-primary)] leading-tight">
                    {studentRegistrations.length}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] font-sans">
                    {liveScheduleCount > 0 ? 'Live / Scheduled' : 'Scheduled'}
                  </div>
                  <div className="text-base font-mono font-extrabold text-[var(--text-primary)] leading-tight">
                    {studentSchedules.length}
                    {liveScheduleCount > 0 && (
                      <span className="ml-1.5 text-[10px] font-sans font-bold text-emerald-500">
                        ({liveScheduleCount} live)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] font-sans">Published Wins</div>
                  <div className="text-base font-mono font-extrabold text-[var(--text-primary)] leading-tight">
                    {myWinCount}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] font-sans">Points Earned</div>
                  <div className="text-base font-mono font-extrabold text-[var(--text-primary)] leading-tight">
                    {myTotalPoints}
                  </div>
                </div>
              </div>
            </div>
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
