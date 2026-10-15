'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  ClipboardPen,
  Lock,
  BookOpen,
  MapPin,
  Trophy
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ResultEntryView, ResultEntryTab } from '@/components/roles/ResultEntryView';
import { StageControllerResultView } from '@/components/roles/StageControllerResultView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

export default function ResultEntryPage() {
  const { refreshKey } = useFest();
  const stages = useMemo(() => festService.getStages(), [refreshKey]);
  const [activeTab, setActiveTab] = useState<string>('stage-1');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set default stage when stages load
  useEffect(() => {
    if (stages.length > 0 && !activeTab.startsWith('stage-') && activeTab !== 'scoring' && activeTab !== 'published') {
      setActiveTab(`stage-${stages[0].stage_number}`);
    }
  }, [stages, activeTab]);

  // Dynamic Sidebar Navigation: Stages from stages table followed by Tabulation Consoles
  const navItems: NavItem[] = useMemo(() => {
    const stageItems: NavItem[] = stages.map(st => ({
      id: `stage-${st.stage_number}`,
      label: st.name,
      icon: Radio
    }));

    return [
      ...stageItems,
      { id: 'scoring', label: 'Score Entry Console', icon: ClipboardPen },
      { id: 'published', label: 'Published Results Registry', icon: Lock }
    ];
  }, [stages]);

  // Determine active stage number if currently on a stage tab
  const activeStageNumber = useMemo(() => {
    if (activeTab.startsWith('stage-')) {
      const num = parseInt(activeTab.replace('stage-', ''), 10);
      return isNaN(num) ? 1 : num;
    }
    return 1;
  }, [activeTab]);

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Result & Stage Console"
        roleBadge="Result Entry"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={setActiveTab}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['result_entry', 'stage_controller', 'admin']}>
      <DashboardLayout
        portalTitle="Result & Stage Console"
        roleBadge="Result Entry"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={setActiveTab}
      >
        <div className="max-w-7xl mx-auto">
          {activeTab.startsWith('stage-') && (
            <StageControllerResultView
              selectedStageNumber={activeStageNumber}
              onSelectStageNumber={(num) => setActiveTab(`stage-${num}`)}
            />
          )}

          {(activeTab === 'scoring' || activeTab === 'published') && (
            <ResultEntryView
              activeTab={activeTab as ResultEntryTab}
              onTabChange={(tab) => setActiveTab(tab)}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
