'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  KeyRound,
  UserCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Info,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { TilePattern } from '@/components/fest/FestPattern';

export default function StudentLoginPage() {
  const router = useRouter();
  const {
    theme,
    toggleTheme,
    setCurrentRole,
    setCurrentCollegeAfflNo,
    setCurrentCollegeId,
    refreshSessionAndSync,
    festSettings
  } = useFest();

  const [cicNo, setCicNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanCic = cicNo.trim().replace(/^ST-|^CH-/i, '');
    const cleanPassword = password.trim();

    if (!cleanCic) {
      setError('Please enter your CIC Number.');
      setLoading(false);
      return;
    }

    if (!cleanPassword) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cicNo: cleanCic, password: cleanPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.student) {
        setError(payload?.error || 'Invalid credentials. Please verify your CIC number and password or contact your college coordinator.');
        setLoading(false);
        return;
      }

      const student = payload.student;

      // Store sanitized student session in localStorage (httpOnly signed cookies are set by the API route)
      if (typeof window !== 'undefined') {
        localStorage.setItem('arts_fest_student_session', JSON.stringify({
          id: student.id,
          name: student.name,
          cic_no: student.cic_no,
          college_affl_no: student.college_affl_no,
          college_name: student.college_name || '',
          college_short_name: student.college_short_name || '',
          class: student.class,
          phase: student.phase,
          chest_no: student.chest_no || ''
        }));
      }

      // Set current context role to student and scope to student's college
      setCurrentRole('student');
      if (student.college_affl_no) {
        setCurrentCollegeAfflNo(Number(student.college_affl_no));
        setCurrentCollegeId(`col-${student.college_affl_no}`);
      }

      await refreshSessionAndSync();

      // Redirect to student dashboard
      router.push('/student');
    } catch (err: any) {
      console.error('Student authentication error:', err);
      setError(err?.message || 'Authentication error. Please check your network connection.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col justify-center items-center p-4 sm:p-6 transition-colors overflow-hidden selection:bg-amber-500 selection:text-black">
      {/* ── Background Islamic Khatam 8-Point Star Tile Pattern ── */}
      <TilePattern
        id="tiles-student-login"
        className="text-[var(--text-primary)] opacity-[0.035] dark:opacity-[0.05]"
      />

      {/* ── Atmospheric Ambient Lighting Glows ── */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[360px] rounded-full bg-[var(--f-saffron)] opacity-15 dark:opacity-20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-[420px] h-[320px] rounded-full bg-[var(--f-lapis)] opacity-10 dark:opacity-15 blur-[140px]"
        aria-hidden="true"
      />

      {/* ── Top Header Navigation ── */}
      <header className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none group"
        >
          <span
            className="transition-transform duration-150 group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            ←
          </span>
          <span>Back to Fest Home</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none group"
          >
            <span>College/Official Login</span>
            <span
              className="transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 transition-all duration-150 [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none group"
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
            aria-label={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            <div className="w-4 h-4 flex items-center justify-center transition-transform duration-500 group-hover:rotate-45">
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
            </div>
          </button>
        </div>
      </header>

      {/* ── Brand Header with Fest Motifs ── */}
      <div className="text-center mb-6 z-10 flex flex-col items-center">
        {/* Moorish Arch Silhouette Crown framing Brand Crest */}
        <div className="relative mb-3 flex flex-col items-center">
          {/* Architectural Arch SVG contour */}
          <svg
            viewBox="0 0 100 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-24 h-10 text-[var(--f-saffron)] opacity-85 -mb-6"
            aria-hidden="true"
          >
            <path
              d="M 10 38 C 10 24, 22 14, 38 6 C 46 2, 50 0, 50 0 C 50 0, 54 2, 62 6 C 78 14, 90 24, 90 38"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="1" r="2" fill="currentColor" />
          </svg>

          {/* Brand Emblem Icon with Specular Highlight and Saffron Glow */}
          <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] text-[var(--f-saffron)] border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-transform duration-200 hover:scale-105">
            <GraduationCap className="w-6 h-6 text-[var(--f-saffron)]" />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] ring-2 ring-[var(--bg-page)] animate-pulse"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Fest Name with Outfit Typography */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="font-heading font-extrabold text-lg sm:text-xl text-[var(--text-primary)] tracking-tight">
            WAFY
          </span>
          <span
            className="inline-block w-2 h-2 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] animate-pulse"
            aria-hidden="true"
          />
          <span className="font-heading font-extrabold text-lg sm:text-xl text-[var(--f-saffron-text)]">
            FEST
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-[var(--f-saffron-text)] border border-amber-500/30 font-semibold tracking-wider ml-1">
            14th Ed.
          </span>
        </div>

        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-[-0.02em] leading-tight flex items-center justify-center gap-2">
          <span>{festSettings.fest_name}</span>
        </h1>

        {/* Arabic Kufi Calligraphic Flourish */}
        <p
          lang="ar"
          dir="rtl"
          className="font-['Reem_Kufi'] text-sm sm:text-base font-bold text-[var(--f-saffron-text)] mt-1 drop-shadow-xs"
        >
          مهرجان وافي الرابع عشر للفنون
        </p>

        {/* Subtitle with Space Grotesk */}
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans mt-1.5 flex items-center gap-1.5">
          <span>Student Participants &amp; Results Portal</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="font-mono text-[11px] font-semibold text-[var(--f-saffron-text)] uppercase tracking-wider">
            14th Edition
          </span>
        </p>
      </div>

      {/* ── Main Moorish Arch Glass Card ── */}
      <main className="w-full max-w-md bg-[var(--bg-surface)] backdrop-blur-xl rounded-t-[2.5rem] rounded-b-2xl border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-elevated),var(--glass-highlight)] p-6 sm:p-8 space-y-5 relative z-10 transition-all duration-300">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)]" />
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[var(--f-saffron-text)]">
              Participant Authentication
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--text-primary)] mt-1 tracking-tight">
            Student Login
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans leading-relaxed">
            Access your personalized Admit Card, Venue Timings &amp; Results
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs backdrop-blur-sm [box-shadow:var(--glass-highlight)]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Student Login Form */}
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label
              htmlFor="student-cic-input"
              className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              Student CIC Number
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)] pointer-events-none" />
              <input
                id="student-cic-input"
                type="text"
                value={cicNo}
                onChange={(e) => setCicNo(e.target.value)}
                placeholder="e.g. 22801 or 18050"
                autoComplete="username"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[var(--bg-surface)] border border-[var(--border-medium)] hover:border-[var(--border-strong)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 font-mono tracking-wide placeholder:text-[var(--text-muted)] [box-shadow:var(--glass-highlight)] transition-all duration-150"
                required
                disabled={loading}
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-normal">
              Your unique Coordination of Islamic Colleges (CIC) student
              enrollment number.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="student-password-input"
                className="block text-xs font-heading font-semibold text-[var(--text-secondary)]"
              >
                Student Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--f-saffron-text)] transition-colors cursor-pointer flex items-center gap-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)] pointer-events-none" />
              <input
                id="student-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your student portal password"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[var(--bg-surface)] border border-[var(--border-medium)] hover:border-[var(--border-strong)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 font-mono placeholder:text-[var(--text-muted)] [box-shadow:var(--glass-highlight)] transition-all duration-150"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* First-time login callout */}
          <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3.5 text-xs text-[var(--text-secondary)] flex items-start gap-2.5 backdrop-blur-sm [box-shadow:var(--glass-highlight)]">
            <Info className="w-4 h-4 text-[var(--f-saffron-text)] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong className="text-[var(--text-primary)]">
                Need login assistance?
              </strong>{" "}
              Use your unique CIC student enrollment number and password
              provided by your institution.
            </span>
          </div>

          {/* Primary Action Button (Saffron CTA) */}
          <button
            type="submit"
            id="student-submit-btn"
            disabled={loading}
            className="w-full bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[#090d1a] py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#090d1a]" />
                <span>Checking Student Credentials...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#090d1a]" />
                <span>Authenticate &amp; View Dashboard</span>
                <ArrowRight className="w-4 h-4 text-[#090d1a]" />
              </>
            )}
          </button>
        </form>

        {/* Credentials Recovery Info */}
        <div className="border-t border-[var(--border-subtle)] pt-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Need login assistance or credentials recovery?
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] font-medium">
            Contact your college team manager or staff coordinator.
          </p>
        </div>
      </main>

      {/* ── Fest Brand Signature Footer ── */}
      <footer className="mt-6 text-center text-xs text-[var(--text-muted)] relative z-10 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)]" />
          <span className="font-heading font-semibold text-[var(--text-secondary)]">
            {festSettings.fest_name}
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span>Wafy Students Federation (WSF)</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          Coordination of Islamic Colleges (CIC)
        </p>
      </footer>
    </div>
  );
}
