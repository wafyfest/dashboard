'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, AppealStatusBadge, StageStatusBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ShieldAlert,
  Building2,
  Calendar,
  Lock,
  Unlock,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Award,
  Users,
  UserCheck,
  Search,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  ClipboardList,
  Eye,
  GraduationCap,
  Phone,
  ListChecks,
  Layers,
  UserPlus
} from 'lucide-react';
import { Item, College, ItemType, StudentCategory, EntryLock, Student, Result, isSubmissionEvent, getEffectiveStageMode } from '@/lib/types/fest';
import { LocksMatrixTab } from '../admin/tabs/LocksMatrixTab';
import { EventDeadlinesTab } from '../admin/tabs/EventDeadlinesTab';
import { EventsCatalogTab } from '../admin/tabs/EventsCatalogTab';
import { CollegesTab } from '../admin/tabs/CollegesTab';
import { CollegeRegistrationsTab } from '../admin/tabs/CollegeRegistrationsTab';
import { ManageVolunteersTab } from '../admin/tabs/ManageVolunteersTab';
import { BlockedStudentsTab } from '../admin/tabs/BlockedStudentsTab';
import { BroadcastAlertsTab } from '../admin/tabs/BroadcastAlertsTab';
import { EventsScheduleTab } from '../admin/tabs/EventsScheduleTab';
import { EventRegistrationsTab } from '../admin/tabs/EventRegistrationsTab';
import { SystemLogsTab } from '../admin/tabs/SystemLogsTab';
import { PreFestEventsTab } from '../admin/tabs/PreFestEventsTab';
import { AppealsTab } from '../admin/tabs/AppealsTab';
import { ReplacementsTab } from '../admin/tabs/ReplacementsTab';
import { ResultsTab } from '../admin/tabs/ResultsTab';

export type AdminTab =
  | 'overview'
  | 'schedule'
  | 'locks_matrix'
  | 'settings'
  | 'event_deadlines'
  | 'items'
  | 'prefest_setup'
  | 'prefest_events'
  | 'prefest_registrations'
  | 'special_events' // backward compat
  | 'event_registrations'
  | 'colleges'
  | 'college_registrations'
  | 'volunteers'
  | 'blocked_students'
  | 'announcements'
  | 'appeals'
  | 'replacements'
  | 'results'
  | 'logs';

