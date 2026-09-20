'use client';

import React from 'react';
import { useFest } from '@/lib/context/FestContext';
import { FestHeader } from '@/components/layout/FestHeader';
import { AdminView } from '@/components/roles/AdminView';
import { CollegeView } from '@/components/roles/CollegeView';
import { StudentView } from '@/components/roles/StudentView';
import { StageControllerView } from '@/components/roles/StageControllerView';
import { ResultEntryView } from '@/components/roles/ResultEntryView';

export default function DashboardPage() {
  const { currentRole } = useFest();

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F6]">
      {/* Global Topbar & Role Switcher */}
      <FestHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'admin' && <AdminView />}
        {currentRole === 'college' && <CollegeView />}
        {currentRole === 'student' && <StudentView />}
        {currentRole === 'stage_controller' && <StageControllerView />}
        {currentRole === 'result_entry' && <ResultEntryView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 px-4 sm:px-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Inter-College Arts Fest Management System &copy; {new Date().getFullYear()}. Enterprise Edition.
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Canvas #EEF2F6 | Navy #132238
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-700 font-medium">PostgreSQL RLS Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
