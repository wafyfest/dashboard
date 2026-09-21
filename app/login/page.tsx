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
  Mail
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentRole, festSettings } = useFest();
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
    <div className="min-h-screen bg-[#EEF2F6] flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#132238] text-white shadow-elevated mb-3">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black text-[#132238] tracking-tight">
          {festSettings.fest_name}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Inter-College Arts Fest Management System • Multi-Tenant Access
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Select Your Workspace
          </span>
          <h2 className="text-base font-bold text-[#132238] mt-0.5">
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
                className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#132238] bg-[#d9e2ec]/60 shadow-xs ring-1 ring-[#132238]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#132238] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#132238] truncate">{opt.label}</h3>
                  <p className="text-[10px] text-slate-500 truncate">{opt.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-[#132238] hover:bg-[#1E3354] text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
          >
            <span>Continue to {roleOptions.find(r => r.role === selectedRole)?.label}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Instant 1-Click Direct Links */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
          <span>Direct Links:</span>
          <a href="/college" className="font-semibold text-blue-700 hover:underline">/college</a>
          <span>•</span>
          <a href="/admin" className="font-semibold text-blue-700 hover:underline">/admin</a>
          <span>•</span>
          <a href="/student" className="font-semibold text-blue-700 hover:underline">/student</a>
          <span>•</span>
          <a href="/stage-controller" className="font-semibold text-blue-700 hover:underline">/stage-controller</a>
          <span>•</span>
          <a href="/result-entry" className="font-semibold text-blue-700 hover:underline">/result-entry</a>
        </div>
      </div>
    </div>
  );
}
