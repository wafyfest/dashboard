'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Contact,
  Trophy,
  LayoutDashboard,
  ShieldAlert,
  Radio,
  FileText
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StudentView, StudentTab } from '@/components/roles/StudentView';

export default function StudentPage() {
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview & Highlights', icon: LayoutDashboard },
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'admit_card', label: 'Official Admit Card', icon: Contact },
    { id: 'results', label: 'College & Event Results', icon: Trophy },
    { id: 'appeals', label: 'Submit Appeal', icon: ShieldAlert }
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
