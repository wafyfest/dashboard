'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Award,
  Building2,
  AlertTriangle,
  Trophy,
  Lock,
  UserCheck
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { AdminView, AdminTab } from '@/components/roles/AdminView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Fest Overview', icon: ShieldAlert },
    { id: 'locks_matrix', label: 'Entry Locks Matrix', icon: Lock },
    { id: 'settings', label: 'Deadlines & Branding', icon: Clock },
    { id: 'items', label: 'Events Catalog', icon: Award },
    { id: 'colleges', label: 'Colleges & Overrides', icon: Building2 },
    { id: 'college_registrations', label: 'College Registrations', icon: UserCheck },
    { id: 'appeals', label: 'Appeals & Replacements', icon: AlertTriangle },
    { id: 'results', label: 'Results & Points', icon: Trophy }
  ];

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Admin Dashboard"
        roleBadge="Executive Admin"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as AdminTab)}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-32 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
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
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout
        portalTitle="Admin Dashboard"
        roleBadge="Executive Admin"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={(id) => setActiveTab(id as AdminTab)}
      >
        <div className="max-w-7xl mx-auto">
          <AdminView activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
