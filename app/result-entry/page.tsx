'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardPen,
  Lock,
  BookOpen
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ResultEntryView, ResultEntryTab } from '@/components/roles/ResultEntryView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ResultEntryPage() {
  const [activeTab, setActiveTab] = useState<ResultEntryTab>('scoring');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Focused Tabulation Sidebar Navigation
  const navItems: NavItem[] = [
    { id: 'scoring', label: 'Score Entry Console', icon: ClipboardPen },
    { id: 'published', label: 'Published Results Registry', icon: Lock },
    { id: 'rubrics', label: 'Evaluation Rubrics & Rules', icon: BookOpen }
  ];

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Result Entry Portal"
        roleBadge="Tabulation Officer"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ResultEntryTab)}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['result_entry', 'admin']}>
      <DashboardLayout
        portalTitle="Result Entry Portal"
        roleBadge="Tabulation Officer"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ResultEntryTab)}
      >
        <div className="max-w-7xl mx-auto">
          <ResultEntryView
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
