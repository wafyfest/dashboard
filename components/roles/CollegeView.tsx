'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, AppealStatusBadge, StageStatusBadge, ItemModeBadge, ItemTypeBadge } from '../ui/badge';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import {
  Building2,
  Users,
  CalendarCheck,
  Printer,
  Plus,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileText,
  UserPlus,
  QrCode,
  Trash2,
  Search,
  Filter,
  X,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import {
  Item,
  Student,
  StudentCategory,
  isCategoryMatching,
  isItemEligibleForCollege,
  normalizeCategoryKey,
  isSubmissionEvent,
  isScreeningEvent,
  getItemParticipantBounds,
  formatParticipantQuotaLabel,
  isSpecialEvent,
  getEffectiveStageMode
} from '@/lib/types/fest';
import { formatIstDisplay, evaluateDeadlineTierAtTime } from '@/lib/utils/istDate';
import { registrationContainsStudent, checkStudentQuota, getCanonicalChestNo, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { StudentsListTable } from '../college/StudentsListTable';
import { AdmitCardTable } from '../college/AdmitCardTable';
import { CollegeVolunteersTab } from '../college/tabs/CollegeVolunteersTab';

export function CollegeView() {
  const { currentCollegeId, currentCollegeAfflNo, festSettings, refreshKey, triggerRefresh, timeTick } = useFest();
  const [activeTab, setActiveTab] = useState<'students' | 'registration' | 'admit_cards' | 'schedules' | 'appeals' | 'replacements' | 'volunteers'>('registration');

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    full_name: '',
    admission_no: '',
    category: 'Senior',
    phone: '',
    photo_url: ''
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedItemForReg, setSelectedItemForReg] = useState<Item | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [regModalSearch, setRegModalSearch] = useState<string>('');
  const [regModalPhaseFilter, setRegModalPhaseFilter] = useState<string>('All');

  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealForm, setAppealForm] = useState({
    itemId: '',
    reason: '',
    feeReceiptUrl: ''
  });

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    registrationId: '',
    originalStudentId: '',
    replacementStudentId: '',
    reason: ''
  });

  const college = festService.getCollege(currentCollegeId);
  const allItems = festService.getItems();
  const students = festService.getStudents(currentCollegeId);
  const registrations = festService.getRegistrations(currentCollegeId);
  const schedules = festService.getSchedules();
  const appeals = festService.getAppeals(currentCollegeId);
  const replacements = festService.getReplacements(currentCollegeId);
  const quotaLimits = festService.getMaxParticipation();

  // Dynamic filtering for Replacement Modal
  const currentEventRegisteredStudents = students.filter(s => {
    if (!replacementForm.registrationId) return false;
    const selReg = registrations.find(r => r.id === replacementForm.registrationId);
    if (!selReg) return false;
    const itemRegs = registrations.filter(r => r.item_id === selReg.item_id);
    return itemRegs.some(r => registrationContainsStudent(r, s, students));
  });

  const eligibleSubstituteStudents = students.filter(s => {
    if (!replacementForm.registrationId) return true;
    const selReg = registrations.find(r => r.id === replacementForm.registrationId);
    if (!selReg) return true;
    const selItem = selReg.item || allItems.find(i => i.item_id === selReg.item_id);

    const itemRegs = registrations.filter(r => r.item_id === selReg.item_id);
    const enrolledIds = new Set(
      students
        .filter(st => itemRegs.some(r => registrationContainsStudent(r, st, students)))
        .map(st => st.id)
    );

    if (enrolledIds.has(s.id)) return false;
    if (selItem) {
      const itemCategory = selItem.phase || selItem.category;
      const studentCategory = s.category || s.phase;
      if (itemCategory && !isCategoryMatching(studentCategory, itemCategory)) {
        return false;
      }
    }
    return true;
  });

  // Registered item IDs for this college
  const registeredItemIds = new Set(registrations.map(r => r.item_id));

  const collegeEligibleItems = allItems.filter(item =>
    isItemEligibleForCollege(item, students, college, registeredItemIds)
  );

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    festService.saveStudent({
      ...newStudent,
      college_id: currentCollegeId
    });
    setIsStudentModalOpen(false);
    setNewStudent({
      full_name: '',
      admission_no: '',
      category: 'Senior',
      phone: '',
      photo_url: ''
    });
    triggerRefresh();
  };

  // Available student phases
  const availableStudentPhases = React.useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      const p = s.category || s.phase;
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered students for registration modal
  const filteredModalStudents = React.useMemo(() => {
    return students.filter(s => {
      // Phase filter
      if (regModalPhaseFilter !== 'All') {
        const sCat = s.category || s.phase;
        if (normalizeCategoryKey(sCat) !== normalizeCategoryKey(regModalPhaseFilter)) {
          return false;
        }
      }

      // Search query (name, chest no, admission/CIC no)
      if (regModalSearch.trim()) {
        const q = regModalSearch.toLowerCase().trim();
        const name = (s.full_name || s.name || '').toLowerCase();
        const chest = (getCanonicalChestNo(s) || s.chest_no || '').toLowerCase();
        const adm = String(s.admission_no || s.cic_no || '').toLowerCase();
        if (!name.includes(q) && !chest.includes(q) && !adm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [students, regModalSearch, regModalPhaseFilter]);

  // Selected students hidden by filter
  const hiddenSelectedCount = React.useMemo(() => {
    const visibleIds = new Set(filteredModalStudents.map(s => s.id));
    return selectedStudentIds.filter(id => !visibleIds.has(id)).length;
  }, [filteredModalStudents, selectedStudentIds]);

  const handleOpenRegistrationModal = (item: Item) => {
    const targetItemId = Number(item.item_id || item.id);
    const matchingRegs = registrations.filter(
      r => Number(r.item_id) === targetItemId || String(r.item_id) === String(item.id)
    );
    const preselectedSet = new Set<string>();
    matchingRegs.forEach(reg => {
      reg.participants?.forEach(p => {
        const found = findStudentByIdentifier(students, p.id || p.chest_no || p.admission_no || p.cic_no, currentCollegeAfflNo || college?.affl_no);
        if (found?.id) preselectedSet.add(found.id);
        else if (p.id) preselectedSet.add(p.id);
      });
      if (reg.student?.id) preselectedSet.add(reg.student.id);
      if (reg.chest_no) {
        const found = findStudentByIdentifier(students, reg.chest_no, currentCollegeAfflNo || college?.affl_no);
        if (found?.id) preselectedSet.add(found.id);
      }
    });

    // Cross-check against full students pool
    students.forEach(s => {
      if (matchingRegs.some(r => registrationContainsStudent(r, s, students))) {
        preselectedSet.add(s.id);
      }
    });

    setSelectedItemForReg(item);
    setSelectedStudentIds(Array.from(preselectedSet));
    setRegModalSearch('');
    const itemCat = item.phase || item.category || 'All';
    const isGeneralOrSpecial = normalizeCategoryKey(itemCat) === 'GENERAL' || normalizeCategoryKey(itemCat) === 'SPECIAL';
    setRegModalPhaseFilter(isGeneralOrSpecial ? 'All' : itemCat);
    setIsRegisterModalOpen(true);
  };

  const handleConfirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReg) return;

    const res = await festService.registerCollegeForItem(
      currentCollegeAfflNo || currentCollegeId,
      selectedItemForReg.item_id || selectedItemForReg.id,
      selectedStudentIds
    );

    if (!res.success) {
      alert(`Registration Error: ${res.error}`);
      return;
    }

    setIsRegisterModalOpen(false);
    triggerRefresh();
  };

  const handleUnregisterRegistration = async (item: Item) => {
    const itemId = item.item_id || item.id;
    const itemName = item.name_eng || item.name;
    if (!confirm(`Are you sure you want to remove/unregister your entry for "${itemName}"?`)) {
      return;
    }
    const res = await festService.unregisterCollegeForItem(
      currentCollegeAfflNo || currentCollegeId,
      itemId
    );
    if (!res.success) {
      alert(`Unregister Error: ${res.error}`);
      return;
    }
    setIsRegisterModalOpen(false);
    triggerRefresh();
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealForm.itemId || !appealForm.reason) {
      alert('Please select an event and describe your grievance.');
      return;
    }
    const res = await festService.submitAppeal(
      currentCollegeId,
      appealForm.itemId,
      appealForm.reason,
      appealForm.feeReceiptUrl
    );
    if (!res.success) {
      alert(`Appeal Submission Error: ${res.error || 'Failed to submit appeal'}`);
      return;
    }
    setIsAppealModalOpen(false);
    setAppealForm({ itemId: '', reason: '', feeReceiptUrl: '' });
    triggerRefresh();
    alert('Appeal submitted to the Fest Executive Committee.');
  };

  const handleSubmitReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacementForm.registrationId || !replacementForm.originalStudentId || !replacementForm.replacementStudentId) {
      alert('Please complete all substitution fields.');
      return;
    }
    const res = await festService.submitReplacement(
      replacementForm.registrationId,
      replacementForm.originalStudentId,
      replacementForm.replacementStudentId,
      replacementForm.reason
    );
    if (!res.success) {
      alert(`Failed to submit substitution: ${res.error}`);
      return;
    }
    setIsReplacementModalOpen(false);
    setReplacementForm({ registrationId: '', originalStudentId: '', replacementStudentId: '', reason: '' });
    triggerRefresh();
    alert('Participant replacement request submitted for Admin verification.');
  };

  // Check deadline tier for college
  const tierInfo = React.useMemo(
    () => evaluateDeadlineTierAtTime(festSettings.reg_deadline, new Date()),
    [festSettings.reg_deadline, timeTick]
  );
  const isFineApplicable = tierInfo.tier === 'fine' || tierInfo.tier === 'super_fine';

  return (
    <div className="space-y-6">
      {/* College Info Card & Fine Alert Banner */}
      <div className="bg-[var(--bg-surface)] backdrop-blur-md rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--f-saffron)] text-[#090d1a] flex items-center justify-center font-bold text-lg font-mono shadow-xs">
            {college?.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-heading font-bold text-[var(--text-primary)]">{college?.name}</h2>
              {college?.fine_status && <Badge variant="destructive">Late Fine Flagged</Badge>}
              {college?.manual_lock_override && <Badge variant="amber">Admin Override Active</Badge>}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Affiliation: <span className="font-mono text-[var(--text-secondary)] font-semibold">{college?.affiliation_no}</span> | Coordinator: <strong className="text-[var(--text-primary)]">{college?.coordinator_name}</strong> ({college?.coordinator_phone})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('admit_cards')}
          >
            <Printer className="w-3.5 h-3.5" /> Batch Admit Cards
          </Button>
          <Button
            size="sm"
            variant="saffron"
            onClick={() => setIsStudentModalOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" /> Enroll Student
          </Button>
        </div>
      </div>

      {/* Late fine / super fine notice if active */}
      {isFineApplicable && (
        <div
          className={`border rounded-xl p-3 text-xs flex items-center gap-2 ${tierInfo.tier === 'super_fine'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            : 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-300'
            }`}
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${tierInfo.tier === 'super_fine' ? 'text-rose-600' : 'text-amber-600'}`}
          />
          <span>
            {tierInfo.tier === 'super_fine' ? (
              <>
                <strong>Super Fine Period Active (₹1,000):</strong> The 1-hour ₹500 fine window has ended. New registrations incur a <strong>₹1,000 super fine</strong> until{' '}
                <strong className="font-mono">{tierInfo.schedule ? formatIstDisplay(tierInfo.schedule.superFineEndIso) : ''}</strong>, after which registration will be completely locked.
              </>
            ) : (
              <>
                <strong>Fine Period Active (₹500):</strong> The normal registration deadline has passed. Registrations up to{' '}
                <strong className="font-mono">{tierInfo.schedule ? formatIstDisplay(tierInfo.schedule.fineEndIso) : ''}</strong> incur a <strong>₹500 fine</strong> (₹1,000 Super Fine after 1 hour).
              </>
            )}
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)]/80 p-1.5 rounded-2xl border border-[var(--border-subtle)] backdrop-blur-md shadow-xs overflow-x-auto scrollbar-none" role="tablist">
        {[
          { id: 'registration', label: `Event Registration`, badge: registrations.length },
          { id: 'students', label: `Student Directory`, badge: students.length },
          { id: 'volunteers', label: 'Volunteers', badge: null },
          { id: 'schedules', label: 'Stage Schedule', badge: null },
          { id: 'admit_cards', label: 'Admit Cards', badge: 'PDF' },
          { id: 'appeals', label: `Appeals`, badge: appeals.length || null },
          { id: 'replacements', label: `Replacements`, badge: replacements.length || null }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-heading font-medium transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${isActive
                ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-black/20 text-[#090d1a]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. EVENT REGISTRATION TAB */}
      {activeTab === 'registration' && (
        <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <CardHeader>
            <div>
              <CardTitle className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
                Arts Fest Events & Registration Matrix
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)]">
                Register single participants or group ensembles within required quota constraints
              </CardDescription>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Total Events: <strong className="text-[var(--text-primary)] font-mono">{allItems.length}</strong> | Enrolled:{' '}
              <strong className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-bold">
                {registrations.length}
              </strong>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-subtle)]/90 backdrop-blur-sm">
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Code</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Event Title</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Category</TableHead>
                  <TableHead className="text-center font-heading font-bold text-[11px] text-[var(--text-secondary)]">Type / Mode</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Required Participants</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Enrollment Status</TableHead>
                  <TableHead className="text-right font-heading font-bold text-[11px] text-[var(--text-secondary)]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collegeEligibleItems.map(item => {
                  const reg = registrations.find(r => r.item_id === item.item_id || String(r.item_id) === item.id);
                  const lockCheck = festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, item.item_id || item.id);

                  return (
                    <TableRow key={item.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">{item.code}</TableCell>
                      <TableCell>
                        <div className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">{item.name}</div>
                        {reg && reg.participants && reg.participants.length > 0 && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-sans">
                            Participants: {reg.participants.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p)})`).join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={item.phase || item.category} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ItemTypeBadge
                          type={item.item_type}
                          mode={item.mode}
                          isSubmission={isSubmissionEvent(item)}
                          isScreening={isScreeningEvent(item)}
                        />
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">
                        {formatParticipantQuotaLabel(item)}
                      </TableCell>
                      <TableCell>
                        {reg ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                            {reg.code_letter && (
                              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/25 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] rounded font-mono text-[10px]">
                                Code {reg.code_letter}
                              </span>
                            )}
                          </span>
                        ) : !lockCheck.canRegister ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-xs">
                            <Lock className="w-3.5 h-3.5" /> {lockCheck.reason}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">Available</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant={reg ? 'outline' : lockCheck.canRegister ? 'saffron' : 'secondary'}
                            disabled={!lockCheck.canRegister}
                            onClick={() => lockCheck.canRegister && handleOpenRegistrationModal(item)}
                            title={!lockCheck.canRegister ? lockCheck.reason || 'Registration Closed (Locked)' : (reg ? 'Modify Roster' : 'Register Entry')}
                            className={!lockCheck.canRegister ? 'opacity-75 cursor-not-allowed' : ''}
                          >
                            {!lockCheck.canRegister ? (
                              <Lock className="w-3.5 h-3.5 mr-1 text-[var(--text-muted)]" />
                            ) : null}
                            {reg ? 'Modify Roster' : 'Register Entry'}
                          </Button>
                          {reg && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={!lockCheck.canRegister}
                              className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!lockCheck.canRegister ? 'Registration Closed (Locked)' : 'Remove Registration'}
                              onClick={() => {
                                if (!lockCheck.canRegister) return;
                                handleUnregisterRegistration(item);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 2. STUDENT DIRECTORY TAB */}
      {activeTab === 'students' && (
        <StudentsListTable
          college={college}
          collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
        />
      )}

      {/* 3. STAGE SCHEDULE TAB */}
      {activeTab === 'schedules' && (
        <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <CardHeader>
            <div>
              <CardTitle className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
                Live Event Timeline & Stages
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)]">
                Schedule of venues and start times for items your college is registered for
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-subtle)]/90 backdrop-blur-sm">
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Event</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Assigned Stage / Venue</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Scheduled Start</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Live Status</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Assigned Participants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules
                  .filter(sch => registeredItemIds.has(sch.item_id))
                  .map(sch => {
                    const reg = registrations.find(r => r.item_id === sch.item_id);
                    return (
                      <TableRow key={sch.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <TableCell>
                          <div className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">{sch.item?.name}</div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">{sch.item?.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs sm:text-sm text-[var(--text-primary)]">{sch.stage?.name}</div>
                          <span className="text-[11px] text-[var(--text-muted)]">{sch.stage?.location}</span>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">
                          {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <StageStatusBadge status={sch.status} />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {reg?.participants?.map(p => p.full_name).join(', ') || 'No roster'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* VOLUNTEER REGISTRATION TAB */}
      {activeTab === 'volunteers' && (
        <CollegeVolunteersTab
          college={college}
          collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
          students={students}
          refreshKey={refreshKey}
          onRefresh={triggerRefresh}
        />
      )}

      {/* 4. BATCH ADMIT CARDS TAB */}
      {activeTab === 'admit_cards' && (
        <AdmitCardTable
          students={students}
          college={college}
          collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
          registrations={registrations}
          festSettings={festSettings}
        />
      )}

      {/* 5. APPEALS TAB */}
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[var(--bg-surface)] backdrop-blur-md p-4 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <div>
              <h3 className="text-sm font-heading font-bold text-[var(--text-primary)]">Formal Grievances</h3>
              <p className="text-xs text-[var(--text-muted)]">File an event result appeal for official admin review</p>
            </div>
            <Button size="sm" variant="saffron" onClick={() => setIsAppealModalOpen(true)}>
              Submit New Appeal
            </Button>
          </div>

          <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <CardHeader>
              <CardTitle className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
                Submitted Appeals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]/90 backdrop-blur-sm">
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Event</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Reason</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Receipt</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Status</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Admin Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-[var(--text-muted)]">
                        No appeals filed by your institution
                      </TableCell>
                    </TableRow>
                  ) : (
                    appeals.map(a => (
                      <TableRow key={a.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <TableCell className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">{a.item?.name}</TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)] max-w-sm">{a.reason}</TableCell>
                        <TableCell>
                          {a.fee_receipt_url ? (
                            <a
                              href={a.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-xs hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="w-3 h-3" /> Proof
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AppealStatusBadge status={a.status || a.current_status || 'Pending'} />
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)]">{a.admin_remarks || 'Pending'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. REPLACEMENTS TAB */}
      {(activeTab as string) === 'replacements' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[var(--bg-surface)] backdrop-blur-md p-4 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <div>
              <h3 className="text-sm font-heading font-bold text-[var(--text-primary)]">Emergency Substitutions</h3>
              <p className="text-xs text-[var(--text-muted)]">Request participant medical substitution or emergency replacement</p>
            </div>
            <Button size="sm" variant="saffron" onClick={() => setIsReplacementModalOpen(true)}>
              Request Substitution
            </Button>
          </div>

          <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <CardHeader>
              <CardTitle className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
                Submitted Replacement Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]/90 backdrop-blur-sm">
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Original Participant</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Replacement Participant</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Reason</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Status</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] text-[var(--text-secondary)]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-[var(--text-muted)]">
                        No replacement requests submitted
                      </TableCell>
                    </TableRow>
                  ) : (
                    replacements.map(r => (
                      <TableRow key={r.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <TableCell className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                          {r.original_student?.name || r.original_student?.full_name || r.original_student_id}
                        </TableCell>
                        <TableCell className="font-heading font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                          {r.replacement_student?.name || r.replacement_student?.full_name || r.replacement_student_id}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)] max-w-sm">{r.reason}</TableCell>
                        <TableCell>
                          <AppealStatusBadge status={r.status || 'Pending'} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[var(--text-muted)]">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
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

      {/* Modal: Enroll Student */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Enroll Student in Directory"
        description="Add a student profile to allocate chest numbers and register for arts fest competitions"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Full Student Name</label>
            <input
              type="text"
              value={newStudent.full_name || ''}
              onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">College Admission / Roll No</label>
              <input
                type="text"
                placeholder="e.g. 22801"
                value={newStudent.admission_no || ''}
                onChange={e => setNewStudent({ ...newStudent, admission_no: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 font-mono transition-all shadow-2xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={newStudent.category || 'Foundation'}
                onChange={e => setNewStudent({ ...newStudent, category: e.target.value as StudentCategory })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
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
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Contact Phone</label>
            <input
              type="tel"
              placeholder="+91 98..."
              value={newStudent.phone || ''}
              onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Photo URL (Optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={newStudent.photo_url || ''}
              onChange={e => setNewStudent({ ...newStudent, photo_url: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsStudentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron">Add Student</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Event Registration with Capacity Verification */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title={
          selectedItemForReg && registrations.some(r => Number(r.item_id) === Number(selectedItemForReg.item_id || selectedItemForReg.id))
            ? `Edit Registration: ${selectedItemForReg?.name_eng || selectedItemForReg?.name}`
            : `Register: ${selectedItemForReg?.name_eng || selectedItemForReg?.name}`
        }
        description={
          selectedItemForReg?.no_of_participants == null
            ? `Event Code: ${selectedItemForReg?.item_code || selectedItemForReg?.code} | Open Entry (Min 1 participant)`
            : `Event Code: ${selectedItemForReg?.item_code || selectedItemForReg?.code} | Required: ${selectedItemForReg.no_of_participants} participant(s)`
        }
        maxWidth="xl"
      >
        {selectedItemForReg && (() => {
          const targetItemId = Number(selectedItemForReg.item_id || selectedItemForReg.id);
          const { min: minPart, max: maxPart, isOpen: isOpenPart } = getItemParticipantBounds(selectedItemForReg);
          const matchingEventRegs = registrations.filter(
            r => Number(r.item_id) === targetItemId || String(r.item_id) === String(selectedItemForReg.id)
          );

          // Resolve currently enrolled students
          const currentlyRegisteredStudents: Student[] = [];
          students.forEach(s => {
            if (matchingEventRegs.some(r => registrationContainsStudent(r, s, students))) {
              currentlyRegisteredStudents.push(s);
            }
          });
          const isAlreadyRegistered = matchingEventRegs.length > 0 || currentlyRegisteredStudents.length > 0;

          return (
            <form onSubmit={handleConfirmRegistration} className="space-y-4">
              <div className="bg-[var(--bg-subtle)]/75 p-3 rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-[var(--text-secondary)] font-heading">Category: </span>
                  <CategoryBadge category={selectedItemForReg.phase || selectedItemForReg.category || 'General'} />
                </div>
                <div>
                  <span className="font-semibold text-[var(--text-secondary)] font-heading">Type / Mode: </span>
                  <ItemTypeBadge
                    type={selectedItemForReg.point_type === 'group' ? 'Group' : 'Individual'}
                    mode={selectedItemForReg.mode}
                    isSubmission={isSubmissionEvent(selectedItemForReg)}
                    isScreening={isScreeningEvent(selectedItemForReg)}
                  />
                </div>
              </div>

              {/* Banner: Currently Registered Participants */}
              {currentlyRegisteredStudents.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-heading font-bold text-amber-900 dark:text-amber-200">
                      <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Currently Registered Participants ({currentlyRegisteredStudents.length})</span>
                    </div>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      Saved in database
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {currentlyRegisteredStudents.map(curStudent => {
                      const isChecked = selectedStudentIds.includes(curStudent.id);
                      const chest = getCanonicalChestNo(curStudent);
                      const cic = curStudent.admission_no || curStudent.cic_no || (curStudent as any).cic_number || 'N/A';
                      return (
                        <div
                          key={curStudent.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${isChecked
                            ? 'bg-[var(--bg-surface)] border-amber-500/40 text-[var(--text-primary)] shadow-2xs'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 line-through opacity-70'
                            }`}
                        >
                          <div>
                            <div className="font-heading font-semibold text-[11.5px] leading-tight">
                              {curStudent.full_name || curStudent.name}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                              <span>Chest: {chest}</span>
                              <span>•</span>
                              <span>CIC: {cic}</span>
                            </div>
                          </div>
                          {isChecked ? (
                            <Badge variant="success" size="sm" className="text-[9.5px] py-0 px-1 font-heading">
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="destructive" size="sm" className="text-[9.5px] py-0 px-1 font-heading">
                              Will Remove
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Participant Search and Phase Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search student name, chest no, admission/CIC no..."
                    value={regModalSearch}
                    onChange={e => setRegModalSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
                  />
                  {regModalSearch && (
                    <button
                      type="button"
                      onClick={() => setRegModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Student Phase Filter */}
                <div className="relative shrink-0 sm:w-44">
                  <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={regModalPhaseFilter}
                    onChange={e => setRegModalPhaseFilter(e.target.value)}
                    className="w-full appearance-none pl-8 pr-7 py-2 text-xs font-semibold border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 cursor-pointer shadow-2xs"
                  >
                    <option value="All">All Phases</option>
                    {availableStudentPhases.map(ph => (
                      <option key={ph} value={ph}>
                        {ph.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Hidden Selected Alert */}
              {hiddenSelectedCount > 0 && (
                <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span>{hiddenSelectedCount} selected student(s) currently hidden by active filter.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRegModalSearch('');
                      setRegModalPhaseFilter('All');
                    }}
                    className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-200 ml-2"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                    Select Participants ({selectedStudentIds.length} / {isOpenPart ? 'Open' : maxPart} selected)
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium font-mono">
                    Showing {filteredModalStudents.length} of {students.length}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  {filteredModalStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      <p className="font-heading font-semibold text-[var(--text-primary)]">No participants match your criteria</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Try clearing the search query or phase filter</p>
                      {(regModalSearch || regModalPhaseFilter !== 'All') && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="mt-3 text-xs"
                          onClick={() => {
                            setRegModalSearch('');
                            setRegModalPhaseFilter('All');
                          }}
                        >
                          Reset Search & Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredModalStudents.map(s => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const sCat = s.category || s.phase;
                      const itemCat = selectedItemForReg.phase || selectedItemForReg.category;
                      const isCategoryMatch = isCategoryMatching(sCat, itemCat);

                      const quotaCheck = checkStudentQuota(s, selectedItemForReg, registrations, allItems, quotaLimits, students);
                      const isAlreadyInEvent = quotaCheck.isAlreadyRegisteredInItem;
                      const isQuotaComplete = !quotaCheck.allowed;
                      const isFaded = !isCategoryMatch || (!isSelected && !isAlreadyInEvent && isQuotaComplete);
                      const isDisabled = (!isCategoryMatch && !isSelected) || (!isSelected && !isAlreadyInEvent && isQuotaComplete);

                      const isItemSpecial = isSpecialEvent(selectedItemForReg);
                      const itemStageMode = getEffectiveStageMode(selectedItemForReg);
                      const isItemOnstage = itemStageMode === 'onstage';
                      const isItemOffstage = !isItemOnstage;

                      // Base counts across festival (consistent across all event modals)
                      const baseOn = quotaCheck.totalStats.onstageCount;
                      const baseOff = quotaCheck.totalStats.offstageCount;
                      const baseTot = quotaCheck.totalStats.registeredEventsCount;

                      // Dynamic numbers reflecting current selection state in this modal
                      let displayedOn = baseOn;
                      let displayedOff = baseOff;
                      let displayedTot = baseTot;
                      let deltaBadge: React.ReactNode = null;

                      if (isAlreadyInEvent) {
                        if (isSelected) {
                          deltaBadge = (
                            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                              Enrolled
                            </span>
                          );
                        } else {
                          if (!isItemSpecial) {
                            if (isItemOnstage) displayedOn = Math.max(0, baseOn - 1);
                            if (isItemOffstage) displayedOff = Math.max(0, baseOff - 1);
                            displayedTot = Math.max(0, baseTot - 1);
                          }
                          deltaBadge = (
                            <span className="ml-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/30">
                              -1 will remove
                            </span>
                          );
                        }
                      } else {
                        if (isSelected) {
                          if (!isItemSpecial) {
                            if (isItemOnstage) displayedOn = baseOn + 1;
                            if (isItemOffstage) displayedOff = baseOff + 1;
                            displayedTot = baseTot + 1;
                          }
                          deltaBadge = (
                            <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">
                              +1 added
                            </span>
                          );
                        }
                      }

                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2.5 text-xs transition-colors ${isFaded
                            ? 'opacity-40 bg-[var(--bg-subtle)]/50 cursor-not-allowed select-none'
                            : 'hover:bg-[var(--bg-subtle)]/60 cursor-pointer'
                            }`}
                          title={!isCategoryMatch ? 'Category does not match event requirement' : (!isAlreadyInEvent && isQuotaComplete ? quotaCheck.reason : undefined)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={e => {
                                if (e.target.checked) {
                                  if (selectedStudentIds.length >= maxPart) {
                                    alert(`Maximum participant limit (${maxPart}) reached for this event.`);
                                    return;
                                  }
                                  setSelectedStudentIds([...selectedStudentIds, s.id]);
                                } else {
                                  setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] accent-amber-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-heading font-bold text-[var(--text-primary)] truncate">
                                  {s.full_name || s.name}
                                </span>
                                {isQuotaComplete && !isSelected && !isAlreadyInEvent && (
                                  <Badge variant="destructive" size="sm" className="text-[10px] py-0 px-1.5">
                                    {quotaCheck.reason}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex-wrap">
                                <span>Chest: {getCanonicalChestNo(s)}</span>
                                <span>•</span>
                                <span>Adm: {s.admission_no || s.cic_no || 'N/A'}</span>
                                <span>•</span>
                                <span className={`font-sans ${isSelected ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                                  On: {displayedOn}/{quotaCheck.quota?.on_max ?? '-'} | Off: {displayedOff}/{quotaCheck.quota?.off_max ?? '-'} | Tot: {displayedTot}/{quotaCheck.quota?.total_max ?? '-'}
                                  {deltaBadge}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <CategoryBadge category={sCat || 'Senior'} />
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="text-xs">
                  {selectedStudentIds.length < minPart && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      Need at least {minPart} participant(s).
                    </span>
                  )}
                  {selectedStudentIds.length >= minPart &&
                    selectedStudentIds.length <= maxPart && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Capacity verified!</span>
                    )}
                </div>
                <div className="flex gap-2">
                  {isAlreadyRegistered && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleUnregisterRegistration(selectedItemForReg)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove Registration
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="saffron"
                    disabled={selectedStudentIds.length < minPart || selectedStudentIds.length > maxPart}
                  >
                    {isAlreadyRegistered ? 'Update Registration' : 'Confirm Registration'}
                  </Button>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Modal: Appeal Filing */}
      <Modal
        isOpen={isAppealModalOpen}
        onClose={() => setIsAppealModalOpen(false)}
        title="File Performance or Scoring Appeal"
        description="Official appeals must include technical reasons and administrative fee deposit receipt"
      >
        <form onSubmit={handleSubmitAppeal} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Contested Event</label>
            <select
              value={appealForm.itemId}
              onChange={e => setAppealForm({ ...appealForm, itemId: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
              required
            >
              <option value="">-- Select Event --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.code}: {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Reason for Appeal</label>
            <textarea
              rows={3}
              placeholder="State the factual basis (audio issues, unfair judging, time penalty miscalculation)..."
              value={appealForm.reason}
              onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Fee Receipt Document URL</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={appealForm.feeReceiptUrl}
              onChange={e => setAppealForm({ ...appealForm, feeReceiptUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 font-mono transition-all shadow-2xs"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAppealModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron">Submit Appeal</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Replacement Request */}
      <Modal
        isOpen={isReplacementModalOpen}
        onClose={() => setIsReplacementModalOpen(false)}
        title="Emergency Participant Replacement"
        description="Replace a registered student in case of illness, injury, or severe clash"
      >
        <form onSubmit={handleSubmitReplacement} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Registered Event</label>
            <select
              value={replacementForm.registrationId}
              onChange={e => setReplacementForm({ ...replacementForm, registrationId: e.target.value, originalStudentId: '', replacementStudentId: '' })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
              required
            >
              <option value="">-- Select Registered Event --</option>
              {Array.from(new Map(registrations.map(r => [r.item_id, r])).values()).map(r => (
                <option key={r.id} value={r.id}>
                  {r.item?.name || r.item?.name_eng} ({r.item?.code || r.item?.item_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Student to Replace</label>
              <select
                value={replacementForm.originalStudentId}
                onChange={e => setReplacementForm({ ...replacementForm, originalStudentId: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 disabled:opacity-50 transition-all shadow-2xs"
                required
                disabled={!replacementForm.registrationId}
              >
                <option value="">
                  {!replacementForm.registrationId ? '-- Select Event First --' : '-- Registered Student --'}
                </option>
                {currentEventRegisteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.name} (CIC: {s.cic_no || s.admission_no || s.cic_number || s.chest_no || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">New Substitute Student</label>
              <select
                value={replacementForm.replacementStudentId}
                onChange={e => setReplacementForm({ ...replacementForm, replacementStudentId: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 disabled:opacity-50 transition-all shadow-2xs"
                required
                disabled={!replacementForm.registrationId}
              >
                <option value="">
                  {!replacementForm.registrationId ? '-- Select Event First --' : '-- Eligible Substitute --'}
                </option>
                {eligibleSubstituteStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.name} ({s.category || s.phase}) - CIC: {s.cic_no || s.admission_no || s.cic_number || s.chest_no || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Reason for Substitution</label>
            <input
              type="text"
              placeholder="e.g. Medical emergency / hospitalized"
              value={replacementForm.reason}
              onChange={e => setReplacementForm({ ...replacementForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all shadow-2xs"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReplacementModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
