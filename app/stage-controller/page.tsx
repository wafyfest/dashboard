'use client';

import React, { useState } from 'react';
import {
  Radio,
  Shuffle,
  Calendar
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StageControllerView } from '@/components/roles/StageControllerView';

export default function StageControllerPage() {
  const [activeTab, setActiveTab] = useState<string>('relay');

  const navItems: NavItem[] = [
    { id: 'relay', label: 'Backstage Tablet', icon: Radio },
    { id: 'blind_allotment', label: 'Blind Judging Allotment', icon: Shuffle },
    { id: 'all_schedules', label: 'Stage Schedules', icon: Calendar }
  ];

  return (
    <DashboardLayout
      portalTitle="Stage Console"
      roleBadge="Stage Controller"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={setActiveTab}
    >
      <div className="max-w-7xl mx-auto">
        <StageControllerView />
      </div>
    </DashboardLayout>
  );
}
