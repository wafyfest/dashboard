'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, AppealStatusBadge } from '../ui/badge';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
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
  Users
} from 'lucide-react';
import { Item, College, ItemType, StudentCategory } from '@/lib/types/fest';

export function AdminView() {
  const { festSettings, triggerRefresh } = useFest();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'items' | 'colleges' | 'appeals' | 'results'>('overview');

  // Local state for modals & forms
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item>>({
    code: '',
    name: '',
    category: 'Senior',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1
  });

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockTargetCollege, setUnlockTargetCollege] = useState<string>('');
  const [unlockTargetItem, setUnlockTargetItem] = useState<string>('');
  const [unlockHours, setUnlockHours] = useState<number>(24);

  const [appealRemarks, setAppealRemarks] = useState<{ [id: string]: string }>({});

  const colleges = festService.getColleges();
  const items = festService.getItems();
  const students = festService.getStudents();
  const registrations = festService.getRegistrations();
  const appeals = festService.getAppeals();
  const replacements = festService.getReplacements();
  const results = festService.getResults();
  const locks = festService.getCollegeItemLocks();
  const schedules = festService.getSchedules();

  // Settings edit state
  const [settingsForm, setSettingsForm] = useState({
    fest_name: festSettings.fest_name,
    reg_deadline: festSettings.reg_deadline.slice(0, 16),
    fine_deadline: festSettings.fine_deadline.slice(0, 16),
    rulebook_url: festSettings.rulebook_url || ''
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    festService.updateFestSettings({
      fest_name: settingsForm.fest_name,
      reg_deadline: new Date(settingsForm.reg_deadline).toISOString(),
      fine_deadline: new Date(settingsForm.fine_deadline).toISOString(),
      rulebook_url: settingsForm.rulebook_url
    });
    triggerRefresh();
    alert('Fest settings and registration deadlines successfully updated!');
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    festService.saveItem(editingItem);
    setIsItemModalOpen(false);
    setEditingItem({
      code: '',
      name: '',
      category: 'Senior',
      item_type: 'Single',
      min_participants: 1,
      max_participants: 1
    });
    triggerRefresh();
  };

  const handleCreateSelectiveUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTargetCollege || !unlockTargetItem) {
      alert('Please select both a college and an item');
      return;
    }
    festService.setCollegeItemLock(unlockTargetCollege, unlockTargetItem, true, unlockHours);
    setIsUnlockModalOpen(false);
    triggerRefresh();
    alert('Granular unlock successfully granted to institution!');
  };

  return (
    <div className="space-y-6">
      {/* Admin Title & Quick Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="md">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Fest Executive Admin Console
            </Badge>
            <span className="text-xs text-slate-500">Full System Control & RLS Authority</span>
          </div>
          <h2 className="text-xl font-bold text-[#132238] mt-1">Festival Operations & Access Control</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'settings', label: 'Deadlines & Locks' },
            { id: 'items', label: 'Events Catalog' },
            { id: 'colleges', label: 'Colleges & Overrides' },
            { id: 'appeals', label: `Appeals (${appeals.filter(a => a.status === 'Pending').length})` },
            { id: 'results', label: 'Results & Points' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#132238] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Institutions</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-[#132238] mt-2">{colleges.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {colleges.filter(c => c.fine_status).length} flagged with late fines
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Registered Students</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-[#132238] mt-2">{students.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">Across 4 age/experience categories</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Items</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-[#132238] mt-2">{items.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {items.filter(i => i.is_locked).length} locked globally
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Pending Appeals</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-[#132238] mt-2">
                {appeals.filter(a => a.status === 'Pending').length + replacements.filter(r => r.status === 'Pending').length}
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">Requires admin review</p>
            </Card>
          </div>

          {/* Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <TableCell className="font-semibold text-slate-800">{sch.stage?.name}</TableCell>
                        <TableCell>
                          <div className="font-medium text-[#132238]">{sch.item?.name}</div>
                          <span className="text-[10px] text-slate-400">{sch.item?.code}</span>
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono">
                          {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sch.status === 'On_Going'
                                ? 'success'
                                : sch.status === 'Starting_Soon'
                                ? 'amber'
                                : 'default'
                            }
                          >
                            {sch.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Granular Unlocks & Overrides */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Active Granular Overrides</CardTitle>
                  <CardDescription>Selective permissions overriding global registration locks</CardDescription>
                </div>
                <Button size="xs" variant="outline" onClick={() => setIsUnlockModalOpen(true)}>
                  <Plus className="w-3 h-3" /> Grant Unlock
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>College</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                          No active granular unlocks
                        </TableCell>
                      </TableRow>
                    ) : (
                      locks.map(l => {
                        const col = colleges.find(c => c.affl_no === l.college_affl_no || c.id === l.college_id);
                        const itm = items.find(i => i.item_id === l.item_id || i.id === String(l.item_id));
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium text-[#132238]">{col?.name}</TableCell>
                            <TableCell>{itm?.name_eng || itm?.name}</TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {l.unlocked_until
                                ? new Date(l.unlocked_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Permanent'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() => {
                                  festService.setCollegeItemLock(l.college_affl_no, l.item_id, false);
                                  triggerRefresh();
                                }}
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. SETTINGS & DEADLINES TAB */}
      {activeTab === 'settings' && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div>
              <CardTitle>System Settings & Registration Windows</CardTitle>
              <CardDescription>
                Configure fest branding, regular registration deadline, and late registration fine cutoffs
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Arts Fest Title</label>
                <input
                  type="text"
                  value={settingsForm.fest_name}
                  onChange={e => setSettingsForm({ ...settingsForm, fest_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={settingsForm.reg_deadline}
                    onChange={e => setSettingsForm({ ...settingsForm, reg_deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 focus:outline-none font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Colleges can register without penalty until this time.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Late Registration (Fine) Cutoff
                  </label>
                  <input
                    type="datetime-local"
                    value={settingsForm.fine_deadline}
                    onChange={e => setSettingsForm({ ...settingsForm, fine_deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 focus:outline-none font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Registrations after standard deadline incur late fees.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Rulebook PDF URL</label>
                <input
                  type="url"
                  value={settingsForm.rulebook_url}
                  onChange={e => setSettingsForm({ ...settingsForm, rulebook_url: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 focus:outline-none font-mono"
                  placeholder="https://fest.edu/rulebook.pdf"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit">Save Deadline Settings</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. ITEMS CATALOG TAB */}
      {activeTab === 'items' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Arts Fest Events Directory</CardTitle>
              <CardDescription>Manage event codes, categories, participant quotas, and global lock state</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingItem({
                  code: '',
                  name: '',
                  category: 'Senior',
                  item_type: 'Single',
                  min_participants: 1,
                  max_participants: 1
                });
                setIsItemModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add New Event
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Lock Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-bold text-slate-700">{item.code}</TableCell>
                    <TableCell className="font-semibold text-[#132238]">{item.name}</TableCell>
                    <TableCell>
                      <CategoryBadge category={item.category} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.item_type === 'Single' ? 'default' : 'purple'}>
                        {item.item_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {item.min_participants === item.max_participants
                        ? item.min_participants
                        : `${item.min_participants} - ${item.max_participants}`}
                    </TableCell>
                    <TableCell>
                      {item.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                          <Lock className="w-3.5 h-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <Unlock className="w-3.5 h-3.5" /> Open
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="xs"
                        variant={item.is_locked ? 'success' : 'destructive'}
                        onClick={() => {
                          festService.toggleItemLock(item.id);
                          triggerRefresh();
                        }}
                      >
                        {item.is_locked ? 'Unlock' : 'Lock'}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 4. COLLEGES & OVERRIDES TAB */}
      {activeTab === 'colleges' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Participating Colleges & Granular Overrides</CardTitle>
              <CardDescription>
                Toggle manual lock overrides and fine exemptions per institution
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsUnlockModalOpen(true)}>
              <Unlock className="w-3.5 h-3.5" /> Granular Event Unlock
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>College Name</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Phone / Email</TableHead>
                  <TableHead>Fine Status</TableHead>
                  <TableHead>Lock Override</TableHead>
                  <TableHead className="text-right">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colleges.map(col => (
                  <TableRow key={col.id}>
                    <TableCell className="font-mono font-bold text-slate-800">{col.code}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-[#132238]">{col.name}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{col.affiliation_no}</span>
                    </TableCell>
                    <TableCell className="text-slate-700">{col.coordinator_name}</TableCell>
                    <TableCell className="text-slate-500 text-[11px]">
                      <div>{col.coordinator_phone}</div>
                      <div>{col.email}</div>
                    </TableCell>
                    <TableCell>
                      {col.fine_status ? (
                        <Badge variant="destructive">Late Fine Applied</Badge>
                      ) : (
                        <Badge variant="success">Clear / Paid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {col.manual_lock_override ? (
                        <Badge variant="amber">Override Active</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">Standard Locks</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button
                        size="xs"
                        variant={col.manual_lock_override ? 'destructive' : 'outline'}
                        onClick={() => {
                          festService.toggleCollegeLockOverride(col.id);
                          triggerRefresh();
                        }}
                      >
                        {col.manual_lock_override ? 'Disable Override' : 'Allow Override'}
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          festService.toggleCollegeFine(col.id);
                          triggerRefresh();
                        }}
                      >
                        {col.fine_status ? 'Waive Fine' : 'Apply Fine'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                        <TableCell className="font-semibold text-[#132238]">{appeal.college?.name}</TableCell>
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
                        <TableCell className="font-semibold text-[#132238]">
                          {rep.registration?.item?.name}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-rose-700">{rep.original_student?.full_name}</div>
                          <span className="text-[10px] text-slate-400">{rep.original_student?.chest_no}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-emerald-700">{rep.replacement_student?.full_name}</div>
                          <span className="text-[10px] text-slate-400">{rep.replacement_student?.chest_no}</span>
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
                                onClick={() => {
                                  festService.reviewReplacement(rep.id, 'Approved');
                                  triggerRefresh();
                                }}
                              >
                                Approve Substitution
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() => {
                                  festService.reviewReplacement(rep.id, 'Rejected');
                                  triggerRefresh();
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
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                      No results entered yet by tabulators
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map(res => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="font-semibold text-[#132238]">{res.item?.name}</div>
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
                          onClick={() => {
                            festService.publishResult(res.id, !res.published);
                            triggerRefresh();
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

      {/* Modal: Add/Edit Item */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem.id ? 'Edit Fest Event' : 'Add New Fest Event'}
        description="Define event guidelines, category level, and minimum/maximum participant bounds"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Code</label>
              <input
                type="text"
                placeholder="e.g. ITM-201"
                value={editingItem.code || ''}
                onChange={e => setEditingItem({ ...editingItem, code: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={editingItem.category || 'Senior'}
                onChange={e => setEditingItem({ ...editingItem, category: e.target.value as StudentCategory })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              >
                <option value="Sub_Junior">Sub-Junior</option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Name</label>
            <input
              type="text"
              placeholder="e.g. Western Acoustic Solo"
              value={editingItem.name || ''}
              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={editingItem.item_type || 'Single'}
                onChange={e => setEditingItem({ ...editingItem, item_type: e.target.value as ItemType })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              >
                <option value="Single">Single</option>
                <option value="Group">Group</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Participants</label>
              <input
                type="number"
                min={1}
                max={50}
                value={editingItem.min_participants || 1}
                onChange={e => setEditingItem({ ...editingItem, min_participants: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Participants</label>
              <input
                type="number"
                min={1}
                max={50}
                value={editingItem.max_participants || 1}
                onChange={e => setEditingItem({ ...editingItem, max_participants: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Event</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Grant Granular Unlock */}
      <Modal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        title="Grant Granular Institution Unlock"
        description="Provide a time-bound registration override for a specific college and event"
      >
        <form onSubmit={handleCreateSelectiveUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Institution</label>
            <select
              value={unlockTargetCollege}
              onChange={e => setUnlockTargetCollege(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            >
              <option value="">-- Choose College --</option>
              {colleges.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Event to Unlock</label>
            <select
              value={unlockTargetItem}
              onChange={e => setUnlockTargetItem(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            >
              <option value="">-- Choose Event --</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.code}: {i.name} ({i.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Unlock Duration (Hours)</label>
            <input
              type="number"
              min={1}
              max={168}
              value={unlockHours}
              onChange={e => setUnlockHours(parseInt(e.target.value) || 24)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              After this window, the lock will automatically reinstate.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsUnlockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Grant Override</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
