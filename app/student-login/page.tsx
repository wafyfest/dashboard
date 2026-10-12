'use client';

import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { createClient } from '@/lib/supabase/client';

export default function StudentLoginPage() {
  const router = useRouter();
  const { theme, toggleTheme, setCurrentRole, festSettings } = useFest();

  const [cicNo, setCicNo] = useState('');
  const [password, setPassword] = useState('');
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
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Database connection failed. Please try again.');
      }

      // Query students table for matching cic_no or admission_no
      // Notice: cic_no in DB is BIGINT / INT or TEXT in some rows, so we check cic_no and fallback
      let query = supabase
        .from('students')
        .select('*');

      // Check if cleanCic is numeric
      if (/^\d+$/.test(cleanCic)) {
        query = query.eq('cic_no', parseInt(cleanCic, 10));
      } else {
        query = query.eq('chest_no', `ST-${cleanCic}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Student query error:', fetchError);
        throw new Error('Failed to verify student record. Please try again.');
      }

      if (!data || data.length === 0) {
        setError('No student found with this CIC Number. Please check your credentials.');
        setLoading(false);
        return;
      }

      const student = data[0];

      // Verify student password
      // In DB, students have password column (e.g., '18050@134')
      const storedPassword = student.password ? String(student.password).trim() : null;

      if (!storedPassword) {
        // Fallback default format: {cic_no}@{college_affl_no}
        const expectedDefault = `${student.cic_no || cleanCic}@${student.college_affl_no}`;
        if (cleanPassword !== expectedDefault) {
          setError('Invalid password. Default password format is [CIC_NO]@[COLLEGE_AFFL_NO] (e.g. 18050@134).');
          setLoading(false);
          return;
        }
      } else if (storedPassword !== cleanPassword) {
        setError('Incorrect password. Please verify and try again.');
        setLoading(false);
        return;
      }

      // Successful verification
      // Store session in localStorage and cookie
      if (typeof window !== 'undefined') {
        localStorage.setItem('arts_fest_student_session', JSON.stringify({
          id: student.id,
          name: student.name,
          cic_no: student.cic_no,
          college_affl_no: student.college_affl_no,
          class: student.class,
          phase: student.phase,
          chest_no: student.chest_no || `ST-${student.cic_no}`
        }));
        document.cookie = `arts_fest_student_id=${student.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `arts_fest_student_cic=${student.cic_no}; path=/; max-age=86400; SameSite=Lax`;
      }

      // Set current context role to student
      setCurrentRole('student');

      // Redirect to student portal
      router.push('/student');
    } catch (err: any) {
      console.error('Student authentication error:', err);
      setError(err?.message || 'Authentication error. Please check your network connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors relative">
      {/* Top Header Navigation */}
      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-500 bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs transition-colors"
        >
          ← Back to Fest Home
        </a>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs transition-colors"
          >
            Officer / College Login →
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-2xs cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Main Student Card */}
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-card p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Student Participant Login
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Access your personalized Admit Card, Venue Timings & Results
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Student Login Form */}
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Student CIC Number
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                id="student-cic-input"
                type="text"
                value={cicNo}
                onChange={e => setCicNo(e.target.value)}
                placeholder="e.g. 18050 or 19288"
                autoComplete="username"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono placeholder:text-[var(--text-muted)]"
                required
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Your unique Council for Islamic Coordination (CIC) student enrollment number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Student Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                id="student-password-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password (e.g. 18050@134)"
                autoComplete="current-password"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono placeholder:text-[var(--text-muted)]"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>First time logging in?</strong> By default, your password is set as <code className="bg-emerald-500/10 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono">[CIC_NO]@[COLLEGE_NO]</code> (e.g., <span className="font-mono">18050@134</span>).
            </span>
          </div>

          <button
            type="submit"
            id="student-submit-btn"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Student Credentials...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticate & View Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[var(--border-subtle)] pt-4 text-center">
          <p className="text-[11px] text-[var(--text-muted)]">
            Don't have your credentials handy?
          </p>
          <a
            href="/student"
            className="inline-block mt-1 text-xs font-semibold text-sky-500 hover:underline"
          >
            Browse Public Schedule & Live Results →
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
        {festSettings.fest_name} • Wafy Students Federation (WSF)
      </footer>
    </div>
  );
}
