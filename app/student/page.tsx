'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Award,
  Trophy,
  LayoutDashboard
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StudentView, StudentTab } from '@/components/roles/StudentView';

export default function StudentPage() {
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview & Highlights', icon: LayoutDashboard },
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'my_results', label: 'My Results & Poster', icon: Award },
    { id: 'results', label: 'College & Event Results', icon: Trophy }
  ];

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Student Login"
        roleBadge="Student Viewer"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as StudentTab)}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
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
    <DashboardLayout
      portalTitle="Student Login"
      roleBadge="Student Viewer"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={(id) => setActiveTab(id as StudentTab)}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <StudentView activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </DashboardLayout>
  );
}
