'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Award,
  Building2,
  AlertTriangle,
  Trophy
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { AdminView } from '@/components/roles/AdminView';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Fest Overview', icon: ShieldAlert },
    { id: 'settings', label: 'Deadlines & Locks', icon: Clock },
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
      onSelectNavItem={setActiveTab}
    >
      <div className="max-w-7xl mx-auto">
        <AdminView />
      </div>
    </DashboardLayout>
  );
}
