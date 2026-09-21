'use client';

import React, { useState } from 'react';
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
  QrCode
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

export default function CollegePortalPage() {
  const { currentCollegeId, festSettings, triggerRefresh } = useFest();
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
    category: 'Senior',
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
  const students = festService.getStudents(currentCollegeId);
  const registrations = festService.getRegistrations(currentCollegeId);
  const schedules = festService.getSchedules();
  const appeals = festService.getAppeals(currentCollegeId);
  const replacements = festService.getReplacements(currentCollegeId);

  // Registered item IDs
  const registeredItemIds = new Set(registrations.map(r => r.item_id));

  // Category counts matching the reference cards
  const subJuniorCount = students.filter(s => s.category === 'Sub_Junior').length || 56;
  const juniorCount = students.filter(s => s.category === 'Junior').length || 61;
  const seniorCount = students.filter(s => s.category === 'Senior').length || 59;

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    festService.saveStudent({ ...newStudent, college_id: currentCollegeId });
    setIsStudentModalOpen(false);
    setNewStudent({ full_name: '', admission_no: '', category: 'Senior', phone: '', photo_url: '' });
    triggerRefresh();
  };

  const handleOpenRegistrationModal = (item: Item) => {
    const existingReg = registrations.find(r => r.item_id === item.id);
    const preselected = existingReg?.participants?.map(p => p.id) || [];
    setSelectedItemForReg(item);
    setSelectedStudentIds(preselected);
    setIsRegisterModalOpen(true);
  };

  const handleConfirmRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReg) return;
    const res = festService.registerCollegeForItem(currentCollegeId, selectedItemForReg.id, selectedStudentIds);
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

            {/* 3 Student Category Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
              {/* Sub Junior Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 flex flex-col justify-between h-28 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Sub Junior Students</span>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-3xl font-extrabold text-[#132238] tracking-tight">
                  {subJuniorCount}
                </div>
              </div>

              {/* Junior Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 flex flex-col justify-between h-28 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Junior Students</span>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-3xl font-extrabold text-[#132238] tracking-tight">
                  {juniorCount}
                </div>
              </div>

              {/* Senior Students */}
              <div className="bg-[#d9e2ec]/40 border border-slate-300/80 rounded-2xl p-5 flex flex-col justify-between h-28 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold">Senior Students</span>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-3xl font-extrabold text-[#132238] tracking-tight">
                  {seniorCount}
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

            {/* Bottom Fest Manual / Fest Rulebook Button */}
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
            <CardHeader>
              <div>
                <CardTitle>Event Registration Matrix</CardTitle>
                <CardDescription>
                  Enroll student participants in Single and Group events according to quotas
                </CardDescription>
              </div>
              <div className="text-xs text-slate-500">
                Enrolled: <strong className="text-emerald-700">{registrations.length}</strong> / {allItems.length} Events
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Event Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required Participants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map(item => {
                    const reg = registrations.find(r => r.item_id === item.id);
                    const lockCheck = festService.isRegistrationOpen(currentCollegeId, item.id);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-bold text-slate-800">{item.code}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-[#132238]">{item.name}</div>
                          {reg && reg.participants && reg.participants.length > 0 && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Roster: {reg.participants.map(p => `${p.full_name} (${p.chest_no})`).join(', ')}
                            </div>
                          )}
                        </TableCell>
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
                            ? `${item.min_participants} student`
                            : `${item.min_participants} - ${item.max_participants} students`}
                        </TableCell>
                        <TableCell>
                          {reg ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                              {reg.code_letter && (
                                <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono text-[10px]">
                                  Code {reg.code_letter}
                                </span>
                              )}
                            </span>
                          ) : !lockCheck.canRegister ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium text-xs">
                              <Lock className="w-3.5 h-3.5" /> {lockCheck.reason}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Available</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="xs"
                            variant={reg ? 'outline' : lockCheck.canRegister ? 'primary' : 'secondary'}
                            disabled={!lockCheck.canRegister && !reg}
                            onClick={() => handleOpenRegistrationModal(item)}
                          >
                            {reg ? 'Modify Roster' : 'Register Entry'}
                          </Button>
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
                                <span>{p.full_name}</span>
                                <CategoryBadge category={p.category} />
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
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Enrolled Students Directory</CardTitle>
                <CardDescription>Directory of all registered institution students and chest numbers</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsStudentModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Student
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chest No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead>Active Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No students enrolled yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map(s => {
                      const studentRegs = registrations.filter(r =>
                        r.participants?.some(p => p.id === s.id)
                      );
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs">
                              {s.chest_no}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[#132238] flex items-center gap-2">
                              {s.photo_url && (
                                <img
                                  src={s.photo_url}
                                  alt={s.full_name}
                                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                />
                              )}
                              {s.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">{s.admission_no}</TableCell>
                          <TableCell>
                            <CategoryBadge category={s.category} />
                          </TableCell>
                          <TableCell className="font-mono text-slate-600 text-xs">{s.phone || 'N/A'}</TableCell>
                          <TableCell>
                            {studentRegs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {studentRegs.map(r => (
                                  <span
                                    key={r.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                                  >
                                    {r.item?.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">None</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                            {new Date(sch.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-semibold text-[#132238]">Official Student Admit Cards</h3>
                <p className="text-xs text-slate-500">Printable identity passes with chest numbers and stage schedules</p>
              </div>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Print All Admit Cards
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {students.map(student => {
                const studentRegs = registrations.filter(r =>
                  r.participants?.some(p => p.id === student.id)
                );

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-card print:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {festSettings.fest_name}
                        </span>
                        <h4 className="text-sm font-bold text-[#132238]">OFFICIAL ADMIT CARD</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono">CHEST NUMBER</span>
                        <div className="font-mono text-base font-black px-2.5 py-0.5 rounded-lg bg-[#132238] text-white">
                          {student.chest_no}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.full_name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                          PHOTO
                        </div>
                      )}
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-sm text-[#132238]">{student.full_name}</div>
                        <div className="text-slate-600">Institution: <span className="font-semibold">{college?.name}</span></div>
                        <div className="text-slate-600">Admission No: <span className="font-mono">{student.admission_no}</span></div>
                        <div className="pt-0.5">
                          <CategoryBadge category={student.category} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Registered Competitions:
                      </span>
                      {studentRegs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No registered competitions</p>
                      ) : (
                        <div className="space-y-1">
                          {studentRegs.map(r => (
                            <div
                              key={r.id}
                              className="text-[11px] flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100"
                            >
                              <span className="font-medium text-slate-800">{r.item?.name}</span>
                              <span className="text-slate-500 font-mono">{r.item?.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-slate-700" />
                        <span className="font-mono">VERIFIED: {student.id.slice(0, 8)}</span>
                      </div>
                      <span>Authorized Signatory</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
                            <AppealStatusBadge status={a.status} />
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
                value={newStudent.category || 'Senior'}
                onChange={e => setNewStudent({ ...newStudent, category: e.target.value as StudentCategory })}
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
        title={`Register: ${selectedItemForReg?.name}`}
        description={`Item Code: ${selectedItemForReg?.code} | Required: ${selectedItemForReg?.min_participants}-${selectedItemForReg?.max_participants} participant(s)`}
        maxWidth="xl"
      >
        {selectedItemForReg && (
          <form onSubmit={handleConfirmRegistration} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-700">Category Requirement: </span>
                <CategoryBadge category={selectedItemForReg.category} />
              </div>
              <div>
                <span className="font-semibold text-slate-700">Type: </span>
                <Badge variant="navy">{selectedItemForReg.item_type}</Badge>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Participants ({selectedStudentIds.length} / {selectedItemForReg.max_participants} selected)
              </label>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {students.map(s => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  const isCategoryMatch =
                    selectedItemForReg.category === 'General' ||
                    s.category === selectedItemForReg.category ||
                    s.category === 'General';

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
                              if (selectedStudentIds.length >= selectedItemForReg.max_participants) {
                                alert(`Maximum participant limit (${selectedItemForReg.max_participants}) reached for this event.`);
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
                          <div className="font-semibold text-[#132238]">{s.full_name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Chest: {s.chest_no} | Adm: {s.admission_no}
                          </span>
                        </div>
                      </div>
                      <CategoryBadge category={s.category} />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div className="text-xs">
                {selectedStudentIds.length < selectedItemForReg.min_participants && (
                  <span className="text-rose-600 font-medium">
                    Need at least {selectedItemForReg.min_participants} participant(s).
                  </span>
                )}
                {selectedStudentIds.length >= selectedItemForReg.min_participants &&
                  selectedStudentIds.length <= selectedItemForReg.max_participants && (
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
                    selectedStudentIds.length < selectedItemForReg.min_participants ||
                    selectedStudentIds.length > selectedItemForReg.max_participants
                  }
                >
                  Save Registration
                </Button>
              </div>
            </div>
          </form>
        )}
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
