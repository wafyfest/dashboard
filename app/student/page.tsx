'use client';

import React, { useState } from 'react';
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

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview & Highlights', icon: LayoutDashboard },
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'my_results', label: 'My Results & Poster', icon: Award },
    { id: 'results', label: 'College & Event Results', icon: Trophy }
  ];

  return (
    <DashboardLayout
      portalTitle="Student Portal"
      roleBadge="Student Viewer"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={(id) => setActiveTab(id as StudentTab)}
    >
      <div className="max-w-7xl mx-auto">
        <StudentView activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </DashboardLayout>
  );
}
