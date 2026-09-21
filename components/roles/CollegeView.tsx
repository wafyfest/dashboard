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
  Sparkles
} from 'lucide-react';
import { Item, Student, StudentCategory } from '@/lib/types/fest';

export function CollegeView() {
  const { currentCollegeId, currentCollegeAfflNo, festSettings, triggerRefresh } = useFest();
  const [activeTab, setActiveTab] = useState<'students' | 'registration' | 'admit_cards' | 'schedules' | 'appeals'>('registration');

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

  // Registered item IDs for this college
  const registeredItemIds = new Set(registrations.map(r => r.item_id));

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
    festService.submitAppeal(
      currentCollegeId,
      appealForm.itemId,
      appealForm.reason,
      appealForm.feeReceiptUrl
    );
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

  // Check deadline for college
  const now = new Date();
  const regDeadline = new Date(festSettings.reg_deadline);
  const fineDeadline = new Date(festSettings.fine_deadline);
  const isFineApplicable = now > regDeadline && now <= fineDeadline;

  return (
    <div className="space-y-6">
      {/* College Info Card & Fine Alert Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold text-lg">
            {college?.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#132238]">{college?.name}</h2>
              {college?.fine_status && <Badge variant="destructive">Late Fine Flagged</Badge>}
              {college?.manual_lock_override && <Badge variant="amber">Admin Override Active</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Affiliation: <span className="font-mono text-slate-700">{college?.affiliation_no}</span> | Coordinator: <strong>{college?.coordinator_name}</strong> ({college?.coordinator_phone})
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
            onClick={() => setIsStudentModalOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" /> Enroll Student
          </Button>
        </div>
      </div>

      {/* Late fine notice if active */}
      {isFineApplicable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Fine Period Notice:</strong> The standard registration deadline has passed. New registrations are subject to late fee fines.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
        {[
          { id: 'registration', label: `Event Registration (${registrations.length} Enrolled)` },
          { id: 'students', label: `Student Directory (${students.length})` },
          { id: 'schedules', label: 'College Stage Schedule' },
          { id: 'admit_cards', label: 'Admit Cards (Printable)' },
          { id: 'appeals', label: `Appeals & Replacements (${appeals.length + replacements.length})` }
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

      {/* 1. EVENT REGISTRATION TAB */}
      {activeTab === 'registration' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Arts Fest Events & Registration Matrix</CardTitle>
              <CardDescription>
                Register single participants or group ensembles within required quota constraints
              </CardDescription>
            </div>
            <div className="text-xs text-slate-500">
              Total Events: <strong className="text-[#132238]">{allItems.length}</strong> | Enrolled: <strong className="text-emerald-700">{registrations.length}</strong>
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
                  <TableHead>Enrollment Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map(item => {
                  const reg = registrations.find(r => r.item_id === item.item_id || String(r.item_id) === item.id);
                  const lockCheck = festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, item.item_id || item.id);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-slate-800">{item.code}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-[#132238]">{item.name}</div>
                        {reg && reg.participants && reg.participants.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Participants: {reg.participants.map(p => `${p.full_name} (${p.chest_no})`).join(', ')}
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
                            <CheckCircle2 className="w-3.5 h-3.5" /> Registered
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

      {/* 2. STUDENT DIRECTORY TAB */}
      {activeTab === 'students' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Institution Student Directory</CardTitle>
              <CardDescription>
                Enrolled students, category classification, and assigned chest numbers
              </CardDescription>
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
                  <TableHead>Registered Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                      No students enrolled yet. Click 'Add Student' to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map(student => {
                    const studentRegs = registrations.filter(r =>
                      r.participants?.some(p => p.id === student.id)
                    );

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs">
                            {student.chest_no}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[#132238] flex items-center gap-2">
                            {student.photo_url && (
                              <img
                                src={student.photo_url}
                                alt={student.full_name}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              />
                            )}
                            {student.full_name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600">{student.admission_no}</TableCell>
                        <TableCell>
                          <CategoryBadge category={student.category || student.phase || 'Senior'} />
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-xs">{student.phone || 'N/A'}</TableCell>
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
                            <span className="text-slate-400 text-xs">No active events</span>
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

      {/* 3. STAGE SCHEDULE TAB */}
      {activeTab === 'schedules' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Live Event Timeline & Stages</CardTitle>
              <CardDescription>
                Schedule of venues and start times for items your college is registered for
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Assigned Stage / Venue</TableHead>
                  <TableHead>Scheduled Start</TableHead>
                  <TableHead>Live Status</TableHead>
                  <TableHead>Assigned Participants</TableHead>
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
                          <span className="text-[10px] text-slate-400">{sch.item?.code}</span>
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
                        <TableCell>
                          <div className="text-xs text-slate-600">
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

      {/* 4. BATCH ADMIT CARDS TAB */}
      {activeTab === 'admit_cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-sm font-semibold text-[#132238]">Batch Admit Cards & Identity Badges</h3>
              <p className="text-xs text-slate-500">Official printable cards with chest numbers, categories, and event schedules</p>
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
                  className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-card print:border-slate-800 print:shadow-none space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {festSettings.fest_name}
                      </span>
                      <h4 className="text-sm font-bold text-[#132238]">OFFICIAL ADMIT CARD</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono">CHEST NUMBER</span>
                      <div className="font-mono text-base font-black px-2 py-0.5 rounded-lg bg-[#132238] text-white">
                        {student.chest_no}
                      </div>
                    </div>
                  </div>

                  {/* Student Details */}
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
                      <div className="text-slate-600">College: <span className="font-semibold">{college?.code} - {college?.name}</span></div>
                      <div className="text-slate-600">Admission No: <span className="font-mono font-medium">{student.admission_no}</span></div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <CategoryBadge category={student.category || student.phase || 'Senior'} />
                      </div>
                    </div>
                  </div>

                  {/* Registered Items Subtable */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Enrolled Competitions & Venues:
                    </span>
                    {studentRegs.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No registered competitions</p>
                    ) : (
                      <div className="space-y-1">
                        {studentRegs.map(r => {
                          const sch = schedules.find(s => s.item_id === r.item_id);
                          return (
                            <div
                              key={r.id}
                              className="text-[11px] flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"
                            >
                              <span className="font-medium text-slate-800">{r.item?.name}</span>
                              <span className="text-slate-500 font-mono">
                                {sch ? `${sch.stage?.name.split(':')[0]} (${new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'TBA'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer Barcode Simulation */}
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

      {/* 5. APPEALS & REPLACEMENTS TAB */}
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-sm font-semibold text-[#132238]">Formal Grievances & Emergency Substitutions</h3>
              <p className="text-xs text-slate-500">File an event result appeal or request participant medical substitution</p>
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
              <CardTitle>Submitted Appeals</CardTitle>
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
                        No appeals filed by your institution
                      </TableCell>
                    </TableRow>
                  ) : (
                    appeals.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-semibold text-[#132238]">{a.item?.name}</TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-sm">{a.reason}</TableCell>
                        <TableCell>
                          {a.fee_receipt_url ? (
                            <a
                              href={a.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Proof
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AppealStatusBadge status={a.status || a.current_status || 'Pending'} />
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{a.admin_remarks || 'Pending'}</TableCell>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Photo URL (Optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={newStudent.photo_url || ''}
              onChange={e => setNewStudent({ ...newStudent, photo_url: e.target.value })}
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
              placeholder="State the factual basis (audio issues, unfair judging, time penalty miscalculation)..."
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
              placeholder="e.g. Medical emergency / hospitalized"
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
    </div>
  );
}
