'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge, ItemTypeBadge, ScreeningStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubmissionLinkModal, SubmissionLinkTarget } from '@/components/college/SubmissionLinkModal';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  Registration,
  Item,
  SubmissionEntry,
  ScreeningStatus,
  normalizeCategoryKey,
  getEffectiveStageMode,
  isSubmissionEvent,
  isScreeningEvent,
  requiresPreFestSubmission
} from '@/lib/types/fest';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { Search, Users, ArrowUpDown, ChevronDown, RotateCcw, FileText, Link2, ExternalLink, AlertCircle } from 'lucide-react';
import { formatPdfItemMode, generateParticipantsListPdf } from '@/lib/utils/participantsListPdf';

interface CollegeParticipantsTabProps {
  registrations: Registration[];
  onEditRegistration?: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  collegeName?: string;
  collegeAfflNo?: number;
}

interface ParticipantRow {
  id: string;
  studentName: string;
  cicNo: string;
  chestNo: string;
  category: string;
  itemId: number;
  itemName: string;
  itemNameMal?: string;
  itemCode: string;
  itemType: string;
  itemMode?: string;
  itemIsSubmission?: boolean;
  itemIsScreening?: boolean;
  needsPreFestLink: boolean;
  submissionEntry?: SubmissionEntry;
  screeningStatus?: ScreeningStatus;
  screeningRemarks?: string | null;
  blindCode: string;
}

function parseCicSortKey(cic: string): { prefix: string; num: number; raw: string } {
  const match = cic.match(/^([A-Z\-_\s]*?)(\d+)/i);
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      num: parseInt(match[2], 10),
      raw: cic
    };
  }
  return { prefix: cic.toUpperCase(), num: 0, raw: cic };
}

function compareCicNo(a: string, b: string): number {
  const keyA = parseCicSortKey(a);
  const keyB = parseCicSortKey(b);

  if (keyA.prefix !== keyB.prefix) {
    return keyA.prefix.localeCompare(keyB.prefix);
  }
  if (keyA.num !== keyB.num) {
    return keyA.num - keyB.num;
  }
  return keyA.raw.localeCompare(keyB.raw);
}

