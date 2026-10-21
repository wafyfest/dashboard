'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  Radio
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { ConvenorView, ConvenorTab } from '@/components/roles/ConvenorView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ConvenorPage() {
  const [activeTab, setActiveTab] = useState<ConvenorTab>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { id: 'all', label: 'All College Contacts', icon: Building2 },
    { id: 'coordinator', label: 'Staff Co-ordinators', icon: GraduationCap },
    { id: 'manager', label: 'Team Managers', icon: Users },
    { id: 'asst_manager', label: 'Assistant Managers', icon: UserCheck },
    { id: 'stage_monitor', label: 'Stage Progress & Alerts', icon: Radio }
  ];

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Convenor Portal"
        roleBadge="Convenor"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ConvenorTab)}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['convenor', 'admin']}>
      <DashboardLayout
        portalTitle="Convenor Portal"
        roleBadge="Convenor"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as ConvenorTab)}
      >
        <div className="max-w-7xl mx-auto">
          <ConvenorView activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
