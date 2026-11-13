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
import { Item, College, ItemType, StudentCategory, EntryLock, Student, Result } from '@/lib/types/fest';
import { LocksMatrixTab } from '../admin/tabs/LocksMatrixTab';
import { SettingsTab } from '../admin/tabs/SettingsTab';
import { EventDeadlinesTab } from '../admin/tabs/EventDeadlinesTab';
import { EventsCatalogTab } from '../admin/tabs/EventsCatalogTab';
import { CollegesTab } from '../admin/tabs/CollegesTab';
import { CollegeRegistrationsTab } from '../admin/tabs/CollegeRegistrationsTab';
import { ManageVolunteersTab } from '../admin/tabs/ManageVolunteersTab';
import { BroadcastAlertsTab } from '../admin/tabs/BroadcastAlertsTab';
import { EventsScheduleTab } from '../admin/tabs/EventsScheduleTab';
import { EventRegistrationsTab } from '../admin/tabs/EventRegistrationsTab';
import { SystemLogsTab } from '../admin/tabs/SystemLogsTab';
import { PreFestEventsTab } from '../admin/tabs/PreFestEventsTab';

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

  const [appealRemarks, setAppealRemarks] = useState<{ [id: string]: string }>({});

  const colleges = React.useMemo(() => festService.getColleges(), [refreshKey]);
  const items = React.useMemo(() => festService.getItems(), [refreshKey]);
  const students = React.useMemo(() => festService.getStudents(), [refreshKey]);
  const registrations = React.useMemo(() => festService.getRegistrations(), [refreshKey]);
  const appeals = React.useMemo(() => festService.getAppeals(), [refreshKey]);
  const replacements = React.useMemo(() => festService.getReplacements(), [refreshKey]);
  const results = React.useMemo(() => festService.getResults(), [refreshKey]);
  const locks = React.useMemo(() => festService.getEntryLocks(), [refreshKey]);
  const schedules = React.useMemo(() => festService.getSchedules(), [refreshKey]);

  // Deduplicate results by event item_id for display and publishing controls
  const groupedResults = React.useMemo(() => {
    const map = new Map<number, Result>();
    for (const res of results) {
      if (!map.has(res.item_id)) {
        map.set(res.item_id, res);
      }
    }
    return Array.from(map.values());
  }, [results]);

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
      onManageRegistrations={(afflNo) => {
        setSelectedCollegeAfflForReg(afflNo);
        setActiveTab('college_registrations');
      }}
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
                    {schedules.map(sch => (
                      <TableRow key={sch.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-heading font-semibold text-[var(--text-primary)]">{sch.stage?.name}</TableCell>
                        <TableCell>
                          <div className="font-heading font-medium text-[var(--text-primary)]">{sch.item?.name}</div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{sch.item?.code}</span>
                        </TableCell>
                        <TableCell className="text-[var(--text-secondary)] font-mono tabular-nums text-xs">
                          {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StageStatusBadge status={sch.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Colleges & Overrides Section */}
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
        <PreFestEventsTab mode="setup" />
      )}

      {/* 3.0.1. PRE-FEST REGISTRATIONS & SUBMISSIONS (UNDER REGISTRATIONS) */}
      {activeTab === 'prefest_registrations' && (
        <PreFestEventsTab mode="registrations" />
      )}

      {/* 3.1. EVENT-WISE ALL COLLEGES REGISTRATIONS TAB */}
      {activeTab === 'event_registrations' && <EventRegistrationsTab />}

      {/* 4. COLLEGES & OVERRIDES TAB */}
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
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
              <div>
                <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">Event Result Appeals &amp; Grievances</CardTitle>
                <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
                  Review contested decisions, technical glitches, and jury disputes with payment proofs
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">College</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Reason / Complaint</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Receipt</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
                    <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Admin Adjudication</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                        No appeals submitted
                      </TableCell>
                    </TableRow>
                  ) : (
                    appeals.map(appeal => (
                      <TableRow key={appeal.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-heading font-semibold text-[var(--text-primary)]">{appeal.college?.name}</TableCell>
                        <TableCell className="font-heading font-medium text-[var(--text-primary)]">{appeal.item?.name}</TableCell>
                        <TableCell className="max-w-xs text-xs text-[var(--text-secondary)] font-sans">
                          {appeal.reason}
                          {appeal.admin_remarks && (
                            <div className="mt-1 text-[11px] bg-[var(--bg-subtle)] p-1.5 rounded-lg text-[var(--text-primary)] border border-[var(--border-subtle)] font-sans">
                              <strong>Remarks:</strong> {appeal.admin_remarks}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {appeal.fee_receipt_url ? (
                            <a
                              href={appeal.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:underline text-xs flex items-center gap-1 font-medium font-sans"
                            >
                              <FileText className="w-3 h-3" /> View Fee
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs font-sans">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AppealStatusBadge status={appeal.status || appeal.current_status || 'Pending'} />
                        </TableCell>
                        <TableCell className="text-right space-y-1">
                          {appeal.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                placeholder="Admin remarks..."
                                value={appealRemarks[appeal.id] || ''}
                                onChange={e =>
                                  setAppealRemarks({ ...appealRemarks, [appeal.id]: e.target.value })
                                }
                                className="px-2.5 py-1 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-sans w-36"
                              />
                              <Button
                                size="xs"
                                variant="success"
                                onClick={() => {
                                  festService.reviewAppeal(
                                    appeal.id,
                                    'Approved',
                                    appealRemarks[appeal.id] || 'Approved by Executive Committee'
                                  );
                                  triggerRefresh();
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() => {
                                  festService.reviewAppeal(
                                    appeal.id,
                                    'Rejected',
                                    appealRemarks[appeal.id] || 'Rejected after jury re-evaluation'
                                  );
                                  triggerRefresh();
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] font-sans">Adjudicated</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5.1. REPLACEMENTS & SUBSTITUTIONS TAB */}
      {activeTab === 'replacements' && (
        <div className="space-y-6">
          <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
              <div>
                <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">Participant Replacement Requests</CardTitle>
                <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
                  Emergency student substitutions (medical reasons, schedule clashes) requiring administrative approval
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Original Participant</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Replacement Student</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Reason</TableHead>
                    <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
                    <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                        No replacement requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    replacements.map(rep => (
                      <TableRow key={rep.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-heading font-semibold text-[var(--text-primary)]">
                          {rep.registration?.item?.name}
                        </TableCell>
                        <TableCell>
                          <div className="font-heading font-medium text-rose-600 dark:text-rose-400">{rep.original_student?.full_name || rep.original_student?.name}</div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">CIC: {rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-heading font-medium text-emerald-600 dark:text-emerald-400">{rep.replacement_student?.full_name || rep.replacement_student?.name}</div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">CIC: {rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)] font-sans">{rep.reason}</TableCell>
                        <TableCell>
                          <AppealStatusBadge status={rep.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {rep.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="xs"
                                variant="success"
                                onClick={async () => {
                                  const res = await festService.reviewReplacement(rep.id, 'Approved');
                                  if (!res.success) {
                                    alert(res.error || 'Failed to approve substitution');
                                  } else {
                                    triggerRefresh();
                                  }
                                }}
                              >
                                Approve Substitution
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={async () => {
                                  const res = await festService.reviewReplacement(rep.id, 'Rejected');
                                  if (!res.success) {
                                    alert(res.error || 'Failed to reject substitution');
                                  } else {
                                    triggerRefresh();
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] font-sans">Resolved</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. RESULTS & POINTS TAB */}
      {activeTab === 'results' && (
        <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
            <div>
              <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">Results Verification & Official Publishing</CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
                Review submitted tabulation sheets, verify points, and publish to the public leaderboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[var(--bg-subtle)]">
                <TableRow>
                  <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
                  <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">1st Place (Gold - 5 pts)</TableHead>
                  <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">2nd Place (Silver - 3 pts)</TableHead>
                  <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">3rd Place (Bronze - 1 pt)</TableHead>
                  <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
                  <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Publishing Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                      No results entered yet by tabulators
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedResults.map(res => (
                    <TableRow key={res.item_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <TableCell>
                        <div className="font-heading font-semibold text-[var(--text-primary)]">{res.item?.name}</div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{res.item?.code}</span>
                      </TableCell>
                      <TableCell>
                        {res.first_reg ? (
                          <div>
                            <span className="font-heading font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">🥇 {res.first_reg.college?.code || res.first_reg.college?.short_name}</span>
                            <div className="text-[11px] text-[var(--text-muted)] font-sans">
                              {res.first_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs font-sans">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.second_reg ? (
                          <div>
                            <span className="font-heading font-bold text-[var(--text-secondary)]">🥈 {res.second_reg.college?.code || res.second_reg.college?.short_name}</span>
                            <div className="text-[11px] text-[var(--text-muted)] font-sans">
                              {res.second_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs font-sans">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.third_reg ? (
                          <div>
                            <span className="font-heading font-bold text-amber-700 dark:text-amber-500">🥉 {res.third_reg.college?.code || res.third_reg.college?.short_name}</span>
                            <div className="text-[11px] text-[var(--text-muted)] font-sans">
                              {res.third_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs font-sans">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.published ? (
                          <Badge variant="success">Published Live</Badge>
                        ) : (
                          <Badge variant="warning">Awaiting Approval</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant={res.published ? 'outline' : 'saffron'}
                          className="font-heading font-semibold"
                          onClick={async () => {
                            const ok = await festService.publishResult(res.item_id, !res.published);
                            if (!ok) {
                              alert('Failed to update result publication status');
                            } else {
                              triggerRefresh();
                            }
                          }}
                        >
                          {res.published ? 'Revoke to Draft' : 'Publish to Board'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 6.0. SYSTEM AUDIT LOGS TAB */}
      {activeTab === 'logs' && <SystemLogsTab />}

    </div>
  );
}
