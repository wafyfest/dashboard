'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Award,
  Users,
  UserCheck,
  Search,
  Trash2,
  Eye,
  Phone,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Item, College, Student, Result } from '@/lib/types/fest';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  registrationContainsStudent,
  calculateStudentEvents
} from '@/lib/utils/studentIdentity';

interface CollegeRegistrationsTabProps {
  selectedCollegeAffl?: number;
  onSelectCollegeAffl?: (afflNo: number) => void;
}

export function CollegeRegistrationsTab({
  selectedCollegeAffl,
  onSelectCollegeAffl
}: CollegeRegistrationsTabProps) {
  const { refreshKey, triggerRefresh } = useFest();

  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  const items = useMemo(() => festService.getItems(), [refreshKey]);
  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const registrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const locks = useMemo(() => festService.getEntryLocks(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);

  // Selected College State
  const [internalSelectedAffl, setInternalSelectedAffl] = useState<number>(() => {
    return selectedCollegeAffl || (colleges.length > 0 ? colleges[0].affl_no : 11);
  });

  const activeCollegeAffl = selectedCollegeAffl ?? internalSelectedAffl;

  const handleCollegeChange = (affl: number) => {
    if (onSelectCollegeAffl) {
      onSelectCollegeAffl(affl);
    } else {
      setInternalSelectedAffl(affl);
    }
  };

  // Sync state if colleges load
  useEffect(() => {
    if (colleges.length > 0 && !colleges.some(c => c.affl_no === activeCollegeAffl)) {
      handleCollegeChange(colleges[0].affl_no);
    }
  }, [colleges.length, activeCollegeAffl]);

  // Fetch Supabase data for the college
  const [isLoadingCollegeData, setIsLoadingCollegeData] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const affl = activeCollegeAffl;
    if (!affl) return;

    setIsLoadingCollegeData(true);
    Promise.all([
      festService.fetchStudentsForCollege(affl),
      festService.fetchRegistrationsForCollege(affl)
    ])
      .then(() => {
        if (isMounted) {
          triggerRefresh();
          setIsLoadingCollegeData(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingCollegeData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollegeAffl]);

  // Active College Object & Records
  const currentCol = useMemo(() => {
    return colleges.find(c => Number(c.affl_no) === Number(activeCollegeAffl)) || colleges[0];
  }, [colleges, activeCollegeAffl]);

  const currentColAffl = Number(currentCol?.affl_no) || 11;
  const collegeRegs = useMemo(() => {
    return registrations.filter(r => Number(r.college_affl_no) === currentColAffl);
  }, [registrations, currentColAffl]);

  const collegeStudents = useMemo(() => {
    return students.filter(s => Number(s.college_affl_no) === currentColAffl);
  }, [students, currentColAffl]);

  const registeredItemIds = useMemo(() => {
    return new Set(collegeRegs.map(r => r.item_id));
  }, [collegeRegs]);

  const activeStudentChestNos = useMemo(() => {
    return new Set(collegeRegs.map(r => r.chest_no));
  }, [collegeRegs]);

  // Metrics
  const totalEventsCount = items.length;
  const registeredEventsCount = registeredItemIds.size;
  const regPercentage = totalEventsCount > 0 ? Math.round((registeredEventsCount / totalEventsCount) * 100) : 0;
  const singleEventsCount = items.filter(i => i.item_type === 'Single' && registeredItemIds.has(i.item_id)).length;
  const groupEventsCount = items.filter(i => i.item_type === 'Group' && registeredItemIds.has(i.item_id)).length;

  // View Mode & Filters
  const [mainTab, setMainTab] = useState<'events' | 'students'>('events');

  // Search & Filters for Events Table
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCategoryFilter, setRegCategoryFilter] = useState('All');
  const [regStatusFilter, setRegStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All');

  // Search & Filters for Students View
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCategoryFilter, setStudentCategoryFilter] = useState('All');
  const [studentRegStatusFilter, setStudentRegStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All');

  // Modals State
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [selectedItemForAdminReg, setSelectedItemForAdminReg] = useState<Item | null>(null);
  const [selectedStudentChestNosForAdminReg, setSelectedStudentChestNosForAdminReg] = useState<string[]>([]);
  const [bypassDeadlinesForAdminReg, setBypassDeadlinesForAdminReg] = useState(true);
  const [regModalStudentSearch, setRegModalStudentSearch] = useState('');
  const [regModalShowAllCategories, setRegModalShowAllCategories] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);

  // Filter Events for the Single Unified Table
  const filteredItems = useMemo(() => {
    const q = regSearchQuery.toLowerCase().trim();
    return items
      .filter(item => {
        const name = item.name || item.name_eng || '';
        const code = item.code || item.item_code || '';
        const matchesSearch =
          !q ||
          name.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) ||
          collegeRegs.some(r => {
            if (r.item_id !== item.item_id) return false;
            if (r.chest_no && r.chest_no.toLowerCase().includes(q)) return true;
            const s =
              findStudentByIdentifier(collegeStudents, r.chest_no) ||
              findStudentByIdentifier(students, r.chest_no);
            return s && (s.name || s.full_name || '').toLowerCase().includes(q);
          });

        const itemCat = item.category || item.phase || '';
        const matchesCategory =
          regCategoryFilter === 'All' || itemCat.toLowerCase() === regCategoryFilter.toLowerCase();
        const isRegistered = registeredItemIds.has(item.item_id);
        const matchesStatus =
          regStatusFilter === 'All' ||
          (regStatusFilter === 'Registered' && isRegistered) ||
          (regStatusFilter === 'Unregistered' && !isRegistered);
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        const codeA = a.code || a.item_code || '';
        const codeB = b.code || b.item_code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [items, regSearchQuery, regCategoryFilter, regStatusFilter, registeredItemIds, collegeRegs, collegeStudents, students]);

  const categories = ['All', 'Foundation', 'Thamheediyya', 'Aliya', 'PG', 'General'];

  // Handlers
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
      currentColAffl,
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
    if (
      window.confirm(
        `Are you sure you want to remove registration for "${eventName}" for ${currentCol?.name}? All enrolled participants will be removed and quotas restored.`
      )
    ) {
      const res = await festService.unregisterCollegeForItem(currentColAffl, itemId);
      if (!res.success) {
        alert(res.error || 'Failed to unregister event');
      } else {
        triggerRefresh();
      }
    }
  };

  const handleClearCollegeRegistrations = () => {
    if (!currentCol) return;
    if (
      window.confirm(
        `⚠️ WARNING: Are you sure you want to remove ALL event registrations for ${currentCol.name} (#${currentCol.affl_no})? All enrolled students will be unassigned and quotas restored.`
      )
    ) {
      const res = festService.clearAllRegistrations(currentCol.affl_no);
      triggerRefresh();
      alert(`Cleared ${res.count} student registration row(s) for ${currentCol.name}.`);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. LOADING BANNER */}
      {isLoadingCollegeData && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-500" />
          <span>Synchronizing student & registration roster for #{currentColAffl} from database...</span>
        </div>
      )}

      {/* 2. COMPACT INSTITUTION PROFILE, SWITCHER & QUICK ACTIONS */}
      <Card className="p-3 sm:p-4 border-l-4 border-l-blue-600 bg-[var(--bg-surface)] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Identity & Metadata */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                #{currentCol?.affl_no}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {currentCol?.name}
              </h3>
              <Badge variant="outline" size="sm" className="uppercase font-mono text-[10px]">
                {currentCol?.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>Code: <strong className="text-[var(--text-secondary)]">{currentCol?.short_name || currentCol?.code}</strong></span>
              <span>Coordinator: <strong className="text-[var(--text-secondary)]">{currentCol?.coordinator_name || currentCol?.staff_coordinator_name || '—'}</strong></span>
              {(currentCol?.coordinator_phone || currentCol?.staff_coordinator_phone) && (
                <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                  <Phone className="w-3 h-3" />
                  {currentCol.coordinator_phone || currentCol.staff_coordinator_phone}
                </span>
              )}
              <span>•</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                {registeredEventsCount} registered ({regPercentage}%)
              </span>
              <span>•</span>
              <span className="font-medium text-[var(--text-secondary)] font-mono">
                {activeStudentChestNos.size} students assigned
              </span>
            </div>
          </div>

          {/* College Switcher & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative w-full sm:w-64 lg:w-72">
              <select
                value={activeCollegeAffl}
                onChange={e => handleCollegeChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {colleges.map(c => (
                  <option key={c.affl_no} value={c.affl_no}>
                    #{c.affl_no} - {c.short_name} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="xs"
                variant={currentCol?.manual_lock_override ? 'destructive' : 'outline'}
                onClick={() => {
                  festService.toggleCollegeLockOverride(currentCol.affl_no);
                  triggerRefresh();
                }}
                className="h-8 text-xs whitespace-nowrap"
                title="Toggle manual override for this college"
              >
                {currentCol?.manual_lock_override ? (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-1 text-rose-400" /> Revoke Override
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Allow Override
                  </>
                )}
              </Button>

              <Button
                size="xs"
                variant={currentCol?.fine_status ? 'outline' : 'secondary'}
                onClick={() => {
                  festService.toggleCollegeFine(currentCol.affl_no);
                  triggerRefresh();
                }}
                className="h-8 text-xs whitespace-nowrap"
                title="Toggle fine status"
              >
                {currentCol?.fine_status ? 'Waive Fine' : 'Apply Fine'}
              </Button>

              {registeredEventsCount > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleClearCollegeRegistrations}
                  className="h-8 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-rose-500/30 whitespace-nowrap"
                  title="Remove all event registrations for this college"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. VIEW MODE SWITCHER: EVENTS TABLE VS STUDENT ROSTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-canvas)] p-1.5 rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMainTab('events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mainTab === 'events'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-blue-500" />
            <span>Events & Registration Table</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-canvas)] font-mono text-[var(--text-muted)]">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('students')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mainTab === 'students'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Student Roster</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-canvas)] font-mono text-[var(--text-muted)]">
              {collegeStudents.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] px-2">
          {mainTab === 'events'
            ? `${registeredEventsCount} of ${items.length} events registered (${regPercentage}%)`
            : `${activeStudentChestNos.size} of ${collegeStudents.length} students assigned to events`}
        </div>
      </div>

      {/* 4. UNIFIED ALL-EVENTS REGISTRATION TABLE */}
      {mainTab === 'events' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <Card className="p-2.5 sm:p-3 bg-[var(--bg-surface)]">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search events by name or code (e.g. AF065, Elocution)..."
                      value={regSearchQuery}
                      onChange={e => setRegSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                      {(['All', 'Registered', 'Unregistered'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setRegStatusFilter(status)}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                            regStatusFilter === status
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {status === 'All'
                            ? `All (${items.length})`
                            : status === 'Registered'
                            ? `Registered (${registeredEventsCount})`
                            : `Not Enrolled (${items.length - registeredEventsCount})`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto text-xs">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setRegCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                            regCategoryFilter.toLowerCase() === cat.toLowerCase()
                              ? 'bg-slate-900 text-white border-slate-700 dark:bg-slate-100 dark:text-slate-900'
                              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
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
              <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
                <div className="p-3 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Festival Events & College Roster</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Showing {filteredItems.length} of {items.length} events for #{currentCol?.affl_no} {currentCol?.short_name}
                    </p>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Click any student chip to inspect their profile and full registrations.
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                      <TableRow>
                        <TableHead className="w-24 font-bold text-xs py-2.5 pl-4">Code / Type</TableHead>
                        <TableHead className="min-w-[180px] max-w-[260px] font-bold text-xs py-2.5">
                          Event Name & Category
                        </TableHead>
                        <TableHead className="w-32 text-center font-bold text-xs py-2.5">Status</TableHead>
                        <TableHead className="min-w-[240px] font-bold text-xs py-2.5">
                          Registered Students / Team
                        </TableHead>
                        <TableHead className="text-right w-36 font-bold text-xs py-2.5 pr-4">Admin Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Users className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
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
                            .map(
                              cNo =>
                                findStudentByIdentifier(collegeStudents, cNo) ||
                                findStudentByIdentifier(students, cNo)
                            )
                            .filter(Boolean) as Student[];

                          const lock = locks.find(
                            l => l.item_id === item.item_id && l.college_affl_no === currentColAffl
                          );
                          const isUnlocked =
                            currentCol?.manual_lock_override || (lock ? lock.is_open : !item.is_locked);

                          return (
                            <TableRow
                              key={item.item_id || item.id}
                              className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60"
                            >
                              <TableCell className="py-2.5 pl-4 align-middle">
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-[var(--text-primary)] text-xs">
                                    {item.code}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge
                                      variant={item.item_type === 'Single' ? 'default' : 'purple'}
                                      size="sm"
                                      className="text-[10px] px-1 py-0 leading-tight"
                                    >
                                      {item.item_type}
                                    </Badge>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                      ({item.min_participants === item.max_participants ? item.min_participants : `${item.min_participants}-${item.max_participants}`})
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="py-2.5 align-middle max-w-[260px]">
                                <div className="font-bold text-[var(--text-primary)] text-xs truncate" title={item.name}>
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <CategoryBadge category={item.category} />
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Mode: <span className="capitalize">{item.mode || 'onstage'}</span>
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="py-2.5 align-middle text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {isReg ? (
                                    <Badge variant="success" size="sm" className="font-semibold text-[10px] px-1.5 py-0">
                                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                      Reg ({registeredChestNos.length})
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                      Not Enrolled
                                    </span>
                                  )}

                                  <div>
                                    {isUnlocked ? (
                                      <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        <Unlock className="w-2.5 h-2.5 mr-1" /> Open
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                        <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="py-2.5 align-middle">
                                {isReg && registeredStudentObjects.length > 0 ? (
                                  <div className="flex items-center gap-1.5 max-w-xs">
                                    <div className="relative flex-1 min-w-[170px]">
                                      <select
                                        value=""
                                        onChange={e => {
                                          const chest = e.target.value;
                                          if (!chest) return;
                                          const stu =
                                            findStudentByIdentifier(collegeStudents, chest) ||
                                            findStudentByIdentifier(students, chest);
                                          if (stu) setSelectedStudentForDetails(stu);
                                        }}
                                        className="w-full px-2.5 py-1 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                                        title="Click to view all registered students for this event"
                                      >
                                        <option value="" disabled>
                                          {registeredStudentObjects.length === 1
                                            ? `${registeredStudentObjects[0].chest_no} - ${registeredStudentObjects[0].name}`
                                            : `👥 ${registeredStudentObjects.length} Students Registered ▾`}
                                        </option>
                                        {registeredStudentObjects.map(stu => (
                                          <option key={stu.chest_no || stu.id} value={stu.chest_no}>
                                            {stu.chest_no} — {stu.name} ({stu.phase || stu.category || 'Cat'})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {registeredStudentObjects[0] && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudentForDetails(registeredStudentObjects[0])}
                                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-blue-500 hover:bg-[var(--bg-canvas)] transition-all shrink-0"
                                        title={`View profile for ${registeredStudentObjects[0].name} (${registeredStudentObjects[0].chest_no})`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ) : isReg && registeredChestNos.length > 0 ? (
                                  <div className="flex items-center gap-1.5 max-w-xs">
                                    <select
                                      value=""
                                      onChange={e => {
                                        const chest = e.target.value;
                                        if (!chest) return;
                                        const stu =
                                          findStudentByIdentifier(collegeStudents, chest) ||
                                          findStudentByIdentifier(students, chest);
                                        if (stu) setSelectedStudentForDetails(stu);
                                      }}
                                      className="w-full px-2.5 py-1 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] font-medium cursor-pointer"
                                    >
                                      <option value="" disabled>
                                        👥 {registeredChestNos.length} Enrolled ({registeredChestNos.join(', ')})
                                      </option>
                                      {registeredChestNos.map(cNo => (
                                        <option key={cNo} value={cNo}>
                                          {cNo}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--text-muted)] italic">
                                    —
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="py-2.5 pr-4 align-middle text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <Button
                                    size="xs"
                                    variant={isReg ? 'outline' : 'primary'}
                                    onClick={() => handleOpenAdminRegModal(item, registeredChestNos)}
                                    className="h-7 px-2 text-xs font-semibold"
                                    title={isReg ? 'Edit student assignments for this event' : 'Register students for this event'}
                                  >
                                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                                    {isReg ? 'Roster' : 'Register'}
                                  </Button>

                                  {isReg && (
                                    <Button
                                      size="xs"
                                      variant="destructive"
                                      onClick={() => handleAdminUnregister(item.item_id, item.name || item.code || 'Event')}
                                      className="h-7 w-7 p-0"
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
                </div>
              </div>
            </div>
          )}

      {/* 6. VIEW BY REGISTERED STUDENTS & DETAILS */}
      {mainTab === 'students' && (() => {
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
          const matchesStatus =
            studentRegStatusFilter === 'All' ||
            (studentRegStatusFilter === 'Registered' && isEnrolled) ||
            (studentRegStatusFilter === 'Unregistered' && !isEnrolled);

          return matchesSearch && matchesCategory && matchesStatus;
        });

        return (
          <div className="space-y-4">
            {/* Student Filter Bar */}
            <Card className="p-2.5 sm:p-3 bg-[var(--bg-surface)]">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search students by name, chest #, or adm #..."
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                    {(['All', 'Registered', 'Unregistered'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStudentRegStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          studentRegStatusFilter === status
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {status === 'All'
                          ? `All (${collegeStudents.length})`
                          : status === 'Registered'
                          ? `Enrolled (${activeStudentChestNos.size})`
                          : `Not Enrolled (${collegeStudents.length - activeStudentChestNos.size})`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setStudentCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                          studentCategoryFilter.toLowerCase() === cat.toLowerCase()
                            ? 'bg-slate-900 text-white border-slate-700 dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
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
            <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
              <div className="p-3 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    College Student Roster & Event Enrollments
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Showing {filteredStudentsList.length} of {collegeStudents.length} students from #{currentCol?.affl_no}{' '}
                    {currentCol?.name}
                  </p>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Click "View Details" to see individual event schedules and quota utilization.
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                    <TableRow>
                      <TableHead className="w-44 font-bold text-xs py-2.5 pl-4">Student & Chest #</TableHead>
                      <TableHead className="w-28 font-bold text-xs py-2.5">Category & Class</TableHead>
                      <TableHead className="w-32 font-bold text-xs py-2.5">Admission / Phone</TableHead>
                      <TableHead className="min-w-[240px] font-bold text-xs py-2.5">Registered Events</TableHead>
                      <TableHead className="w-20 text-center font-bold text-xs py-2.5">Quota</TableHead>
                      <TableHead className="text-right w-28 font-bold text-xs py-2.5 pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudentsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
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
                          <TableRow
                            key={stu.id || stu.chest_no}
                            className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60"
                          >
                            <TableCell className="py-2.5 pl-4 align-middle">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                  {stu.chest_no ? stu.chest_no.replace('CH-', '') : '#'}
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-[var(--text-primary)]">
                                    {stu.name || stu.full_name}
                                  </div>
                                  <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    {getCanonicalChestNo(stu)}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              <div className="space-y-0.5">
                                <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {stu.class || 'Class N/A'}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              <div className="text-xs">
                                <span className="font-mono text-[var(--text-secondary)] font-medium">
                                  {stu.admission_no}
                                </span>
                                {stu.phone ? (
                                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 font-mono">
                                    <Phone className="w-2.5 h-2.5" /> {stu.phone}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[var(--text-muted)]">—</div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-2.5 align-middle">
                              {enrolledItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {enrolledItems.map(itm => (
                                    <div
                                      key={itm.item_id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)]"
                                    >
                                      <span className="font-mono font-bold text-slate-500 text-[9px]">
                                        {itm.code}
                                      </span>
                                      <span className="font-medium truncate max-w-[100px]">{itm.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)] italic">
                                  No events registered
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-2.5 align-middle text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                                  enrolledItems.length > 0
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                    : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                                }`}
                              >
                                {enrolledItems.length}
                              </span>
                            </TableCell>

                            <TableCell className="py-2.5 pr-4 align-middle text-right">
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => setSelectedStudentForDetails(stu)}
                                className="h-7 px-2 text-xs font-semibold"
                                title="View full student profile and registered events"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> Profile
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. ADMIN REGISTRATION MODAL */}
      {selectedItemForAdminReg && (
        <Modal
          isOpen={isRegModalOpen}
          onClose={() => setIsRegModalOpen(false)}
          title={`Manage Roster: ${selectedItemForAdminReg.name}`}
          description={`College #${currentCol?.affl_no} ${currentCol?.name} • Code: ${selectedItemForAdminReg.code}`}
          maxWidth="xl"
        >
          {(() => {
            const min = selectedItemForAdminReg.min_participants || selectedItemForAdminReg.no_of_participants || 1;
            const max = selectedItemForAdminReg.max_participants || selectedItemForAdminReg.no_of_participants || 1;

            const filteredCollegeStudents = collegeStudents.filter(stu => {
              const stuName = stu.name || stu.full_name || '';
              const stuChest = stu.chest_no || '';
              const stuAdm = stu.admission_no != null ? String(stu.admission_no) : '';
              const matchesSearch =
                stuName.toLowerCase().includes(regModalStudentSearch.toLowerCase()) ||
                stuChest.toLowerCase().includes(regModalStudentSearch.toLowerCase()) ||
                stuAdm.toLowerCase().includes(regModalStudentSearch.toLowerCase());
              const itemCategory = (
                selectedItemForAdminReg.category ||
                selectedItemForAdminReg.phase ||
                ''
              ).toLowerCase();
              const matchesCategory =
                regModalShowAllCategories ||
                (stu.phase && stu.phase.toLowerCase() === itemCategory) ||
                (stu.category && stu.category.toLowerCase() === itemCategory);
              return matchesSearch && matchesCategory;
            });

            const lock = locks.find(
              l => l.item_id === selectedItemForAdminReg.item_id && l.college_affl_no === currentColAffl
            );
            const isUnlocked =
              currentCol?.manual_lock_override || (lock ? lock.is_open : !selectedItemForAdminReg.is_locked);

            return (
              <form onSubmit={handleSaveAdminReg} className="space-y-4">
                {/* Item & College Identity banner */}
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
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
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <input
                    type="checkbox"
                    id="bypassDeadlinesCheckbox"
                    checked={bypassDeadlinesForAdminReg}
                    onChange={e => setBypassDeadlinesForAdminReg(e.target.checked)}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="bypassDeadlinesCheckbox" className="text-amber-800 dark:text-amber-300 cursor-pointer font-medium">
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
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setRegModalShowAllCategories(!regModalShowAllCategories)}
                      className={`px-2 py-1.5 text-[11px] rounded-lg font-medium border transition-colors whitespace-nowrap ${
                        regModalShowAllCategories
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {regModalShowAllCategories
                        ? 'All Categories (Showing All)'
                        : `Filter: ${selectedItemForAdminReg.category} only`}
                    </button>
                  </div>
                </div>

                {/* Student Selection List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  {filteredCollegeStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                      No students found matching current filters.
                      {!regModalShowAllCategories && (
                        <button
                          type="button"
                          onClick={() => setRegModalShowAllCategories(true)}
                          className="block mx-auto mt-2 text-blue-500 hover:underline font-semibold"
                        >
                          Show students from all categories
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCollegeStudents.map(student => {
                      const chestNo = getCanonicalChestNo(student);
                      const isSelected =
                        selectedStudentChestNosForAdminReg.includes(student.id) ||
                        selectedStudentChestNosForAdminReg.includes(chestNo);
                      const studentRegCount = calculateStudentEvents(student, registrations, items).registeredEventsCount;

                      return (
                        <div
                          key={student.id || chestNo}
                          onClick={() => handleToggleStudentSelection(chestNo)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/40 text-[var(--text-primary)]'
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
                            <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
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
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
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
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={selectedStudentChestNosForAdminReg.length === 0}
                    className="font-semibold"
                  >
                    Save Registration & Update Quotas
                  </Button>
                </div>
              </form>
            );
          })()}
        </Modal>
      )}

      {/* 8. STUDENT DETAILS MODAL */}
      {selectedStudentForDetails && (
        <Modal
          isOpen={Boolean(selectedStudentForDetails)}
          onClose={() => setSelectedStudentForDetails(null)}
          title="Student Registration & Event Details"
          description={`Chest No: ${getCanonicalChestNo(selectedStudentForDetails)} • Admission: ${selectedStudentForDetails.admission_no}`}
          maxWidth="2xl"
        >
          {(() => {
            const stu = selectedStudentForDetails;
            const stuCollege = colleges.find(c => c.affl_no === stu.college_affl_no || c.id === stu.college_id);

            const stats = calculateStudentEvents(stu, registrations, items);
            const stuRegs = stats.events.map(e => e.registration);
            const stuItemIds = new Set(stuRegs.map(r => r.item_id));
            const stuItems = items.filter(i => stuItemIds.has(i.item_id));
            const stuSchedules = schedules.filter(s => stuItemIds.has(s.item_id));

            const quotaLimits = festService.getMaxParticipation();
            const quota =
              quotaLimits.find(q => q.phase.toLowerCase() === (stu.phase || stu.category || '').toLowerCase()) ||
              quotaLimits[0];
            const totalMax = quota?.total_max || 4;
            const stageMax = quota?.on_max || 2;
            const offstageMax = quota?.off_max || 2;

            const onstageCount = stats.onstageCount;
            const offstageCount = stats.offstageCount;

            return (
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold text-base dark:bg-[#1A2E4A] shadow-xs">
                      {getCanonicalChestNo(stu).replace('CH-', '').replace('ST-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{stu.name || stu.full_name}</h4>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
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

                  <div className="flex sm:flex-col items-end gap-1">
                    <CategoryBadge category={stu.phase || stu.category || 'Senior'} />
                    <span className="text-[11px] text-[var(--text-muted)] font-medium">
                      Class: <strong className="text-[var(--text-secondary)]">{stu.class || 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                {/* Quota & Participation Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Total Events</div>
                    <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 font-mono">
                      {stuItems.length} <span className="text-xs font-normal text-[var(--text-muted)]">/ {totalMax}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Onstage</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                      {onstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {stageMax}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Offstage</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                      {offstageCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ {offstageMax}</span>
                    </div>
                  </div>
                </div>

                {/* Registered Events Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Registered Events ({stuItems.length})
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {stu.phone ? `Contact: ${stu.phone}` : 'No phone registered'}
                    </span>
                  </div>

                  {stuItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                      This student is not enrolled in any festival events yet.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                      <Table className="w-full text-xs">
                        <TableHeader className="bg-[var(--bg-canvas)]">
                          <TableRow>
                            <TableHead className="w-20 font-bold py-2">Code</TableHead>
                            <TableHead className="font-bold py-2">Event Name</TableHead>
                            <TableHead className="w-20 font-bold py-2">Type</TableHead>
                            <TableHead className="w-20 font-bold py-2">Mode</TableHead>
                            <TableHead className="font-bold py-2">Stage / Schedule</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stuItems.map(item => {
                            const sched = stuSchedules.find(s => s.item_id === item.item_id);
                            return (
                              <TableRow key={item.item_id} className="border-b border-[var(--border-subtle)]/60">
                                <TableCell className="font-mono font-bold text-xs py-2">{item.code}</TableCell>
                                <TableCell className="font-semibold text-xs text-[var(--text-primary)] py-2">
                                  {item.name}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant={item.item_type === 'Single' ? 'default' : 'purple'} size="sm">
                                    {item.item_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="text-xs capitalize text-[var(--text-secondary)] font-medium">
                                    {item.mode}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-[var(--text-muted)] py-2">
                                  {sched ? (
                                    <div>
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        Stage {sched.stage_number}
                                        {sched.stage?.name ? ` (${sched.stage.name})` : ''}
                                      </span>
                                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {sched.starting
                                          ? new Date(sched.starting).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Time TBA'}
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

                <div className="pt-2 flex justify-end border-t border-[var(--border-subtle)]">
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
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
