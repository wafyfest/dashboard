'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Contact,
  Trophy
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StudentView, StudentTab } from '@/components/roles/StudentView';

export default function StudentPage() {
  const [activeTab, setActiveTab] = useState<StudentTab>('schedule');

  const navItems: NavItem[] = [
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'admit_card', label: 'Admit Card', icon: Contact },
    { id: 'results', label: 'Live Results & Leaderboard', icon: Trophy }
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
