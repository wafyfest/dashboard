'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AppealStatusBadge } from '@/components/ui/badge';
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
  onOpenReplacementModal?: () => void;
}

export function CollegeAppealsTab({
  appeals = [],
  students = [],
  college,
  allItems = [],
  registrations = [],
  onRefresh,
  onOpenReplacementModal
}: CollegeAppealsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'status'>('form');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [chestNo, setChestNo] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [grounds, setGrounds] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'GPay'>('Cash');
  const [paidTo, setPaidTo] = useState<string>('Fazil');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Auto-fill college name
  const collegeName = college?.name || 'MAJLIS UMARIYYA ISLAMIC & ARTS COLLEGE';

  // Active registrations for this college
  const activeRegistrations = useMemo(() => {
    if (registrations && registrations.length > 0) return registrations;
    if (college) return festService.getRegistrations(college.affl_no || college.id);
    return [];
  }, [registrations, college]);

  // Filter students based on selected event (only list registered students for that event)
  const availableStudents = useMemo(() => {
    if (!selectedItemId) {
      return students;
    }

    const numericItemId = Number(selectedItemId);

    // Find all registration entries for the selected event
    const itemRegs = activeRegistrations.filter(r =>
      Number(r.item_id) === numericItemId ||
      String(r.item_id) === selectedItemId ||
      (r.item && (Number(r.item.id) === numericItemId || String(r.item.id) === selectedItemId))
    );

    if (itemRegs.length === 0) {
      return [];
    }

    const registeredChestNos = new Set<string>();
    const registeredStudentIds = new Set<string>();

    itemRegs.forEach(r => {
      if (r.chest_no) registeredChestNos.add(String(r.chest_no).trim().toLowerCase());
      if (r.student) {
        if (r.student.id) registeredStudentIds.add(String(r.student.id));
        if (r.student.chest_no) registeredChestNos.add(String(r.student.chest_no).trim().toLowerCase());
        if (r.student.admission_no) registeredChestNos.add(String(r.student.admission_no).trim().toLowerCase());
      }
      if (r.participants && r.participants.length > 0) {
        r.participants.forEach(p => {
          if (p.id) registeredStudentIds.add(String(p.id));
          if (p.chest_no) registeredChestNos.add(String(p.chest_no).trim().toLowerCase());
          if (p.admission_no) registeredChestNos.add(String(p.admission_no).trim().toLowerCase());
        });
      }
    });

    return students.filter(s => {
      const sId = String(s.id);
      const sChest = String(s.chest_no || '').trim().toLowerCase();
      const sAdm = String(s.admission_no || '').trim().toLowerCase();

      return (
        (sId && registeredStudentIds.has(sId)) ||
        (sChest && registeredChestNos.has(sChest)) ||
        (sAdm && registeredChestNos.has(sAdm))
      );
    });
  }, [selectedItemId, activeRegistrations, students]);

  // Handle Event selection change
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    // Reset participant selection when event changes
    setSelectedStudentId('');
    setParticipantName('');
    setChestNo('');
  };

  // Handle participant selection change
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setParticipantName('');
      setChestNo('');
      return;
    }

    const s = students.find(std => String(std.id) === studentId || String(std.admission_no) === studentId);
    if (s) {
      setParticipantName(s.full_name || s.name || '');
      setChestNo(String(s.chest_no ?? s.admission_no ?? ''));
    }
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setParticipantName('');
    setChestNo('');
    setSelectedItemId('');
    setGrounds('');
    setPaymentMode('Cash');
    setPaidTo('Fazil');
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    festService.submitAppeal({
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
      mobile_number: college?.team_manager_phone || college?.staff_coordinator_phone || '9800000000'
    });

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
      {/* Top Segmented Tab Navigation - Clean dark/light theme styling */}
      <div className="bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-300/60 dark:border-slate-800/80 flex items-center shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('form')}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 text-center ${
            activeSubTab === 'form'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Appeal Form
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('status')}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 ${
            activeSubTab === 'status'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Appeal Status
          {appeals.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
              {appeals.length}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: APPEAL FORM */}
      {activeSubTab === 'form' && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Submit a New Appeal</CardTitle>
              <CardDescription>
                Fill out the details below to submit a formal appeal for an event.
              </CardDescription>
            </div>
            {onOpenReplacementModal && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenReplacementModal}
                className="self-start sm:self-auto text-xs border-slate-200 dark:border-slate-800"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Request Substitution
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {isSubmitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Appeal Submitted Successfully</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
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
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:focus:ring-blue-500/20 appearance-none transition-colors"
                      >
                        {!selectedItemId ? (
                          <>
                            <option value="">Select a student...</option>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.full_name || s.name} {s.chest_no ? `(Chest: ${s.chest_no})` : ''}
                              </option>
                            ))}
                          </>
                        ) : availableStudents.length === 0 ? (
                          <option value="">No registered students for this event</option>
                        ) : (
                          <>
                            <option value="">Select a registered student...</option>
                            {availableStudents.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.full_name || s.name} {s.chest_no ? `(Chest: ${s.chest_no})` : ''}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Name of the College */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Name of the College
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={collegeName}
                      className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Chest No (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Chest No (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter chest number if applicable"
                      value={chestNo}
                      onChange={e => setChestNo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:focus:ring-blue-500/20 transition-colors"
                    />
                  </div>

                  {/* Name of the Event */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Name of the Event
                    </label>
                    <div className="relative">
                      <select
                        value={selectedItemId}
                        onChange={e => handleItemSelect(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:focus:ring-blue-500/20 appearance-none transition-colors"
                        required
                      >
                        <option value="">Select an event...</option>
                        {allItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code || item.item_code} - {item.name_eng || item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Grounds and Brief Description of Appeal */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Grounds and Brief Description of Appeal
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide a clear and concise reason for your appeal..."
                    value={grounds}
                    onChange={e => setGrounds(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:focus:ring-blue-500/20 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Fee Payment Mode & Paid To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Fee Payment Mode
                    </label>
                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="Cash"
                          checked={paymentMode === 'Cash'}
                          onChange={() => setPaymentMode('Cash')}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                        />
                        <span>Cash</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="GPay"
                          checked={paymentMode === 'GPay'}
                          onChange={() => setPaymentMode('GPay')}
                          className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                        />
                        <span>GPay</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Paid To
                    </label>
                    <div className="relative">
                      <select
                        value={paidTo}
                        onChange={e => setPaidTo(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 dark:focus:ring-blue-500/20 appearance-none transition-colors"
                      >
                        <option value="Fazil">Fazil</option>
                        <option value="Accounts Office">Accounts Office</option>
                        <option value="Convenor">Convenor</option>
                        <option value="Treasurer">Treasurer</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-2 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#132238] hover:bg-[#1a2e4a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-xl text-xs shadow-2xs transition-colors"
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
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Submitted Grievances & Appeals</CardTitle>
              <CardDescription>
                Track the status and admin decision for your institution&apos;s submitted appeals
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveSubTab('form')}
              className="bg-[#132238] hover:bg-[#1a2e4a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium px-3.5 rounded-xl"
            >
              + New Appeal
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Event</TableHead>
                  <TableHead className="text-xs font-semibold">Participant / Chest No</TableHead>
                  <TableHead className="text-xs font-semibold">Grounds & Description</TableHead>
                  <TableHead className="text-xs font-semibold">Payment Details</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Admin Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
                      No appeals filed by your institution. Click &quot;Appeal Form&quot; to submit a new appeal.
                    </TableCell>
                  </TableRow>
                ) : (
                  appeals.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {a.item?.name_eng || a.item?.name || `Item #${a.item_id}`}
                        </div>
                        {a.item?.code || a.item?.item_code ? (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {a.item?.code || a.item?.item_code}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                        <div className="font-medium">{a.participant_name || 'N/A'}</div>
                        {a.chest_no && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Chest: {a.chest_no}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                        {a.reason || a.reason_for_appeal || a.appeal_description || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          {a.payment_mode || 'Cash'} {a.paid_to ? `• ${a.paid_to}` : ''}
                        </span>
                        {a.fee_receipt_url && (
                          <div className="mt-1">
                            <a
                              href={a.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 dark:text-blue-400 text-[11px] hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Proof
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <AppealStatusBadge status={a.status || a.current_status || 'Pending'} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 italic">
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
