'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  X,
  FileText,
  UserCheck,
  Loader2,
  Printer,
  Sparkles
} from 'lucide-react';
import { Student, College, Registration, FestSettings } from '@/lib/types/fest';
import { generateAdmitCardPdf } from '@/lib/utils/admitCardPdf';
import { getCanonicalChestNo, registrationContainsStudent } from '@/lib/utils/studentIdentity';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdmitCardTableProps {
  students: Student[];
  college?: College;
  collegeAfflNo: number;
  registrations: Registration[];
  festSettings?: FestSettings;
  className?: string;
}

export function AdmitCardTable({
  students,
  college,
  collegeAfflNo,
  registrations,
  festSettings,
  className = ''
}: AdmitCardTableProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Derive stable canonical chest number for each student
  const getChestNo = (student: Student): string => {
    return getCanonicalChestNo(student);
  };

  // Filter students to ONLY those who have active registrations (O(1) Set lookup)
  const registeredStudents = useMemo(() => {
    if (!students || students.length === 0 || !registrations || registrations.length === 0) {
      return [];
    }

    const registeredKeys = new Set<string>();
    registrations.forEach(r => {
      if (r.chest_no) registeredKeys.add(r.chest_no.trim().toUpperCase());
      if (r.student?.id) registeredKeys.add(r.student.id);
      if (r.student?.chest_no) registeredKeys.add(r.student.chest_no.trim().toUpperCase());
      r.participants?.forEach(p => {
        if (p.id) registeredKeys.add(p.id);
        if (p.chest_no) registeredKeys.add(p.chest_no.trim().toUpperCase());
        const cic = p.admission_no ?? p.cic_no ?? p.cic_number;
        if (cic) registeredKeys.add(String(cic).trim().toUpperCase());
      });
    });

    return students.filter(student => {
      if (student.id && registeredKeys.has(student.id)) return true;
      const chest = getCanonicalChestNo(student).toUpperCase();
      if (chest !== '—' && registeredKeys.has(chest)) return true;
      const cic = String(student.admission_no ?? student.cic_no ?? student.cic_number ?? '').trim().toUpperCase();
      if (cic && registeredKeys.has(cic)) return true;
      return registrationContainsStudent(registrations[0], student, students);
    });
  }, [students, registrations]);

  // Search filter across Name, CIC No, or Chest No for registered students only
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return registeredStudents;

    const tokens = query.split(/\s+/).filter(Boolean);

    return registeredStudents.filter(student => {
      const name = (student.name || student.full_name || '').toLowerCase();
      const cic = String(
        student.admission_no ?? student.cic_no ?? student.cic_number ?? ''
      ).toLowerCase();
      const chest = getChestNo(student).toLowerCase();

      return tokens.every(
        t => name.includes(t) || cic.includes(t) || chest.includes(t)
      );
    });
  }, [registeredStudents, searchQuery]);

  // Handle single student PDF download
  const handleDownload = async (student: Student, idx: number) => {
    try {
      setDownloadingId(student.id || `idx-${idx}`);

      // Filter registrations specifically for this student
      const studentRegs = registrations.filter(r => registrationContainsStudent(r, student, students));
      const chestNo = getChestNo(student);

      const doc = generateAdmitCardPdf({
        student,
        college,
        registrations: studentRegs,
        festSettings,
        chestNo
      });

      const cleanName = (student.name || student.full_name || 'student')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const cic = student.admission_no ?? student.cic_no ?? 'admit';

      doc.save(`Admit_Card_${cleanName}_${cic}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
      }, 600);
    }
  };

  // Handle download all filtered admit cards into individual files
  const handleDownloadAll = async () => {
    if (filteredStudents.length === 0) return;
    for (let i = 0; i < Math.min(filteredStudents.length, 25); i++) {
      const stu = filteredStudents[i];
      await handleDownload(stu, i);
    }
  };

  return (
    <Card className={`[box-shadow:var(--shadow-card),var(--glass-highlight)] ${className}`}>
      {/* Header section with Bulk Download Button */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Admit Card Generation
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Download the official admit card for any registered participant from your college.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Badge variant="saffron" size="md" className="font-mono font-bold">
            {registeredStudents.length} Registered
          </Badge>
          <Button
            variant="saffron"
            size="sm"
            onClick={handleDownloadAll}
            disabled={filteredStudents.length === 0 || downloadingId !== null}
            title="Batch Download Filtered Admit Cards"
            className="font-heading font-bold"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Batch Download (PDF)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar with Glass Surface */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name, CIC No, or Chest No..."
            className="w-full bg-[var(--bg-subtle)]/75 hover:bg-[var(--bg-surface)] focus:bg-[var(--bg-surface)] border border-[var(--border-medium)] focus:border-[var(--f-saffron)] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-all font-sans font-medium"
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

        {/* Modern Glass Table */}
        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Participant Name</TableHead>
              <TableHead>CIC Identifier</TableHead>
              <TableHead>Chest Number</TableHead>
              <TableHead className="text-right w-36">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                  <div className="max-w-md mx-auto space-y-2">
                    <UserCheck className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      {searchQuery
                        ? `No registered participants matching "${searchQuery}"`
                        : 'No registered participants found. Admit cards are generated only for students registered in events.'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[var(--f-saffron-text)] hover:underline font-semibold font-sans"
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student, idx) => {
                const cicNumber =
                  student.admission_no ??
                  student.cic_no ??
                  student.cic_number ??
                  '—';
                const chestNo = getChestNo(student);
                const isDownloading = downloadingId === (student.id || `idx-${idx}`);

                return (
                  <TableRow key={student.id || `stu-${idx}`}>
                    <TableCell className="font-mono text-xs text-[var(--text-muted)]">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-heading font-bold text-[var(--text-primary)] uppercase tracking-wide text-xs sm:text-sm">
                        {student.name || student.full_name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-[var(--text-secondary)] text-xs sm:text-sm tracking-wider">
                      {cicNumber}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] text-xs sm:text-sm tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25">
                        {chestNo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="saffron"
                        size="xs"
                        onClick={() => handleDownload(student, idx)}
                        disabled={isDownloading}
                        title="Download Student Admit Card PDF"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)] pt-2 px-1">
          <div>
            Showing <strong className="text-[var(--text-primary)] font-mono">{filteredStudents.length}</strong> of{' '}
            <strong className="text-[var(--text-primary)] font-mono">{registeredStudents.length}</strong> registered participants
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Admit cards include candidate identity, category, and participating events roster.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
