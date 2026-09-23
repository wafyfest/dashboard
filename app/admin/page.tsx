'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Award,
  Building2,
  AlertTriangle,
  Trophy,
  Lock
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { AdminView, AdminTab } from '@/components/roles/AdminView';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Fest Overview', icon: ShieldAlert },
    { id: 'locks_matrix', label: 'Entry Locks Matrix', icon: Lock },
    { id: 'settings', label: 'Deadlines & Branding', icon: Clock },
    { id: 'items', label: 'Events Catalog', icon: Award },
    { id: 'colleges', label: 'Colleges & Overrides', icon: Building2 },
    { id: 'appeals', label: 'Appeals & Replacements', icon: AlertTriangle },
    { id: 'results', label: 'Results & Points', icon: Trophy }
  ];

  return (
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
  );
}
