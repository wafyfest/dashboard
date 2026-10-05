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
  Moon
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentRole, festSettings, theme, toggleTheme } = useFest();
  const [selectedRole, setSelectedRole] = useState<UserRole>('college');
  const [email, setEmail] = useState('masapmsawafy@gmail.com');
  const [password, setPassword] = useState('••••••••••••');

  const roleOptions: {
    role: UserRole;
    route: string;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultEmail: string;
  }[] = [
    {
      role: 'college',
      route: '/college',
      label: 'Institution Portal',
      subtitle: 'PMSA Pookoya Thangal College',
      icon: Building2,
      defaultEmail: 'masapmsawafy@gmail.com'
    },
    {
      role: 'admin',
      route: '/admin',
      label: 'Executive Admin',
      subtitle: 'Fest Committee & Lock Overrides',
      icon: ShieldAlert,
      defaultEmail: 'admin@fest.edu'
    },
    {
      role: 'student',
      route: '/student',
      label: 'Student / Public',
      subtitle: 'Admit Card & Results Viewer',
      icon: GraduationCap,
      defaultEmail: 'student@fest.edu'
    },
    {
      role: 'stage_controller',
      route: '/stage-controller',
      label: 'Stage Controller',
      subtitle: 'Backstage Tablet & Blind Allotment',
      icon: Radio,
      defaultEmail: 'stage@fest.edu'
    },
    {
      role: 'result_entry',
      route: '/result-entry',
      label: 'Result Entry',
      subtitle: 'Write-once Fast Tabulation',
      icon: ClipboardPen,
      defaultEmail: 'results@fest.edu'
    }
  ];

  const handleSelectRole = (opt: typeof roleOptions[0]) => {
    setSelectedRole(opt.role);
    setEmail(opt.defaultEmail);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentRole(selectedRole);
    const target = roleOptions.find(r => r.role === selectedRole)?.route || '/college';
    router.push(target);
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
          Inter-College Arts Fest Management System • Multi-Tenant Access
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-xl bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-card p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Select Your Workspace
          </span>
          <h2 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
            Sign In to Access Your Designated Portal
          </h2>
        </div>

        {/* Role Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {roleOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedRole === opt.role;

            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => handleSelectRole(opt)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--brand-navy)] bg-[var(--bg-hover)] shadow-xs ring-1 ring-[var(--brand-navy)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[var(--brand-navy)] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">{opt.label}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{opt.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email / Username</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] rounded-lg focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-[var(--brand-navy)] hover:opacity-95 text-white py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Continue to {roleOptions.find(r => r.role === selectedRole)?.label}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Instant Direct Links */}
        <div className="border-t border-[var(--border-subtle)] pt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>Direct Links:</span>
          <a href="/college" className="font-medium text-sky-600 dark:text-sky-400 hover:underline">/college</a>
          <span>•</span>
          <a href="/admin" className="font-medium text-sky-600 dark:text-sky-400 hover:underline">/admin</a>
          <span>•</span>
          <a href="/student" className="font-medium text-sky-600 dark:text-sky-400 hover:underline">/student</a>
          <span>•</span>
          <a href="/stage-controller" className="font-medium text-sky-600 dark:text-sky-400 hover:underline">/stage-controller</a>
          <span>•</span>
          <a href="/result-entry" className="font-medium text-sky-600 dark:text-sky-400 hover:underline">/result-entry</a>
        </div>
      </div>
    </div>
  );
}
