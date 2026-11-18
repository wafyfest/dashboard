'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  UserX,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  Users,
  CheckCircle2,
  EyeOff,
  Ban,
  Info,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { BlockedStudent, Student, College, isFestCommitteeBlock } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';

const STANDARD_REASONS = [
  {
    value: 'Fest Committee',
    label: 'Fest Committee Member',
    description: 'Completely omitted and hidden from event registrations, volunteers, and student directory.',
    category: 'committee'
  },
  {
    value: 'Disciplinary Action',
    label: 'Disciplinary Action',
    description: 'Visible in registration picker with disabled "Blocked" UI. Prohibited from registering.',
    category: 'student_block'
  },
  {
    value: 'Malpractice',
    label: 'Malpractice / Ethics Violation',
    description: 'Visible in registration picker with disabled "Blocked" UI. Prohibited from registering.',
    category: 'student_block'
  },
  {
    value: 'Suspended',
    label: 'Student Suspension',
    description: 'Visible in registration picker with disabled "Blocked" UI. Prohibited from registering.',
    category: 'student_block'
  },
  {
    value: 'Eligibility / Verification Issue',
    label: 'Eligibility / Verification Issue',
    description: 'Visible in registration picker with disabled "Blocked" UI. Prohibited from registering.',
    category: 'student_block'
  },
  {
    value: 'Other',
    label: 'Other (Custom Scenario)',
    description: 'Specify a custom blocking reason. Shown with disabled "Blocked" UI.',
    category: 'other'
  }
];

