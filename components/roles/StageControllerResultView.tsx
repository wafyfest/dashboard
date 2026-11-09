'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StageStatus } from '@/lib/types/fest';
import { getCanonicalChestNo, findStudentByIdentifier } from '@/lib/utils/studentIdentity';
import { TilePattern } from '@/components/fest/FestPattern';
import {
  Dices,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  Radio,
  UserCheck,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle
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
  const chestNosMapping = useMemo(() => festService.getChestNos(), [refreshKey]);

  // Stage selection state
  const [internalStageNumber, setInternalStageNumber] = useState<number>(() => {
    return stages[0] ? stages[0].stage_number : 1;
  });
  const currentStageNumber = controlledStageNumber ?? internalStageNumber;

  // Selected stage object
  const currentStage = stages.find(s => s.stage_number === currentStageNumber) || stages[0];

  // Events scheduled for this stage
  const stageSchedules = useMemo(() => {
    return schedules
      .filter(s => s.stage_number === currentStageNumber)
      .map(s => {
        const item = s.item || allItems.find(i => Number(i.item_id) === Number(s.item_id));
        const regs = allRegistrations.filter(r => Number(r.item_id) === Number(s.item_id));
        const itemCodeLetters = codeLetters.filter(cl => Number(cl.item_id) === Number(s.item_id));
        const allocatedCount = regs.filter(r => {
          const cleanChest = (r.chest_no || '').trim().toUpperCase();
          return Boolean(r.code_letter) || itemCodeLetters.some(cl => (cl.chest_no || '').trim().toUpperCase() === cleanChest);
        }).length;

        return {
          ...s,
          item,
          registrationsCount: regs.length,
          allocatedCount
        };
      })
      .sort((a, b) => new Date(a.starting).getTime() - new Date(b.starting).getTime());
  }, [schedules, currentStageNumber, allItems, allRegistrations, codeLetters]);

  // Selected event state for detail view
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const selectedSchedule = stageSchedules.find(s => Number(s.item_id) === Number(selectedEventId));
  const selectedItem = selectedSchedule?.item || allItems.find(i => Number(i.item_id) === Number(selectedEventId));

  // Live per-event loading state
  const [isLoadingParticipants, setIsLoadingParticipants] = useState<boolean>(false);

  // Fetch event-specific registrations, chest numbers, and code letters when event is selected
  useEffect(() => {
    if (!selectedEventId) return;
    let isCancelled = false;
    setIsLoadingParticipants(true);

    festService
      .fetchEventParticipantsData(selectedEventId)
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingParticipants(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedEventId, refreshKey]);

  // Registered participants for selected event
  const eventParticipants = useMemo(() => {
    if (!selectedEventId) return [];
    const eventRegs = allRegistrations.filter(r => Number(r.item_id) === Number(selectedEventId));

    return eventRegs.map(reg => {
      const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
      const stu = reg.student || findStudentByIdentifier(students, reg.chest_no, reg.college_affl_no);
      const cleanChest = (reg.chest_no || '').trim().toUpperCase();
      const letterEntry = codeLetters.find(
        cl => Number(cl.item_id) === Number(selectedEventId) && (cl.chest_no || '').trim().toUpperCase() === cleanChest
      );
      const activeCodeLetter = reg.code_letter || letterEntry?.code_letter || null;

      // Chest mapping lookup for cic_no
      const chestMapping = chestNosMapping.find(
        (cm: any) => (cm.chest_no || '').trim().toUpperCase() === cleanChest
      );

      return {
        registration: reg,
        college: col,
        student: stu,
        chestNo: reg.chest_no,
        canonicalChestNo: stu ? getCanonicalChestNo(stu) : (reg.chest_no || 'ST-N/A'),
        admissionNo: stu?.admission_no || stu?.cic_no || chestMapping?.cic_no || 'N/A',
        codeLetter: activeCodeLetter
      };
    });
  }, [selectedEventId, allRegistrations, colleges, students, codeLetters, chestNosMapping]);

  // Loading/busy feedback for code generation
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modal verification state
  const [verifyingParticipant, setVerifyingParticipant] = useState<any | null>(null);

  // Keep active verifying participant synced with live state
  const activeVerifyingParticipant = useMemo(() => {
    if (!verifyingParticipant) return null;
    const fresh = eventParticipants.find(
      p => (p.chestNo || '').trim().toUpperCase() === (verifyingParticipant.chestNo || '').trim().toUpperCase()
    );
    return fresh || verifyingParticipant;
  }, [verifyingParticipant, eventParticipants]);

  const showTemporaryMessage = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Random single participant code letter allocation (One-time only)
  const handleAssignRandomCode = async (chestNo: string, collegeAfflNo: number) => {
    if (!selectedEventId) return;
    setIsProcessing(true);
    try {
      const res = await festService.assignRandomCodeLetter(selectedEventId, collegeAfflNo, chestNo);
      if (res.success && res.codeLetter) {
        showTemporaryMessage(`Assigned Code Letter "${res.codeLetter}" to Chest ${chestNo}!`);
        triggerRefresh();
        // Update verifying participant state
        setVerifyingParticipant((prev: any) => (prev ? { ...prev, codeLetter: res.codeLetter } : null));
      } else {
        alert(res.error || 'Failed to assign code letter');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning random code letter');
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

  // Check if an event has overrun its scheduled ending time
  const checkIsOverrun = (endingTime?: string | null, status?: string) => {
    if (!endingTime || status === 'Ended') return false;
    return new Date(endingTime).getTime() < Date.now();
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
          <div className="relative overflow-hidden bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all">
            <TilePattern id="stage-venue-pattern" className="opacity-10 text-[var(--f-saffron)]" />

            <div className="relative z-10 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold shadow-2xs shrink-0">
                <Radio className="w-7 h-7 text-[var(--f-saffron-text)] animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] ring-2 ring-[var(--bg-surface)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase font-mono tracking-widest text-[var(--f-saffron-text)] font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse" />
                    STAGE {currentStage?.stage_number}
                  </span>
                  <Badge variant="saffron" size="sm" className="font-semibold">Active Venue</Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight mt-0.5">
                  {currentStage?.name || `Stage ${currentStageNumber}`}
                </h2>
                <p className="text-xs font-sans text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--f-saffron-text)]" />
                  <span>{currentStage?.location || 'Campus Fest Ground'}</span>
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-right">
                <span className="block text-[11px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">Events Scheduled</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] font-mono">{stageSchedules.length}</span>
              </div>
            </div>
          </div>

          {/* Events Schedule Table */}
          <Card className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base font-heading font-extrabold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--f-saffron)]" />
                  Scheduled Events on {currentStage?.name}
                </CardTitle>
                <CardDescription className="text-xs font-sans">
                  Click on any event row to view registered participants and allocate anonymous blind code letters (A, B, C...)
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">#</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Event Code</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">English Name</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Category</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Date</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Time Start</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Time End</TableHead>
                    <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Status</TableHead>
                    <TableHead className="text-center font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Code Letters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[var(--text-muted)] text-sm font-sans">
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
                          <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {item?.item_code || item?.code || `ITM-${sch.item_id}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-heading font-bold text-xs text-[var(--text-primary)]">
                              {item?.name_eng || item?.name || 'Fest Event'}
                            </div>
                            {item?.name_mal && (
                              <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5 font-normal">
                                {item.name_mal}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={item?.phase || item?.category || 'General'} />
                          </TableCell>
                          <TableCell className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap font-sans">
                            {formatDate(sch.starting)}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-[var(--f-saffron-text)] whitespace-nowrap">
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
                              className="text-xs font-heading font-semibold rounded-xl px-2.5 py-1.5 border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 focus:outline-none shadow-2xs"
                            >
                              <option value="Upcoming">Upcoming</option>
                              <option value="Starting_Soon">Starting Soon</option>
                              <option value="Next_Item">Next Event</option>
                              <option value="On_Going">On Going (Live)</option>
                              <option value="Ended">Ended</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-center">
                            {sch.registrationsCount === 0 ? (
                              <span className="text-[11px] text-[var(--text-muted)] font-mono">0/0</span>
                            ) : isComplete ? (
                              <Badge variant="saffron" size="sm" className="font-mono font-bold">
                                {sch.allocatedCount}/{sch.registrationsCount}
                              </Badge>
                            ) : sch.allocatedCount > 0 ? (
                              <Badge variant="amber" size="sm" className="font-mono font-bold">
                                {sch.allocatedCount}/{sch.registrationsCount}
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="text-[var(--text-muted)] font-mono font-bold">
                                0/{sch.registrationsCount}
                              </Badge>
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
        </div>
      )}

      {/* VIEW 2: Selected Event Details & Code Letter Allotment Console */}
      {selectedEventId && selectedItem && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedEventId(null)}
              className="inline-flex items-center gap-2 text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] hover:border-[var(--f-saffron)] bg-[var(--bg-surface)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {currentStage?.name} Events</span>
            </button>

            <button
              onClick={() => {
                if (selectedEventId) {
                  setIsLoadingParticipants(true);
                  festService.fetchEventParticipantsData(selectedEventId).finally(() => {
                    setIsLoadingParticipants(false);
                    triggerRefresh();
                  });
                }
              }}
              disabled={isLoadingParticipants}
              className="inline-flex items-center gap-2 text-xs font-heading font-semibold text-[var(--text-secondary)] hover:text-[var(--f-saffron-text)] hover:border-[var(--f-saffron)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] shadow-2xs transition-colors cursor-pointer"
              title="Refresh participants and code letters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingParticipants ? 'animate-spin text-[var(--f-saffron)]' : ''}`} />
              <span>Refresh Roster</span>
            </button>
          </div>

          {/* Event Header Card */}
          <div className="relative overflow-hidden bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold text-xl shadow-2xs shrink-0">
                  <Dices className="w-7 h-7 text-[var(--f-saffron-text)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)] bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                      {selectedItem.item_code || selectedItem.code}
                    </span>
                    <CategoryBadge category={selectedItem.phase || selectedItem.category} />
                    <Badge variant={selectedItem.point_type === 'group' ? 'purple' : 'secondary'}>
                      {selectedItem.point_type === 'group' ? 'Group Event' : 'Single Event'}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-heading font-extrabold text-[var(--text-primary)] mt-1.5 tracking-tight">
                    {selectedItem.name_eng || selectedItem.name}
                  </h2>
                  {selectedItem.name_mal && (
                    <p className="text-sm font-sans text-[var(--text-secondary)] mt-0.5">
                      {selectedItem.name_mal}
                    </p>
                  )}
                </div>
              </div>

              {/* Event Timing & Allocation Stats */}
              <div className="flex items-center gap-4 bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-subtle)] flex-wrap sm:flex-nowrap">
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">Scheduled Time</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                    {formatTime(selectedSchedule?.starting)} - {formatTime(selectedSchedule?.ending)}
                    {checkIsOverrun(selectedSchedule?.ending, selectedSchedule?.status) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Overrun
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">Letter Pool</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    {eventParticipants.length > 0
                      ? `A to ${String.fromCharCode(64 + Math.min(eventParticipants.length, 26))}`
                      : 'None'}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">Allocated</span>
                  <span className="text-xs font-mono font-bold text-[var(--f-saffron-text)]">
                    {eventParticipants.filter(p => Boolean(p.codeLetter)).length} / {eventParticipants.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-[var(--border-subtle)] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block mb-1">Stage Status</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSchedule?.status || 'Upcoming'}
                      onChange={(e) => handleStatusChange(Number(selectedItem.item_id), e.target.value as StageStatus)}
                      disabled={isProcessing}
                      className="text-xs font-heading font-bold rounded-xl px-2.5 py-1.5 border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer shadow-2xs focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Starting_Soon">Starting Soon</option>
                      <option value="Next_Item">Next Event</option>
                      <option value="On_Going">On Going (Live)</option>
                      <option value="Ended">Ended</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Table with Individual Random Selection & Verification Modal */}
          <Card className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base font-heading font-extrabold flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--f-saffron)]" />
                  Registered Participants & Code Letters
                </CardTitle>
                <CardDescription className="text-xs font-sans">
                  Click on a student row or the &quot;Draw Code&quot; button to verify participant credentials and allocate their anonymous blind code letter.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {isLoadingParticipants ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[var(--f-saffron)] animate-spin mx-auto" />
                  <p className="text-xs font-sans text-[var(--text-muted)]">
                    Loading registered participants and code letters from Supabase database...
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">#</TableHead>
                      <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Student Name</TableHead>
                      <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">College / Institution</TableHead>
                      <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Chest No</TableHead>
                      <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Adm / CIC No</TableHead>
                      <TableHead className="text-center font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Assigned Code Letter</TableHead>
                      <TableHead className="text-right w-44 font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventParticipants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-sm font-sans">
                          No students are currently registered for this event in the registrations table.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventParticipants.map((p, idx) => {
                        const student = p.student;
                        const college = p.college;
                        const hasCode = Boolean(p.codeLetter);

                        return (
                          <TableRow
                            key={p.registration.id || p.chestNo}
                            className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                            onClick={() => setVerifyingParticipant(p)}
                          >
                            <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs font-mono">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="font-heading font-bold text-xs text-[var(--text-primary)]">
                                {student?.full_name || student?.name || `Participant (${p.canonicalChestNo || p.chestNo})`}
                              </div>
                              <span className="text-[11px] font-sans text-[var(--text-muted)]">
                                {student?.category || student?.phase || selectedItem.phase || 'Senior'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-xs font-sans text-[var(--text-primary)]">
                                {college?.name || `College #${p.registration.college_affl_no}`}
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                Affl No: {p.registration.college_affl_no}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                              {p.canonicalChestNo}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                              {p.admissionNo}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasCode ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--f-saffron-text)]">
                                  <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
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
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {hasCode ? (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => setVerifyingParticipant(p)}
                                    className="gap-1.5 font-heading font-semibold border-amber-500/40 text-[var(--f-saffron-text)] hover:bg-amber-500/10 rounded-xl"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                                    <span>Verified ({p.codeLetter})</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="xs"
                                    variant="saffron"
                                    disabled={isProcessing}
                                    onClick={() => setVerifyingParticipant(p)}
                                    className="gap-1.5 font-heading font-bold shadow-sm cursor-pointer rounded-xl"
                                  >
                                    <Dices className="w-3.5 h-3.5" />
                                    <span>Draw Code</span>
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
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Participant Verification & Single Lot Draw Modal Popup */}
      {activeVerifyingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[var(--bg-elevated)] w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-elevated),var(--glass-highlight)] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-[var(--bg-subtle)] to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] border border-amber-500/30 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-[var(--text-primary)]">
                    Participant Verification
                  </h3>
                  <p className="text-xs font-sans text-[var(--text-muted)]">
                    Confirm scholar identity before drawing random code letter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerifyingParticipant(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                aria-label="Close participant verification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Verified Credentials */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs">
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">Candidate Name</span>
                  <span className="font-heading font-bold text-[var(--text-primary)] text-sm mt-0.5 block">
                    {activeVerifyingParticipant.student?.full_name || activeVerifyingParticipant.student?.name || `Participant (${activeVerifyingParticipant.canonicalChestNo})`}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">College / Institution</span>
                  <span className="font-semibold text-[var(--text-primary)] font-sans mt-0.5 block truncate">
                    {activeVerifyingParticipant.college?.name || `College #${activeVerifyingParticipant.registration.college_affl_no}`}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Affiliation: #{activeVerifyingParticipant.registration.college_affl_no}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">Chest Number</span>
                  <span className="font-mono font-bold text-sm text-[var(--f-saffron-text)] mt-0.5 block">
                    {activeVerifyingParticipant.canonicalChestNo || activeVerifyingParticipant.chestNo}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-heading font-semibold text-[var(--text-muted)] block">CIC / Admission No</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                    {activeVerifyingParticipant.admissionNo || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-heading font-semibold text-[var(--text-muted)] block">Event</span>
                    <span className="font-sans font-semibold text-[var(--text-primary)]">
                      {selectedItem?.item_code}: {selectedItem?.name_eng || selectedItem?.name}
                    </span>
                  </div>
                  <CategoryBadge category={selectedItem?.phase || selectedItem?.category || 'General'} />
                </div>
              </div>

              {/* Status Section */}
              {activeVerifyingParticipant.codeLetter ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--f-saffron)] text-[#090d1a] font-mono font-extrabold text-2xl shadow-md shadow-amber-500/25">
                    {activeVerifyingParticipant.codeLetter}
                  </div>
                  <div>
                    <span className="text-xs font-heading font-bold text-[var(--f-saffron-text)] block">
                      Code Letter Allotted: {activeVerifyingParticipant.codeLetter}
                    </span>
                    <p className="text-[11px] font-sans text-[var(--text-muted)] mt-1">
                      This participant has drawn their lot. Code letters are saved to the database. Re-rolls and resets are disabled.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[var(--f-saffron)] shrink-0 mt-0.5" />
                    <div className="text-xs font-sans">
                      <span className="font-heading font-bold text-[var(--f-saffron-text)] block">
                        One-Time Random Lot Draw
                      </span>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Verify the candidate credentials above before drawing. A single random letter from the unused pool (A - N) will be drawn and saved to the database.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerifyingParticipant(null)}
                className="text-xs font-heading"
              >
                {activeVerifyingParticipant.codeLetter ? 'Done' : 'Cancel'}
              </Button>

              {!activeVerifyingParticipant.codeLetter && (
                <Button
                  variant="saffron"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() =>
                    handleAssignRandomCode(
                      activeVerifyingParticipant.chestNo,
                      activeVerifyingParticipant.registration.college_affl_no
                    )
                  }
                  className="gap-2 text-xs font-heading font-bold shadow-md cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Drawing...</span>
                    </>
                  ) : (
                    <>
                      <Dices className="w-4 h-4" />
                      <span>Confirm & Draw Random Code</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
