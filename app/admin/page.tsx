'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Calendar,
  Clock,
  Award,
  Building2,
  AlertTriangle,
  Trophy,
  Lock,
  HeartHandshake,
  BellRing,
  Layers,
  ScrollText,
  UserPlus,
  Sparkles,
  UserX,
  Users,
  FileText
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { AdminView, AdminTab } from '@/components/roles/AdminView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const VALID_ADMIN_TABS = new Set<string>([
  'overview',
  'schedule',
  'locks_matrix',
  'settings',
  'event_deadlines',
  'items',
  'prefest_setup',
  'prefest_events',
  'prefest_registrations',
  'special_events',
  'event_registrations',
  'colleges',
  'college_registrations',
  'volunteers',
  'blocked_students',
  'announcements',
  'appeals',
  'replacements',
  'results',
  'logs',
  'topics'
]);

const navItems: NavItem[] = [
  // Main Overview
  { id: 'overview', label: 'Fest Overview', icon: ShieldAlert },

  // Setup & Rules
  { id: 'items', label: 'Events Catalog', icon: Award, group: 'Setup' },
  { id: 'prefest_setup', label: 'Pre-Fest Catalog', icon: Sparkles, group: 'Setup' },
  { id: 'colleges', label: 'College Controls', icon: Building2, group: 'Setup' },
  { id: 'locks_matrix', label: 'Registration Locks', icon: Lock, group: 'Setup' },
  { id: 'settings', label: 'Deadlines & Fines', icon: Clock, group: 'Setup' },

  // Delegations & Rosters
  { id: 'college_registrations', label: 'College Delegations', icon: Users, group: 'Registrations' },
  { id: 'event_registrations', label: 'Participant Rosters', icon: Layers, group: 'Registrations' },
  { id: 'prefest_registrations', label: 'Pre-Fest Registrations', icon: Sparkles, group: 'Registrations' },
  { id: 'volunteers', label: 'Volunteer Force', icon: HeartHandshake, group: 'Registrations' },
  { id: 'blocked_students', label: 'Student Blocklist', icon: UserX, group: 'Registrations' },

  // Live Festival Operations
  { id: 'schedule', label: 'Stages & Schedules', icon: Calendar, group: 'Live Stage' },
  { id: 'topics', label: 'Item Topics', icon: FileText, group: 'Live Stage' },
  { id: 'results', label: 'Results & Points', icon: Trophy, group: 'Live Stage' },
  { id: 'announcements', label: 'Broadcast Alerts', icon: BellRing, group: 'Live Stage' },

  // Governance & Records
  { id: 'appeals', label: 'Appeals', icon: AlertTriangle, group: 'Records' },
  { id: 'replacements', label: 'Replacements', icon: UserPlus, group: 'Records' },
  { id: 'logs', label: 'System Audit Logs', icon: ScrollText, group: 'Records' }
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Read initial tab from URL search parameters on client mount
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && VALID_ADMIN_TABS.has(tab)) {
        setActiveTab(tab as AdminTab);
      }
    } catch {}

    // Support browser Back / Forward buttons without full-page reloads
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && VALID_ADMIN_TABS.has(tab)) {
          setActiveTab(tab as AdminTab);
        } else {
          setActiveTab('overview');
        }
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = useCallback((newTab: AdminTab) => {
    // 1. Immediately update local state for 0ms instantaneous UI response
    setActiveTab(newTab);

    // 2. Update URL silently via history.pushState so browser history & direct links work without Next.js router transitions
    try {
      const url = new URL(window.location.href);
      if (newTab === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', newTab);
      }
      const targetUrl = url.pathname + (url.search ? url.search : '');
      window.history.pushState(null, '', targetUrl);
    } catch {}
  }, []);

  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Admin Dashboard"
        roleBadge="Executive Admin"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={() => {}}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-32 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] border-t-2 border-t-[var(--f-saffron)]/70 [box-shadow:var(--shadow-card),var(--glass-highlight)] animate-pulse"
              />
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
        onSelectNavItem={(id) => handleSelectTab(id as AdminTab)}
      >
        <div className="max-w-7xl mx-auto">
          <AdminView activeTab={activeTab} onTabChange={handleSelectTab} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
