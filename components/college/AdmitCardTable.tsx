'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  X,
  FileText,
  UserCheck,
  Loader2,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { Student, College, Registration, FestSettings } from '@/lib/types/fest';
import { generateAdmitCardPdf } from '@/lib/utils/admitCardPdf';

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

  // Derive stable chest number for each student
  const getChestNo = (student: Student, index: number): string => {
    if (student.chest_no && student.chest_no.trim() !== '') {
      return student.chest_no;
    }
    // Check if chest_no exists in registrations
    const reg = registrations.find(
      r => r.participants?.some(p => p.id === student.id) || r.chest_no
    );
    if (reg && reg.chest_no && reg.chest_no.trim() !== '') {
      return reg.chest_no;
    }
    // Stable default: college affl_no + 2-digit index e.g. 1101, 1102
    const affl = student.college_affl_no || collegeAfflNo || 11;
    return `${affl}${String(index + 1).padStart(2, '0')}`;
  };

  // Search filter across Name, CIC No, or Chest No
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;

    const tokens = query.split(/\s+/).filter(Boolean);

    return students.filter((student, idx) => {
      const name = (student.name || student.full_name || '').toLowerCase();
      const cic = String(
        student.admission_no ?? student.cic_no ?? student.cic_number ?? ''
      ).toLowerCase();
      const chest = getChestNo(student, idx).toLowerCase();

      return tokens.every(
        t => name.includes(t) || cic.includes(t) || chest.includes(t)
      );
    });
  }, [students, searchQuery, registrations, collegeAfflNo]);

  // Handle single student PDF download
  const handleDownload = async (student: Student, idx: number) => {
    try {
      setDownloadingId(student.id || `idx-${idx}`);

      // Filter registrations specifically for this student
      const studentRegs = registrations.filter(r =>
        r.participants?.some(p => p.id === student.id || p.chest_no === student.chest_no) ||
        (student.chest_no && r.chest_no === student.chest_no)
      );

      const chestNo = getChestNo(student, idx);

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
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-card ${className}`}
    >
      {/* Header section matching reference arrangement */}
      <div className="pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#132238]">
              Admit Card Generation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Download the official admit card for any registered participant from your college.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium px-2.5 py-1 rounded-lg bg-slate-100">
              {students.length} Participants
            </span>
          </div>
        </div>

        {/* Search Bar matching reference arrangement */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name, CIC No, or Chest No..."
            className="w-full bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#132238] rounded-xl px-4 py-3 text-sm text-[#132238] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#132238] transition-all pr-10 font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Main Table: #, Name, CIC No, Chest No, Action */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6 w-16">#</th>
                <th className="py-3.5 px-4 sm:px-6">Name</th>
                <th className="py-3.5 px-4 sm:px-6">CIC No</th>
                <th className="py-3.5 px-4 sm:px-6">Chest No</th>
                <th className="py-3.5 px-4 sm:px-6 text-right w-36">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">
                        {searchQuery
                          ? `No participants matching "${searchQuery}"`
                          : 'No participants available in this college roster'}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
                        >
                          Clear search filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const cicNumber =
                    student.admission_no ??
                    student.cic_no ??
                    student.cic_number ??
                    '—';
                  const chestNo = getChestNo(student, idx);
                  const isDownloading = downloadingId === (student.id || `idx-${idx}`);

                  return (
                    <tr
                      key={student.id || `stu-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* # (Serial No) */}
                      <td className="py-4 px-4 sm:px-6 font-semibold text-slate-500 text-sm">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-[#132238] text-sm uppercase tracking-wide">
                          {student.name || student.full_name || 'N/A'}
                        </div>
                      </td>

                      {/* CIC No */}
                      <td className="py-4 px-4 sm:px-6 font-semibold text-slate-700 text-sm font-mono tracking-wider">
                        {cicNumber}
                      </td>

                      {/* Chest No */}
                      <td className="py-4 px-4 sm:px-6 font-bold text-slate-900 text-sm font-mono tracking-wider">
                        {chestNo}
                      </td>

                      {/* Action Button: Download */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => handleDownload(student, idx)}
                          disabled={isDownloading}
                          title="Download Student Admit Card PDF"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
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
                        </button>
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
          Showing <span className="font-semibold text-slate-800">{filteredStudents.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{students.length}</span> registered participants
          {searchQuery && (
            <span>
              {' '}
              matching &ldquo;<span className="text-slate-800 font-medium">{searchQuery}</span>&rdquo;
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400">
          Admit cards include candidate identity, category, and participating events roster.
        </div>
      </div>
    </div>
  );
}