export function BlockedStudentsTab() {
  const { refreshKey, triggerRefresh } = useFest();
  const [blockedList, setBlockedList] = useState<BlockedStudent[]>(() => festService.getBlockedStudents());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string>('all');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>('all');

  // Modal states: Add
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedCollegeForAdd, setSelectedCollegeForAdd] = useState<number | ''>('');
  const [studentSearchForAdd, setStudentSearchForAdd] = useState<string>('');
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<Student | null>(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState<string>('Fest Committee');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [blockNotes, setBlockNotes] = useState<string>('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState<boolean>(false);

  // Modal states: Edit
  const [editingBlock, setEditingBlock] = useState<BlockedStudent | null>(null);
  const [editReasonPreset, setEditReasonPreset] = useState<string>('');
  const [editCustomReason, setEditCustomReason] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Modal states: Unblock
  const [unblockingTarget, setUnblockingTarget] = useState<BlockedStudent | null>(null);
  const [isSubmittingUnblock, setIsSubmittingUnblock] = useState<boolean>(false);

  const colleges: College[] = useMemo(() => festService.getColleges(), [refreshKey]);
  const allStudents: Student[] = useMemo(() => festService.getStudents(), [refreshKey]);

  // Sync blocked students from server
  const loadBlockedStudents = async () => {
    setIsLoading(true);
    try {
      const items = await festService.fetchBlockedStudents();
      setBlockedList(items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedStudents();
  }, [refreshKey]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = blockedList.length;
    let committeeCount = 0;
    let disciplinaryCount = 0;
    let otherCount = 0;

    for (const b of blockedList) {
      if (isFestCommitteeBlock(b.reason)) {
        committeeCount++;
      } else if (
        b.reason.toLowerCase().includes('disciplinary') ||
        b.reason.toLowerCase().includes('malpractice') ||
        b.reason.toLowerCase().includes('suspend')
      ) {
        disciplinaryCount++;
      } else {
        otherCount++;
      }
    }

    return { total, committeeCount, disciplinaryCount, otherCount };
  }, [blockedList]);

  // Filtered blocked items
  const filteredBlocked = useMemo(() => {
    return blockedList.filter(b => {
      // Reason filter
      if (selectedReasonFilter !== 'all') {
        if (selectedReasonFilter === 'committee' && !isFestCommitteeBlock(b.reason)) return false;
        if (selectedReasonFilter === 'disciplinary' && !b.reason.toLowerCase().includes('disciplinary') && !b.reason.toLowerCase().includes('malpractice') && !b.reason.toLowerCase().includes('suspend')) return false;
        if (selectedReasonFilter === 'other' && (isFestCommitteeBlock(b.reason) || b.reason.toLowerCase().includes('disciplinary') || b.reason.toLowerCase().includes('malpractice') || b.reason.toLowerCase().includes('suspend'))) return false;
      }

      // College filter
      if (selectedCollegeFilter !== 'all') {
        if (Number(b.college_affl_no) !== Number(selectedCollegeFilter)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sName = (b.student?.name || (b as any).students?.name || '').toLowerCase();
        const cic = String(b.cic_no || '').toLowerCase();
        const reason = b.reason.toLowerCase();
        const notes = (b.notes || '').toLowerCase();
        const colName = (b.college?.name || '').toLowerCase();
        return (
          sName.includes(q) ||
          cic.includes(q) ||
          reason.includes(q) ||
          notes.includes(q) ||
          colName.includes(q)
        );
      }

      return true;
    });
  }, [blockedList, selectedReasonFilter, selectedCollegeFilter, searchQuery]);

  // Candidate students for the Add modal
  const candidateStudents = useMemo(() => {
    const blockedStudentIds = new Set(blockedList.map(b => b.student_id));
    return allStudents.filter(s => {
      if (blockedStudentIds.has(s.id)) return false;
      if (selectedCollegeForAdd !== '' && s.college_affl_no !== Number(selectedCollegeForAdd)) {
        return false;
      }
      if (studentSearchForAdd.trim()) {
        const q = studentSearchForAdd.toLowerCase().trim();
        const name = (s.full_name || s.name || '').toLowerCase();
        const cic = String(s.cic_no || s.admission_no || '').toLowerCase();
        const chest = String(s.chest_no || '').toLowerCase();
        return name.includes(q) || cic.includes(q) || chest.includes(q);
      }
      return true;
    });
  }, [allStudents, blockedList, selectedCollegeForAdd, studentSearchForAdd]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setSelectedCollegeForAdd('');
    setStudentSearchForAdd('');
    setSelectedStudentForAdd(null);
    setSelectedReasonPreset('Fest Committee');
    setCustomReasonText('');
    setBlockNotes('');
    setIsAddModalOpen(true);
  };

  // Submit Block
  const handleConfirmBlock = async () => {
    if (!selectedStudentForAdd) {
      alert('Please select a student to block.');
      return;
    }

    const effectiveReason =
      selectedReasonPreset === 'Other'
        ? customReasonText.trim() || 'Administrative Block'
        : selectedReasonPreset;

    setIsSubmittingBlock(true);
    try {
      const res = await festService.blockStudent({
        student_id: selectedStudentForAdd.id,
        reason: effectiveReason,
        notes: blockNotes.trim() || null
      });

      if (!res.success) {
        alert(`Failed to block student: ${res.error}`);
        return;
      }

      setIsAddModalOpen(false);
      await loadBlockedStudents();
      triggerRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to add student to blocklist'}`);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (b: BlockedStudent) => {
    setEditingBlock(b);
    const isPreset = STANDARD_REASONS.some(r => r.value === b.reason && r.value !== 'Other');
    if (isPreset) {
      setEditReasonPreset(b.reason);
      setEditCustomReason('');
    } else {
      setEditReasonPreset('Other');
      setEditCustomReason(b.reason);
    }
    setEditNotes(b.notes || '');
  };

  // Submit Edit
  const handleConfirmEdit = async () => {
    if (!editingBlock) return;
    const effectiveReason =
      editReasonPreset === 'Other'
        ? editCustomReason.trim() || 'Administrative Block'
        : editReasonPreset;

    setIsSubmittingEdit(true);
    try {
      const res = await festService.updateBlockedStudent(
        editingBlock.student_id,
        effectiveReason,
        editNotes.trim() || undefined
      );

      if (!res.success) {
        alert(`Failed to update block: ${res.error}`);
        return;
      }

      setEditingBlock(null);
      await loadBlockedStudents();
      triggerRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to update block'}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Unblock
  const handleConfirmUnblock = async () => {
    if (!unblockingTarget) return;

    setIsSubmittingUnblock(true);
    try {
      const res = await festService.unblockStudent(unblockingTarget.student_id);
      if (!res.success) {
        alert(`Failed to unblock: ${res.error}`);
        return;
      }

      setUnblockingTarget(null);
      await loadBlockedStudents();
      triggerRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to unblock student'}`);
    } finally {
      setIsSubmittingUnblock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-[var(--text-primary)] tracking-tight">
                Student Blocklist & Committee Controls
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
                Manage restricted students, Fest Committee exclusions, and disciplinary participant blocks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBlockedStudents}
            disabled={isLoading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-heading font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add to Blocklist
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Total Blocked
              </p>
              <h3 className="text-2xl font-mono font-bold text-[var(--text-primary)] mt-1">
                {metrics.total}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
              <Ban className="w-5 h-5 text-rose-500" />
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-muted)] mt-2">
            Active participant blocks
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Fest Committee
              </p>
              <h3 className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                {metrics.committeeCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <EyeOff className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-muted)] mt-2">
            Hidden completely from registration
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Disciplinary / Malpractice
              </p>
              <h3 className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                {metrics.disciplinaryCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-muted)] mt-2">
            Shown on registration with Blocked UI
          </p>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Other Scenarios
              </p>
              <h3 className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
                {metrics.otherCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Info className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-muted)] mt-2">
            Administrative & custom restrictions
          </p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student name, CIC, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Reason Filter */}
          <div>
            <Select
              value={selectedReasonFilter}
              onChange={e => setSelectedReasonFilter(e.target.value)}
              className="py-1.5 text-xs font-medium"
            >
              <option value="all">All Blocking Reasons</option>
              <option value="committee">Fest Committee (Hidden from reg)</option>
              <option value="disciplinary">Disciplinary & Malpractice</option>
              <option value="other">Other Administrative Blocks</option>
            </Select>
          </div>

          {/* College Filter */}
          <div>
            <Select
              value={selectedCollegeFilter}
              onChange={e => setSelectedCollegeFilter(e.target.value)}
              className="py-1.5 text-xs font-medium"
            >
              <option value="all">All Colleges / Affiliations</option>
              {colleges.map(c => (
                <option key={c.affl_no} value={c.affl_no}>
                  #{c.affl_no} - {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Blocked Students Table */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card)] rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-heading font-bold text-[var(--text-primary)]">
                Active Blocklist Directory
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                Showing {filteredBlocked.length} of {blockedList.length} restricted students
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && blockedList.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span>Loading blocked students directory...</span>
            </div>
          ) : filteredBlocked.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)]">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-70" />
              <p className="font-heading font-semibold text-[var(--text-primary)]">No blocked students match criteria</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {blockedList.length === 0
                  ? 'No students are currently blocked. Click "Add to Blocklist" above to restrict a student.'
                  : 'Try adjusting your search query or filter options.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student Name & Phase</TableHead>
                    <TableHead>CIC / Chest No</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Reason & Scenario</TableHead>
                    <TableHead>Notes & Date</TableHead>
                    <TableHead className="text-center w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocked.map((b, idx) => {
                    const student = b.student || (b as any).students;
                    const college = b.college || (b as any).colleges;
                    const isCommittee = isFestCommitteeBlock(b.reason);

                    return (
                      <TableRow key={b.id || b.student_id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                        <TableCell className="text-center font-mono text-xs text-[var(--text-muted)]">
                          {idx + 1}
                        </TableCell>

                        {/* Student */}
                        <TableCell>
                          <div>
                            <span className="font-heading font-bold text-xs text-[var(--text-primary)] block">
                              {student?.name || 'Unknown Student'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mt-0.5">
                              <span>Phase: {student?.phase || '—'}</span>
                              <span>•</span>
                              <span>Class: {student?.class || '—'}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* CIC / Chest */}
                        <TableCell>
                          <div className="font-mono text-xs text-[var(--text-primary)]">
                            <span className="font-bold">CIC: {b.cic_no}</span>
                            {student?.chest_no && (
                              <span className="text-[10.5px] text-[var(--text-muted)] block">
                                Chest: #{student.chest_no}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* College */}
                        <TableCell>
                          <div className="text-xs">
                            <span className="font-medium text-[var(--text-primary)] block truncate max-w-[200px]" title={college?.name}>
                              {college?.name || `College #${b.college_affl_no}`}
                            </span>
                            <span className="font-mono text-[10.5px] text-[var(--text-muted)]">
                              Affl #{b.college_affl_no}
                            </span>
                          </div>
                        </TableCell>

                        {/* Reason */}
                        <TableCell>
                          {isCommittee ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit"
                            >
                              <EyeOff className="w-3 h-3" />
                              {b.reason}
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit"
                            >
                              <Ban className="w-3 h-3" />
                              {b.reason}
                            </Badge>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)] block mt-1 font-mono">
                            {isCommittee ? 'Hidden from registration' : 'Registration Blocked UI'}
                          </span>
                        </TableCell>

                        {/* Notes & Date */}
                        <TableCell>
                          <div className="text-xs max-w-[220px]">
                            {b.notes ? (
                              <p className="text-[11px] text-[var(--text-secondary)] italic truncate" title={b.notes}>
                                &ldquo;{b.notes}&rdquo;
                              </p>
                            ) : (
                              <span className="text-[10.5px] text-[var(--text-muted)]">No remarks</span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-0.5">
                              {b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : '—'}
                              {b.blocked_by ? ` by ${b.blocked_by}` : ''}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleOpenEditModal(b)}
                              className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              title="Edit reason or notes"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setUnblockingTarget(b)}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                              title="Unblock student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL: ADD STUDENT TO BLOCKLIST                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmittingBlock && setIsAddModalOpen(false)}
        title="Add Student to Blocklist"
        description="Restrict a student from festival participation or mark as Fest Committee."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {/* Step 1: Filter by College & Search Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                Filter by College (Optional)
              </label>
              <select
                value={selectedCollegeForAdd}
                onChange={e => {
                  setSelectedCollegeForAdd(e.target.value === '' ? '' : Number(e.target.value));
                  setSelectedStudentForAdd(null);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
              >
                <option value="">All Colleges</option>
                {colleges.map(c => (
                  <option key={c.affl_no} value={c.affl_no}>
                    #{c.affl_no} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                Search Student (Name / CIC)
              </label>
              <input
                type="text"
                placeholder="Type name or CIC number..."
                value={studentSearchForAdd}
                onChange={e => setStudentSearchForAdd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          {/* Student Picker List */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
              Select Student ({candidateStudents.length} candidates)
            </label>
            <div className="max-h-40 overflow-y-auto border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {candidateStudents.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                  No eligible students found matching filter
                </div>
              ) : (
                candidateStudents.slice(0, 50).map(s => {
                  const isSelected = selectedStudentForAdd?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudentForAdd(s)}
                      className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-rose-500/15 border-l-4 border-l-rose-500'
                          : 'hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div>
                        <span className="font-heading font-bold text-[var(--text-primary)] block">
                          {s.full_name || s.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-muted)] font-mono mt-0.5">
                          <span>CIC: {s.cic_no || s.admission_no}</span>
                          <span>•</span>
                          <span>Affl #{s.college_affl_no}</span>
                          <span>•</span>
                          <span>{s.phase || 'General'}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {candidateStudents.length > 50 && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Showing top 50 matches. Type in search box to refine.
              </p>
            )}
          </div>

          {/* Step 2: Choose Blocking Reason */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
              Blocking Reason / Scenario
            </label>
            <div className="space-y-2">
              {STANDARD_REASONS.map(r => (
                <label
                  key={r.value}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedReasonPreset === r.value
                      ? 'bg-rose-500/[0.08] border-rose-500/40'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="blockReason"
                    value={r.value}
                    checked={selectedReasonPreset === r.value}
                    onChange={() => setSelectedReasonPreset(r.value)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500 accent-rose-600"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--text-primary)] block">
                      {r.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                      {r.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {selectedReasonPreset === 'Other' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="Specify custom blocking reason..."
                  value={customReasonText}
                  onChange={e => setCustomReasonText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
                />
              </div>
            )}
          </div>

          {/* Step 3: Admin Notes */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
              Administrative Notes & Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Committee department, decision minute order number, or reason details..."
              value={blockNotes}
              onChange={e => setBlockNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Policy Information Box */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Preservation of Existing Records</p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                Existing registrations are preserved as-is. This action strictly prevents any new registrations or additions for this student.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmittingBlock}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmBlock}
              disabled={!selectedStudentForAdd || isSubmittingBlock}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmittingBlock ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                'Confirm & Add to Blocklist'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT BLOCK                                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!editingBlock}
        onClose={() => !isSubmittingEdit && setEditingBlock(null)}
        title="Edit Block Details"
        description="Update blocking reason or administrative remarks."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {editingBlock && (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs">
              <span className="font-heading font-bold text-[var(--text-primary)] block">
                {editingBlock.student?.name || (editingBlock as any).students?.name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                CIC: {editingBlock.cic_no} • College #{editingBlock.college_affl_no}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
              Blocking Reason
            </label>
            <select
              value={editReasonPreset}
              onChange={e => setEditReasonPreset(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
            >
              {STANDARD_REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {editReasonPreset === 'Other' && (
              <input
                type="text"
                placeholder="Specify custom reason..."
                value={editCustomReason}
                onChange={e => setEditCustomReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
              />
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
              Administrative Remarks / Notes
            </label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingBlock(null)}
              disabled={isSubmittingEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmEdit}
              disabled={isSubmittingEdit}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: UNBLOCK CONFIRMATION                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!unblockingTarget}
        onClose={() => !isSubmittingUnblock && setUnblockingTarget(null)}
        title="Unblock Student Confirmation"
        maxWidth="sm"
      >
        <div className="space-y-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Confirm Removal from Blocklist</p>
              <p className="text-[11px] mt-0.5">
                Are you sure you want to unblock{' '}
                <strong>{unblockingTarget?.student?.name || (unblockingTarget as any)?.students?.name || 'this participant'}</strong> (CIC: {unblockingTarget?.cic_no})?
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            The student will immediately become eligible to participate and register for festival events and volunteer assignments.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnblockingTarget(null)}
              disabled={isSubmittingUnblock}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUnblock}
              disabled={isSubmittingUnblock}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmittingUnblock ? 'Unblocking...' : 'Yes, Unblock Student'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
