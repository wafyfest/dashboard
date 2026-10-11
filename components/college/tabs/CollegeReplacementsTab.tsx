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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Participant Emergency Substitutions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Request medical or emergency participant replacements for registered arts fest events
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenReplacementModal}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium text-xs px-4 py-2 rounded-xl shadow-2xs flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Request New Replacement
        </Button>
      </div>

      {/* Minimalist Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Requests</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{replacements.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{pendingCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{approvedCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rejected</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Replacements Table Card */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Replacement History</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track status of participant emergency substitution requests submitted for Admin verification
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or reason..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {filteredReplacements.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No replacement requests found</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'All'
                  ? 'Try changing your search keywords or status filter options.'
                  : 'You have not submitted any participant substitution requests yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Original Participant</th>
                  <th className="py-3 px-4">Replacement Participant</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requested On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                {filteredReplacements.map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {rep.original_student?.name || rep.original_student?.full_name || rep.original_student_id}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {(rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no)
                          ? `CIC: ${rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no}`
                          : `ID: ${rep.original_student_id}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {rep.replacement_student?.name || rep.replacement_student?.full_name || rep.replacement_student_id}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {(rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no)
                              ? `CIC: ${rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no}`
                              : `ID: ${rep.replacement_student_id}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-500 dark:text-slate-400 text-[11px]">{rep.reason}</p>
                    </td>
                    <td className="py-3 px-4">
                      {rep.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                        </span>
                      ) : rep.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <XCircle className="w-3 h-3 text-rose-500" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 text-amber-500" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px]">
                      {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
