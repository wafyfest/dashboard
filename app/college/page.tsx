'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ClipboardPen,
  Users,
  UserCheck,
  Calendar,
  Contact,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  UserPlus,
  HeartHandshake,
  Search,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Clock,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { useFest } from '@/lib/context/FestContext';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { Badge, CategoryBadge, ItemTypeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Item,
  Student,
  isCategoryMatching,
  isItemEligibleForCollege,
  normalizeCategoryKey,
  isSubmissionEvent,
  isScreeningEvent,
  requiresPreFestSubmission,
  getItemParticipantBounds,
  isSpecialEvent,
  getEffectiveStageMode
} from '@/lib/types/fest';
import { registrationContainsStudent, checkStudentQuota, getCanonicalChestNo, isSameStudent, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { StudentsListTable } from '@/components/college/StudentsListTable';
import { AdmitCardTable } from '@/components/college/AdmitCardTable';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import { CollegeDashboardTab } from '@/components/college/tabs/CollegeDashboardTab';
import { CollegeRegistrationTab } from '@/components/college/tabs/CollegeRegistrationTab';
import { CollegeParticipantsTab } from '@/components/college/tabs/CollegeParticipantsTab';
import { CollegeScheduleTab } from '@/components/college/tabs/CollegeScheduleTab';
import { CollegeAppealsTab } from '@/components/college/tabs/CollegeAppealsTab';
import { CollegeReplacementsTab } from '@/components/college/tabs/CollegeReplacementsTab';
import { CollegeVolunteersTab } from '@/components/college/tabs/CollegeVolunteersTab';
import { PreFestEventsCollegeTab } from '@/components/college/tabs/PreFestEventsCollegeTab';

export default function CollegePortalPage() {
  const { currentCollegeId, currentCollegeAfflNo, festSettings, refreshKey, triggerRefresh, isAuthenticated, isLoadingAuth, timeTick } = useFest();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registration', label: 'Registration', icon: ClipboardPen },
    { id: 'prefest_events_registration', label: 'Pre-Fest Registration', icon: Sparkles },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'volunteers', label: 'Volunteers', icon: HeartHandshake },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'admit_card', label: 'Admit Card', icon: Contact },
    { id: 'appeals', label: 'Appeals', icon: ShieldAlert },
    { id: 'replacements', label: 'Replacements', icon: UserPlus }
  ];

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedItemForReg, setSelectedItemForReg] = useState<Item | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  const [regModalSearch, setRegModalSearch] = useState<string>('');
  const [regModalPhaseFilter, setRegModalPhaseFilter] = useState<string>('All');
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealForm, setAppealForm] = useState({ itemId: '', reason: '', feeReceiptUrl: '' });

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    registrationId: '',
    originalStudentId: '',
    replacementStudentId: '',
    reason: ''
  });

  const college = useMemo(
    () => festService.getCollege(currentCollegeId),
    [currentCollegeId, refreshKey]
  );
  const allItems = useMemo(
    () => festService.getItems(),
    [refreshKey]
  );
  const registrations = useMemo(
    () => festService.getRegistrations(currentCollegeAfflNo || currentCollegeId),
    [currentCollegeAfflNo, currentCollegeId, refreshKey]
  );
  const registeredItemIds = useMemo(
    () => new Set(registrations.map(r => r.item_id)),
    [registrations]
  );
  const quotaLimits = useMemo(
    () => festService.getMaxParticipation(),
    [refreshKey]
  );

  const students = useMemo(
    () => festService.getStudents(currentCollegeId),
    [currentCollegeId, refreshKey]
  );

  // Safety net: if portal mounts before authenticated sync ran for this college (e.g. client navigation), sync immediately
  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;
    const affl = currentCollegeAfflNo || (college ? college.affl_no : 0);
    if (!affl) return;

    if (!festService.hasAuthenticatedSync(affl)) {
      festService.syncWithSupabase(affl, true).then(() => {
        triggerRefresh();
      });
    }
  }, [isAuthenticated, isLoadingAuth, currentCollegeAfflNo, college?.affl_no]);

  const collegeEligibleItems = useMemo(
    () =>
      allItems.filter(item =>
        isItemEligibleForCollege(item, students, college, registeredItemIds)
      ),
    [allItems, students, college, registeredItemIds]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  // Normal events for CollegeRegistrationTab (exclude submission & screening pre-fest events)
  const normalCollegeItems = useMemo(
    () => collegeEligibleItems.filter(item => !requiresPreFestSubmission(item)),
    [collegeEligibleItems]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalCollegeItems
            .map(item => item.phase || item.category)
            .filter(Boolean)
        )
      ),
    [normalCollegeItems]
  );

  const filteredItems = useMemo(
    () =>
      normalCollegeItems
        .filter(item => {
          if (selectedCategory === 'All Categories') return true;
          return normalizeCategoryKey(item.phase || item.category) === normalizeCategoryKey(selectedCategory);
        })
        .sort((a, b) => {
          const codeA = a.item_code || a.code || '';
          const codeB = b.item_code || b.code || '';
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        }),
    [normalCollegeItems, selectedCategory]
  );

  const registrationStatusByItem = useMemo(
    () =>
      activeTab === 'registration'
        ? festService.getRegistrationStatuses(
          currentCollegeAfflNo || currentCollegeId,
          filteredItems
        )
        : new Map<number, RegistrationStatus>(),
    [
      activeTab,
      currentCollegeAfflNo,
      currentCollegeId,
      filteredItems,
      festSettings,
      refreshKey,
      timeTick
    ]
  );

  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);
  const appeals = useMemo(() => festService.getAppeals(currentCollegeId), [currentCollegeId, refreshKey]);
  const replacements = useMemo(() => festService.getReplacements(currentCollegeId), [currentCollegeId, refreshKey]);
  const submissions = useMemo(
    () => festService.getSubmissionEntries(currentCollegeAfflNo || currentCollegeId),
    [currentCollegeAfflNo, currentCollegeId, refreshKey]
  );

  const pendingSubmissionsCount = useMemo(() => {
    const submittedItemIds = new Set(
      submissions.filter(s => Boolean(s.file_url)).map(s => Number(s.item_id))
    );
    const seen = new Set<number>();
    let missing = 0;
    for (const r of registrations) {
      const id = Number(r.item_id);
      if (seen.has(id)) continue;
      seen.add(id);
      if (requiresPreFestSubmission(r.item) && !submittedItemIds.has(id)) {
        missing++;
      }
    }
    return missing;
  }, [registrations, submissions]);

  // Dynamic filtering for Replacement Modal
  const currentEventRegisteredStudents = useMemo(() => {
    if (!replacementForm.registrationId) return [];
    const selReg = registrations.find(r => r.id === replacementForm.registrationId);
    if (!selReg) return [];
    const itemRegs = registrations.filter(r => r.item_id === selReg.item_id);
    return students.filter(s => itemRegs.some(r => registrationContainsStudent(r, s, students)));
  }, [replacementForm.registrationId, registrations, students]);

  const eligibleSubstituteStudents = useMemo(() => {
    if (!replacementForm.registrationId) return students;
    const selReg = registrations.find(r => r.id === replacementForm.registrationId);
    if (!selReg) return students;
    const selItem = selReg.item || allItems.find(i => i.item_id === selReg.item_id);

    const itemRegs = registrations.filter(r => r.item_id === selReg.item_id);
    const enrolledIds = new Set(
      students
        .filter(s => itemRegs.some(r => registrationContainsStudent(r, s, students)))
        .map(s => s.id)
    );

    return students.filter(s => {
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
  }, [replacementForm.registrationId, registrations, allItems, students]);

  // Category counts calculated in a single pass using normalized phase keys (memoized)
  const categoryCards = useMemo(() => {
    let foundationCount = 0;
    let thamheediyyaCount = 0;
    let aliyaCount = 0;
    let pgCount = 0;
    let generalCount = 0;
    let specialCount = 0;

    if (students.length > 0) {
      students.forEach(s => {
        const key = normalizeCategoryKey(s.category || s.phase);
        if (key === 'FOUNDATION' || key === 'SPECIAL_FOUNDATION') {
          foundationCount++;
        } else if (key === 'THAMHEEDIYYA') {
          thamheediyyaCount++;
        } else if (key === 'ALIYA') {
          aliyaCount++;
        } else if (key === 'PG') {
          pgCount++;
        } else if (key === 'SPECIAL') {
          specialCount++;
        } else {
          generalCount++;
        }
      });
    } else {
      foundationCount = (college?.st_foundation ?? 0) + (college?.st_pre_foundation ?? 0);
      thamheediyyaCount = college?.st_thamheediya ?? 0;
      aliyaCount = college?.st_aliya ?? 0;
      pgCount = college?.st_pg ?? 0;
    }

    const totalCount = students.length > 0
      ? students.length
      : (foundationCount + thamheediyyaCount + aliyaCount + pgCount + generalCount + specialCount);

    return [
      { label: 'Foundation', count: foundationCount },
      { label: 'Thamheediyya', count: thamheediyyaCount },
      { label: 'Aliya', count: aliyaCount },
      { label: 'PG', count: pgCount },
      { label: 'General', count: generalCount },
      { label: 'Special', count: specialCount },
      { label: 'Total Students', count: totalCount, highlight: true },
    ].filter(card => card.count > 0);
  }, [students, college]);

  // Phase options derived from enrolled students
  const availableStudentPhases = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      const p = s.category || s.phase;
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [students]);

  // Dynamic filter for participant selection inside Registration Modal
  const filteredModalStudents = useMemo(() => {
    return students
      .filter(s => {
        const isSelected = selectedStudentIds.has(s.id);

        // Phase filter: preserve selected participants regardless of filter
        if (regModalPhaseFilter !== 'All' && !isSelected) {
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
          const adm = String(s.admission_no || s.cic_no || s.cic_number || '').toLowerCase();
          if (!name.includes(q) && !chest.includes(q) && !adm.includes(q) && !isSelected) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aSel = selectedStudentIds.has(a.id) ? 1 : 0;
        const bSel = selectedStudentIds.has(b.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel; // Selected students floated to top!
        return (a.full_name || a.name || '').localeCompare(b.full_name || b.name || '');
      });
  }, [students, regModalSearch, regModalPhaseFilter, selectedStudentIds]);

  // Count of selected students currently hidden by active filter
  const hiddenSelectedCount = useMemo(() => {
    const visibleIds = new Set(filteredModalStudents.map(s => s.id));
    let count = 0;
    selectedStudentIds.forEach(id => {
      if (!visibleIds.has(id)) count++;
    });
    return count;
  }, [filteredModalStudents, selectedStudentIds]);

  // Precomputed metadata for the registration modal
  const regModalMeta = useMemo(() => {
    if (!selectedItemForReg) return null;
    const targetItemId = Number(selectedItemForReg.item_id || selectedItemForReg.id);
    const { min: minPart, max: maxPart, isOpen: isOpenPart } = getItemParticipantBounds(selectedItemForReg);
    const matchingEventRegs = registrations.filter(
      r => Number(r.item_id) === targetItemId || String(r.item_id) === String(selectedItemForReg.id)
    );
    const currentlyRegisteredStudents: Student[] = [];
    students.forEach(s => {
      if (matchingEventRegs.some(r => registrationContainsStudent(r, s, students))) {
        currentlyRegisteredStudents.push(s);
      }
    });
    const isAlreadyRegistered = matchingEventRegs.length > 0 || currentlyRegisteredStudents.length > 0;
    const modalLockCheck = festService.isRegistrationOpen(
      currentCollegeAfflNo || currentCollegeId,
      selectedItemForReg.item_id || selectedItemForReg.id
    );
    return {
      targetItemId,
      minPart,
      maxPart,
      isOpenPart,
      matchingEventRegs,
      currentlyRegisteredStudents,
      isAlreadyRegistered,
      modalLockCheck,
    };
  }, [selectedItemForReg, registrations, students, currentCollegeAfflNo, currentCollegeId]);

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

    // Direct cross-check against all students pool
    students.forEach(s => {
      if (matchingRegs.some(r => registrationContainsStudent(r, s, students))) {
        preselectedSet.add(s.id);
      }
    });

    setSelectedItemForReg(item);
    setSelectedStudentIds(preselectedSet);
    setRegModalSearch('');
    // Smart default: default modal phase filter to match the event category
    const itemCat = item.phase || item.category || 'All';
    const isGeneralOrSpecial = normalizeCategoryKey(itemCat) === 'GENERAL' || normalizeCategoryKey(itemCat) === 'SPECIAL';
    setRegModalPhaseFilter(isGeneralOrSpecial ? 'All' : itemCat);
    setIsRegisterModalOpen(true);
  };

  const handleConfirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReg || isSubmittingReg) return;
    setIsSubmittingReg(true);
    try {
      const res = await festService.registerCollegeForItem(
        currentCollegeAfflNo || currentCollegeId,
        selectedItemForReg.item_id || selectedItemForReg.id,
        Array.from(selectedStudentIds)
      );
      if (!res.success) {
        alert(`Registration Error: ${res.error}`);
        return;
      }
      setIsRegisterModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(`Unexpected Error: ${err.message || 'Failed to complete registration'}`);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleUnregisterRegistration = async (item: Item) => {
    const itemId = item.item_id || item.id;
    const itemName = item.name_eng || item.name;
    if (!confirm(`Are you sure you want to remove/unregister your entry for "${itemName}"?`)) {
      return;
    }
    setIsSubmittingReg(true);
    try {
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
    } catch (err: any) {
      alert(`Unexpected Error: ${err.message || 'Failed to remove registration'}`);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealForm.itemId || !appealForm.reason) {
      alert('Please select an event and describe your grievance.');
      return;
    }
    const res = await festService.submitAppeal(currentCollegeId, appealForm.itemId, appealForm.reason, appealForm.feeReceiptUrl);
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

    // Resolve the exact Registration row belonging to originalStudentId for group events
    const selectedEventReg = registrations.find(r => r.id === replacementForm.registrationId);
    const origStudent = students.find(s => s.id === replacementForm.originalStudentId);
    const exactStudentReg = selectedEventReg
      ? registrations.find(
        r =>
          Number(r.item_id) === Number(selectedEventReg.item_id) &&
          (r.student?.id === replacementForm.originalStudentId ||
            (origStudent ? isSameStudent(origStudent, r.chest_no) : false))
      ) || selectedEventReg
      : undefined;

    const res = await festService.submitReplacement(
      exactStudentReg?.id || replacementForm.registrationId,
      replacementForm.originalStudentId,
      replacementForm.replacementStudentId,
      replacementForm.reason
    );
    if (!res.success) {
      alert(`Substitution Request Error: ${res.error || 'Failed to submit substitution request'}`);
      return;
    }
    setIsReplacementModalOpen(false);
    setReplacementForm({ registrationId: '', originalStudentId: '', replacementStudentId: '', reason: '' });
    triggerRefresh();
    alert('Participant replacement request submitted for Admin verification.');
  };

  // Prevent SSR/client hydration mismatch
  if (!isMounted) {
    return (
      <DashboardLayout
        portalTitle="Fest Dashboard"
        roleBadge="College Portal"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={setActiveTab}
      >
        <div className="space-y-5 max-w-7xl mx-auto">
          <div className="pb-5 border-b border-[var(--border-subtle)] space-y-2.5">
            <div className="h-7 w-72 max-w-full rounded bg-[var(--bg-subtle)]" />
            <div className="h-4 w-96 max-w-full rounded bg-[var(--bg-subtle)]" />
          </div>
          <div className="h-12 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]" />
          <div className="h-28 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 h-72 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]" />
            <div className="lg:col-span-5 h-72 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['college', 'admin']}>
      <DashboardLayout
        portalTitle="Fest Dashboard"
        roleBadge="College Portal"
        navItems={navItems}
        activeItemId={activeTab}
        onSelectNavItem={setActiveTab}
      >
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <CollegeDashboardTab
              college={college}
              festSettings={festSettings}
              categoryCards={categoryCards}
              registrationsCount={registeredItemIds.size}
              totalEventsCount={collegeEligibleItems.length}
              allEventsCount={allItems.length}
              totalEntriesCount={registrations.length}
              pendingSubmissionsCount={pendingSubmissionsCount}
              students={students}
              registrations={registrations}
              eligibleItems={collegeEligibleItems}
              submissions={submissions}
              schedules={schedules}
              appeals={appeals}
              replacements={replacements}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* TAB 2: REGISTRATION */}
          {activeTab === 'registration' && (
            <CollegeRegistrationTab
              filteredItems={filteredItems}
              registrations={registrations}
              submissions={submissions}
              students={students}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categoryOptions={categoryOptions}
              currentCollegeId={currentCollegeId}
              currentCollegeAfflNo={currentCollegeAfflNo}
              onOpenRegistrationModal={handleOpenRegistrationModal}
              onUnregisterRegistration={handleUnregisterRegistration}
              onRefresh={triggerRefresh}
              onOpenParticipantsTab={() => setActiveTab('participants')}
              allItemsCount={normalCollegeItems.length}
              registrationStatusByItem={registrationStatusByItem}
            />
          )}

          {/* TAB 2.5: PRE-FEST EVENTS REGISTRATION (Screening & Digital Submission) */}
          {(activeTab === 'prefest_events_registration' || activeTab === 'special_events_registration') && (
            <PreFestEventsCollegeTab
              currentCollegeId={currentCollegeId}
              currentCollegeAfflNo={currentCollegeAfflNo || college?.affl_no}
              college={college}
              registrations={registrations}
              submissions={submissions}
              students={students}
              allItems={collegeEligibleItems}
              registrationStatusByItem={registrationStatusByItem}
              onOpenRegistrationModal={handleOpenRegistrationModal}
              onUnregisterRegistration={handleUnregisterRegistration}
              onRefresh={triggerRefresh}
            />
          )}

          {/* TAB 3: PARTICIPANTS */}
          {activeTab === 'participants' && (
            <CollegeParticipantsTab
              registrations={registrations}
              onEditRegistration={handleOpenRegistrationModal}
              onUnregisterRegistration={handleUnregisterRegistration}
              collegeName={college?.name}
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no}
            />
          )}

          {/* TAB 4: STUDENTS DIRECTORY */}
          {activeTab === 'students' && (
            <StudentsListTable
              college={college}
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
            />
          )}

          {/* TAB: VOLUNTEER REGISTRATION (ALIYA PHASE ONLY) */}
          {activeTab === 'volunteers' && (
            <CollegeVolunteersTab
              college={college}
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
              students={students}
              onRefresh={triggerRefresh}
            />
          )}

          {/* TAB 5: SCHEDULE */}
          {activeTab === 'schedule' && (
            <CollegeScheduleTab
              schedules={schedules}
              registrations={registrations}
            />
          )}

          {/* TAB 6: ADMIT CARD */}
          {activeTab === 'admit_card' && (
            <AdmitCardTable
              students={students}
              college={college}
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 0}
              registrations={registrations}
              festSettings={festSettings}
            />
          )}

          {/* TAB 7: APPEALS */}
          {activeTab === 'appeals' && (
            <CollegeAppealsTab
              appeals={appeals}
              students={students}
              college={college}
              allItems={allItems}
              registrations={registrations}
              onRefresh={triggerRefresh}
              onOpenAppealModal={() => setIsAppealModalOpen(true)}
            />
          )}

          {/* TAB 8: REPLACEMENTS */}
          {activeTab === 'replacements' && (
            <CollegeReplacementsTab
              replacements={replacements}
              students={students}
              college={college}
              allItems={allItems}
              registrations={registrations}
              onRefresh={triggerRefresh}
              onOpenReplacementModal={() => setIsReplacementModalOpen(true)}
            />
          )}
        </div>

        {/* Modal: Event Registration with Capacity Verification */}
        <Modal
          isOpen={isRegisterModalOpen && Boolean(selectedItemForReg && regModalMeta)}
          onClose={() => setIsRegisterModalOpen(false)}
          onSubmit={handleConfirmRegistration}
          title={
            regModalMeta?.isAlreadyRegistered
              ? `Edit Registration: ${selectedItemForReg?.name_eng || selectedItemForReg?.name}`
              : `Register: ${selectedItemForReg?.name_eng || selectedItemForReg?.name}`
          }
          description={
            selectedItemForReg?.no_of_participants == null
              ? `Event Code: ${selectedItemForReg?.item_code || selectedItemForReg?.code} | Open Entry (Min 1 participant)`
              : `Event Code: ${selectedItemForReg?.item_code || selectedItemForReg?.code} | Required: ${selectedItemForReg.no_of_participants} participant(s)`
          }
          maxWidth="2xl"
          footer={
            regModalMeta && (
              <div className="space-y-2.5">
                {/* Status & Secondary Destructive Action */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {selectedStudentIds.size < regModalMeta.minPart ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-sans font-medium text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span>Need at least {regModalMeta.minPart} participant(s) selected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>Capacity verified ({selectedStudentIds.size} / {regModalMeta.isOpenPart ? 'Open' : regModalMeta.maxPart} selected)</span>
                      </span>
                    )}
                  </div>

                  {regModalMeta.isAlreadyRegistered && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={isSubmittingReg}
                      className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-heading text-xs shrink-0"
                      onClick={() => selectedItemForReg && handleUnregisterRegistration(selectedItemForReg)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      Remove Registration
                    </Button>
                  )}
                </div>

                {/* Primary Dialog Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-[var(--border-subtle)]/40">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-heading"
                    disabled={isSubmittingReg}
                    onClick={() => setIsRegisterModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="saffron"
                    className="font-heading font-bold min-w-[140px]"
                    disabled={
                      isSubmittingReg ||
                      selectedStudentIds.size < regModalMeta.minPart ||
                      selectedStudentIds.size > regModalMeta.maxPart ||
                      !regModalMeta.modalLockCheck.canRegister
                    }
                  >
                    {isSubmittingReg
                      ? 'Saving Registration...'
                      : regModalMeta.isAlreadyRegistered
                        ? 'Update Registration'
                        : 'Save Registration'}
                  </Button>
                </div>
              </div>
            )
          }
        >
          {selectedItemForReg && regModalMeta && (() => {
            const { minPart, maxPart, isOpenPart, currentlyRegisteredStudents, isAlreadyRegistered, modalLockCheck } = regModalMeta;

            return (
              <div className="space-y-4">
                <div className="bg-[var(--bg-subtle)]/75 p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-heading font-semibold text-[var(--text-secondary)]">Category: </span>
                    <CategoryBadge category={selectedItemForReg.phase || selectedItemForReg.category || 'General'} />
                  </div>
                  <div>
                    <span className="font-heading font-semibold text-[var(--text-secondary)]">Type / Mode: </span>
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
                        const isChecked = selectedStudentIds.has(curStudent.id);
                        const chest = getCanonicalChestNo(curStudent);
                        const cic = curStudent.admission_no || curStudent.cic_no || curStudent.cic_number || 'N/A';
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

                {!modalLockCheck.canRegister && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 font-sans font-medium">
                    <Lock className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{modalLockCheck.reason || 'Registration is locked for this event.'}</span>
                  </div>
                )}

                {modalLockCheck.canRegister && (modalLockCheck.isFinePeriod || modalLockCheck.isSuperFinePeriod) && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-sans ${modalLockCheck.isSuperFinePeriod
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                      }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {modalLockCheck.isSuperFinePeriod
                        ? `Super Fine Period Active: Saving this registration incurs a ₹${(modalLockCheck.fineAmount || 1000).toLocaleString('en-IN')} Super Fine.`
                        : `Fine Period Active: Saving this registration incurs a ₹${(modalLockCheck.fineAmount || 500).toLocaleString('en-IN')} Fine.`}
                    </span>
                  </div>
                )}

                {/* Participant Search and Phase Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search student name, chest no, CIC no..."
                      value={regModalSearch}
                      onChange={e => setRegModalSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      className="w-full pl-9 pr-8 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-sans font-medium"
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
                      className="w-full appearance-none pl-8 pr-7 py-2 text-xs font-heading font-semibold border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                    >
                      <option value="All">All Categories</option>
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
                  <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center justify-between font-sans">
                    <span>{hiddenSelectedCount} selected student(s) currently hidden by active filter.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRegModalSearch('');
                        setRegModalPhaseFilter('All');
                      }}
                      className="underline font-semibold hover:text-[var(--f-saffron-text)] ml-2"
                    >
                      Clear filter
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Select Participants ({selectedStudentIds.size} / {isOpenPart ? 'Open' : maxPart} selected)
                    </label>
                    <span className="text-[11px] font-sans text-[var(--text-muted)] font-medium">
                      Showing {filteredModalStudents.length} of {students.length}
                    </span>
                  </div>

                  {/* Active Selected Roster Pills */}
                  {selectedStudentIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[var(--bg-subtle)]/70 rounded-xl border border-[var(--border-subtle)]">
                      <span className="text-[10.5px] font-heading font-semibold text-[var(--text-muted)] px-1">
                        Active Roster ({selectedStudentIds.size}):
                      </span>
                      {Array.from(selectedStudentIds).map(id => {
                        const stu = students.find(s => s.id === id);
                        if (!stu) return null;
                        const chest = getCanonicalChestNo(stu);
                        const idStr = chest !== '—' ? `#${chest}` : `CIC:${stu.admission_no || stu.cic_no || 'N/A'}`;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--f-saffron)]/40 text-[11px] font-medium text-[var(--text-primary)] shadow-2xs font-sans"
                          >
                            <span className="truncate max-w-[140px]">{stu.full_name || stu.name}</span>
                            <span className="text-[9.5px] font-mono text-[var(--text-muted)]">({idStr})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(id);
                                  return next;
                                });
                              }}
                              className="text-[var(--text-muted)] hover:text-rose-500 rounded-full p-0.5 transition-colors"
                              title="Remove participant"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="max-h-48 sm:max-h-56 overflow-y-auto border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {filteredModalStudents.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                        <p className="font-heading font-semibold text-[var(--text-secondary)]">No participants match your criteria</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">Try clearing the search query or category filter</p>
                        {(regModalSearch || regModalPhaseFilter !== 'All') && (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="mt-3 text-xs font-heading"
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
                        const isSelected = selectedStudentIds.has(s.id);
                        const sCat = s.category || s.phase;
                        const itemCat = selectedItemForReg.phase || selectedItemForReg.category;
                        const isCategoryMatch = isCategoryMatching(sCat, itemCat);

                        const quotaCheck = checkStudentQuota(s, selectedItemForReg, registrations, allItems, quotaLimits, students);
                        const isAlreadyInEvent = quotaCheck.isAlreadyRegisteredInItem;
                        const isQuotaComplete = !quotaCheck.allowed;
                        const isFaded = !isCategoryMatch || (!isSelected && !isAlreadyInEvent && isQuotaComplete);
                        const isDisabled = (!isCategoryMatch && !isSelected) || (!isSelected && !isAlreadyInEvent && isQuotaComplete);

                        const isItemSpecial = isSpecialEvent(selectedItemForReg);
                        const isItemGroup = selectedItemForReg.point_type === 'group' || selectedItemForReg.item_type === 'Group';
                        const itemStageMode = getEffectiveStageMode(selectedItemForReg);
                        const isItemOnstage = itemStageMode === 'onstage';
                        const isItemOffstage = !isItemOnstage;

                        // Base counts across festival (consistent across all event modals)
                        const baseOn = quotaCheck.totalStats.onstageCount;
                        const baseOff = quotaCheck.totalStats.offstageCount;
                        const baseGrp = quotaCheck.totalStats.groupCount;
                        const baseTot = quotaCheck.totalStats.individualCount;

                        // Dynamic numbers reflecting current selection state in this modal
                        let displayedOn = baseOn;
                        let displayedOff = baseOff;
                        let displayedGrp = baseGrp;
                        let displayedTot = baseTot;
                        let deltaBadge: React.ReactNode = null;

                        if (isAlreadyInEvent) {
                          if (isSelected) {
                            // Kept in roster: same as current saved total
                            deltaBadge = (
                              <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                                Enrolled
                              </span>
                            );
                          } else {
                            // Unchecked: will be removed on submit!
                            if (!isItemSpecial) {
                              if (isItemGroup) {
                                displayedGrp = Math.max(0, baseGrp - 1);
                              } else {
                                if (isItemOnstage) displayedOn = Math.max(0, baseOn - 1);
                                if (isItemOffstage) displayedOff = Math.max(0, baseOff - 1);
                                displayedTot = Math.max(0, baseTot - 1);
                              }
                            }
                            deltaBadge = (
                              <span className="ml-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/30">
                                -1 will remove
                              </span>
                            );
                          }
                        } else {
                          if (isSelected) {
                            // Newly checked to add!
                            if (!isItemSpecial) {
                              if (isItemGroup) {
                                displayedGrp = baseGrp + 1;
                              } else {
                                if (isItemOnstage) displayedOn = baseOn + 1;
                                if (isItemOffstage) displayedOff = baseOff + 1;
                                displayedTot = baseTot + 1;
                              }
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
                              : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                              }`}
                            title={!isCategoryMatch ? 'Category does not match event requirement' : (!isAlreadyInEvent && isQuotaComplete ? quotaCheck.reason : undefined)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isDisabled}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    if (selectedStudentIds.size >= maxPart) {
                                      alert(`Maximum participant limit (${maxPart}) reached for this event.`);
                                      return;
                                    }
                                    setSelectedStudentIds(prev => new Set(prev).add(s.id));
                                  } else {
                                    setSelectedStudentIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(s.id);
                                      return next;
                                    });
                                  }
                                }}
                                className="rounded border-[var(--border-medium)] text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] accent-amber-500 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-heading font-bold text-[var(--text-primary)] truncate">
                                    {s.full_name || s.name}
                                  </span>
                                  {isQuotaComplete && !isSelected && !isAlreadyInEvent && (
                                    <Badge variant="destructive" size="sm" className="text-[10px] py-0 px-1.5 font-sans">
                                      {quotaCheck.reason}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex-wrap">
                                  <span>Chest: {getCanonicalChestNo(s)}</span>
                                  <span>•</span>
                                  <span>CIC: {s.admission_no || s.cic_no || s.cic_number || 'N/A'}</span>
                                  <span>•</span>
                                  <span className={`font-sans ${isSelected ? 'text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                                    On: {displayedOn}/{quotaCheck.quota?.on_max ?? '-'} | Off: {displayedOff}/{quotaCheck.quota?.off_max ?? '-'} | Grp: {displayedGrp}/{quotaCheck.quota?.group_max ?? '-'} | Tot: {displayedTot}/{quotaCheck.quota?.total_max ?? '-'}
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

              </div>
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
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
                required
              >
                <option value="">-- Select Registered Event --</option>
                {allItems
                  .filter(item =>
                    registrations.some(
                      r =>
                        Number(r.item_id) === Number(item.item_id) ||
                        String(r.item_id) === String(item.id) ||
                        String(r.item?.id) === String(item.id)
                    )
                  )
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code || item.item_code}: {item.name || item.name_eng}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Reason for Appeal</label>
              <textarea
                rows={3}
                placeholder="State the factual basis..."
                value={appealForm.reason}
                onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
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
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-mono"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="outline" className="font-heading" onClick={() => setIsAppealModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="saffron" className="font-heading font-bold">Submit Appeal</Button>
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
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">Student to Replace</label>
                <select
                  value={replacementForm.originalStudentId}
                  onChange={e => setReplacementForm({ ...replacementForm, originalStudentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={!replacementForm.registrationId}
                >
                  <option value="">
                    {!replacementForm.registrationId ? '-- Select Registered Event First --' : '-- Registered Student to Replace --'}
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
                  className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={!replacementForm.registrationId}
                >
                  <option value="">
                    {!replacementForm.registrationId ? '-- Select Registered Event First --' : '-- Eligible Substitute Student --'}
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
                placeholder="e.g. Medical emergency"
                value={replacementForm.reason}
                onChange={e => setReplacementForm({ ...replacementForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="outline" className="font-heading" onClick={() => setIsReplacementModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="saffron" className="font-heading font-bold">Submit Request</Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
