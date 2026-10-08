'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Award,
  Lock,
  Mail,
  Sun,
  Moon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentRole, setCurrentCollegeAfflNo, festSettings, theme, toggleTheme } = useFest();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeMap: Record<UserRole, string> = {
    college: '/college',
    admin: '/admin',
    student: '/student',
    stage_controller: '/stage-controller',
    result_entry: '/result-entry'
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (!supabase) {
      setError('Database connection error. Please verify configuration.');
      setLoading(false);
      return;
    }

    try {
      // 1. Authenticate credentials against Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        await supabase.auth.signOut().catch(() => {});
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please check your credentials.'
            : authError.message
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Query user profile from Supabase PostgreSQL
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, college_affl_no, full_name')
        .eq('id', data.user.id)
        .maybeSingle();

      let userRole: UserRole = (profile?.role as UserRole) || 'college';
      let afflNo = profile?.college_affl_no;

      // Fallback: match college by email if profile link is pending
      if (!profile && !afflNo) {
        const { data: matchedCollege } = await supabase
          .from('colleges')
          .select('affl_no')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (matchedCollege) {
          afflNo = matchedCollege.affl_no;
          userRole = 'college';
        }
      }

      // 3. Update active context state
      setCurrentRole(userRole);
      if (afflNo) {
        setCurrentCollegeAfflNo(afflNo);
      }

      // 4. Navigate to user's assigned portal
      const destination = routeMap[userRole] || '/college';
      router.push(destination);
      router.refresh();

    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  const handlePublicAccess = () => {
    router.push('/student');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors relative">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
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

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--brand-navy)] text-white shadow-xs mb-3 border border-slate-700/30">
          <Award className="w-5 h-5 text-emerald-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {festSettings.fest_name}
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Inter-College Arts Fest Management System
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-card p-6 sm:p-8 space-y-5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Portal Authentication
          </span>
          <h2 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            Sign In to your Dashboard
          </h2>
        </div>


        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Supabase Auth Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="college@example.com or admin@wsfartsfest.in"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium placeholder:text-[var(--text-muted)]"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Public Student Results Link */}
        <div className="border-t border-[var(--border-subtle)] pt-4 text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-2">Looking for public results or admit cards?</p>
          <button
            onClick={handlePublicAccess}
            id="public-access-btn"
            className="text-xs font-semibold text-sky-400 hover:underline cursor-pointer"
          >
            Continue to Public Student View →
          </button>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-[var(--text-muted)] text-center">
        Arts Fest Management System • Executive Committee Portal
      </p>
    </div>
  );
}
