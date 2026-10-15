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
  ListChecks
} from 'lucide-react';
import { Item, College, ItemType, StudentCategory, EntryLock, Student, Result } from '@/lib/types/fest';
import { LocksMatrixTab } from '../admin/tabs/LocksMatrixTab';
import { SettingsTab } from '../admin/tabs/SettingsTab';
import { EventsCatalogTab } from '../admin/tabs/EventsCatalogTab';
import { CollegesTab } from '../admin/tabs/CollegesTab';
import { CollegeRegistrationsTab } from '../admin/tabs/CollegeRegistrationsTab';
import { ManageVolunteersTab } from '../admin/tabs/ManageVolunteersTab';
import { BroadcastAlertsTab } from '../admin/tabs/BroadcastAlertsTab';
import { EventsScheduleTab } from '../admin/tabs/EventsScheduleTab';


export type AdminTab =
  | 'overview'
  | 'schedule'
  | 'locks_matrix'
  | 'settings'
  | 'items'
  | 'colleges'
  | 'college_registrations'
  | 'volunteers'
  | 'announcements'
  | 'appeals'
  | 'results';

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

  const colleges = festService.getColleges();
  const items = festService.getItems();
  const students = festService.getStudents();
  const registrations = festService.getRegistrations();
  const appeals = festService.getAppeals();
  const replacements = festService.getReplacements();
  const results = festService.getResults();
  const locks = festService.getEntryLocks();
  const schedules = festService.getSchedules();

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

  // Unique count of active students registered across festival events
  const registeredStudentsCount = React.useMemo(() => {
    const set = new Set<string>();
    registrations.forEach(r => {
      if (r.chest_no) set.add(r.chest_no.trim().toUpperCase());
    });
    return set.size;
  }, [registrations]);

  // College-wise Registrations Management State
  const [selectedCollegeAfflForReg, setSelectedCollegeAfflForReg] = useState<number>(() => {
    return colleges.length > 0 ? colleges[0].affl_no : 11;
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
            <Badge variant="navy" size="md">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Fest Executive Admin Console
            </Badge>
            <span className="text-xs text-[var(--text-muted)]">Full System Control & RLS Authority</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">Festival Operations & Access Control</h2>
        </div>


      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Institutions</span>
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{colleges.length}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {colleges.filter(c => c.fine_status).length} flagged with late fines
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registered Students</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{registeredStudentsCount}</span>
                <span className="text-xs text-[var(--text-muted)]">/ {students.length} on roster</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {registrations.length} event {registrations.length === 1 ? 'entry' : 'entries'} across institutions
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Items</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{items.length}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {items.filter(i => i.is_locked).length} locked globally
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pending Appeals</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                {appeals.filter(a => a.status === 'Pending').length + replacements.filter(r => r.status === 'Pending').length}
              </p>
              <p className="text-[11px] text-amber-400 font-medium mt-1">Requires admin review</p>
            </Card>
          </div>

          {/* Activity Section */}
          <div className="space-y-6">
            {/* Live Schedules Snapshot */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Stages & Live Schedules</CardTitle>
                  <CardDescription>Real-time item progression across campus auditoriums</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Current Item</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(sch => (
                      <TableRow key={sch.id}>
                        <TableCell className="font-semibold text-slate-100">{sch.stage?.name}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-200">{sch.item?.name}</div>
                          <span className="text-[10px] text-slate-400">{sch.item?.code}</span>
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono">
                          {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
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

      {/* 2. ENTRY LOCKS MATRIX TAB */}
      {activeTab === 'locks_matrix' && <LocksMatrixTab />}

      {/* 2. SETTINGS & DEADLINES TAB */}
      {activeTab === 'settings' && <SettingsTab />}

      {/* 3. ITEMS CATALOG TAB */}
      {activeTab === 'items' && <EventsCatalogTab />}

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

      {/* 5. APPEALS & REPLACEMENTS TAB */}
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          {/* Item Performance Appeals */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Event Result Appeals & Grievances</CardTitle>
                <CardDescription>
                  Review contested decisions, technical glitches, and jury disputes with payment proofs
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Reason / Complaint</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Admin Adjudication</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                        No appeals submitted
                      </TableCell>
                    </TableRow>
                  ) : (
                    appeals.map(appeal => (
                      <TableRow key={appeal.id}>
                        <TableCell className="font-semibold text-slate-100">{appeal.college?.name}</TableCell>
                        <TableCell className="font-medium text-slate-700">{appeal.item?.name}</TableCell>
                        <TableCell className="max-w-xs text-xs text-slate-600">
                          {appeal.reason}
                          {appeal.admin_remarks && (
                            <div className="mt-1 text-[11px] bg-slate-100 p-1.5 rounded text-slate-700">
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
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View Fee
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
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
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg w-36"
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
                            <span className="text-xs text-slate-400">Adjudicated</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Participant Replacements */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Participant Substitution Requests</CardTitle>
                <CardDescription>
                  Emergency student substitutions (medical reasons, schedule clashes) requiring approval
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Original Participant</TableHead>
                    <TableHead>Replacement Student</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                        No replacement requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    replacements.map(rep => (
                      <TableRow key={rep.id}>
                        <TableCell className="font-semibold text-slate-100">
                          {rep.registration?.item?.name}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-rose-700">{rep.original_student?.full_name || rep.original_student?.name}</div>
                          <span className="text-[10px] text-slate-400">CIC: {rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-emerald-700">{rep.replacement_student?.full_name || rep.replacement_student?.name}</div>
                          <span className="text-[10px] text-slate-400">CIC: {rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{rep.reason}</TableCell>
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
                            <span className="text-xs text-slate-400">Resolved</span>
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
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Results Verification & Official Publishing</CardTitle>
              <CardDescription>
                Review submitted tabulation sheets, verify points, and publish to the public leaderboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>1st Place (Gold - 5 pts)</TableHead>
                  <TableHead>2nd Place (Silver - 3 pts)</TableHead>
                  <TableHead>3rd Place (Bronze - 1 pt)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Publishing Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                      No results entered yet by tabulators
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedResults.map(res => (
                    <TableRow key={res.item_id}>
                      <TableCell>
                        <div className="font-semibold text-slate-100">{res.item?.name}</div>
                        <span className="text-[10px] text-slate-400">{res.item?.code}</span>
                      </TableCell>
                      <TableCell>
                        {res.first_reg ? (
                          <div>
                            <span className="font-bold text-amber-600">🥇 {res.first_reg.college?.code || res.first_reg.college?.short_name}</span>
                            <div className="text-[11px] text-slate-500">
                              {res.first_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.second_reg ? (
                          <div>
                            <span className="font-bold text-slate-600">🥈 {res.second_reg.college?.code || res.second_reg.college?.short_name}</span>
                            <div className="text-[11px] text-slate-500">
                              {res.second_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.third_reg ? (
                          <div>
                            <span className="font-bold text-amber-700">🥉 {res.third_reg.college?.code || res.third_reg.college?.short_name}</span>
                            <div className="text-[11px] text-slate-500">
                              {res.third_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
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
                          variant={res.published ? 'outline' : 'primary'}
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




    </div>
  );
}
