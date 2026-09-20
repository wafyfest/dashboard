'use client';

import React from 'react';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';
import {
  ShieldAlert,
  Building2,
  GraduationCap,
  Radio,
  ClipboardPen,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { festService } from '@/lib/services/festService';

export function FestHeader() {
  const {
    currentRole,
    setCurrentRole,
    currentCollegeId,
    setCurrentCollegeId,
    festSettings,
    resetDatabase,
    triggerRefresh
  } = useFest();

  const colleges = festService.getColleges();
  const activeCollege = colleges.find(c => c.id === currentCollegeId) || colleges[0];

  const now = new Date();
  const regDeadline = new Date(festSettings.reg_deadline);
  const fineDeadline = new Date(festSettings.fine_deadline);

  const isBeforeRegDeadline = now <= regDeadline;
  const isFinePeriod = !isBeforeRegDeadline && now <= fineDeadline;
  const isPastDeadline = now > fineDeadline;

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { role: 'admin', label: 'Admin', icon: <ShieldAlert className="w-3.5 h-3.5" />, desc: 'Global system control & locks' },
    { role: 'college', label: 'College Portal', icon: <Building2 className="w-3.5 h-3.5" />, desc: 'Registrations & Admit cards' },
    { role: 'student', label: 'Student View', icon: <GraduationCap className="w-3.5 h-3.5" />, desc: 'Schedule & Results viewer' },
    { role: 'stage_controller', label: 'Stage Controller', icon: <Radio className="w-3.5 h-3.5" />, desc: 'Blind codes & live stage' },
    { role: 'result_entry', label: 'Result Entry', icon: <ClipboardPen className="w-3.5 h-3.5" />, desc: 'Fast write-once scoring' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
      {/* Top Banner: Role Switcher & System Status */}
      <div className="bg-[#132238] text-white px-4 lg:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{festSettings.fest_name}</span>
          </div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <div className="hidden md:flex items-center gap-2 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Reg Deadline: {new Date(festSettings.reg_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isBeforeRegDeadline ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Registration Open
            </span>
          ) : isFinePeriod ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Late Reg (Fine Applicable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-medium">
              Registrations Closed
            </span>
          )}

          <button
            onClick={() => {
              if (confirm('Reset mock database to initial seed state?')) {
                resetDatabase();
              }
            }}
            title="Reset to initial seed data"
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            KU
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#132238] leading-none flex items-center gap-1.5">
              Arts Fest Management Portal
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Active Role: <strong className="text-[#132238] capitalize">{currentRole.replace('_', ' ')}</strong>
              {currentRole === 'college' && (
                <span className="text-blue-600 font-medium ml-1">
                  ({activeCollege?.name} - {activeCollege?.code})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Interactive RBAC Switcher Toolbar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
          {roles.map(r => {
            const isActive = currentRole === r.role;
            return (
              <button
                key={r.role}
                onClick={() => setCurrentRole(r.role)}
                title={r.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#132238] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {r.icon}
                <span className="whitespace-nowrap">{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Institution selector when viewing as College */}
        {currentRole === 'college' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Switch College:</span>
            <select
              value={currentCollegeId}
              onChange={e => setCurrentCollegeId(e.target.value)}
              className="bg-white border border-slate-200 text-[#132238] rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-[#132238]"
            >
              {colleges.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
