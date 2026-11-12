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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type SortField = 'none' | 'cic_no' | 'class' | 'category';
export type SortDirection = 'asc' | 'desc';

interface StudentsListTableProps {
  college?: College;
  collegeAfflNo: number;
  className?: string;
}

function PhaseBadge({ phase }: { phase?: string }) {
  const code = (phase || '—').trim().toUpperCase();
  let variant: 'category-foundation' | 'category-thamheediyya' | 'category-aliya' | 'category-pg' | 'category-general' = 'category-general';

  if (code === 'FD') variant = 'category-foundation';
  else if (code === 'TH') variant = 'category-thamheediyya';
  else if (code === 'AL') variant = 'category-aliya';
  else if (code === 'PG') variant = 'category-pg';

  return (
    <Badge variant={variant} size="sm" className="font-mono font-bold tracking-wider">
      {code}
    </Badge>
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
  const [sortField, setSortField] = useState<SortField>('none');
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
        setSortField('none');
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Search across student name OR CIC number through one space
  const filteredAndSorted = useMemo(() => {
    let list = students;

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
    if (sortField !== 'none') {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'cic_no') {
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
    }

    return list;
  }, [students, searchQuery, sortField, sortDirection]);

  // Render sorting icon with active state
  const renderSortIcon = (field: SortField) => {
    const isActive = sortField === field;
    if (isActive) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
    );
  };

  const collegeDisplayName =
    college?.name ||
    (collegeAfflNo ? `Institution #${collegeAfflNo}` : 'College Portal');

  return (
    <Card className={`[box-shadow:var(--shadow-card),var(--glass-highlight)] ${className}`}>
      {/* Header Bar: Title and Search Bar */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Students List
            </CardTitle>
            {isLoading && (
              <Badge variant="saffron" size="sm" className="font-sans flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing...
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
            {collegeDisplayName}
            {college?.short_name && ` (${college.short_name})`} •{' '}
            <span className="text-[var(--text-primary)] font-semibold font-mono">
              {students.length}
            </span>{' '}
            students enrolled
          </CardDescription>
        </div>

        {/* Right side: Search bar */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Name or CIC..."
              className="w-full bg-[var(--bg-subtle)]/75 hover:bg-[var(--bg-surface)] focus:bg-[var(--bg-surface)] border border-[var(--border-medium)] focus:border-[var(--f-saffron)] rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all font-sans font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Table Container */}
        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-x-auto">
          <TableHeader>
            <TableRow>
              {/* Column 1: # (Serial Number) */}
              <TableHead className="w-12 text-center whitespace-nowrap">#</TableHead>

              {/* Column 2: Name */}
              <TableHead className="w-[38%]">Name</TableHead>

              {/* Column 3: CIC No */}
              <TableHead
                onClick={() => handleSort('cic_no')}
                className="whitespace-nowrap cursor-pointer select-none hover:text-[var(--f-saffron)] transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>CIC No</span>
                  {renderSortIcon('cic_no')}
                </div>
              </TableHead>

              {/* Column 4: Class */}
              <TableHead
                onClick={() => handleSort('class')}
                className="whitespace-nowrap cursor-pointer select-none hover:text-[var(--f-saffron)] transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Class</span>
                  {renderSortIcon('class')}
                </div>
              </TableHead>

              {/* Column 5: Category */}
              <TableHead
                onClick={() => handleSort('category')}
                className="whitespace-nowrap cursor-pointer select-none hover:text-[var(--f-saffron)] transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {renderSortIcon('category')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 px-6 text-center text-[var(--text-muted)]"
                >
                  <div className="max-w-xs mx-auto space-y-2">
                    <UserCheck className="w-8 h-8 text-[var(--text-muted)] opacity-50 mx-auto" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      {searchQuery
                        ? `No students matching "${searchQuery}"`
                        : 'No students enrolled for this institution'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[var(--f-saffron-text)] hover:underline font-semibold font-sans"
                      >
                        Clear search query
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((student, idx) => {
                const cicNumber =
                  student.admission_no ??
                  student.cic_no ??
                  student.cic_number ??
                  '—';
                const phaseCode = student.phase || student.category || '—';
                const serialNumber = idx + 1;

                return (
                  <TableRow
                    key={student.id || `stu-${idx}`}
                  >
                    {/* # (Serial number) */}
                    <TableCell className="text-center font-mono font-semibold text-[var(--text-muted)] text-xs sm:text-sm">
                      {serialNumber}
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm uppercase tracking-wide">
                        {student.name || student.full_name || 'N/A'}
                      </div>
                    </TableCell>

                    {/* CIC No */}
                    <TableCell className="font-mono font-semibold text-[var(--text-secondary)] text-xs sm:text-sm tracking-wider">
                      {cicNumber}
                    </TableCell>

                    {/* Class */}
                    <TableCell className="font-sans font-medium text-[var(--text-secondary)] text-xs sm:text-sm">
                      {student.class || '—'}
                    </TableCell>

                    {/* Category (Phase short form e.g. FD, AL, TH, PG) */}
                    <TableCell>
                      <PhaseBadge phase={phaseCode} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)] pt-2 px-1">
          <div>
            Showing{' '}
            <span className="text-[var(--text-primary)] font-mono font-semibold">
              {filteredAndSorted.length}
            </span>{' '}
            of{' '}
            <span className="text-[var(--text-primary)] font-mono font-semibold">
              {students.length}
            </span>{' '}
            students
            {searchQuery && (
              <span>
                {' '}
                matching &ldquo;<span className="text-[var(--text-primary)] font-medium">{searchQuery}</span>&rdquo;
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--text-muted)]">
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
              className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--f-saffron)] transition-colors cursor-pointer font-sans"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
