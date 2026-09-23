'use client';

import React, { useState } from 'react';
import {
  Radio,
  Shuffle,
  Calendar
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StageControllerView, StageControllerTab } from '@/components/roles/StageControllerView';

export default function StageControllerPage() {
  const [activeTab, setActiveTab] = useState<StageControllerTab>('relay');

  const navItems: NavItem[] = [
    { id: 'relay', label: 'Backstage Tablet & Queue', icon: Radio },
    { id: 'blind_allotment', label: 'Blind Judging Allotment', icon: Shuffle },
    { id: 'all_schedules', label: 'Stage Schedules & Timeline', icon: Calendar }
  ];

  return (
    <DashboardLayout
      portalTitle="Stage Console"
      roleBadge="Stage Controller"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={(id) => setActiveTab(id as StageControllerTab)}
    >
      <div className="max-w-7xl mx-auto">
        <StageControllerView activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </DashboardLayout>
  );
}
