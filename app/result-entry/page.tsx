'use client';

import React, { useState } from 'react';
import {
  ClipboardPen,
  Lock,
  Trophy
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ResultEntryView } from '@/components/roles/ResultEntryView';

export default function ResultEntryPage() {
  const [activeTab, setActiveTab] = useState<string>('scoring');

  const navItems: NavItem[] = [
    { id: 'scoring', label: 'Tabular Scoring', icon: ClipboardPen },
    { id: 'write_once', label: 'Write-Once Lock Status', icon: Lock }
  ];

  return (
    <DashboardLayout
      portalTitle="Tabulation Console"
      roleBadge="Result Entry"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={setActiveTab}
    >
      <div className="max-w-7xl mx-auto">
        <ResultEntryView />
      </div>
    </DashboardLayout>
  );
}