export function CollegeParticipantsTab({
  registrations,
  collegeName = 'College',
  collegeAfflNo = 11
}: CollegeParticipantsTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedItemCode, setSelectedItemCode] = useState('All Item Codes');
  const [selectedMode, setSelectedMode] = useState('All Modes');
  const [sortAsc, setSortAsc] = useState(true);

  // Submission / Screening link modal state
  const [linkModalTarget, setLinkModalTarget] = useState<SubmissionLinkTarget | null>(null);

  const submissions = React.useMemo(
    () => festService.getSubmissionEntries(collegeAfflNo),
    [collegeAfflNo, refreshKey]
  );

  // Extract flat participant rows with all details
  const participantRows = React.useMemo(() => {
    const list: ParticipantRow[] = [];
    const seenKeys = new Set<string>();
    const subByKey = new Map<string, SubmissionEntry>();
    const subByItemCollege = new Map<string, SubmissionEntry>();
    submissions.forEach(s => {
      const candidates = [
        s.chest_no,
        s.student?.chest_no,
        s.student ? getCanonicalChestNo(s.student) : '',
      ]
        .map(v => (v || '').trim().toUpperCase())
        .filter(v => Boolean(v) && v !== '—');
      candidates.forEach(ch => {
        subByKey.set(`${s.item_id}:${ch}`, s);
      });
      if (s.college_affl_no) {
        subByItemCollege.set(`${s.item_id}:${s.college_affl_no}`, s);
      }
    });

    registrations.forEach(r => {
      const itemId = Number(r.item_id || r.item?.item_id || 0);
      const itemCode = r.item?.code || r.item?.item_code || '';
      const itemName = r.item?.name || r.item?.name_eng || '';
      const itemNameMal = r.item?.name_mal;
      const itemType = r.item?.item_type || (r.item?.point_type === 'group' ? 'Group' : 'Single');
      const itemMode = r.item?.mode;
      const itemIsSubmission = isSubmissionEvent(r.item);
      const itemIsScreening = isScreeningEvent(r.item);
      const needsPreFestLink = requiresPreFestSubmission(r.item);
      const isGroup = itemType.toLowerCase() === 'group';
      const blindCode = r.code_letter || 'Unassigned';

      const participants = (r.participants && r.participants.length > 0)
        ? r.participants
        : (r.student ? [r.student] : []);

      participants.forEach(p => {
        const studentName = p.full_name || p.name || 'Unknown Student';
        const cicNo = String(p.cic_no || p.admission_no || p.cic_number || 'N/A');
        const resolvedChest = getCanonicalChestNo(p);
        const chestNo = resolvedChest !== '—' ? resolvedChest : (p.chest_no || r.chest_no || (cicNo !== 'N/A' ? cicNo : '—'));
        const category = p.category || p.phase || r.item?.phase || 'General';

        const chestCandidates = [chestNo, p.chest_no, r.chest_no]
          .map(v => (v || '').trim().toUpperCase())
          .filter(Boolean);
        let subEntry: SubmissionEntry | undefined;
        for (const ch of chestCandidates) {
          const hit = subByKey.get(`${itemId}:${ch}`);
          if (hit) {
            subEntry = hit;
            break;
          }
        }
        if (!subEntry && isGroup) {
          subEntry = subByItemCollege.get(`${itemId}:${r.college_affl_no || collegeAfflNo}`);
        }

        const uniqueKey = `${itemCode}-${p.id || cicNo || chestNo}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          list.push({
            id: uniqueKey,
            studentName,
            cicNo,
            chestNo,
            category,
            itemId,
            itemName,
            itemNameMal,
            itemCode,
            itemType,
            itemMode,
            itemIsSubmission,
            itemIsScreening,
            needsPreFestLink,
            submissionEntry: subEntry,
            screeningStatus: r.screening_status || 'pending',
            screeningRemarks: r.screening_remarks || null,
            blindCode
          });
        }
      });
    });

    // Default sort by CIC No (natural numeric order)
    list.sort((a, b) => {
      const res = compareCicNo(a.cicNo, b.cicNo);
      return sortAsc ? res : -res;
    });

    return list;
  }, [registrations, submissions, collegeAfflNo, sortAsc]);

  // Unique Category options for dropdown
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    participantRows.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [participantRows]);

  // Unique Item Code options for dropdown
  const itemCodeOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    participantRows.forEach(p => {
      if (p.itemCode) {
        map.set(p.itemCode, p.itemName);
      }
    });
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [participantRows]);

  // Combined search + category + item code filter
  const filteredRows = React.useMemo(() => {
    return participantRows.filter(p => {
      // 1. Category Filter
      if (selectedCategory !== 'All Categories') {
        if (normalizeCategoryKey(p.category) !== normalizeCategoryKey(selectedCategory)) {
          return false;
        }
      }
      // 2. Item Code Filter
      if (selectedItemCode !== 'All Item Codes') {
        if (p.itemCode.toLowerCase() !== selectedItemCode.toLowerCase()) {
          return false;
        }
      }
      // 3. Stage Mode Filter
      if (selectedMode !== 'All Modes') {
        const m = getEffectiveStageMode({ mode: p.itemMode });
        if (selectedMode === 'onstage' && m !== 'onstage') return false;
        if (selectedMode === 'offstage' && m !== 'offstage') return false;
        if (selectedMode === 'submission' && !p.itemIsSubmission) return false;
        if (selectedMode === 'screening' && !p.itemIsScreening) return false;
      }
      // 4. Search Query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matches =
          p.studentName.toLowerCase().includes(q) ||
          p.cicNo.toLowerCase().includes(q) ||
          p.chestNo.toLowerCase().includes(q) ||
          p.itemName.toLowerCase().includes(q) ||
          p.itemCode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [participantRows, selectedCategory, selectedItemCode, selectedMode, searchQuery]);

  const hasActiveFilters = selectedCategory !== 'All Categories' || selectedItemCode !== 'All Item Codes' || selectedMode !== 'All Modes' || searchQuery !== '';

  const handleResetFilters = () => {
    setSelectedCategory('All Categories');
    setSelectedItemCode('All Item Codes');
    setSelectedMode('All Modes');
    setSearchQuery('');
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPDF = () => {
    if (filteredRows.length === 0) {
      alert('No participant records available to export.');
      return;
    }

    setIsExportingPdf(true);
    try {
      const doc = generateParticipantsListPdf({
        collegeName,
        collegeAfflNo,
        participants: filteredRows.map(r => ({
          ...r,
          itemMode: formatPdfItemMode({
            mode: r.itemMode,
            is_submission: r.itemIsSubmission,
            is_screening: r.itemIsScreening
          })
        })),
        filterSummary: hasActiveFilters
          ? [
              selectedCategory !== 'All Categories' ? `Category: ${selectedCategory}` : null,
              selectedItemCode !== 'All Item Codes' ? `Event: ${selectedItemCode}` : null,
              selectedMode !== 'All Modes' ? `Mode: ${selectedMode}` : null,
              searchQuery ? `Search: "${searchQuery}"` : null
            ].filter(Boolean).join(' | ')
          : undefined
      });

      const cleanCollege = (collegeName || 'College').replace(/[^a-z0-9]/gi, '_');
      doc.save(`${cleanCollege}_Affl${collegeAfflNo}_Participants.pdf`);
    } catch (err: any) {
      console.error('Failed to generate participants PDF:', err);
      alert('Failed to generate participants PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              Registered Competition Participants
            </CardTitle>
            <Badge variant="saffron" className="font-mono font-bold">
              {filteredRows.length} / {participantRows.length} Entries
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Official participant directory sorted by CIC number
          </CardDescription>
        </div>

        {/* Toolbar: Category Filter + Item Code Filter + Search + PDF Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All Categories">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Item Code Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedItemCode}
              onChange={e => setSelectedItemCode(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-mono"
            >
              <option value="All Item Codes">All Event Codes</option>
              {itemCodeOptions.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.code} ({opt.name.slice(0, 16)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Stage Mode Filter Dropdown */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 shadow-2xs hover:border-[var(--f-saffron)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 cursor-pointer font-sans"
            >
              <option value="All Modes">All Stage Modes</option>
              <option value="onstage">On Stage</option>
              <option value="offstage">Off Stage</option>
              <option value="submission">Submission</option>
              <option value="screening">Screening</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-sans font-medium"
            />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleResetFilters}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer font-sans"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}

          {/* Download Participants PDF Button */}
          <Button
            size="sm"
            variant="saffron"
            onClick={handleDownloadPDF}
            disabled={isExportingPdf || filteredRows.length === 0}
            className="flex items-center gap-1.5 font-heading font-bold shrink-0 shadow-2xs"
            title="Download Official Participants Directory as PDF"
          >
            <FileText className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {(() => {
          const pendingSlots = new Set<string>();
          participantRows.forEach(p => {
            if (p.needsPreFestLink && !p.submissionEntry?.file_url) {
              const slot = p.itemType.toLowerCase() === 'group'
                ? `${p.itemId}:GROUP`
                : `${p.itemId}:${p.chestNo}`;
              pendingSlots.add(slot);
            }
          });
          if (pendingSlots.size === 0) return null;
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{pendingSlots.size}</strong> pre-fest submission / screening {pendingSlots.size === 1 ? 'entry still needs' : 'entries still need'} a video or file URL. Click <strong>Submit Link</strong> on the row below.
                </span>
              </div>
            </div>
          );
        })()}

        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex items-center gap-1 hover:text-[var(--f-saffron)] transition-colors font-bold cursor-pointer text-xs"
                  title="Click to toggle CIC sorting direction"
                >
                  <span>CIC / Adm No</span>
                  <ArrowUpDown className="w-3 h-3 text-[var(--f-saffron)]" />
                </button>
              </TableHead>
              <TableHead>Chest No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead>Event Code</TableHead>
              <TableHead className="text-center">Type / Mode</TableHead>
              <TableHead className="text-center">Blind Code</TableHead>
              <TableHead className="text-center">Screening &amp; Video/File Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-[var(--text-muted)] text-xs">
                  <div className="max-w-md mx-auto space-y-2">
                    <Users className="w-8 h-8 mx-auto opacity-40 text-[var(--text-muted)]" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      No matching competition participant details found.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="text-center font-mono font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                      {p.studentName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {p.cicNo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                      {p.chestNo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={p.category} />
                  </TableCell>
                  <TableCell>
                    <div className="font-heading font-semibold text-[var(--text-primary)] text-xs sm:text-sm">
                      {p.itemName}
                    </div>
                    {p.itemNameMal && (
                      <div className="text-[10px] font-sans text-[var(--text-muted)]">{p.itemNameMal}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                    {p.itemCode}
                  </TableCell>
                  <TableCell className="text-center">
                    <ItemTypeBadge
                      type={p.itemType}
                      mode={p.itemMode}
                      isSubmission={p.itemIsSubmission}
                      isScreening={p.itemIsScreening}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {p.blindCode !== 'Unassigned' ? (
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs">
                        {p.blindCode}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs font-sans">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {p.itemIsScreening && (
                        <ScreeningStatusBadge status={p.screeningStatus} size="sm" />
                      )}
                      {p.needsPreFestLink ? (
                        <div className="flex flex-col items-center gap-1">
                          {p.submissionEntry?.file_url ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                p.submissionEntry.status === 'late'
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                  : p.submissionEntry.status === 'fine'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {p.submissionEntry.status === 'late'
                                ? 'Submitted (Late)'
                                : p.submissionEntry.status === 'fine'
                                ? 'Submitted (Late Fine)'
                                : 'Submitted On Time'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              Link Needed
                            </span>
                          )}
                          <div className="inline-flex items-center gap-1.5">
                            {p.submissionEntry?.file_url && (
                              <a
                                href={p.submissionEntry.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20"
                                title={p.submissionEntry.file_url}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                View
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setLinkModalTarget({
                                  collegeAfflNo,
                                  chestNo: p.chestNo,
                                  studentName: p.studentName,
                                  itemId: p.itemId,
                                  itemCode: p.itemCode,
                                  itemName: p.itemName,
                                  isScreening: p.itemIsScreening,
                                  existingUrl: p.submissionEntry?.file_url || null,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border border-[var(--border-medium)] bg-[var(--bg-subtle)] hover:border-[var(--f-saffron)] text-[var(--text-primary)] cursor-pointer transition-colors"
                            >
                              <Link2 className="w-2.5 h-2.5 text-[var(--f-saffron-text)]" />
                              {p.submissionEntry?.file_url ? 'Edit Link' : 'Submit Link'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        !p.itemIsScreening && (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pre-Fest Screening / Submission Link Modal */}
      <SubmissionLinkModal
        target={linkModalTarget}
        onClose={() => setLinkModalTarget(null)}
        onSaved={triggerRefresh}
      />
    </Card>
  );
}
