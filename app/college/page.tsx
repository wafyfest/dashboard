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
  Zap,
  Mail,
  MapPin,
  User,
  Phone,
  MessageSquare,
  BookOpen,
  Printer,
  Plus,
  Lock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  QrCode,
  ChevronDown,
  SquarePen
} from 'lucide-react';
import { DashboardLayout, NavItem } from '@/components/layout/DashboardLayout';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, AppealStatusBadge, StageStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Item, Student, StudentCategory } from '@/lib/types/fest';
import { StudentsListTable } from '@/components/college/StudentsListTable';
import { AdmitCardTable } from '@/components/college/AdmitCardTable';

export default function CollegePortalPage() {
  const { currentCollegeId, currentCollegeAfflNo, festSettings, triggerRefresh } = useFest();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Navigation Items matching the reference screenshot
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const categoryOptions = Array.from(
    new Set(allItems.map(item => item.phase || item.category).filter(Boolean))
  );
  const filteredItems = allItems.filter(item => {
    if (selectedCategory === 'All Categories') return true;
    return (item.phase || item.category) === selectedCategory;
  });

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
  }, [currentCollegeId, currentCollegeAfflNo, college]);

  const registrations = festService.getRegistrations(currentCollegeId);
  const schedules = festService.getSchedules();
  const appeals = festService.getAppeals(currentCollegeId);
  const replacements = festService.getReplacements(currentCollegeId);

  // Registered item IDs
  const registeredItemIds = new Set(registrations.map(r => r.item_id));

  // Category counts matching current fest categories
  const foundationCount = students.filter(s => (s.category || s.phase)?.toLowerCase() === 'foundation').length || college?.st_foundation || 56;
  const thamheediyyaCount = students.filter(s => (s.category || s.phase)?.toLowerCase().includes('thamheed')).length || college?.st_thamheediya || 61;
  const aliyaCount = students.filter(s => (s.category || s.phase)?.toLowerCase() === 'aliya').length || college?.st_aliya || 59;
  const pgCount = students.filter(s => (s.category || s.phase)?.toLowerCase() === 'pg').length || 24;
  const generalCount = students.filter(s => (s.category || s.phase)?.toLowerCase() === 'general').length || 18;

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

  const handleConfirmRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReg) return;
    const res = festService.registerCollegeForItem(
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

  return (
    <DashboardLayout
      portalTitle="Fest Dashboard"
      roleBadge="College Portal"
      navItems={navItems}
      activeItemId={activeTab}
      onSelectNavItem={setActiveTab}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ==================================================================== */}
        {/* 1. DASHBOARD TAB (PIXEL-PERFECT MATCH TO REFERENCE IMAGE) */}
        {/* ==================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Key Dates Alert Bar */}
            <div className="bg-[#d9e2ec]/60 border border-slate-300/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-[#132238] shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span className="font-medium">
                <strong className="font-bold">Key Dates:</strong> Registration closes 27th Sept 10PM • Events Begin: 1st Oct
              </span>
            </div>

            {/* Student Category Stat Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
              {/* Foundation Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Foundation</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-[#132238] tracking-tight">
                  {foundationCount}
                </div>
              </div>

              {/* Thamheediyya Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Thamheediyya</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-[#132238] tracking-tight">
                  {thamheediyyaCount}
                </div>
              </div>

              {/* Aliya Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Aliya</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-[#132238] tracking-tight">
                  {aliyaCount}
                </div>
              </div>

              {/* PG Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">PG</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-[#132238] tracking-tight">
                  {pgCount}
                </div>
              </div>

              {/* General Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-4 flex flex-col justify-between h-26 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">General</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-[#132238] tracking-tight">
                  {generalCount}
                </div>
              </div>
            </div>

            {/* Institution Banner Card */}
            <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-base sm:text-lg font-black text-[#132238] uppercase tracking-tight">
                {college?.name || 'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE'}
              </h2>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  {college?.affiliation_no || '11'}
                </div>
                <span className="text-xs font-semibold text-slate-700">Affiliation Number</span>
              </div>

              <div className="space-y-2 pt-1 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium">{college?.email || 'masapmsawafy@gmail.com'}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="font-medium">
                    {college?.address || 'Kattilangadi, Athavanad, Athikkattukunnu Rd, Kurumbathur, Kerala 676310'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Contact Staff Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {/* Co-ordinator (Staff) */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                <h3 className="text-xs font-bold text-[#132238]">Co-ordinator (Staff)</h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold">{college?.coordinator_name || 'Usthad Shafi Wafy'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.coordinator_phone || '9645845185'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.coordinator_phone || '9645845185'}</span>
                  </div>
                </div>
              </div>

              {/* Manager */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                <h3 className="text-xs font-bold text-[#132238]">Manager</h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold">{college?.manager_name || 'Akbar shuhaib'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.manager_phone || '9539629410'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.manager_phone || '9539629410'}</span>
                  </div>
                </div>
              </div>

              {/* Asst. Manager */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                <h3 className="text-xs font-bold text-[#132238]">Asst. Manager</h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold">{college?.asst_manager_name || 'Muhammed Minhaj'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.asst_manager_phone || '7306729618'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{college?.asst_manager_phone || '7306729618'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Fest_ Manual / Fest Rulebook Button */}
            <div>
              <a
                href={festSettings.rulebook_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300/90 bg-white/80 hover:bg-white text-xs font-bold text-[#132238] shadow-2xs transition-colors"
              >
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Fest Manual</span>
              </a>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. REGISTRATION TAB */}
        {/* ==================================================================== */}
        {activeTab === 'registration' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Event Registration</CardTitle>
                <CardDescription>
                  Enroll student participants in Single and Group events according to quotas
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 hidden sm:block">
                  Enrolled: <strong className="text-emerald-700">{registrations.length}</strong> / {allItems.length} Events
                </div>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Registered</TableHead>
                    <TableHead className="text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const reg = registrations.find(r => r.item_id === item.item_id || String(r.item_id) === item.id);
                    const lockCheck = festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, item.item_id || item.id);
                    const itemCategory = item.phase || item.category;
                    const itemType = item.point_type
                      ? (item.point_type.toLowerCase() === 'group' ? 'Group' : 'Individual')
                      : (item.item_type === 'Group' ? 'Group' : 'Individual');
                    const maxCount = item.no_of_participants || item.max_participants || 1;
                    const registeredCount = reg ? (reg.participants?.length || 1) : 0;
                    const isRegistered = !!reg;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-center font-medium text-slate-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {item.name_mal || item.name}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[#132238]">{item.name_eng || item.name}</div>
                          {reg && reg.participants && reg.participants.length > 0 && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Roster: {reg.participants.map(p => `${p.full_name} (${p.chest_no})`).join(', ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={itemCategory} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={itemType === 'Group' ? 'purple' : 'secondary'}>
                            {itemType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-700">
                          {item.item_code || item.code}
                        </TableCell>
                        <TableCell className="text-center">
                          {isRegistered ? (
                            <span className="font-mono font-bold text-sm text-emerald-600">
                              {registeredCount}/{maxCount}
                            </span>
                          ) : (
                            <span
                              className={`font-mono font-bold text-sm ${!lockCheck.canRegister ? 'text-rose-500' : 'text-blue-600'}`}
                              title={!lockCheck.canRegister ? lockCheck.reason : undefined}
                            >
                              0/{maxCount}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            {isRegistered ? (
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
                                title="Edit Roster"
                                onClick={() => handleOpenRegistrationModal(item)}
                              >
                                <SquarePen className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant="primary"
                                disabled={!lockCheck.canRegister}
                                className="h-8 w-8 p-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                title={lockCheck.canRegister ? 'Register Entry' : lockCheck.reason}
                                onClick={() => handleOpenRegistrationModal(item)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                        No events found matching the selected category.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ==================================================================== */}
        {/* 3. PARTICIPANTS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'participants' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Registered Competition Participants</CardTitle>
                <CardDescription>Roster of students allocated to specific arts fest competitions</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Blind Code</TableHead>
                    <TableHead>Assigned Students</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        No competition participants registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-bold text-[#132238]">{r.item?.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{r.item?.code}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.item?.item_type === 'Single' ? 'default' : 'purple'}>
                            {r.item?.item_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.code_letter ? (
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs">
                              {r.code_letter}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {r.participants?.map(p => (
                              <div key={p.id} className="text-xs font-medium text-slate-800 flex items-center gap-2">
                                <span className="font-mono font-bold px-1.5 py-0.2 bg-slate-100 rounded text-[10px]">
                                  {p.chest_no}
                                </span>
                                  <span>{p.full_name || p.name}</span>
                                  <CategoryBadge category={p.category || p.phase || 'Senior'} />
                                </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              if (r.item) handleOpenRegistrationModal(r.item);
                            }}
                          >
                            Edit
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

        {/* ==================================================================== */}
        {/* 4. STUDENTS DIRECTORY TAB */}
        {/* ==================================================================== */}
        {activeTab === 'students' && (
          <StudentsListTable
            college={college}
            collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 11}
          />
        )}

        {/* ==================================================================== */}
        {/* 5. SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>College Event Stage Schedule</CardTitle>
                <CardDescription>Scheduled stages and starting times for enrolled events</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Stage / Venue</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules
                    .filter(sch => registeredItemIds.has(sch.item_id))
                    .map(sch => {
                      const reg = registrations.find(r => r.item_id === sch.item_id);
                      return (
                        <TableRow key={sch.id}>
                          <TableCell>
                            <div className="font-bold text-[#132238]">{sch.item?.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{sch.item?.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-800">{sch.stage?.name}</div>
                            <span className="text-[11px] text-slate-500">{sch.stage?.location}</span>
                          </TableCell>
                          <TableCell className="font-mono text-slate-700">
                            {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <StageStatusBadge status={sch.status} />
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {reg?.participants?.map(p => p.full_name).join(', ') || 'No roster'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ==================================================================== */}
        {/* 6. ADMIT CARD TAB */}
        {activeTab === 'admit_card' && (
          <AdmitCardTable
            students={students}
            college={college}
            collegeAfflNo={currentCollegeAfflNo || college?.affl_no || 11}
            registrations={registrations}
            festSettings={festSettings}
          />
        )}

        {/* ==================================================================== */}
        {/* 7. APPEALS TAB */}
        {activeTab === 'appeals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-semibold text-[#132238]">Formal Grievances & Emergency Substitutions</h3>
                <p className="text-xs text-slate-500">Submit an event result appeal or request participant medical substitution</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsReplacementModalOpen(true)}>
                  Request Substitution
                </Button>
                <Button size="sm" onClick={() => setIsAppealModalOpen(true)}>
                  Submit New Appeal
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Submitted Grievances</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                          No appeals filed by your institution.
                        </TableCell>
                      </TableRow>
                    ) : (
                      appeals.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-semibold text-[#132238]">{a.item?.name}</TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-sm">{a.reason}</TableCell>
                          <TableCell>
                            {a.fee_receipt_url ? (
                              <a href={a.fee_receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Proof
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <AppealStatusBadge status={a.status || a.current_status || 'Pending'} />
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{a.admin_remarks || 'Pending review'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Student Name</label>
            <input
              type="text"
              value={newStudent.full_name || ''}
              onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">College Admission / Roll No</label>
              <input
                type="text"
                placeholder="e.g. ST-2023-551"
                value={newStudent.admission_no || ''}
                onChange={e => setNewStudent({ ...newStudent, admission_no: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newStudent.category || 'Foundation'}
                onChange={e => setNewStudent({ ...newStudent, category: e.target.value as StudentCategory })}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              placeholder="+91 98..."
              value={newStudent.phone || ''}
              onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
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

          return (
            <form onSubmit={handleConfirmRegistration} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Category Requirement: </span>
                  <CategoryBadge category={selectedItemForReg.phase || selectedItemForReg.category || 'General'} />
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Type: </span>
                  <Badge variant="navy">{selectedItemForReg.point_type === 'group' ? 'Group' : 'Single'}</Badge>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Participants ({selectedStudentIds.length} / {maxPart} selected)
                </label>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {students.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const sCat = s.category || s.phase;
                    const itemCat = selectedItemForReg.phase || selectedItemForReg.category;
                    const isCategoryMatch =
                      itemCat === 'General' ||
                      sCat === itemCat ||
                      sCat === 'General';

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !isCategoryMatch ? 'opacity-40 bg-slate-50' : ''
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
                            className="rounded border-slate-300 text-[#132238] focus:ring-[#132238]"
                          />
                          <div>
                            <div className="font-semibold text-[#132238]">{s.full_name || s.name}</div>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contested Event</label>
            <select
              value={appealForm.itemId}
              onChange={e => setAppealForm({ ...appealForm, itemId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Appeal</label>
            <textarea
              rows={3}
              placeholder="State the factual basis..."
              value={appealForm.reason}
              onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Receipt Document URL</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={appealForm.feeReceiptUrl}
              onChange={e => setAppealForm({ ...appealForm, feeReceiptUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 font-mono"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Event</label>
            <select
              value={replacementForm.registrationId}
              onChange={e => setReplacementForm({ ...replacementForm, registrationId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
              required
            >
              <option value="">-- Select Registered Event --</option>
              {registrations.map(r => (
                <option key={r.id} value={r.id}>
                  {r.item?.name} ({r.item?.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student to Replace</label>
              <select
                value={replacementForm.originalStudentId}
                onChange={e => setReplacementForm({ ...replacementForm, originalStudentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
                required
              >
                <option value="">-- Current Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.chest_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Substitute Student</label>
              <select
                value={replacementForm.replacementStudentId}
                onChange={e => setReplacementForm({ ...replacementForm, replacementStudentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
                required
              >
                <option value="">-- Substitute Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.chest_no})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Substitution</label>
            <input
              type="text"
              placeholder="e.g. Medical emergency"
              value={replacementForm.reason}
              onChange={e => setReplacementForm({ ...replacementForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20"
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
  );
}
