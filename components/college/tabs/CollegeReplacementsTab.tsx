'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Search,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Replacement, Student, Registration, Item, College } from '@/lib/types/fest';

interface CollegeReplacementsTabProps {
  replacements: Replacement[];
  students: Student[];
  college?: College;
  allItems: Item[];
  registrations: Registration[];
  onRefresh?: () => void;
  onOpenReplacementModal: () => void;
}

export function CollegeReplacementsTab({
  replacements,
  students,
  college,
  allItems,
  registrations,
  onRefresh,
  onOpenReplacementModal
}: CollegeReplacementsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const pendingCount = replacements.filter(r => r.status === 'Pending').length;
  const approvedCount = replacements.filter(r => r.status === 'Approved').length;
  const rejectedCount = replacements.filter(r => r.status === 'Rejected').length;

  const filteredReplacements = replacements.filter(rep => {
    if (statusFilter !== 'All' && rep.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const origName = rep.original_student?.name || rep.original_student?.full_name || '';
    const repName = rep.replacement_student?.name || rep.replacement_student?.full_name || '';
    const reason = rep.reason || '';
    return origName.toLowerCase().includes(term) || repName.toLowerCase().includes(term) || reason.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-heading text-[var(--text-primary)]">
              Participant Emergency Substitutions
            </h3>
            <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
              Request medical or emergency participant replacements for registered arts fest events
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenReplacementModal}
          variant="saffron"
          className="font-heading font-bold text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Request New Replacement
        </Button>
      </div>

      {/* Minimalist Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-2xs flex items-center justify-between backdrop-blur-md">
          <div>
            <p className="text-[10px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Requests</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">{replacements.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border-subtle)]">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-2xs flex items-center justify-between backdrop-blur-md">
          <div>
            <p className="text-[10px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pending Review</p>
            <p className="text-xl font-bold font-mono text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] mt-1">{pendingCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] flex items-center justify-center border border-amber-500/25">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-2xs flex items-center justify-between backdrop-blur-md">
          <div>
            <p className="text-[10px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">Approved</p>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] shadow-2xs flex items-center justify-between backdrop-blur-md">
          <div>
            <p className="text-[10px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">Rejected</p>
            <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/25">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Replacements Table Card */}
      <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
                </span>
                <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
                  Replacement History
                </CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
                Track status of participant emergency substitution requests submitted for Admin verification
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search student or reason..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl pl-8 pr-3 py-1.5 text-xs font-sans text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-3 py-1.5 text-xs font-heading font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead>Original Participant</TableHead>
                <TableHead>Replacement Participant</TableHead>
                <TableHead>Reason / Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReplacements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-heading font-semibold text-[var(--text-secondary)]">No replacement requests found</p>
                      <p className="text-[11px] font-sans text-[var(--text-muted)] max-w-sm mx-auto">
                        {searchTerm || statusFilter !== 'All'
                          ? 'Try changing your search keywords or status filter options.'
                          : 'You have not submitted any Participant Replacement requests yet.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReplacements.map(rep => (
                  <TableRow key={rep.id}>
                    <TableCell>
                      <div className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                        {rep.original_student?.name || rep.original_student?.full_name || rep.original_student_id}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        {(rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no)
                          ? `CIC: ${rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no}`
                          : `ID: ${rep.original_student_id}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                        <div>
                          <div className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                            {rep.replacement_student?.name || rep.replacement_student?.full_name || rep.replacement_student_id}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            {(rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no)
                              ? `CIC: ${rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no}`
                              : `ID: ${rep.replacement_student_id}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-2 text-[var(--text-secondary)] font-sans text-[11px]">{rep.reason}</p>
                    </TableCell>
                    <TableCell>
                      {rep.status === 'Approved' ? (
                        <Badge variant="emerald" size="sm" className="font-mono font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Approved
                        </Badge>
                      ) : rep.status === 'Rejected' ? (
                        <Badge variant="rose" size="sm" className="font-mono font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Rejected
                        </Badge>
                      ) : (
                        <Badge variant="saffron" size="sm" className="font-mono font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)] font-mono text-[10px]">
                      {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
