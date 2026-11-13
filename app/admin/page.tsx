'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Calendar,
  Clock,
  Award,
  Building2,
  AlertTriangle,
  Trophy,
  Lock,
  UserCheck,
  HeartHandshake,
  BellRing,
  Layers,
  ScrollText,
  UserPlus,
  Sparkles
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
    // Main Overview
    { id: 'overview', label: 'Fest Overview', icon: ShieldAlert },

    // Setup & Rules
    { id: 'items', label: 'Events Catalog', icon: Award, group: 'Setup' },
    { id: 'prefest_setup', label: 'Pre-Fest Catalog & Deadlines', icon: Sparkles, group: 'Setup' },
    { id: 'locks_matrix', label: 'Registration Locks', icon: Lock, group: 'Setup' },
    { id: 'settings', label: 'Deadlines & Fines', icon: Clock, group: 'Setup' },

    // Delegations & Rosters
    { id: 'college_registrations', label: 'College Delegations', icon: Building2, group: 'Registrations' },
    { id: 'event_registrations', label: 'Participant Rosters', icon: Layers, group: 'Registrations' },
    { id: 'prefest_registrations', label: 'Pre-Fest Registrations', icon: Sparkles, group: 'Registrations' },
    { id: 'colleges', label: 'Institutions & Overrides', icon: UserCheck, group: 'Registrations' },
    { id: 'volunteers', label: 'Volunteer Force', icon: HeartHandshake, group: 'Registrations' },

    // Live Festival Operations
    { id: 'schedule', label: 'Stages & Schedules', icon: Calendar, group: 'Live Stage' },
    { id: 'results', label: 'Results & Points', icon: Trophy, group: 'Live Stage' },
    { id: 'announcements', label: 'Broadcast Alerts', icon: BellRing, group: 'Live Stage' },

    // Governance & Records
    { id: 'appeals', label: 'Appeals', icon: AlertTriangle, group: 'Records' },
    { id: 'replacements', label: 'Replacements', icon: UserPlus, group: 'Records' },
    { id: 'logs', label: 'System Audit Logs', icon: ScrollText, group: 'Records' }
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
          <div className="h-32 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
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