interface AdminViewProps {
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export function AdminView({ activeTab: controlledTab, onTabChange }: AdminViewProps = {}) {
  const { festSettings, refreshKey, triggerRefresh } = useFest();
  const [internalTab, setInternalTab] = useState<AdminTab>('overview');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: AdminTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const colleges = React.useMemo(() => festService.getColleges(), [refreshKey]);
  const items = React.useMemo(() => festService.getItems(), [refreshKey]);
  const students = React.useMemo(() => festService.getStudents(), [refreshKey]);
  const registrations = React.useMemo(() => festService.getRegistrations(), [refreshKey]);
  const appeals = React.useMemo(() => festService.getAppeals(), [refreshKey]);
  const replacements = React.useMemo(() => festService.getReplacements(), [refreshKey]);
  const locks = React.useMemo(() => festService.getEntryLocks(), [refreshKey]);
  const schedules = React.useMemo(() => festService.getSchedules(), [refreshKey]);

  // Unique count of active students registered across fest events
  const registeredStudentsCount = React.useMemo(() => {
    const set = new Set<string>();
    registrations.forEach(r => {
      if (r.chest_no) set.add(r.chest_no.trim().toUpperCase());
    });
    return set.size;
  }, [registrations]);

  // College-wise Registrations Management State
  const [selectedCollegeAfflForReg, setSelectedCollegeAfflForReg] = useState<number>(() => {
    return colleges.length > 0 ? colleges[0].affl_no : 1;
  });

  React.useEffect(() => {
    if (colleges.length > 0 && !colleges.some(c => c.affl_no === selectedCollegeAfflForReg)) {
      setSelectedCollegeAfflForReg(colleges[0].affl_no);
    }
  }, [colleges.length, selectedCollegeAfflForReg]);



  const renderCollegesCard = (hideMetrics = false) => (
    <CollegesTab
      hideMetrics={hideMetrics}
      onOpenMatrix={() => setActiveTab('locks_matrix')}
    />
  );

  const renderCollegeRegistrationsTab = () => (
    <CollegeRegistrationsTab
      selectedCollegeAffl={selectedCollegeAfflForReg}
      onSelectCollegeAffl={setSelectedCollegeAfflForReg}
    />
  );

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] shrink-0" />
            <span className="text-xs font-heading font-bold text-[var(--f-saffron-text)] uppercase tracking-wider">
              Executive Console
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--text-primary)] mt-1 tracking-tight">
            Festival Operations &amp; Live Control
          </h1>
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="group relative overflow-hidden p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--f-saffron)]/50 transition-all duration-300 rounded-2xl hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--f-saffron)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Institutions
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)]">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold font-mono tabular-nums text-[var(--text-primary)] mt-3">
                {colleges.length}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {colleges.filter(c => c.fine_status).length} flagged with late fines
              </p>
            </Card>

            <Card className="group relative overflow-hidden p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--f-saffron)]/50 transition-all duration-300 rounded-2xl hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--f-saffron)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Registered Students
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-heading font-extrabold font-mono tabular-nums text-[var(--text-primary)]">
                  {registeredStudentsCount}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">/ {students.length} on roster</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {registrations.length} event {registrations.length === 1 ? 'entry' : 'entries'} across institutions
              </p>
            </Card>

            <Card className="group relative overflow-hidden p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] hover:border-[var(--f-saffron)]/50 transition-all duration-300 rounded-2xl hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--f-saffron)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Total Events
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)]">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold font-mono tabular-nums text-[var(--text-primary)] mt-3">
                {items.length}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {items.filter(i => i.is_locked).length} locked globally
              </p>
            </Card>

            {(() => {
              const pendingCount = appeals.filter(a => a.status === 'Pending').length + replacements.filter(r => r.status === 'Pending').length;
              return (
                <Card className={`group relative overflow-hidden p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] ${pendingCount > 0 ? 'hover:border-rose-500/50' : 'hover:border-amber-500/30'} transition-all duration-300 rounded-2xl hover:-translate-y-0.5`}>
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent ${pendingCount > 0 ? 'via-rose-500/40' : 'via-emerald-500/30'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Pending Appeals
                    </span>
                    <div className={`p-2 rounded-xl border ${pendingCount > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-heading font-extrabold font-mono tabular-nums text-[var(--text-primary)] mt-3">
                    {pendingCount}
                  </p>
                  {pendingCount > 0 ? (
                    <p className="text-[11px] text-rose-400/90 font-sans font-medium mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      Requires admin review
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)] font-sans mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                      All appeals resolved
                    </p>
                  )}
                </Card>
              );
            })()}
          </div>

          {/* Activity Section */}
          <div className="space-y-6">
            {/* Live Schedules Snapshot */}
            <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
                <div>
                  <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">Stages & Live Schedules</CardTitle>
                  <CardDescription className="text-xs text-[var(--text-muted)] font-sans">Real-time event progression across campus auditoriums</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[580px]">
                  <TableHeader className="bg-[var(--bg-subtle)]">
                    <TableRow>
                      <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[140px]">Stage</TableHead>
                      <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[180px]">Current Event</TableHead>
                      <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[120px]">Scheduled Time</TableHead>
                      <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[130px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-[var(--text-muted)] italic font-sans">
                          No events scheduled yet. Go to Stages &amp; Schedules tab to schedule events.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map(sch => (
                        <TableRow key={sch.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                          <TableCell className="font-heading font-semibold text-[var(--text-primary)]">{sch.stage?.name || (sch.stage_number ? `Stage ${sch.stage_number}` : (isSubmissionEvent(sch.item) ? 'Digital Submission' : getEffectiveStageMode(sch.item) === 'offstage' ? 'Off-Stage' : 'Unassigned'))}</TableCell>
                          <TableCell>
                            <div className="font-heading font-medium text-[var(--text-primary)]">{sch.item?.name || sch.item?.name_eng || `Item ${sch.item_id}`}</div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{sch.item?.code || sch.item?.item_code}</span>
                          </TableCell>
                          <TableCell className="text-[var(--text-secondary)] font-mono tabular-nums text-xs">
                            {sch.scheduled_start || sch.starting ? new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StageStatusBadge status={sch.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* College Controls Section */}
            {renderCollegesCard(true)}
          </div>
        </div>
      )}

      {/* 1.1. EVENTS SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <EventsScheduleTab
          items={items}
          stages={festService.getStages()}
          schedules={schedules}
        />
      )}

      {/* 2. REGISTRATION LOCK TAB */}
      {activeTab === 'locks_matrix' && <LocksMatrixTab />}

      {/* 2. UNIVERSAL DEADLINES & FINES POLICY TAB */}
      {(activeTab === 'settings' || activeTab === 'event_deadlines') && <EventDeadlinesTab />}

      {/* 3. ITEMS CATALOG TAB */}
      {activeTab === 'items' && <EventsCatalogTab />}

      {/* 3.0. PRE-FEST EVENT CATALOG & DEADLINES (IN SETUP) */}
      {(activeTab === 'prefest_setup' || activeTab === 'prefest_events' || activeTab === 'special_events') && (
        <PreFestEventsTab mode="setup" onNavigateTab={(tab) => setActiveTab(tab as AdminTab)} />
      )}

      {/* 3.0.1. PRE-FEST REGISTRATIONS & SUBMISSIONS (UNDER REGISTRATIONS) */}
      {activeTab === 'prefest_registrations' && (
        <PreFestEventsTab mode="registrations" onNavigateTab={(tab) => setActiveTab(tab as AdminTab)} />
      )}

      {/* 3.1. EVENT-WISE ALL COLLEGES REGISTRATIONS TAB */}
      {activeTab === 'event_registrations' && <EventRegistrationsTab />}

      {/* 4. COLLEGE CONTROLS TAB */}
      {activeTab === 'colleges' && renderCollegesCard()}

      {/* 4.1. COLLEGE-WISE EVENT REGISTRATIONS TAB */}
      {activeTab === 'college_registrations' && renderCollegeRegistrationsTab()}

      {/* 4.2. MANAGE VOLUNTEERS TAB */}
      {activeTab === 'volunteers' && (
        <ManageVolunteersTab
          colleges={colleges}
          students={students}
          refreshKey={refreshKey}
          onRefresh={triggerRefresh}
        />
      )}

      {/* 4.2b. STUDENT BLOCKLIST & COMMITTEE CONTROLS TAB */}
      {activeTab === 'blocked_students' && (
        <BlockedStudentsTab />
      )}

      {/* 4.3. BROADCAST ALERTS & BULLETINS TAB */}
      {activeTab === 'announcements' && (
        <BroadcastAlertsTab
          colleges={colleges}
          students={students}
          refreshKey={refreshKey}
          onRefresh={triggerRefresh}
        />
      )}

      {/* 5. APPEALS TAB */}
      {activeTab === 'appeals' && <AppealsTab onRefresh={triggerRefresh} />}

      {/* 5.1. REPLACEMENTS & SUBSTITUTIONS TAB */}
      {activeTab === 'replacements' && <ReplacementsTab onRefresh={triggerRefresh} />}

      {/* 6. RESULTS & POINTS TAB */}
      {activeTab === 'results' && <ResultsTab onRefresh={triggerRefresh} />}

      {/* 6.0. SYSTEM AUDIT LOGS TAB */}
      {activeTab === 'logs' && <SystemLogsTab />}

    </div>
  );
}
