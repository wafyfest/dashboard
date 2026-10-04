'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  UserCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Student, College } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';

export type SortField = 'index' | 'name' | 'cic_no' | 'class' | 'category';
export type SortDirection = 'asc' | 'desc';

interface StudentsListTableProps {
  college?: College;
  collegeAfflNo: number;
  className?: string;
}

function PhaseBadge({ phase }: { phase?: string }) {
  const code = (phase || '—').trim().toUpperCase();

  const getStyle = () => {
    switch (code) {
      case 'FD':
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'TH':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'AL':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      case 'PG':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono tracking-wider border shadow-2xs ${getStyle()}`}
    >
      {code}
    </span>
  );
}

export function StudentsListTable({
  college,
  collegeAfflNo,
  className = ''
}: StudentsListTableProps) {
  const [students, setStudents] = useState<Student[]>(() =>
    festService.getStudents(collegeAfflNo)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Load students for this college (cached first, then sync with Supabase)
  useEffect(() => {
    let isMounted = true;
    const initial = festService.getStudents(collegeAfflNo);
    setStudents(initial);

    if (collegeAfflNo) {
      setIsLoading(true);
      festService
        .fetchStudentsForCollege(collegeAfflNo)
        .then(fresh => {
          if (isMounted && fresh && fresh.length > 0) {
            setStudents(fresh);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [collegeAfflNo]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField('index');
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Search across student name OR CIC number through one space
  const filteredAndSorted = useMemo(() => {
    let list = students.map((s, idx) => ({ ...s, originalIndex: idx + 1 }));

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean);
      list = list.filter(student => {
        const name = (student.name || student.full_name || '').toLowerCase();
        const cic = String(
          student.admission_no ?? student.cic_no ?? student.cic_number ?? ''
        ).toLowerCase();
        const cls = String(student.class || '').toLowerCase();
        const phase = String(student.phase || student.category || '').toLowerCase();

        return tokens.every(
          t => name.includes(t) || cic.includes(t) || cls.includes(t) || phase.includes(t)
        );
      });
    }

    // Sort list
    if (sortField !== 'index') {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') {
          const nameA = (a.name || a.full_name || '').toLowerCase();
          const nameB = (b.name || b.full_name || '').toLowerCase();
          cmp = nameA.localeCompare(nameB);
        } else if (sortField === 'cic_no') {
          const cicA = Number(a.admission_no ?? a.cic_no ?? a.cic_number ?? 0);
          const cicB = Number(b.admission_no ?? b.cic_no ?? b.cic_number ?? 0);
          if (isNaN(cicA) || isNaN(cicB)) {
            cmp = String(a.admission_no ?? '').localeCompare(String(b.admission_no ?? ''));
          } else {
            cmp = cicA - cicB;
          }
        } else if (sortField === 'class') {
          const clsA = String(a.class || '').toLowerCase();
          const clsB = String(b.class || '').toLowerCase();
          cmp = clsA.localeCompare(clsB, undefined, { numeric: true });
        } else if (sortField === 'category') {
          const catA = String(a.phase || a.category || '').toLowerCase();
          const catB = String(b.phase || b.category || '').toLowerCase();
          cmp = catA.localeCompare(catB);
        }

        return sortDirection === 'desc' ? -cmp : cmp;
      });
    } else {
      if (sortDirection === 'desc') {
        list.reverse();
      }
    }

    return list;
  }, [students, searchQuery, sortField, sortDirection]);

  // Render sorting icon with active state
  const renderSortIcon = (field: SortField) => {
    const isActive = sortField === field;
    if (isActive) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
    );
  };

  const collegeDisplayName =
    college?.name ||
    (collegeAfflNo ? `Institution #${collegeAfflNo}` : 'College Portal');

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-card ${className}`}
    >
      {/* Header Bar: Title and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#132238]">
              Students List
            </h2>
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {collegeDisplayName}
            {college?.short_name && ` (${college.short_name})`} •{' '}
            <span className="text-slate-700 font-semibold">
              {students.length} students enrolled
            </span>
          </p>
        </div>

        {/* Right side: Search bar (Add student button removed as requested) */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72 md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Name or CIC..."
              className="w-full bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#132238] rounded-xl px-4 py-2.5 text-sm text-[#132238] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#132238] transition-all pr-10 font-medium"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                {/* Column 1: # (Serial Number) */}
                <th
                  onClick={() => handleSort('index')}
                  className="py-3.5 px-4 sm:px-6 w-16 cursor-pointer select-none hover:text-[#132238] transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>#</span>
                    {renderSortIcon('index')}
                  </div>
                </th>

                {/* Column 2: Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 sm:px-6 cursor-pointer select-none hover:text-[#132238] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>Name</span>
                    {renderSortIcon('name')}
                  </div>
                </th>

                {/* Column 3: CIC No */}
                <th
                  onClick={() => handleSort('cic_no')}
                  className="py-3.5 px-4 sm:px-6 cursor-pointer select-none hover:text-[#132238] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>CIC No</span>
                    {renderSortIcon('cic_no')}
                  </div>
                </th>

                {/* Column 4: Class */}
                <th
                  onClick={() => handleSort('class')}
                  className="py-3.5 px-4 sm:px-6 cursor-pointer select-none hover:text-[#132238] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>Class</span>
                    {renderSortIcon('class')}
                  </div>
                </th>

                {/* Column 5: Category */}
                <th
                  onClick={() => handleSort('category')}
                  className="py-3.5 px-4 sm:px-6 cursor-pointer select-none hover:text-[#132238] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 px-6 text-center text-slate-400"
                  >
                    <div className="max-w-xs mx-auto space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">
                        {searchQuery
                          ? `No students matching "${searchQuery}"`
                          : 'No students enrolled for this institution'}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
                        >
                          Clear search query
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((student, idx) => {
                  const cicNumber =
                    student.admission_no ??
                    student.cic_no ??
                    student.cic_number ??
                    '—';
                  const phaseCode = student.phase || student.category || '—';
                  const serialNumber =
                    sortField === 'index'
                      ? student.originalIndex
                      : idx + 1;

                  return (
                    <tr
                      key={student.id || `stu-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* # (Serial number) */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-500 text-sm">
                        {serialNumber}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-[#132238] text-sm uppercase tracking-wide">
                          {student.name || student.full_name || 'N/A'}
                        </div>
                      </td>

                      {/* CIC No */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-700 text-sm font-mono tracking-wider">
                        {cicNumber}
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-700 text-sm">
                        {student.class || '—'}
                      </td>

                      {/* Category (Phase short form e.g. FD, AL, TH, PG) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <PhaseBadge phase={phaseCode} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <div>
          Showing{' '}
          <span className="text-[#132238] font-semibold">
            {filteredAndSorted.length}
          </span>{' '}
          of{' '}
          <span className="text-[#132238] font-semibold">
            {students.length}
          </span>{' '}
          students
          {searchQuery && (
            <span>
              {' '}
              matching &ldquo;<span className="text-slate-800 font-medium">{searchQuery}</span>&rdquo;
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Click column headers to sort ascending / descending
          </span>
          <button
            onClick={() => {
              setIsLoading(true);
              festService
                .fetchStudentsForCollege(collegeAfflNo)
                .then(fresh => {
                  if (fresh && fresh.length > 0) setStudents(fresh);
                })
                .finally(() => setIsLoading(false));
            }}
            title="Refresh student roster"
            className="flex items-center gap-1 text-slate-500 hover:text-[#132238] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
