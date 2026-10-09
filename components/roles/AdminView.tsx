'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, AppealStatusBadge, StageStatusBadge } from '../ui/badge';
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
import { Item, College, ItemType, StudentCategory, EntryLock, Student } from '@/lib/types/fest';
import { LocksMatrixTab } from '../admin/tabs/LocksMatrixTab';
import { SettingsTab } from '../admin/tabs/SettingsTab';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  getStudentDisplayIdentifier,
  registrationContainsStudent,
  calculateStudentEvents
} from '@/lib/utils/studentIdentity';

export type AdminTab =
  | 'overview'
  | 'locks_matrix'
  | 'settings'
  | 'items'
  | 'colleges'
  | 'college_registrations'
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

  // College-wise Registrations Management State
  const [selectedCollegeAfflForReg, setSelectedCollegeAfflForReg] = useState<number>(() => {
    return colleges.length > 0 ? colleges[0].affl_no : 11;
  });

  // Loading state for student/registration data fetch
  const [isLoadingCollegeData, setIsLoadingCollegeData] = useState(false);

  React.useEffect(() => {
    if (colleges.length > 0 && !colleges.some(c => c.affl_no === selectedCollegeAfflForReg)) {
      setSelectedCollegeAfflForReg(colleges[0].affl_no);
    }
  }, [colleges.length, selectedCollegeAfflForReg]);

  React.useEffect(() => {
    let isMounted = true;
    const affl = selectedCollegeAfflForReg || (colleges.length > 0 ? colleges[0].affl_no : 11);
    if (!affl) return;
    setIsLoadingCollegeData(true);
    Promise.all([
      festService.fetchStudentsForCollege(affl),
      festService.fetchRegistrationsForCollege(affl)
    ]).then(() => {
      if (isMounted) {
        triggerRefresh();
        setIsLoadingCollegeData(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingCollegeData(false);
    });
    return () => { isMounted = false; };
  }, [selectedCollegeAfflForReg]);

  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCategoryFilter, setRegCategoryFilter] = useState('All');
  const [regStatusFilter, setRegStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All');

  // View mode in College Registrations (Events vs Students)
  const [regViewMode, setRegViewMode] = useState<'events' | 'students'>('events');
  const [eventsSubTab, setEventsSubTab] = useState<'registered_list' | 'all_events'>('registered_list');
  const [regListSearchQuery, setRegListSearchQuery] = useState('');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCategoryFilter, setStudentCategoryFilter] = useState('All');
  const [studentRegStatusFilter, setStudentRegStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All');

  // Admin Registration Roster Modal State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [selectedItemForAdminReg, setSelectedItemForAdminReg] = useState<Item | null>(null);
  const [selectedStudentChestNosForAdminReg, setSelectedStudentChestNosForAdminReg] = useState<string[]>([]);
  const [bypassDeadlinesForAdminReg, setBypassDeadlinesForAdminReg] = useState(true);
  const [regModalStudentSearch, setRegModalStudentSearch] = useState('');
  const [regModalShowAllCategories, setRegModalShowAllCategories] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);

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

  const handleOpenAdminRegModal = (item: Item, currentParticipantChestNos: string[] = []) => {
    setSelectedItemForAdminReg(item);
    setSelectedStudentChestNosForAdminReg(currentParticipantChestNos);
    setRegErrorMessage(null);
    setRegModalStudentSearch('');
    setRegModalShowAllCategories(false);
    setIsRegModalOpen(true);
  };

  const handleToggleStudentSelection = (chestNo: string) => {
    if (!selectedItemForAdminReg) return;
    const isSingle = selectedItemForAdminReg.item_type === 'Single';

    if (isSingle) {
      if (selectedStudentChestNosForAdminReg.includes(chestNo)) {
        setSelectedStudentChestNosForAdminReg([]);
      } else {
        setSelectedStudentChestNosForAdminReg([chestNo]);
      }
    } else {
      if (selectedStudentChestNosForAdminReg.includes(chestNo)) {
        setSelectedStudentChestNosForAdminReg(selectedStudentChestNosForAdminReg.filter(c => c !== chestNo));
      } else {
        const max = selectedItemForAdminReg.max_participants || selectedItemForAdminReg.no_of_participants || 1;
        if (selectedStudentChestNosForAdminReg.length >= max) {
          setRegErrorMessage(`Maximum limit of ${max} participants reached for this group event.`);
          return;
        }
        setRegErrorMessage(null);
        setSelectedStudentChestNosForAdminReg([...selectedStudentChestNosForAdminReg, chestNo]);
      }
    }
  };

  const handleSaveAdminReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdminReg) return;

    if (selectedStudentChestNosForAdminReg.length === 0) {
      setRegErrorMessage('Please select at least 1 participant, or use Unregister to remove enrollment.');
      return;
    }

    const min = selectedItemForAdminReg.min_participants || selectedItemForAdminReg.no_of_participants || 1;
    if (selectedStudentChestNosForAdminReg.length < min) {
      setRegErrorMessage(`Requires at least ${min} participant(s). Currently selected: ${selectedStudentChestNosForAdminReg.length}.`);
      return;
    }

    const result = await festService.registerCollegeForItem(
      selectedCollegeAfflForReg,
      selectedItemForAdminReg.item_id,
      selectedStudentChestNosForAdminReg,
      bypassDeadlinesForAdminReg
    );

    if (!result.success) {
      setRegErrorMessage(result.error || 'Failed to update registration');
      return;
    }

    setIsRegModalOpen(false);
    setSelectedItemForAdminReg(null);
    setSelectedStudentChestNosForAdminReg([]);
    setRegErrorMessage(null);
    triggerRefresh();
  };

  const handleAdminUnregister = async (itemId: number, eventName: string) => {
    if (window.confirm(`Are you sure you want to remove registration for "${eventName}" for this college? All enrolled participants will be removed and quotas restored.`)) {
      const res = await festService.unregisterCollegeForItem(selectedCollegeAfflForReg, itemId);
      if (!res.success) {
        alert(res.error || 'Failed to unregister event');
      } else {
        triggerRefresh();
      }
    }
  };

  const handleClearCollegeRegistrations = () => {
    const currentCol = colleges.find(c => c.affl_no === selectedCollegeAfflForReg) || colleges[0];
    if (!currentCol) return;
    if (window.confirm(`⚠️ WARNING: Are you sure you want to remove ALL event registrations for ${currentCol.name} (#${currentCol.affl_no})? All enrolled students will be unassigned and quotas restored.`)) {
      const res = festService.clearAllRegistrations(currentCol.affl_no);
      triggerRefresh();
      alert(`Cleared ${res.count} student registration row(s) for ${currentCol.name}.`);
    }
  };

  const handleClearAllFestivalRegistrations = () => {
    if (window.confirm('🚨 DANGER: Are you sure you want to clear ALL registrations across ALL colleges festival-wide? All student enrollments in all events will be permanently deleted.')) {
      const res = festService.clearAllRegistrations();
      triggerRefresh();
      alert(`Successfully cleared all ${res.count} registrations across the festival.`);
    }
  };

  const renderLocksMatrixCard = () => (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Entry Locks Matrix</CardTitle>
            <Badge variant="navy">2D Permissions Grid</Badge>
          </div>
          <CardDescription>
            Header columns: College Affiliation IDs. First column: Event Details & Row Toggle. Click any cell to open or close registration.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            className="text-emerald-400 border-emerald-600 hover:bg-emerald-900/50 hover:text-emerald-300"
            onClick={() => {
              festService.setAllEntryLocks(true);
              triggerRefresh();
            }}
          >
            <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Open All
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-400 border-rose-600 hover:bg-rose-900/50 hover:text-rose-300"
            onClick={() => {
              festService.setAllEntryLocks(false);
              triggerRefresh();
            }}
          >
            <Lock className="w-3.5 h-3.5 mr-1 text-rose-400" /> Lock All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-80 min-w-[280px] font-semibold">
                Item ID & Event Name
              </TableHead>
              {colleges.map(col => (
                <TableHead key={col.id} className="text-center min-w-[130px] font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      #{col.affl_no}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate max-w-[120px] mt-0.5" title={col.name}>
                      {col.short_name || col.code || col.name}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const itemCells = colleges.map(col => {
                const cell = locks.find(l => l.item_id === item.item_id && l.college_affl_no === col.affl_no);
                return cell ? cell.is_open : !item.is_locked;
              });
              const allOpen = itemCells.every(open => open);

              return (
                <TableRow key={item.id}>
                  {/* First Column: Item ID, Event Name & Row Lock Toggle */}
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {item.item_id ? String(item.item_id).padStart(2, '0') : item.code}
                          </span>
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            {item.name_eng || item.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.phase || item.category}</span>
                          <span>•</span>
                          <span className="font-mono">{item.mode}</span>
                          {item.name_mal && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">{item.name_mal}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row Lock Toggle Button */}
                      <button
                        type="button"
                        title={allOpen ? 'Lock row for all colleges' : 'Open row for all colleges'}
                        onClick={() => {
                          festService.setEntryLockRow(item.item_id, !allOpen);
                          triggerRefresh();
                        }}
                        className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${allOpen
                          ? 'bg-[#1A2638] text-slate-200 border-[#26303F] hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/80'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-800/80'
                          }`}
                      >
                        {allOpen ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px]">Open</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span className="text-[10px]">Locked</span>
                          </>
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* College Cells */}
                  {colleges.map(col => {
                    const cell = locks.find(l => l.item_id === item.item_id && l.college_affl_no === col.affl_no);
                    const isOpen = cell ? cell.is_open : !item.is_locked;

                    return (
                      <TableCell key={col.id} className="text-center p-2">
                        <button
                          type="button"
                          onClick={() => {
                            festService.setEntryLockCell(item.item_id, col.affl_no, !isOpen);
                            triggerRefresh();
                          }}
                          className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border ${isOpen
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                        >
                          {isOpen ? (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              <span>Open</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Closed</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderCollegesCard = () => (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Participating Colleges & Granular Overrides</CardTitle>
            <Badge variant="navy">{colleges.length} Institutions</Badge>
          </div>
          <CardDescription>
            Toggle manual lock overrides and fine exemptions per institution
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setActiveTab('locks_matrix')}>
          <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-400" /> View Locks Matrix
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Affl # / Code</TableHead>
              <TableHead className="font-semibold">College Name</TableHead>
              <TableHead className="font-semibold">Coordinator / Manager</TableHead>
              <TableHead className="font-semibold">Phone & Email</TableHead>
              <TableHead className="font-semibold">Fine Status</TableHead>
              <TableHead className="font-semibold">Lock Override</TableHead>
              <TableHead className="text-right font-semibold">Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.map(col => (
              <TableRow key={col.id || col.affl_no}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      #{col.affl_no || col.affiliation_no}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-medium">
                      {col.short_name || col.code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-[var(--text-primary)]">{col.name}</div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Type: <span className="uppercase text-[var(--text-secondary)] font-mono font-semibold">{col.type}</span>
                  </span>
                </TableCell>
                <TableCell className="text-[var(--text-secondary)] text-sm">
                  {col.coordinator_name || col.staff_coordinator_name || col.team_manager_name || '—'}
                </TableCell>
                <TableCell className="text-[var(--text-muted)] text-xs">
                  <div>{col.coordinator_phone || col.staff_coordinator_phone || col.contact_no || '—'}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{col.email || '—'}</div>
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
                <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => {
                      setSelectedCollegeAfflForReg(col.affl_no);
                      setActiveTab('college_registrations');
                    }}
                    title="Manage Registered Events and Students"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Manage Events
                  </Button>
                  <Button
                    size="xs"
                    variant={col.manual_lock_override ? 'destructive' : 'outline'}
                    onClick={() => {
                      festService.toggleCollegeLockOverride(col.affl_no || col.id);
                      triggerRefresh();
                    }}
                  >
                    {col.manual_lock_override ? 'Disable Override' : 'Allow Override'}
                  </Button>
                  <Button
                    size="xs"
                    variant={col.fine_status ? 'outline' : 'secondary'}
                    onClick={() => {
                      festService.toggleCollegeFine(col.affl_no || col.id);
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
  );

  const renderCollegeRegistrationsTab = () => {
    const currentCol = colleges.find(c => Number(c.affl_no) === Number(selectedCollegeAfflForReg)) || colleges[0];
    const currentColAffl = Number(currentCol?.affl_no) || 11;
    const collegeRegs = registrations.filter(r => Number(r.college_affl_no) === Number(currentColAffl));
    const collegeStudents = students.filter(s => Number(s.college_affl_no) === Number(currentColAffl));
    const registeredItemIds = new Set(collegeRegs.map(r => r.item_id));
    const activeStudentChestNos = new Set(collegeRegs.map(r => r.chest_no));

    // Calculate metrics
    const totalEventsCount = items.length;
    const registeredEventsCount = registeredItemIds.size;
    const regPercentage = totalEventsCount > 0 ? Math.round((registeredEventsCount / totalEventsCount) * 100) : 0;
    const singleEventsCount = items.filter(i => i.item_type === 'Single' && registeredItemIds.has(i.item_id)).length;
    const groupEventsCount = items.filter(i => i.item_type === 'Group' && registeredItemIds.has(i.item_id)).length;

    // Filter items
    const filteredItems = items.filter(item => {
      const name = item.name || item.name_eng || '';
      const code = item.code || item.item_code || '';
      const matchesSearch = name.toLowerCase().includes(regSearchQuery.toLowerCase()) ||
        code.toLowerCase().includes(regSearchQuery.toLowerCase());
      const itemCat = item.category || item.phase || '';
      const matchesCategory = regCategoryFilter === 'All' || itemCat.toLowerCase() === regCategoryFilter.toLowerCase();
      const isRegistered = registeredItemIds.has(item.item_id);
      const matchesStatus = regStatusFilter === 'All' ||
        (regStatusFilter === 'Registered' && isRegistered) ||
        (regStatusFilter === 'Unregistered' && !isRegistered);
      return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = ['All', 'Foundation', 'Thamheediyya', 'Aliya', 'PG', 'General'];

    return (
      <div className="space-y-6">
        {/* Loading Banner */}
        {isLoadingCollegeData && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Fetching latest student &amp; registration data from Supabase...</span>
          </div>
        )}
        {/* College Selector & Institution Profile Card */}
        <Card className="p-5 border-l-4 border-l-blue-600">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="navy">Institution Registry Console</Badge>
                <span className="text-xs text-[var(--text-muted)]">College-Wise Events & Student Management</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {currentCol?.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] pt-1">
                <span className="font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-bold text-emerald-600 dark:text-emerald-400">
                  Affiliation #{currentCol?.affl_no}
                </span>
                <span>Code: <strong className="text-[var(--text-secondary)]">{currentCol?.short_name || currentCol?.code}</strong></span>
                <span>Type: <strong className="uppercase text-[var(--text-secondary)]">{currentCol?.type}</strong></span>
                <span>Coordinator: <strong className="text-[var(--text-secondary)]">{currentCol?.coordinator_name || currentCol?.staff_coordinator_name || '—'}</strong></span>
                <span>Phone: <strong className="text-[var(--text-secondary)]">{currentCol?.coordinator_phone || currentCol?.staff_coordinator_phone || '—'}</strong></span>
              </div>
            </div>

            {/* Selector Dropdown & Quick Toggles */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-[280px]">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Switch College
                </label>
                <select
                  value={selectedCollegeAfflForReg}
                  onChange={e => setSelectedCollegeAfflForReg(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {colleges.map(c => (
                    <option key={c.affl_no} value={c.affl_no}>
                      #{c.affl_no} - {c.short_name} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex sm:flex-col gap-2 justify-end pt-1 sm:pt-4">
                <Button
                  size="xs"
                  variant={currentCol?.manual_lock_override ? 'destructive' : 'outline'}
                  onClick={() => {
                    festService.toggleCollegeLockOverride(currentCol.affl_no);
                    triggerRefresh();
                  }}
                  title="Toggle manual override for this college"
                >
                  {currentCol?.manual_lock_override ? 'Disable Override' : 'Allow Override'}
                </Button>
                <Button
                  size="xs"
                  variant={currentCol?.fine_status ? 'outline' : 'secondary'}
                  onClick={() => {
                    festService.toggleCollegeFine(currentCol.affl_no);
                    triggerRefresh();
                  }}
                  title="Toggle late registration fine status"
                >
                  {currentCol?.fine_status ? 'Waive Fine' : 'Apply Fine'}
                </Button>
                {registeredEventsCount > 0 && (
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={handleClearCollegeRegistrations}
                    title="Remove all event registrations for this college"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Registrations
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 4 Metric Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registered Events</span>
              <Award className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{registeredEventsCount}</span>
              <span className="text-xs text-[var(--text-muted)]">/ {totalEventsCount} total</span>
            </div>
            <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full overflow-hidden mt-3">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${regPercentage}%` }} />
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1.5 block">{regPercentage}% events enrolled</span>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Enrolled Students</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{activeStudentChestNos.size}</span>
              <span className="text-xs text-[var(--text-muted)]">/ {collegeStudents.length} on roster</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">
              Active unique competitors assigned to events
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Participation Type</span>
              <ClipboardList className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div>
                <span className="text-xl font-bold text-[var(--text-primary)]">{singleEventsCount}</span>
                <span className="text-[11px] text-[var(--text-muted)] ml-1">Single</span>
              </div>
              <span className="text-slate-400">•</span>
              <div>
                <span className="text-xl font-bold text-[var(--text-primary)]">{groupEventsCount}</span>
                <span className="text-[11px] text-[var(--text-muted)] ml-1">Group</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">
              {collegeRegs.length} total participant seats registered
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Access & Compliance</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div>
                {currentCol?.manual_lock_override ? (
                  <Badge variant="amber" size="sm">Admin Override Active</Badge>
                ) : (
                  <Badge variant="default" size="sm">Standard Portal Locks</Badge>
                )}
              </div>
              <div>
                {currentCol?.fine_status ? (
                  <Badge variant="destructive" size="sm">Late Registration Fine</Badge>
                ) : (
                  <Badge variant="success" size="sm">Good Standing / No Fine</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* View Mode Switcher: Events vs Students */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRegViewMode('events')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${regViewMode === 'events'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Award className="w-4 h-4 text-blue-500" />
              <span>By Events & Rosters</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] font-mono">
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRegViewMode('students')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${regViewMode === 'students'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>By Registered Students & Details</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] font-mono">
                {collegeStudents.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-muted)] px-2">
            {regViewMode === 'events'
              ? 'Manage enrolled participants and team rosters per event'
              : 'Inspect student details, profile, quotas, and all registered events'}
          </div>
        </div>

        {/* 1. VIEW BY EVENTS */}
        {regViewMode === 'events' && (
          <div className="space-y-4">
            {/* Sub-tab Switcher: Registered List vs All Events Catalog */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEventsSubTab('registered_list')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${eventsSubTab === 'registered_list'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Registered Events List</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${registeredEventsCount > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}>
                    {registeredEventsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEventsSubTab('all_events')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${eventsSubTab === 'all_events'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <Award className="w-3.5 h-3.5 text-blue-500" />
                  <span>All Events Catalog</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] font-mono">
                    {items.length}
                  </span>
                </button>
              </div>

              <div className="text-xs text-[var(--text-muted)] px-2">
                {eventsSubTab === 'registered_list'
                  ? `Showing ${registeredEventsCount} registered events & enrolled student teams for #${currentCol?.affl_no}`
                  : `Browse all ${items.length} events to enroll students or update registrations`}
              </div>
            </div>

            {/* A. REGISTERED LIST VIEW */}
            {eventsSubTab === 'registered_list' && (() => {
              const registeredItems = items.filter(i => registeredItemIds.has(i.item_id));
              const filteredRegisteredItems = registeredItems.filter(item => {
                const name = item.name || item.name_eng || '';
                const code = item.code || item.item_code || '';
                const q = regListSearchQuery.toLowerCase();
                if (!q) return true;
                const matchesItem = name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
                const itemRegs = collegeRegs.filter(r => r.item_id === item.item_id);
                const matchesStudent = itemRegs.some(r => {
                  const s = findStudentByIdentifier(collegeStudents, r.chest_no) || findStudentByIdentifier(students, r.chest_no);
                  return (
                    (r.chest_no && r.chest_no.toLowerCase().includes(q)) ||
                    (s && (s.name || s.full_name || '').toLowerCase().includes(q))
                  );
                });
                return matchesItem || matchesStudent;
              });

              return (
                <div className="space-y-4">
                  {/* Active Registered Students Summary Strip */}
                  {activeStudentChestNos.size > 0 && (
                    <Card className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            Active Enrolled Competitors ({activeStudentChestNos.size} students)
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Click any student chip to inspect profile & registrations
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {Array.from(activeStudentChestNos).map(cNo => {
                          const stu = findStudentByIdentifier(collegeStudents, cNo) || findStudentByIdentifier(students, cNo);
                          const stuRegCount = stu ? calculateStudentEvents(stu, collegeRegs, items).registeredEventsCount : collegeRegs.filter(r => r.chest_no === cNo).length;
                          return (
                            <button
                              key={cNo}
                              type="button"
                              onClick={() => stu && setSelectedStudentForDetails(stu)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-blue-400 hover:shadow-xs transition-all text-xs cursor-pointer group"
                              title={stu ? `${stu.name} (${getCanonicalChestNo(stu)}) - Registered in ${stuRegCount} event(s)` : cNo}
                            >
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                {stu ? getCanonicalChestNo(stu) : cNo}
                              </span>
                              <span className="font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                                {stu?.name || 'Student'}
                              </span>
                              <span className="text-[10px] font-mono px-1 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                                {stuRegCount} {stuRegCount === 1 ? 'event' : 'events'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Registered List Header & Search */}
                  <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter registered list by event name, code, or student..."
                          value={regListSearchQuery}
                          onChange={e => setRegListSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setEventsSubTab('all_events')}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add / Register More Events
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Registered Events Cards / List */}
                  {filteredRegisteredItems.length === 0 ? (
                    <Card className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ClipboardList className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {registeredEventsCount === 0
                            ? 'No events registered yet for this college'
                            : 'No registered events match your search'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] max-w-sm">
                          {registeredEventsCount === 0
                            ? 'Browse all festival events from the catalog to enroll students and assign chest numbers.'
                            : 'Try adjusting your search terms or clear the filter.'}
                        </p>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setRegListSearchQuery('');
                            setEventsSubTab('all_events');
                          }}
                          className="mt-2"
                        >
                          <Award className="w-3.5 h-3.5 mr-1.5" />
                          Browse All Events Catalog ({items.length})
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredRegisteredItems.map(item => {
                        const itemRegs = collegeRegs.filter(r => r.item_id === item.item_id);
                        const registeredChestNos = itemRegs.map(r => r.chest_no);
                        const registeredStudentObjects = registeredChestNos
                          .map(cNo => findStudentByIdentifier(collegeStudents, cNo) || findStudentByIdentifier(students, cNo))
                          .filter(Boolean) as Student[];

                        const min = item.min_participants || item.no_of_participants || 1;
                        const max = item.max_participants || item.no_of_participants || 1;

                        const lock = locks.find(l => l.item_id === item.item_id && l.college_affl_no === currentColAffl);
                        const isUnlocked = currentCol?.manual_lock_override || (lock ? lock.is_open : !item.is_locked);

                        return (
                          <Card key={item.item_id} className="overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all">
                            {/* Registered Event Header */}
                            <div className="p-4 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-2xs">
                                  {item.code}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                    {item.name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                                    <CategoryBadge category={item.category} />
                                    <Badge variant={item.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                                      {item.item_type}
                                    </Badge>
                                    <span>Mode: <strong className="capitalize">{item.mode || 'onstage'}</strong></span>
                                    <span>•</span>
                                    <span>Capacity: <strong>{min === max ? min : `${min}-${max}`}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 justify-end">
                                <Badge variant="success" size="sm" className="font-semibold">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {registeredChestNos.length} Enrolled
                                </Badge>

                                <div>
                                  {isUnlocked ? (
                                    <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                      <Unlock className="w-3 h-3 mr-1" /> Open
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                                      <Lock className="w-3 h-3 mr-1" /> Locked
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 ml-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleOpenAdminRegModal(item, registeredChestNos)}
                                    title="Modify enrolled participants for this event"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Manage Roster
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    onClick={() => handleAdminUnregister(item.item_id, item.name || item.code || 'Event')}
                                    title="Remove this event registration for this college"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Registered Participants Table for this event */}
                            <div className="p-0 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-[var(--bg-surface)]">
                                    <TableHead className="w-32 font-semibold text-xs">Chest #</TableHead>
                                    <TableHead className="font-semibold text-xs">Student Full Name</TableHead>
                                    <TableHead className="w-32 font-semibold text-xs">Admission #</TableHead>
                                    <TableHead className="w-32 font-semibold text-xs">Class / Phase</TableHead>
                                    <TableHead className="w-36 font-semibold text-xs">Contact</TableHead>
                                    <TableHead className="text-right w-28 font-semibold text-xs">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {registeredStudentObjects.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={6} className="text-center py-4 text-xs text-[var(--text-muted)]">
                                        No student details linked for chest numbers: {registeredChestNos.join(', ')}
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    registeredStudentObjects.map(stu => (
                                      <TableRow key={stu.chest_no || stu.id}>
                                        <TableCell>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedStudentForDetails(stu)}
                                            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:border-blue-400 cursor-pointer"
                                            title="Click to view student details"
                                          >
                                            {stu.chest_no}
                                          </button>
                                        </TableCell>
                                        <TableCell className="font-semibold text-xs text-[var(--text-primary)]">
                                          {stu.name || stu.full_name}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                                          {stu.admission_no}
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-xs text-[var(--text-secondary)]">
                                            <span>{stu.class || 'N/A'}</span>
                                            <span className="text-[10px] text-[var(--text-muted)] ml-1">({stu.phase || stu.category})</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-[var(--text-muted)]">
                                          {stu.phone ? (
                                            <div className="flex items-center gap-1">
                                              <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                                              <span>{stu.phone}</span>
                                            </div>
                                          ) : (
                                            <span>—</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => setSelectedStudentForDetails(stu)}
                                            title="View student profile & registration details"
                                          >
                                            <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* B. ALL EVENTS CATALOG VIEW */}
            {eventsSubTab === 'all_events' && (
              <>
                {/* Filter and Search Bar */}
                <Card className="p-4">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search events by name or code (e.g. ITM-201, Elocution)..."
                        value={regSearchQuery}
                        onChange={e => setRegSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                        {(['All', 'Registered', 'Unregistered'] as const).map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setRegStatusFilter(status)}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${regStatusFilter === status
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                              }`}
                          >
                            {status === 'All' ? `All (${items.length})` : status === 'Registered' ? `Registered (${registeredEventsCount})` : `Not Enrolled (${items.length - registeredEventsCount})`}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setRegCategoryFilter(cat)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${regCategoryFilter.toLowerCase() === cat.toLowerCase()
                              ? 'bg-[#132238] text-white border-[#1E3558] dark:bg-[#1A2E4A] dark:border-[#2E476B]'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Event Registrations Table */}
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <CardTitle>Festival Events & College Roster</CardTitle>
                      <CardDescription>
                        Showing {filteredItems.length} of {items.length} events for #{currentCol?.affl_no} {currentCol?.short_name}
                      </CardDescription>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Click any student chip to inspect their profile and full registrations.
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28 font-semibold">Code / Type</TableHead>
                          <TableHead className="min-w-[180px] font-semibold">Event Name & Category</TableHead>
                          <TableHead className="w-36 font-semibold">Registration Status</TableHead>
                          <TableHead className="min-w-[280px] font-semibold">Registered Students / Team</TableHead>
                          <TableHead className="text-right w-44 font-semibold">Admin Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-[var(--text-muted)]">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Users className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                                <p className="text-sm font-medium">No events found matching your filter criteria</p>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setRegSearchQuery('');
                                    setRegCategoryFilter('All');
                                    setRegStatusFilter('All');
                                  }}
                                >
                                  Clear Filters
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredItems.map(item => {
                            const itemRegs = collegeRegs.filter(r => r.item_id === item.item_id);
                            const isReg = itemRegs.length > 0;
                            const registeredChestNos = itemRegs.map(r => r.chest_no);
                            const registeredStudentObjects = registeredChestNos
                              .map(cNo => findStudentByIdentifier(collegeStudents, cNo) || findStudentByIdentifier(students, cNo))
                              .filter(Boolean) as Student[];

                            const lock = locks.find(l => l.item_id === item.item_id && l.college_affl_no === currentColAffl);
                            const isUnlocked = currentCol?.manual_lock_override || (lock ? lock.is_open : !item.is_locked);

                            return (
                              <TableRow key={item.item_id || item.id}>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
                                      {item.code}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Badge variant={item.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                                        {item.item_type}
                                      </Badge>
                                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                        ({item.min_participants === item.max_participants ? item.min_participants : `${item.min_participants}-${item.max_participants}`})
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <CategoryBadge category={item.category} />
                                    <span className="text-[11px] text-[var(--text-muted)]">
                                      Mode: <span className="capitalize">{item.mode || 'onstage'}</span>
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="flex flex-col gap-1.5">
                                    {isReg ? (
                                      <Badge variant="success" size="sm" className="font-semibold">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Registered ({registeredChestNos.length})
                                      </Badge>
                                    ) : (
                                      <Badge variant="default" size="sm">
                                        Not Enrolled
                                      </Badge>
                                    )}

                                    <div>
                                      {isUnlocked ? (
                                        <span className="inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                          <Unlock className="w-3 h-3 mr-1" /> Open
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                          <Lock className="w-3 h-3 mr-1" /> Locked
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  {isReg && registeredStudentObjects.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 max-w-lg">
                                      {registeredStudentObjects.map(stu => (
                                        <div
                                          key={stu.chest_no || stu.id}
                                          onClick={() => setSelectedStudentForDetails(stu)}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] shadow-2xs cursor-pointer hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-all group"
                                          title="Click to view student details & event registrations"
                                        >
                                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                            {stu.chest_no}
                                          </span>
                                          <span className="font-medium truncate max-w-[130px]">{stu.name}</span>
                                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-1 rounded border border-[var(--border-subtle)]">
                                            {stu.phase || stu.category}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : isReg ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {registeredChestNos.map(cNo => {
                                        const foundStu = findStudentByIdentifier(collegeStudents, cNo) || findStudentByIdentifier(students, cNo);
                                        return (
                                          <button
                                            key={cNo}
                                            type="button"
                                            onClick={() => foundStu && setSelectedStudentForDetails(foundStu)}
                                            className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-blue-500 font-bold border border-[var(--border-subtle)] hover:border-blue-400 cursor-pointer"
                                            title="Click to view student details"
                                          >
                                            {foundStu ? getCanonicalChestNo(foundStu) : cNo}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[var(--text-muted)] italic">
                                      No students registered yet
                                    </span>
                                  )}
                                </TableCell>

                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="xs"
                                      variant={isReg ? 'outline' : 'primary'}
                                      onClick={() => handleOpenAdminRegModal(item, registeredChestNos)}
                                      title={isReg ? 'Edit student assignments for this event' : 'Register students for this event'}
                                    >
                                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                                      {isReg ? 'Manage Roster' : 'Register'}
                                    </Button>

                                    {isReg && (
                                      <Button
                                        size="xs"
                                        variant="destructive"
                                        onClick={() => handleAdminUnregister(item.item_id, item.name || item.code || 'Event')}
                                        title="Remove registration for this college"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* 2. VIEW BY REGISTERED STUDENTS & DETAILS */}
        {regViewMode === 'students' && (() => {
          const filteredStudentsList = collegeStudents.filter(stu => {
            const name = (stu.name || stu.full_name || '').toLowerCase();
            const chest = (stu.chest_no || '').toLowerCase();
            const adm = stu.admission_no != null ? String(stu.admission_no).toLowerCase() : '';
            const query = studentSearchQuery.toLowerCase();
            const matchesSearch = !query || name.includes(query) || chest.includes(query) || adm.includes(query);

            const cat = (stu.phase || stu.category || '').toLowerCase();
            const matchesCategory = studentCategoryFilter === 'All' || cat === studentCategoryFilter.toLowerCase();

            const stuRegs = collegeRegs.filter(r => registrationContainsStudent(r, stu));
            const isEnrolled = stuRegs.length > 0;
            const matchesStatus = studentRegStatusFilter === 'All' ||
              (studentRegStatusFilter === 'Registered' && isEnrolled) ||
              (studentRegStatusFilter === 'Unregistered' && !isEnrolled);

            return matchesSearch && matchesCategory && matchesStatus;
          });

          return (
            <div className="space-y-4">
              {/* Student Filter Bar */}
              <Card className="p-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search students by name, chest #, or adm #..."
                      value={studentSearchQuery}
                      onChange={e => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                      {(['All', 'Registered', 'Unregistered'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStudentRegStatusFilter(status)}
                          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${studentRegStatusFilter === status
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          {status === 'All' ? `All (${collegeStudents.length})` : status === 'Registered' ? `Enrolled (${activeStudentChestNos.size})` : `Not Enrolled (${collegeStudents.length - activeStudentChestNos.size})`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setStudentCategoryFilter(cat)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${studentCategoryFilter.toLowerCase() === cat.toLowerCase()
                            ? 'bg-[#132238] text-white border-[#1E3558] dark:bg-[#1A2E4A] dark:border-[#2E476B]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Registered Students Table */}
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
                  <div>
                    <CardTitle>College Student Roster & Event Enrollments</CardTitle>
                    <CardDescription>
                      Showing {filteredStudentsList.length} of {collegeStudents.length} students from #{currentCol?.affl_no} {currentCol?.name}
                    </CardDescription>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Click "View Details" to see individual event schedules and quota utilization.
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48 font-semibold">Student & Chest #</TableHead>
                        <TableHead className="w-32 font-semibold">Category & Class</TableHead>
                        <TableHead className="w-36 font-semibold">Admission / Phone</TableHead>
                        <TableHead className="min-w-[280px] font-semibold">Registered Events</TableHead>
                        <TableHead className="w-24 text-center font-semibold">Quota</TableHead>
                        <TableHead className="text-right w-32 font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudentsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Users className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                              <p className="text-sm font-medium">No students match your filter criteria</p>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setStudentSearchQuery('');
                                  setStudentCategoryFilter('All');
                                  setStudentRegStatusFilter('All');
                                }}
                              >
                                Clear Filters
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudentsList.map(stu => {
                          const stuRegs = collegeRegs.filter(r => registrationContainsStudent(r, stu));
                          const stuItemIds = new Set(stuRegs.map(r => r.item_id));
                          const enrolledItems = items.filter(i => stuItemIds.has(i.item_id));

                          return (
                            <TableRow key={stu.id || stu.chest_no}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                                    {stu.chest_no ? stu.chest_no.replace('CH-', '') : '#'}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs text-[var(--text-primary)]">
                                      {stu.name || stu.full_name}
                                    </div>
                                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                      {getCanonicalChestNo(stu)}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1">
                                  <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
                                  <div className="text-[11px] text-[var(--text-muted)]">
                                    {stu.class || 'Class N/A'}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="text-xs">
                                  <span className="font-mono text-[var(--text-secondary)] font-medium">
                                    {stu.admission_no}
                                  </span>
                                  {stu.phone ? (
                                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3" /> {stu.phone}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-[var(--text-muted)]">No phone</div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                {enrolledItems.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 max-w-md">
                                    {enrolledItems.map(itm => (
                                      <div
                                        key={itm.item_id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)]"
                                      >
                                        <span className="font-mono font-bold text-slate-500 text-[10px]">
                                          {itm.code}
                                        </span>
                                        <span className="font-medium truncate max-w-[120px]">{itm.name}</span>
                                        <span className="text-[9px] uppercase px-1 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
                                          {itm.mode}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--text-muted)] italic">
                                    No events registered yet
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${enrolledItems.length > 0
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                                  }`}>
                                  {enrolledItems.length}
                                </span>
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="xs"
                                  variant="primary"
                                  onClick={() => setSelectedStudentForDetails(stu)}
                                  title="View full student profile and registered events"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View Details
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
          );
        })()}
      </div>
    );
  };

  const renderAdminRegModal = () => {
    if (!selectedItemForAdminReg) return null;
    const currentCol = colleges.find(c => c.affl_no === selectedCollegeAfflForReg) || colleges[0];
    const currentColAffl = currentCol?.affl_no || 11;
    const collegeStudents = students.filter(s => s.college_affl_no === currentColAffl);
    const min = selectedItemForAdminReg.min_participants || selectedItemForAdminReg.no_of_participants || 1;
    const max = selectedItemForAdminReg.max_participants || selectedItemForAdminReg.no_of_participants || 1;

    // Filter available students from this college
    const filteredCollegeStudents = collegeStudents.filter(stu => {
      const stuName = stu.name || stu.full_name || '';
      const stuChest = stu.chest_no || '';
      const stuAdm = stu.admission_no != null ? String(stu.admission_no) : '';
      const matchesSearch = stuName.toLowerCase().includes(regModalStudentSearch.toLowerCase()) ||
        stuChest.toLowerCase().includes(regModalStudentSearch.toLowerCase()) ||
        stuAdm.toLowerCase().includes(regModalStudentSearch.toLowerCase());
      const itemCategory = (selectedItemForAdminReg.category || selectedItemForAdminReg.phase || '').toLowerCase();
      const matchesCategory = regModalShowAllCategories ||
        (stu.phase && stu.phase.toLowerCase() === itemCategory) ||
        (stu.category && stu.category.toLowerCase() === itemCategory);
      return matchesSearch && matchesCategory;
    });

    const lock = locks.find(l => l.item_id === selectedItemForAdminReg.item_id && l.college_affl_no === currentColAffl);
    const isUnlocked = currentCol?.manual_lock_override || (lock ? lock.is_open : !selectedItemForAdminReg.is_locked);

    return (
      <Modal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        title={`Manage Roster: ${selectedItemForAdminReg.name}`}
        description={`College #${currentCol?.affl_no} ${currentCol?.name} • Code: ${selectedItemForAdminReg.code}`}
      >
        <form onSubmit={handleSaveAdminReg} className="space-y-4">
          {/* Item & College Identity banner */}
          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CategoryBadge category={selectedItemForAdminReg.category} />
              <Badge variant={selectedItemForAdminReg.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                {selectedItemForAdminReg.item_type}
              </Badge>
              <span className="text-[var(--text-secondary)] font-medium">
                Capacity: <strong>{min === max ? min : `${min} - ${max}`}</strong> participant(s)
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-[var(--text-muted)]">Lock:</span>
              {isUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Open
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Admin Override Checkbox */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs">
            <input
              type="checkbox"
              id="bypassDeadlinesCheckbox"
              checked={bypassDeadlinesForAdminReg}
              onChange={e => setBypassDeadlinesForAdminReg(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="bypassDeadlinesCheckbox" className="text-amber-900 dark:text-amber-200 cursor-pointer font-medium">
              <strong>Admin Authority Override:</strong> Bypass registration deadlines, late-fine gates, and individual lock states.
            </label>
          </div>

          {/* Student Filter Toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
              <span>Select Students from College Roster ({collegeStudents.length} available)</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                Selected: {selectedStudentChestNosForAdminReg.length} / {min === max ? min : `${min}-${max}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search students by name or chest no..."
                  value={regModalStudentSearch}
                  onChange={e => setRegModalStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() => setRegModalShowAllCategories(!regModalShowAllCategories)}
                className={`px-2 py-1.5 text-[11px] rounded-lg font-medium border transition-colors whitespace-nowrap ${regModalShowAllCategories
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {regModalShowAllCategories ? 'All Categories (Showing All)' : `Filter: ${selectedItemForAdminReg.category} only`}
              </button>
            </div>
          </div>

          {/* Student Selection List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            {filteredCollegeStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                No students found matching current filters.
                {!regModalShowAllCategories && (
                  <button
                    type="button"
                    onClick={() => setRegModalShowAllCategories(true)}
                    className="block mx-auto mt-2 text-blue-600 hover:underline"
                  >
                    Show students from all categories
                  </button>
                )}
              </div>
            ) : (
              filteredCollegeStudents.map(student => {
                const chestNo = getCanonicalChestNo(student);
                const isSelected = selectedStudentChestNosForAdminReg.includes(student.id) || selectedStudentChestNosForAdminReg.includes(chestNo);
                const studentRegCount = calculateStudentEvents(student, registrations, items).registeredEventsCount;

                return (
                  <div
                    key={student.id || chestNo}
                    onClick={() => handleToggleStudentSelection(chestNo)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${isSelected
                      ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/80'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-blue-600 dark:text-blue-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-blue-500/20" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {student.chest_no}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {student.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
                          <span>Class: {student.class || 'N/A'}</span>
                          <span>•</span>
                          <span>Phase: {student.phase || student.category}</span>
                          <span>•</span>
                          <span>Adm: {student.admission_no}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                        {studentRegCount} event{studentRegCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Error Message Alert */}
          {regErrorMessage && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{regErrorMessage}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRegModalOpen(false);
                setSelectedItemForAdminReg(null);
                setRegErrorMessage(null);
              }}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={selectedStudentChestNosForAdminReg.length === 0}
              >
                Save Registration & Update Quotas
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    );
  };

  const renderStudentDetailsModal = () => {
    if (!selectedStudentForDetails) return null;
    const stu = selectedStudentForDetails;
    const stuCollege = colleges.find(c => c.affl_no === stu.college_affl_no || c.id === stu.college_id);

    // Registrations & stats for this student
    const stats = calculateStudentEvents(stu, registrations, items);
    const stuRegs = stats.events.map(e => e.registration);
    const stuItemIds = new Set(stuRegs.map(r => r.item_id));
    const stuItems = items.filter(i => stuItemIds.has(i.item_id));
    const stuSchedules = schedules.filter(s => stuItemIds.has(s.item_id));

    // Quota limits
    const quotaLimits = festService.getMaxParticipation();
    const quota = quotaLimits.find(q => q.phase.toLowerCase() === (stu.phase || stu.category || '').toLowerCase()) || quotaLimits[0];
    const totalMax = quota?.total_max || 4;
    const stageMax = quota?.on_max || 2;
    const offstageMax = quota?.off_max || 2;

    const onstageCount = stats.onstageCount;
    const offstageCount = stats.offstageCount;

    return (
      <Modal
        isOpen={!!selectedStudentForDetails}
        onClose={() => setSelectedStudentForDetails(null)}
        title="Student Registration & Event Details"
        description={`Chest No: ${getCanonicalChestNo(stu)} • Admission: ${stu.admission_no}`}
      >
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold text-lg dark:bg-[#1A2E4A] shadow-xs">
                {getCanonicalChestNo(stu).replace('CH-', '').replace('ST-', '')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-[var(--text-primary)]">{stu.name || stu.full_name}</h4>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {getCanonicalChestNo(stu)}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-2 mt-0.5">
                  <span>Adm: <strong className="font-mono text-[var(--text-secondary)]">{stu.admission_no}</strong></span>
                  <span>•</span>
                  <span>College: <strong className="text-[var(--text-secondary)]">{stuCollege?.short_name || stuCollege?.name}</strong> (#{stu.college_affl_no})</span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-end gap-1.5">
              <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                Class: <strong className="text-[var(--text-secondary)]">{stu.class || 'N/A'}</strong>
              </span>
            </div>
          </div>

          {/* Quota & Participation Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Total Events</div>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {stuItems.length} <span className="text-xs font-normal text-[var(--text-muted)]">/ {totalMax}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Onstage</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {onstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {stageMax}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Offstage</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {offstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {offstageMax}</span>
              </div>
            </div>
          </div>

          {/* Registered Events Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Registered Events ({stuItems.length})
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {stu.phone ? `Contact: ${stu.phone}` : 'No phone registered'}
              </span>
            </div>

            {stuItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
                This student is not enrolled in any festival events yet.
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Event Name</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-24">Mode</TableHead>
                      <TableHead>Stage / Schedule</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stuItems.map(item => {
                      const sched = stuSchedules.find(s => s.item_id === item.item_id);
                      return (
                        <TableRow key={item.item_id}>
                          <TableCell className="font-mono font-bold text-xs">{item.code}</TableCell>
                          <TableCell className="font-semibold text-xs text-[var(--text-primary)]">
                            {item.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                              {item.item_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs capitalize text-[var(--text-secondary)] font-medium">
                              {item.mode}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--text-muted)]">
                            {sched ? (
                              <div>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  Stage {sched.stage_number}{sched.stage?.name ? ` (${sched.stage.name})` : ''}
                                </span>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {sched.starting ? new Date(sched.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBA'}
                                </div>
                              </div>
                            ) : (
                              <span className="italic text-[var(--text-muted)]">Not scheduled</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudentForDetails(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

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

        <div className="flex items-center gap-2">
          {registrations.length > 0 ? (
            <Button
              size="xs"
              variant="destructive"
              onClick={handleClearAllFestivalRegistrations}
              title="Permanently remove all registrations across all institutions"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All Registrations ({registrations.length})
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>All Registrations Cleared (0 Active)</span>
            </div>
          )}
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
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{students.length}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Across 4 age/experience categories</p>
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
            {renderCollegesCard()}
          </div>
        </div>
      )}

      {/* 2. ENTRY LOCKS MATRIX TAB */}
      {activeTab === 'locks_matrix' && <LocksMatrixTab />}

      {/* 2. SETTINGS & DEADLINES TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
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

          {/* Danger Zone / Data Management Card */}
          <Card className="max-w-3xl border-rose-500/20 bg-rose-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" size="sm">
                  <AlertTriangle className="w-3 h-3 mr-1" /> System Reset & Danger Zone
                </Badge>
              </div>
              <CardTitle className="text-rose-700 dark:text-rose-400 mt-1">Data Management & Registration Purge</CardTitle>
              <CardDescription>
                Irreversible administrative controls to wipe participant enrollments and reset cached festival records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Purge All Registrations</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Wipes all {registrations.length} student registrations across all participating institutions. Resets quotas and clears database records.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAllFestivalRegistrations}
                  disabled={registrations.length === 0}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear All Registrations ({registrations.length})
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Reset Local Database to Defaults</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Clears local storage caches and re-initializes colleges, events, and empty registration rosters.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all local festival data to defaults?')) {
                      localStorage.clear();
                      triggerRefresh();
                      alert('Festival cache reset to default clean state.');
                    }
                  }}
                >
                  Reset System State
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                    <TableCell className="font-mono font-bold text-slate-300">{item.code}</TableCell>
                    <TableCell className="font-semibold text-slate-100">{item.name}</TableCell>
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
      {activeTab === 'colleges' && renderCollegesCard()}

      {/* 4.1. COLLEGE-WISE EVENT REGISTRATIONS TAB */}
      {activeTab === 'college_registrations' && renderCollegeRegistrationsTab()}

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
                value={editingItem.category || 'Aliya'}
                onChange={e => setEditingItem({ ...editingItem, category: e.target.value as StudentCategory })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              >
                <option value="Foundation">Foundation</option>
                <option value="Thamheediyya">Thamheediyya</option>
                <option value="Aliya">Aliya</option>
                <option value="PG">PG</option>
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

      {/* Modal: Admin Manage Registration Roster */}
      {renderAdminRegModal()}

      {/* Modal: Student Registration & Profile Details */}
      {renderStudentDetailsModal()}
    </div>
  );
}
