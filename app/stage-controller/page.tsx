'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Calendar,
  Shuffle
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { StageControllerResultView } from '@/components/roles/StageControllerResultView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

export default function StageControllerPage() {
  const { refreshKey } = useFest();
  const stages = useMemo(() => festService.getStages(), [refreshKey]);
  const [activeTab, setActiveTab] = useState<string>('stage-1');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (stages.length > 0 && !activeTab.startsWith('stage-')) {
      setActiveTab(`stage-${stages[0].stage_number}`);
    }
  }, [stages, activeTab]);

  // Sidebar navigation: Stages from the stages table
  const navItems: NavItem[] = useMemo(() => {
    return stages.map(st => ({
      id: `stage-${st.stage_number}`,
      label: st.name,
      icon: Radio
    }));
  }, [stages]);

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
        portalTitle="Stage Controller"
        roleBadge="Stage Controller"
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
    <ProtectedRoute allowedRoles={['stage_controller', 'result_entry', 'admin']}>
      <DashboardLayout
        portalTitle="Stage Controller"
        roleBadge="Stage Controller"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={setActiveTab}
      >
        <div className="max-w-7xl mx-auto">
          <StageControllerResultView
            selectedStageNumber={activeStageNumber}
            onSelectStageNumber={(num) => setActiveTab(`stage-${num}`)}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}