'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldAlert,
  GraduationCap,
  Radio,
  ClipboardPen,
  ArrowRight,
  Sparkles,
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

  const roleOptions: {
    role: UserRole;
    route: string;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    hint: string;
  }[] = [
    {
      role: 'college',
      route: '/college',
      label: 'Institution Portal',
      subtitle: 'Registration & Student Management',
      icon: Building2,
      hint: 'Use your college email address'
    },
    {
      role: 'admin',
      route: '/admin',
      label: 'Executive Admin',
      subtitle: 'Fest Committee & Lock Overrides',
      icon: ShieldAlert,
      hint: 'admin@wsfartsfest.in'
    },
    {
      role: 'student',
      route: '/student',
      label: 'Student / Public',
      subtitle: 'Admit Card & Results Viewer',
      icon: GraduationCap,
      hint: 'Public access — no login needed'
    },
    {
      role: 'stage_controller',
      route: '/stage-controller',
      label: 'Stage Controller',
      subtitle: 'Backstage Tablet & Blind Allotment',
      icon: Radio,
      hint: 'Use your stage controller credentials'
    },
    {
      role: 'result_entry',
      route: '/result-entry',
      label: 'Result Entry',
      subtitle: 'Write-once Fast Tabulation',
      icon: ClipboardPen,
      hint: 'Use your result entry credentials'
    }
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Student / public: no login required
    if (!supabase) {
      setError('Database not configured. Please contact the administrator.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Fetch their profile to get role + college
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, college_affl_no, full_name')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Your account is not yet configured. Please contact the fest administrator.');
        setLoading(false);
        return;
      }

      const userRole = profile.role as UserRole;
      setCurrentRole(userRole);
      if (profile.college_affl_no) {
        setCurrentCollegeAfflNo(profile.college_affl_no);
      }

      // Route based on role
      const routeMap: Record<UserRole, string> = {
        college: '/college',
        admin: '/admin',
        student: '/student',
        stage_controller: '/stage-controller',
        result_entry: '/result-entry'
      };
      router.push(routeMap[userRole] || '/college');

    } catch (err: any) {
      setError(err?.message || 'Unexpected error. Please try again.');
      setLoading(false);
    }
  };

  const handlePublicAccess = () => {
    setCurrentRole('student');
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
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {festSettings.fest_name}
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Inter-College Arts Fest Management System • Secure Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-card p-6 sm:p-8 space-y-5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Staff & Institution Login
          </span>
          <h2 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            Sign In to Your Portal
          </h2>
        </div>

        {/* Who can log in info */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {roleOptions.filter(r => r.role !== 'student').map(opt => {
            const Icon = opt.icon;
            return (
              <div key={opt.role} className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Icon className="w-3 h-3 shrink-0" />
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="college@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-navy)] font-medium placeholder:text-[var(--text-muted)]"
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
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-navy)]"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="w-full mt-1 bg-[var(--brand-navy)] hover:opacity-95 disabled:opacity-60 text-white py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Public Access Divider */}
        <div className="border-t border-[var(--border-subtle)] pt-4 text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-2">Looking for results or admit cards?</p>
          <button
            onClick={handlePublicAccess}
            id="public-access-btn"
            className="text-xs font-semibold text-sky-500 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Continue as Student / Public →
          </button>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-[var(--text-muted)] text-center">
        Contact the fest admin if you need login credentials
      </p>
    </div>
  );
}
