'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  ClipboardPen,
  Globe,
  FileCheck2
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ResultEntryView, ResultEntryTab } from '@/components/roles/ResultEntryView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ResultEntryPage() {
  const [activeTab, setActiveTab] = useState<ResultEntryTab>('event-status');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 4 Sidebar Consoles strictly as requested
  const navItems: NavItem[] = [
    { id: 'event-status', label: 'Event Status', icon: Radio },
    { id: 'score-entry', label: 'Score Entry', icon: ClipboardPen },
    { id: 'result-publishing', label: 'Result Publishing', icon: Globe },
    { id: 'result-verification', label: 'Result Verification', icon: FileCheck2 }
  ];

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Result Entry Console"
        roleBadge="Result Entry"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ResultEntryTab)}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-28 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['result_entry', 'admin']}>
      <DashboardLayout
        portalTitle="Result Entry Console"
        roleBadge="Result Entry"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ResultEntryTab)}
      >
        <div className="max-w-7xl mx-auto">
          <ResultEntryView
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
