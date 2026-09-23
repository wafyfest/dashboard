'use client';

import React, { useState } from 'react';
import {
  ClipboardPen,
  Lock,
  BookOpen
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ResultEntryView, ResultEntryTab } from '@/components/roles/ResultEntryView';

export default function ResultEntryPage() {
  const [activeTab, setActiveTab] = useState<ResultEntryTab>('scoring');

  const navItems: NavItem[] = [
    { id: 'scoring', label: 'Score Entry Console', icon: ClipboardPen },
    { id: 'published', label: 'Published Results Registry', icon: Lock },
    { id: 'rubrics', label: 'Judging Rubrics & Rules', icon: BookOpen }
  ];

  return (
    <DashboardLayout
      portalTitle="Tabulation Console"
      roleBadge="Result Entry"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={(id) => setActiveTab(id as ResultEntryTab)}
    >
      <div className="max-w-7xl mx-auto">
        <ResultEntryView activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </DashboardLayout>
  );
}
