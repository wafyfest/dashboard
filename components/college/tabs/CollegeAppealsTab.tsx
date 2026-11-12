'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AppealStatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Appeal, Student, Item, College, Registration } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { FileText, CheckCircle2, ShieldAlert, ChevronDown } from 'lucide-react';

interface CollegeAppealsTabProps {
  appeals: Appeal[];
  students?: Student[];
  college?: College;
  allItems?: Item[];
  registrations?: Registration[];
  onRefresh?: () => void;
  onOpenAppealModal?: () => void;
}

export function CollegeAppealsTab({
  appeals = [],
  students = [],
  college,
  allItems = [],
  registrations = [],
  onRefresh
}: CollegeAppealsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'status'>('form');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [chestNo, setChestNo] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [grounds, setGrounds] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'GPay'>('Cash');
  const [paidTo, setPaidTo] = useState<string>('Accounts Office');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Auto-fill college name
  const collegeName = college?.name;

  // Active registrations for this college
  const activeRegistrations = useMemo(() => {
    if (registrations && registrations.length > 0) return registrations;
    if (college) return festService.getRegistrations(college.affl_no || college.id);
    return [];
  }, [registrations, college]);

  const isStudentInRegistration = React.useCallback((student: Student, reg: Registration) => {
    const sId = String(student.id || '').trim();
    const sChest = String(student.chest_no || '').trim().toLowerCase();
    const sAdm = String(student.admission_no || '').trim().toLowerCase();
    const sCic = String(student.cic_no || '').trim().toLowerCase();

    const regChest = String(reg.chest_no || '').trim().toLowerCase();
    if (regChest && (regChest === sChest || regChest === sAdm || regChest === sCic)) {
      return true;
    }

    const checkPerson = (p?: Partial<Student> | null) => {
      if (!p) return false;
      if (p.id && sId && String(p.id) === sId) return true;
      const pChest = String(p.chest_no || '').trim().toLowerCase();
      const pAdm = String(p.admission_no || '').trim().toLowerCase();
      const pCic = String(p.cic_no || '').trim().toLowerCase();
      return (
        (pChest && (pChest === sChest || pChest === sAdm || pChest === sCic)) ||
        (pAdm && (pAdm === sAdm || pAdm === sCic || pAdm === sChest)) ||
        (pCic && (pCic === sCic || pCic === sAdm || pCic === sChest))
      );
    };

    if (checkPerson(reg.student)) return true;
    if (reg.participants && reg.participants.some(p => checkPerson(p))) return true;
    return false;
  }, []);

  const isItemInRegistration = React.useCallback((item: Item, reg: Registration) => {
    const numItemId = Number(item.item_id);
    if (!Number.isNaN(numItemId) && Number(reg.item_id) === numItemId) return true;
    if (String(reg.item_id) === String(item.id)) return true;
    if (reg.item) {
      if (!Number.isNaN(numItemId) && Number(reg.item.item_id) === numItemId) return true;
      if (String(reg.item.id) === String(item.id)) return true;
    }
    return false;
  }, []);

  // Only students who have at least one registration in this college
  const registeredStudents = useMemo(() => {
    return students.filter(s => activeRegistrations.some(r => isStudentInRegistration(s, r)));
  }, [students, activeRegistrations, isStudentInRegistration]);

  // Only events that this college has registered for
  const registeredItems = useMemo(() => {
    return allItems.filter(item => activeRegistrations.some(r => isItemInRegistration(item, r)));
  }, [allItems, activeRegistrations, isItemInRegistration]);

  // Filter registered students based on selected event (if any)
  const availableStudents = useMemo(() => {
    if (!selectedItemId) {
      return registeredStudents;
    }
    const selectedItem = registeredItems.find(
      i => String(i.id) === selectedItemId || String(i.item_id) === selectedItemId
    );
    if (!selectedItem) return [];
    return registeredStudents.filter(s =>
      activeRegistrations.some(
        r => isItemInRegistration(selectedItem, r) && isStudentInRegistration(s, r)
      )
    );
  }, [selectedItemId, registeredItems, registeredStudents, activeRegistrations, isItemInRegistration, isStudentInRegistration]);

  // Filter registered events based on selected student (if any)
  const availableItems = useMemo(() => {
    if (!selectedStudentId) {
      return registeredItems;
    }
    const selectedStudent = registeredStudents.find(
      std => String(std.id) === selectedStudentId || String(std.admission_no) === selectedStudentId
    );
    if (!selectedStudent) return [];
    return registeredItems.filter(item =>
      activeRegistrations.some(
        r => isItemInRegistration(item, r) && isStudentInRegistration(selectedStudent, r)
      )
    );
  }, [selectedStudentId, registeredStudents, registeredItems, activeRegistrations, isItemInRegistration, isStudentInRegistration]);

  // Handle Event selection change
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (selectedStudentId && itemId) {
      const item = registeredItems.find(i => String(i.id) === itemId || String(i.item_id) === itemId);
      const student = registeredStudents.find(std => String(std.id) === selectedStudentId);
      const stillMatches =
        item &&
        student &&
        activeRegistrations.some(r => isItemInRegistration(item, r) && isStudentInRegistration(student, r));
      if (!stillMatches) {
        setSelectedStudentId('');
        setParticipantName('');
        setChestNo('');
      }
    }
  };

  // Handle participant selection change
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setParticipantName('');
      setChestNo('');
      return;
    }

    const s = registeredStudents.find(
      std => String(std.id) === studentId || String(std.admission_no) === studentId
    );
    if (s) {
      setParticipantName(s.full_name || s.name || '');
      setChestNo(String(s.chest_no ?? s.admission_no ?? ''));
      if (selectedItemId) {
        const item = registeredItems.find(i => String(i.id) === selectedItemId || String(i.item_id) === selectedItemId);
        const stillMatches =
          item &&
          activeRegistrations.some(r => isItemInRegistration(item, r) && isStudentInRegistration(s, r));
        if (!stillMatches) {
          setSelectedItemId('');
        }
      }
    }
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setParticipantName('');
    setChestNo('');
    setSelectedItemId('');
    setGrounds('');
    setPaymentMode('Cash');
    setPaidTo('Accounts Office');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setErrorMessage('Please select an event.');
      return;
    }
    if (!grounds.trim()) {
      setErrorMessage('Please provide grounds and a brief description of the appeal.');
      return;
    }

    const item = allItems.find(i => String(i.id) === selectedItemId || String(i.item_id) === selectedItemId);

    const res = await festService.submitAppeal({
      college_affl_no: college?.affl_no,
      phase: item?.phase || item?.category || 'Senior',
      item_id: item?.item_id || (item ? Number(item.id) : 1),
      participant_name: participantName || null,
      chest_no: chestNo || null,
      reason_for_appeal: grounds.trim(),
      reason: grounds.trim(),
      appeal_description: grounds.trim(),
      payment_mode: paymentMode,
      paid_to: paidTo,
      fee_receipt_url: null,
      current_status: 'Pending',
      status: 'Pending',
      team_manager_name: college?.team_manager_name || 'Team Manager',
      mobile_number: college?.team_manager_phone || college?.staff_coordinator_phone || college?.contact_no || ''
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to submit appeal');
      return;
    }

    resetForm();
    setIsSubmitted(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsSubmitted(false);
      setActiveSubTab('status');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Tab Navigation - Fest Saffron/Surface tokens */}
      <div className="bg-[var(--bg-subtle)] p-1 rounded-2xl border border-[var(--border-subtle)] flex items-center shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('form')}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-heading rounded-xl transition-all duration-200 text-center cursor-pointer ${activeSubTab === 'form'
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
            }`}
        >
          Appeal Form
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('status')}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-heading rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'status'
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
            }`}
        >
          Appeal Status
          {appeals.length > 0 && (
            <Badge variant="saffron" size="sm" className="font-mono font-bold">
              {appeals.length}
            </Badge>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: APPEAL FORM */}
      {activeSubTab === 'form' && (
        <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
                </span>
                <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
                  Submit a New Appeal
                </CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
                Fill out the details below to submit a formal appeal for an event.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isSubmitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)]">Appeal Submitted Successfully</h3>
                <p className="text-xs font-sans text-[var(--text-secondary)] max-w-md">
                  Your formal appeal has been lodged with the Fest Executive Committee. Redirecting to Appeal Status...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 font-medium">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name of the Participant - Dynamic filtering based on event selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Name of the Participant
                      {selectedItemId && availableStudents.length > 0 && (
                        <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          ({availableStudents.length} registered)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStudentId}
                        onChange={e => handleStudentSelect(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs font-sans font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 appearance-none transition-colors"
                      >
                        {availableStudents.length === 0 ? (
                          <option value="">
                            {selectedItemId
                              ? 'No registered students for this event'
                              : 'No registered students found'}
                          </option>
                        ) : (
                          <>
                            <option value="">Select a registered student...</option>
                            {availableStudents.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.full_name || s.name} {(s.cic_no || s.admission_no || s.cic_number || s.chest_no) ? `(CIC: ${s.cic_no || s.admission_no || s.cic_number || s.chest_no})` : ''}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Name of the College */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Name of the College
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={collegeName || ''}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Chest No (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Chest No (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter chest number if applicable"
                      value={chestNo}
                      onChange={e => setChestNo(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>

                  {/* Name of the Event */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Name of the Event
                    </label>
                    <div className="relative">
                      <select
                        value={selectedItemId}
                        onChange={e => handleItemSelect(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs font-sans font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 appearance-none transition-colors"
                        required
                      >
                        {availableItems.length === 0 ? (
                          <option value="">
                            {selectedStudentId
                              ? 'No registered events for this student'
                              : 'No registered events found'}
                          </option>
                        ) : (
                          <>
                            <option value="">Select a registered event...</option>
                            {availableItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.code || item.item_code} - {item.name_eng || item.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Grounds and Brief Description of Appeal */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                    Grounds and Brief Description of Appeal
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide a clear and concise reason for your appeal..."
                    value={grounds}
                    onChange={e => setGrounds(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl p-3.5 text-xs font-sans font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Fee Payment Mode & Paid To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Fee Payment Mode
                    </label>
                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-sans font-medium text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="Cash"
                          checked={paymentMode === 'Cash'}
                          onChange={() => setPaymentMode('Cash')}
                          className="w-4 h-4 text-[var(--f-saffron)] border-[var(--border-medium)] focus:ring-[var(--f-saffron)] accent-amber-500 cursor-pointer"
                        />
                        <span>Cash</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-sans font-medium text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="GPay"
                          checked={paymentMode === 'GPay'}
                          onChange={() => setPaymentMode('GPay')}
                          className="w-4 h-4 text-[var(--f-saffron)] border-[var(--border-medium)] focus:ring-[var(--f-saffron)] accent-amber-500 cursor-pointer"
                        />
                        <span>GPay</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)]">
                      Paid To
                    </label>
                    <div className="relative">
                      <select
                        value={paidTo}
                        onChange={e => setPaidTo(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs font-sans font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 appearance-none transition-colors"
                      >
                        <option value="Accounts Office">Accounts Office</option>
                        <option value="Convenor">Convenor</option>
                        <option value="Treasurer">Treasurer</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="font-heading"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="saffron"
                    className="font-heading font-bold"
                  >
                    Submit Appeal
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 2: APPEAL STATUS TABLE */}
      {activeSubTab === 'status' && (
        <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
                Submitted Grievances & Appeals
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
                Track the status and admin decision for your institution&apos;s submitted appeals
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="saffron"
              onClick={() => setActiveSubTab('form')}
              className="font-heading font-bold self-start sm:self-auto shrink-0"
            >
              + New Appeal
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-x-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="whitespace-nowrap">Participant / Chest No</TableHead>
                  <TableHead>Grounds &amp; Description</TableHead>
                  <TableHead className="whitespace-nowrap">Payment Details</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead>Admin Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[var(--text-muted)] text-xs">
                      No appeals filed by your institution. Click &quot;Appeal Form&quot; to submit a new appeal.
                    </TableCell>
                  </TableRow>
                ) : (
                  appeals.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">
                        <div className="font-heading font-bold text-[var(--text-primary)]">
                          {a.item?.name_eng || a.item?.name || `Item #${a.item_id}`}
                        </div>
                        {a.item?.code || a.item?.item_code ? (
                          <div className="text-[10px] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-semibold">
                            {a.item?.code || a.item?.item_code}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-heading font-semibold text-[var(--text-primary)]">{a.participant_name || 'N/A'}</div>
                        {a.chest_no && (
                          <div className="text-[10px] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-semibold">
                            CIC / Chest: {a.chest_no}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] font-sans max-w-xs leading-relaxed">
                        {a.reason || a.reason_for_appeal || a.appeal_description || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-lg text-[11px] text-[var(--text-secondary)] font-sans">
                          {a.payment_mode || 'Cash'} {a.paid_to ? `• ${a.paid_to}` : ''}
                        </span>
                        {a.fee_receipt_url && (
                          <div className="mt-1">
                            <a
                              href={a.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-[11px] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="w-3 h-3" /> Proof
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <AppealStatusBadge status={a.status || a.current_status || 'Pending'} />
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-muted)] italic font-sans">
                        {a.admin_remarks || 'Pending review'}
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
