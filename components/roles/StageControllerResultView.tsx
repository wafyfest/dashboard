'use client';

import React, { useState, useMemo } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, StageStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, Stage, Schedule, Registration, Student, College, StageStatus } from '@/lib/types/fest';
import { getCanonicalChestNo, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import {
  Shuffle,
  Dices,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  Trophy,
  ChevronRight,
  Hash,
  Building2,
  User,
  RotateCcw,
  Radio,
  FileCheck2,
  Printer,
  AlertTriangle,
  Flame
} from 'lucide-react';

interface StageControllerResultViewProps {
  selectedStageNumber?: number;
  onSelectStageNumber?: (stageNumber: number) => void;
}

export function StageControllerResultView({
  selectedStageNumber: controlledStageNumber,
  onSelectStageNumber
}: StageControllerResultViewProps) {
  const { refreshKey, triggerRefresh } = useFest();

  // Load stages, schedules, items, registrations, colleges, students
  const stages = useMemo(() => festService.getStages(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);
  const allItems = useMemo(() => festService.getItems(), [refreshKey]);
  const allRegistrations = useMemo(() => festService.getRegistrations(), [refreshKey]);
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);
  const students = useMemo(() => festService.getStudents(), [refreshKey]);
  const codeLetters = useMemo(() => festService.getCodeLetters(), [refreshKey]);

  // Stage selection state
  const [internalStageNumber, setInternalStageNumber] = useState<number>(() => {
    return stages[0] ? stages[0].stage_number : 1;
  });
  const currentStageNumber = controlledStageNumber ?? internalStageNumber;

  const handleStageSelect = (num: number) => {
    setSelectedEventId(null);
    if (onSelectStageNumber) {
      onSelectStageNumber(num);
    } else {
      setInternalStageNumber(num);
    }
  };

  // Selected stage object
  const currentStage = stages.find(s => s.stage_number === currentStageNumber) || stages[0];

  // Events scheduled for this stage
  const stageSchedules = useMemo(() => {
    return schedules
      .filter(s => s.stage_number === currentStageNumber)
      .map(s => {
        const item = s.item || allItems.find(i => Number(i.item_id) === Number(s.item_id));
        const regs = allRegistrations.filter(r => Number(r.item_id) === Number(s.item_id));
        const allocatedCount = regs.filter(r => Boolean(r.code_letter)).length;
        return {
          ...s,
          item,
          registrationsCount: regs.length,
          allocatedCount
        };
      })
      .sort((a, b) => new Date(a.starting).getTime() - new Date(b.starting).getTime());
  }, [schedules, currentStageNumber, allItems, allRegistrations]);

  // Selected event state for detail view
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const selectedSchedule = stageSchedules.find(s => Number(s.item_id) === Number(selectedEventId));
  const selectedItem = selectedSchedule?.item || allItems.find(i => Number(i.item_id) === Number(selectedEventId));

  // Registered participants for selected event
  const eventParticipants = useMemo(() => {
    if (!selectedEventId) return [];
    const eventRegs = allRegistrations.filter(r => Number(r.item_id) === Number(selectedEventId));

    return eventRegs.map(reg => {
      const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
      const stu = reg.student || findStudentByIdentifier(students, reg.chest_no, reg.college_affl_no);
      const letterEntry = codeLetters.find(
        cl => Number(cl.item_id) === Number(selectedEventId) && cl.chest_no === reg.chest_no
      );
      const activeCodeLetter = reg.code_letter || letterEntry?.code_letter || null;

      return {
        registration: reg,
        college: col,
        student: stu,
        chestNo: reg.chest_no,
        canonicalChestNo: stu ? getCanonicalChestNo(stu) : (reg.chest_no || 'ST-N/A'),
        codeLetter: activeCodeLetter
      };
    });
  }, [selectedEventId, allRegistrations, colleges, students, codeLetters]);

  // Print run sheet
  const handlePrintCodeSheet = () => {
    window.print();
  };

  // Helper to check if schedule is running overdue
  const checkIsOverrun = (endingStr?: string | null, status?: StageStatus) => {
    if (status !== 'On_Going' || !endingStr) return false;
    const end = new Date(endingStr).getTime();
    return Date.now() > end;
  };

  // Loading/busy feedback for code generation
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showTemporaryMessage = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Random single participant code letter allocation
  const handleAssignRandomCode = async (chestNo: string, collegeAfflNo: number) => {
    if (!selectedEventId) return;
    setIsProcessing(true);
    try {
      const res = await festService.assignRandomCodeLetter(selectedEventId, collegeAfflNo, chestNo);
      if (res.success) {
        showTemporaryMessage(`Assigned Code Letter "${res.codeLetter}" to Chest ${chestNo}!`);
        triggerRefresh();
      } else {
        alert(res.error || 'Failed to assign code letter');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning random code letter');
    } finally {
      setIsProcessing(false);
    }
  };

  // Randomize all participants for this event
  const handleRandomizeAll = async () => {
    if (!selectedEventId) return;
    if (eventParticipants.length === 0) {
      alert('No participants registered for this event to allocate.');
      return;
    }
    if (
      eventParticipants.some(p => Boolean(p.codeLetter)) &&
      !confirm('Some participants already have code letters assigned. Do you want to re-shuffle and randomize all code letters for this event?')
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await festService.randomizeAllCodeLetters(selectedEventId);
      if (res.success) {
        showTemporaryMessage(`Successfully randomized all ${eventParticipants.length} code letters!`);
        triggerRefresh();
      } else {
        alert(res.error || 'Failed to randomize code letters');
      }
    } catch (err: any) {
      alert(err.message || 'Error randomizing all code letters');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove code letter for single participant
  const handleRemoveCode = async (chestNo: string) => {
    if (!selectedEventId) return;
    setIsProcessing(true);
    try {
      await festService.removeCodeLetter(selectedEventId, chestNo);
      showTemporaryMessage(`Reset code letter for Chest ${chestNo}.`);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error removing code letter');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update schedule status by stage controller
  const handleStatusChange = async (itemId: number, newStatus: StageStatus) => {
    setIsProcessing(true);
    try {
      await festService.updateScheduleStatus(itemId, newStatus);
      showTemporaryMessage(`Event status updated to "${newStatus.replace(/_/g, ' ')}"`);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating event status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format time helper
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Message */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{actionSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* VIEW 1: Events Table for Selected Stage */}
      {!selectedEventId && (
        <div className="space-y-6">
          {/* Stage Banner */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xl shadow-sm border border-slate-700/30">
                <Radio className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                    STAGE {currentStage?.stage_number}
                  </span>
                  <Badge variant="navy" size="sm">Active Venue</Badge>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  {currentStage?.name || `Stage ${currentStageNumber}`}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{currentStage?.location || 'Campus Festival Ground'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-right">
                <span className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase">Events Scheduled</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] font-mono">{stageSchedules.length}</span>
              </div>
            </div>
          </div>

          {/* Events Schedule Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Scheduled Events on {currentStage?.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Select an event to view registered participants and allocate anonymous blind code letters (A, B, C...)
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Event Code</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Start</TableHead>
                    <TableHead>Time End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Registrations</TableHead>
                    <TableHead className="text-center">Code Letters</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-[var(--text-muted)] text-sm">
                        No events are currently scheduled for this stage in the schedule table.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stageSchedules.map((sch, idx) => {
                      const item = sch.item;
                      const isComplete = sch.registrationsCount > 0 && sch.allocatedCount >= sch.registrationsCount;

                      return (
                        <TableRow
                          key={sch.id}
                          className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                          onClick={() => setSelectedEventId(Number(sch.item_id))}
                        >
                          <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-[var(--text-primary)]">
                            {item?.item_code || item?.code || `ITM-${sch.item_id}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {item?.name_eng || item?.name || 'Festival Event'}
                            </div>
                            {item?.name_mal && (
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-normal">
                                {item.name_mal}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={item?.phase || item?.category || 'General'} />
                          </TableCell>
                          <TableCell className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                            {formatDate(sch.starting)}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatTime(sch.starting)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{formatTime(sch.ending)}</span>
                              {checkIsOverrun(sch.ending, sch.status) && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] px-1 py-0 animate-pulse font-mono">
                                  OVERRUN
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <select
                              value={sch.status || 'Upcoming'}
                              onChange={(e) => handleStatusChange(Number(sch.item_id), e.target.value as StageStatus)}
                              disabled={isProcessing}
                              className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs hover:border-emerald-400"
                            >
                              <option value="Upcoming">Upcoming</option>
                              <option value="Starting_Soon">Starting Soon</option>
                              <option value="Next_Item">Next Item</option>
                              <option value="On_Going">On Going (Live)</option>
                              <option value="Ended">Ended</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                              {sch.registrationsCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {sch.registrationsCount === 0 ? (
                              <span className="text-[11px] text-[var(--text-muted)]">No roster</span>
                            ) : isComplete ? (
                              <Badge variant="success" size="sm" className="font-mono">
                                {sch.allocatedCount}/{sch.registrationsCount} Done
                              </Badge>
                            ) : sch.allocatedCount > 0 ? (
                              <Badge variant="amber" size="sm" className="font-mono">
                                {sch.allocatedCount}/{sch.registrationsCount} Partial
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="text-[var(--text-muted)] font-mono">
                                0/{sch.registrationsCount} Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => setSelectedEventId(Number(sch.item_id))}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              Manage Codes →
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
      )}

      {/* VIEW 2: Selected Event Details & Code Letter Allotment Console */}
      {selectedEventId && selectedItem && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedEventId(null)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-500 bg-[var(--bg-surface)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {currentStage?.name} Events</span>
            </button>

            <div className="flex items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintCodeSheet}
                className="gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 font-semibold cursor-pointer"
                title="Print Blind Code Sheet for Stage Marshals & Jury Runners"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Print Code Sheet</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRandomizeAll}
                disabled={isProcessing || eventParticipants.length === 0}
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 font-semibold"
              >
                <Shuffle className="w-4 h-4 text-indigo-600" />
                <span>Shuffle & Randomize All</span>
              </Button>
            </div>
          </div>

          {/* Event Header Card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-xl shadow-sm border border-slate-700/30 shrink-0">
                  <Dices className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg">
                      {selectedItem.item_code || selectedItem.code}
                    </span>
                    <CategoryBadge category={selectedItem.phase || selectedItem.category} />
                    <Badge variant={selectedItem.point_type === 'group' ? 'purple' : 'secondary'}>
                      {selectedItem.point_type === 'group' ? 'Group Event' : 'Single Event'}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-1.5">
                    {selectedItem.name_eng || selectedItem.name}
                  </h2>
                  {selectedItem.name_mal && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {selectedItem.name_mal}
                    </p>
                  )}
                </div>
              </div>

              {/* Event Timing & Allocation Stats */}
              <div className="flex items-center gap-4 bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-subtle)] flex-wrap sm:flex-nowrap">
                <div>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Scheduled Time</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    {formatTime(selectedSchedule?.starting)} - {formatTime(selectedSchedule?.ending)}
                    {checkIsOverrun(selectedSchedule?.ending, selectedSchedule?.status) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Overrun
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Letter Pool</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    {eventParticipants.length > 0
                      ? `A to ${String.fromCharCode(64 + Math.min(eventParticipants.length, 26))}`
                      : 'None'}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Allocated</span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {eventParticipants.filter(p => Boolean(p.codeLetter)).length} / {eventParticipants.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Stage Status</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSchedule?.status || 'Upcoming'}
                      onChange={(e) => handleStatusChange(Number(selectedItem.item_id), e.target.value as StageStatus)}
                      disabled={isProcessing}
                      className="text-xs font-bold rounded-lg px-2.5 py-1 border border-emerald-400/60 dark:border-emerald-700 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Starting_Soon">Starting Soon</option>
                      <option value="Next_Item">Next Item</option>
                      <option value="On_Going">On Going (Live)</option>
                      <option value="Ended">Ended</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Table with Individual Random Selection */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Registered Participants & Code Letters
                </CardTitle>
                <CardDescription className="text-xs">
                  Every student can be assigned an anonymous random code letter for blind evaluation. Letters are recorded in the code_letters table.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>College / Institution</TableHead>
                    <TableHead>Chest No</TableHead>
                    <TableHead>Adm / CIC No</TableHead>
                    <TableHead className="text-center">Assigned Code Letter</TableHead>
                    <TableHead className="text-right w-44">Random Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-sm">
                        No students are currently registered for this event.
                      </TableCell>
                    </TableRow>
                  ) : (
                    eventParticipants.map((p, idx) => {
                      const student = p.student;
                      const college = p.college;
                      const hasCode = Boolean(p.codeLetter);

                      return (
                        <TableRow key={p.registration.id || p.chestNo} className="hover:bg-[var(--bg-hover)]">
                          <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {student?.full_name || student?.name || 'Registered Student'}
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {student?.category || student?.phase || 'Senior'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-[var(--text-primary)]">
                              {college?.name || `College ${p.registration.college_affl_no}`}
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              Affl No: {p.registration.college_affl_no}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                            {p.canonicalChestNo}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                            {student?.admission_no || student?.cic_no || 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasCode ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-mono text-base font-extrabold tracking-wider">
                                  {p.codeLetter}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono text-[var(--text-muted)] italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="xs"
                                variant={hasCode ? 'outline' : 'primary'}
                                disabled={isProcessing}
                                onClick={() => handleAssignRandomCode(p.chestNo, p.registration.college_affl_no)}
                                title={hasCode ? 'Re-roll random code letter' : 'Assign random code letter (A-N)'}
                                className={`gap-1.5 font-semibold ${
                                  hasCode
                                    ? 'border-slate-300 dark:border-slate-700 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                              >
                                <Dices className="w-3.5 h-3.5" />
                                <span>{hasCode ? 'Re-roll' : 'Random Code'}</span>
                              </Button>

                              {hasCode && (
                                <button
                                  onClick={() => handleRemoveCode(p.chestNo)}
                                  disabled={isProcessing}
                                  title="Reset code letter"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
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
        </div>
      )}
      {/* PRINT-ONLY BLIND CODE SHEET (Rendered only on window.print()) */}
      {selectedEventId && selectedItem && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999]">
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wider">WAFFY ARTS FEST 2026</h1>
                <h2 className="text-base font-semibold">Stage {currentStage?.stage_number}: {currentStage?.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold">OFFICIAL BLIND CODE RUN SHEET</p>
                <p className="text-xs text-gray-600">Printed: {new Date().toLocaleTimeString()} on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold">Item:</span> #{selectedItem.item_id} — {selectedItem.name_eng || selectedItem.name} ({selectedItem.phase || selectedItem.category})
              </div>
              <div>
                <span className="font-bold">Scheduled Time:</span> {formatTime(selectedSchedule?.starting)} - {formatTime(selectedSchedule?.ending)}
              </div>
              <div>
                <span className="font-bold">Total Participants:</span> {eventParticipants.length}
              </div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2 text-center w-12">#</th>
                <th className="border border-gray-400 p-2 text-center font-bold w-24">Blind Code</th>
                <th className="border border-gray-400 p-2 text-left">Student / Candidate Name</th>
                <th className="border border-gray-400 p-2 text-left">Chest No</th>
                <th className="border border-gray-400 p-2 text-left">Institution</th>
                <th className="border border-gray-400 p-2 text-center w-28">Stage Callout</th>
                <th className="border border-gray-400 p-2 text-center w-28">Jury Signature</th>
              </tr>
            </thead>
            <tbody>
              {eventParticipants
                .slice()
                .sort((a, b) => (a.codeLetter || 'ZZ').localeCompare(b.codeLetter || 'ZZ'))
                .map((p, idx) => (
                  <tr key={p.registration.id || p.chestNo} className="border-b border-gray-300">
                    <td className="border border-gray-400 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-gray-400 p-2 text-center font-bold font-mono text-base bg-gray-50">
                      {p.codeLetter || '—'}
                    </td>
                    <td className="border border-gray-400 p-2 font-semibold">
                      {p.student?.full_name || p.student?.name || 'Registered Candidate'}
                    </td>
                    <td className="border border-gray-400 p-2 font-mono">{p.canonicalChestNo}</td>
                    <td className="border border-gray-400 p-2">
                      {p.college?.name || `College ${p.registration.college_affl_no}`}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-gray-400">
                      [ ] Pres &nbsp; [ ] Abs
                    </td>
                    <td className="border border-gray-400 p-2 text-center"></td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-gray-400 flex items-center justify-between text-xs">
            <div>
              <p>Stage Controller Name: ___________________________</p>
            </div>
            <div>
              <p>Stage Controller Signature: ___________________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
