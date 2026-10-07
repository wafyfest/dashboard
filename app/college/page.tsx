'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardPen,
  Users,
  UserCheck,
  Calendar,
  Contact,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Item, Student, StudentCategory, isCategoryMatching, isItemEligibleForCollege } from '@/lib/types/fest';
import { StudentsListTable } from '@/components/college/StudentsListTable';
import { AdmitCardTable } from '@/components/college/AdmitCardTable';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import { CollegeDashboardTab } from '@/components/college/tabs/CollegeDashboardTab';
import { CollegeRegistrationTab } from '@/components/college/tabs/CollegeRegistrationTab';
import { CollegeParticipantsTab } from '@/components/college/tabs/CollegeParticipantsTab';
import { CollegeScheduleTab } from '@/components/college/tabs/CollegeScheduleTab';
import { CollegeAppealsTab } from '@/components/college/tabs/CollegeAppealsTab';

export default function CollegePortalPage() {
  const { currentCollegeId, currentCollegeAfflNo, festSettings, triggerRefresh } = useFest();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registration', label: 'Registration', icon: ClipboardPen },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'admit_card', label: 'Admit Card', icon: Contact },
    { id: 'appeals', label: 'Appeals', icon: ShieldAlert }
  ];

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    full_name: '',
    admission_no: '',
    category: 'Foundation',
    phone: '',
    photo_url: ''
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedItemForReg, setSelectedItemForReg] = useState<Item | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealForm, setAppealForm] = useState({ itemId: '', reason: '', feeReceiptUrl: '' });

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    registrationId: '',
    originalStudentId: '',
    replacementStudentId: '',
    reason: ''
  });

  const college = festService.getCollege(currentCollegeId);
  const allItems = festService.getItems();
  const registrations = festService.getRegistrations(currentCollegeId);
  const registeredItemIds = new Set(registrations.map(r => r.item_id));

  const [students, setStudents] = useState<Student[]>(() =>
    festService.getStudents(currentCollegeId)
  );

  useEffect(() => {
    const list = festService.getStudents(currentCollegeId);
    setStudents(list);

    const affl = currentCollegeAfflNo || (college ? college.affl_no : 11);
    if (affl) {
      festService.fetchStudentsForCollege(affl).then(fresh => {
        if (fresh && fresh.length > 0) {
          setStudents(fresh);
        }
      });
    }
  }, [currentCollegeId, currentCollegeAfflNo, college?.affl_no]);

  const collegeEligibleItems = allItems.filter(item =>
    isItemEligibleForCollege(item, students, college, registeredItemIds)
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const categoryOptions = Array.from(
    new Set(collegeEligibleItems.map(item => item.phase || item.category).filter(Boolean))
  );

  const filteredItems = collegeEligibleItems.filter(item => {
    if (selectedCategory === 'All Categories') return true;
    return isCategoryMatching(item.phase || item.category, selectedCategory);
  });

  const schedules = festService.getSchedules();
  const appeals = festService.getAppeals(currentCollegeId);

  // Category counts
  const getPhaseCount = (phaseKey: string, collegeFallbackField?: number) => {
    const key = phaseKey.toLowerCase();
    const count = students.filter(s => {
      const p = (s.category || s.phase || '').toLowerCase();
      if (key === 'foundation') {
        return p === 'foundation' || p === 'fd' || p.includes('sub_junior') || p.includes('sub junior') || p.includes('sub-junior') || p.includes('pre foundation');
      }
      if (key === 'thamheediyya') {
        return p.includes('thamheed') || p === 'th' || (p.includes('junior') && !p.includes('sub'));
      }
      if (key === 'aliya') {
        return p === 'aliya' || p === 'al' || p.includes('senior');
      }
      if (key === 'pg') {
        return p === 'pg';
      }
      if (key === 'general') {
        return p === 'general';
      }
      return p === key;
    }).length;

    if (students.length > 0) {
      return count;
    }
    return collegeFallbackField ?? 0;
  };

  const foundationCount = getPhaseCount('foundation', college?.st_foundation);
  const thamheediyyaCount = getPhaseCount('thamheediyya', college?.st_thamheediya);
  const aliyaCount = getPhaseCount('aliya', college?.st_aliya);
  const pgCount = getPhaseCount('pg', 0);
  const generalCount = getPhaseCount('general', 0);

  const totalCount = students.length > 0
    ? students.length
    : (foundationCount + thamheediyyaCount + aliyaCount + pgCount + generalCount);

  const categoryCards = [
    { label: 'Foundation', count: foundationCount },
    { label: 'Thamheediyya', count: thamheediyyaCount },
    { label: 'Aliya', count: aliyaCount },
    { label: 'PG', count: pgCount },
    { label: 'General', count: generalCount },
    { label: 'Total Students', count: totalCount, highlight: true },
  ].filter(card => card.count > 0);

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    festService.saveStudent({ ...newStudent, college_id: currentCollegeId });
    setIsStudentModalOpen(false);
    setNewStudent({ full_name: '', admission_no: '', category: 'Senior', phone: '', photo_url: '' });
    triggerRefresh();
  };

  const handleOpenRegistrationModal = (item: Item) => {
    const existingReg = registrations.find(r => r.item_id === item.item_id || String(r.item_id) === item.id);
    const preselected = existingReg?.participants?.map(p => p.id) || [];
    setSelectedItemForReg(item);
    setSelectedStudentIds(preselected);
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

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealForm.itemId || !appealForm.reason) {
      alert('Please select an event and describe your grievance.');
      return;
    }
    festService.submitAppeal(currentCollegeId, appealForm.itemId, appealForm.reason, appealForm.feeReceiptUrl);
    setIsAppealModalOpen(false);
    setAppealForm({ itemId: '', reason: '', feeReceiptUrl: '' });
    triggerRefresh();
    alert('Appeal submitted to the Fest Executive Committee.');
  };

  const handleSubmitReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacementForm.registrationId || !replacementForm.originalStudentId || !replacementForm.replacementStudentId) {
      alert('Please complete all substitution fields.');
      return;
    }
    festService.submitReplacement(
      replacementForm.registrationId,
      replacementForm.originalStudentId,
      replacementForm.replacementStudentId,
      replacementForm.reason
    );
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
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="h-40 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
            <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
            <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
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
              registrationsCount={registrations.length}
              totalEventsCount={allItems.length}
            />
          )}

          {/* TAB 2: REGISTRATION */}
          {activeTab === 'registration' && (
            <CollegeRegistrationTab
              filteredItems={filteredItems}
              registrations={registrations}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categoryOptions={categoryOptions}
              currentCollegeId={currentCollegeId}
              currentCollegeAfflNo={currentCollegeAfflNo}
              onOpenRegistrationModal={handleOpenRegistrationModal}
              onUnregisterRegistration={handleUnregisterRegistration}
              allItemsCount={allItems.length}
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
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 11}
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
              collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 11}
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
              onOpenReplacementModal={() => setIsReplacementModalOpen(true)}
            />
          )}
        </div>

        {/* Modal: Enroll Student */}
        <Modal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          title="Enroll Student in Directory"
          description="Add a student profile to allocate chest numbers and register for arts fest competitions"
        >
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Student Name</label>
              <input
                type="text"
                value={newStudent.full_name || ''}
                onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">College Admission / Roll No</label>
                <input
                  type="text"
                  placeholder="e.g. ST-2023-551"
                  value={newStudent.admission_no || ''}
                  onChange={e => setNewStudent({ ...newStudent, admission_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-mono dark:bg-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={newStudent.category || 'Foundation'}
                  onChange={e => setNewStudent({ ...newStudent, category: e.target.value as StudentCategory })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="tel"
                placeholder="+91 98..."
                value={newStudent.phone || ''}
                onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStudentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Student</Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Event Registration with Capacity Verification */}
        <Modal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          title={`Register: ${selectedItemForReg?.name_eng || selectedItemForReg?.name}`}
          description={`Item Code: ${selectedItemForReg?.item_code || selectedItemForReg?.code} | Required: ${selectedItemForReg?.no_of_participants || 1} participant(s)`}
          maxWidth="xl"
        >
          {selectedItemForReg && (() => {
            const minPart = selectedItemForReg.min_participants ?? (selectedItemForReg.point_type === 'individual' ? 1 : (selectedItemForReg.no_of_participants || 1));
            const maxPart = selectedItemForReg.max_participants ?? (selectedItemForReg.no_of_participants || 1);
            const isAlreadyRegistered = registrations.some(
              r => Number(r.item_id) === Number(selectedItemForReg.item_id || selectedItemForReg.id)
            );

            return (
              <form onSubmit={handleConfirmRegistration} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Category Requirement: </span>
                    <CategoryBadge category={selectedItemForReg.phase || selectedItemForReg.category || 'General'} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Type: </span>
                    <Badge variant="navy">{selectedItemForReg.point_type === 'group' ? 'Group' : 'Single'}</Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Participants ({selectedStudentIds.length} / {maxPart} selected)
                  </label>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map(s => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const sCat = s.category || s.phase;
                      const itemCat = selectedItemForReg.phase || selectedItemForReg.category;
                      const isCategoryMatch = isCategoryMatching(sCat, itemCat);

                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            !isCategoryMatch ? 'opacity-40 bg-slate-50 dark:bg-slate-900/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isCategoryMatch && !isSelected}
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
                              className="rounded border-slate-300 dark:border-slate-700 text-[#132238] focus:ring-[#132238]"
                            />
                            <div>
                              <div className="font-semibold text-[#132238] dark:text-slate-100">{s.full_name || s.name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Chest: {s.chest_no} | Adm: {s.admission_no}
                              </span>
                            </div>
                          </div>
                          <CategoryBadge category={sCat || 'Senior'} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="text-xs">
                    {selectedStudentIds.length < minPart && (
                      <span className="text-rose-600 font-medium">
                        Need at least {minPart} participant(s).
                      </span>
                    )}
                    {selectedStudentIds.length >= minPart &&
                      selectedStudentIds.length <= maxPart && (
                        <span className="text-emerald-600 font-medium">Capacity verified!</span>
                      )}
                  </div>
                  <div className="flex gap-2">
                    {isAlreadyRegistered && (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
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
                      disabled={
                        selectedStudentIds.length < minPart ||
                        selectedStudentIds.length > maxPart
                      }
                    >
                      Save Registration
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contested Event</label>
              <select
                value={appealForm.itemId}
                onChange={e => setAppealForm({ ...appealForm, itemId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                required
              >
                <option value="">-- Select Event --</option>
                {allItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code || item.item_code}: {item.name || item.name_eng}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Appeal</label>
              <textarea
                rows={3}
                placeholder="State the factual basis..."
                value={appealForm.reason}
                onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fee Receipt Document URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={appealForm.feeReceiptUrl}
                onChange={e => setAppealForm({ ...appealForm, feeReceiptUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-mono dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAppealModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Appeal</Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Replacement Request */}
        <Modal
          isOpen={isReplacementModalOpen}
          onClose={() => setIsReplacementModalOpen(false)}
          title="Emergency Participant Substitution"
          description="Replace a registered student in case of illness, injury, or severe clash"
        >
          <form onSubmit={handleSubmitReplacement} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Event</label>
              <select
                value={replacementForm.registrationId}
                onChange={e => setReplacementForm({ ...replacementForm, registrationId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student to Replace</label>
                <select
                  value={replacementForm.originalStudentId}
                  onChange={e => setReplacementForm({ ...replacementForm, originalStudentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">-- Current Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.name} ({s.chest_no})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Substitute Student</label>
                <select
                  value={replacementForm.replacementStudentId}
                  onChange={e => setReplacementForm({ ...replacementForm, replacementStudentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">-- Substitute Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.name} ({s.chest_no})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Substitution</label>
              <input
                type="text"
                placeholder="e.g. Medical emergency"
                value={replacementForm.reason}
                onChange={e => setReplacementForm({ ...replacementForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsReplacementModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
