'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  CheckCircle2,
  Sparkles,
  Building2,
  Video,
  FileCheck,
  FolderArchive,
  Mic,
  Palette,
  X
} from 'lucide-react';
import {
  Item,
  College,
  Registration,
  SubmissionEntry,
  Student,
  isScreeningEvent,
  isSubmissionEvent,
  isSpecialGroupEvent,
  isSpecialEvent,
  getEffectiveStageMode
} from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { downloadCsv, generateCsvContent, getFilenameTimestamp } from '@/lib/utils/csvExport';
import { downloadZip, ZipFileEntry } from '@/lib/utils/zipExport';
import { formatPdfItemMode, generateParticipantsListPdf, ParticipantPdfRow } from '@/lib/utils/participantsListPdf';
import { findStudentByIdentifier, getCanonicalChestNo } from '@/lib/utils/studentIdentity';

export type ExportCategory = 'prefest' | 'event_wise' | 'college_wise' | 'pdf';
export type PreFestSubType = 'screening' | 'submission' | 'all';
export type EventModeFilter =
  | 'all'
  | 'onstage'
  | 'offstage'
  | 'submission'
  | 'screening'
  | 'general'
  | 'special';
export type ExportPackaging = 'single' | 'separate';
export type ExportScope = 'all' | 'specific';
export type PdfScopeType = 'event' | 'college';

// Support legacy and alias type names for backwards compatibility
export type ExportType =
  | ExportCategory
  | 'links'
  | 'screening'
  | 'submission'
  | 'roster_csv'
  | 'college_csv'
  | 'roster_pdf';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: number;
  initialCollegeAffl?: number;
  initialType?: ExportType;
  items?: Item[];
  colleges?: College[];
  registrations?: Registration[];
  submissions?: SubmissionEntry[];
  students?: Student[];
}

function resolveInitialCategory(type?: ExportType): {
  category: ExportCategory;
  subType: PreFestSubType;
  modeFilter: EventModeFilter;
} {
  if (!type || type === 'prefest' || type === 'links') {
    return { category: 'prefest', subType: 'all', modeFilter: 'all' };
  }
  if (type === 'screening') {
    return { category: 'prefest', subType: 'screening', modeFilter: 'screening' };
  }
  if (type === 'submission') {
    return { category: 'prefest', subType: 'submission', modeFilter: 'submission' };
  }
  if (type === 'event_wise' || type === 'roster_csv') {
    return { category: 'event_wise', subType: 'all', modeFilter: 'all' };
  }
  if (type === 'college_wise' || type === 'college_csv') {
    return { category: 'college_wise', subType: 'all', modeFilter: 'all' };
  }
  if (type === 'pdf' || type === 'roster_pdf') {
    return { category: 'pdf', subType: 'all', modeFilter: 'all' };
  }
  return { category: 'prefest', subType: 'all', modeFilter: 'all' };
}

function sanitizeFileName(str: string): string {
  return str
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

export function ExportModal({
  isOpen,
  onClose,
  initialEventId,
  initialCollegeAffl,
  initialType = 'prefest',
  items: propsItems,
  colleges: propsColleges,
  registrations: propsRegistrations,
  submissions: propsSubmissions,
  students: propsStudents
}: ExportModalProps) {
  const { refreshKey } = useFest();
  const initialResolved = useMemo(() => resolveInitialCategory(initialType), [initialType]);

  const [category, setCategory] = useState<ExportCategory>(initialResolved.category);
  const [preFestSubType, setPreFestSubType] = useState<PreFestSubType>(initialResolved.subType);
  const [eventModeFilter, setEventModeFilter] = useState<EventModeFilter>(initialResolved.modeFilter);
  const [packaging, setPackaging] = useState<ExportPackaging>('single');
  const [scope, setScope] = useState<ExportScope>(initialEventId || initialCollegeAffl ? 'specific' : 'all');
  const [pdfScopeType, setPdfScopeType] = useState<PdfScopeType>(initialCollegeAffl ? 'college' : 'event');
  const [selectedEventId, setSelectedEventId] = useState<number>(initialEventId || 0);
  const [selectedCollegeAffl, setSelectedCollegeAffl] = useState<number>(initialCollegeAffl || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Sync state if props change when opening
  useEffect(() => {
    if (isOpen) {
      const resolved = resolveInitialCategory(initialType);
      setCategory(resolved.category);
      setPreFestSubType(resolved.subType);
      setEventModeFilter(resolved.modeFilter);
      setPackaging('single');
      setSearchQuery('');

      if (resolved.category === 'college_wise' || (resolved.category === 'pdf' && initialCollegeAffl)) {
        if (initialCollegeAffl) {
          setSelectedCollegeAffl(initialCollegeAffl);
          setScope('specific');
          setPdfScopeType('college');
        } else {
          setScope('all');
        }
      } else {
        if (initialEventId) {
          setSelectedEventId(initialEventId);
          setScope('specific');
          setPdfScopeType('event');
        } else {
          setScope(resolved.category === 'pdf' ? 'specific' : 'all');
        }
      }
    }
  }, [isOpen, initialEventId, initialCollegeAffl, initialType]);

  // Robust data retrieval from props or festService cache
  const items = useMemo(() => {
    if (propsItems && propsItems.length > 0) return propsItems;
    return festService.getItems();
  }, [propsItems, refreshKey, isOpen]);

  const colleges = useMemo(() => {
    if (propsColleges && propsColleges.length > 0) return propsColleges;
    return festService.getColleges();
  }, [propsColleges, refreshKey, isOpen]);

  const students = useMemo(() => {
    if (propsStudents && propsStudents.length > 0) return propsStudents;
    return festService.getStudents();
  }, [propsStudents, refreshKey, isOpen]);

  const registrations = useMemo(() => {
    if (propsRegistrations && propsRegistrations.length > 0) return propsRegistrations;
    return festService.getRegistrations();
  }, [propsRegistrations, refreshKey, isOpen]);

  const submissions = useMemo(() => {
    if (propsSubmissions && propsSubmissions.length > 0) return propsSubmissions;
    return festService.getSubmissionEntries();
  }, [propsSubmissions, refreshKey, isOpen]);

  const festSettings = useMemo(() => festService.getFestSettings(), [refreshKey, isOpen]);

  // Filtered items based on pre-fest criteria
  const screeningItems = useMemo(() => {
    return items.filter(i => isScreeningEvent(i) || Boolean(i.is_screening));
  }, [items]);

  const submissionItems = useMemo(() => {
    return items.filter(i => isSubmissionEvent(i) || Boolean(i.is_submission) || i.mode === 'submission');
  }, [items]);

  const allPreFestItems = useMemo(() => {
    return items.filter(
      i =>
        isScreeningEvent(i) ||
        isSubmissionEvent(i) ||
        Boolean(i.is_screening) ||
        Boolean(i.is_submission) ||
        i.mode === 'submission'
    );
  }, [items]);

  // Event Mode filtering for Event-Wise view
  const eventModeFilteredItems = useMemo(() => {
    if (category !== 'event_wise') return items;
    return items.filter(i => {
      switch (eventModeFilter) {
        case 'onstage':
          return getEffectiveStageMode(i) === 'onstage';
        case 'offstage':
          return getEffectiveStageMode(i) === 'offstage';
        case 'submission':
          return isSubmissionEvent(i) || Boolean(i.is_submission) || i.mode === 'submission';
        case 'screening':
          return isScreeningEvent(i) || Boolean(i.is_screening);
        case 'general':
          return (i.phase || '').toLowerCase() === 'general' || (i.category || '').toLowerCase() === 'general';
        case 'special':
          return isSpecialEvent(i) || (i.category || '').toUpperCase() === 'D' || /^SE\d/i.test(i.item_code || i.code || '');
        case 'all':
        default:
          return true;
      }
    });
  }, [items, category, eventModeFilter]);

  // Selectable items according to category, preFestSubType, and eventModeFilter
  const selectableItems = useMemo(() => {
    if (category === 'prefest') {
      if (preFestSubType === 'screening') return screeningItems;
      if (preFestSubType === 'submission') return submissionItems;
      return allPreFestItems;
    }
    if (category === 'event_wise') {
      return eventModeFilteredItems;
    }
    return items;
  }, [category, preFestSubType, screeningItems, submissionItems, allPreFestItems, eventModeFilteredItems, items]);

  // Filtered event list for search dropdown
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return selectableItems;
    const q = searchQuery.toLowerCase().trim();
    return selectableItems.filter(i => {
      const nameStr = (i.name_eng || i.name || '').toLowerCase();
      const codeStr = (i.item_code || i.code || '').toLowerCase();
      const phaseStr = (i.phase || '').toLowerCase();
      return nameStr.includes(q) || codeStr.includes(q) || phaseStr.includes(q);
    });
  }, [selectableItems, searchQuery]);

  // Auto-sync selectedEventId whenever filteredItems or selectableItems change
  useEffect(() => {
    if (filteredItems.length > 0) {
      const hasSelected = filteredItems.some(i => Number(i.item_id) === Number(selectedEventId));
      if (!hasSelected) {
        setSelectedEventId(Number(filteredItems[0].item_id));
      }
    } else if (selectableItems.length > 0) {
      const hasSelected = selectableItems.some(i => Number(i.item_id) === Number(selectedEventId));
      if (!hasSelected) {
        setSelectedEventId(Number(selectableItems[0].item_id));
      }
    }
  }, [filteredItems, selectableItems, selectedEventId]);

  // Filtered colleges list
  const filteredColleges = useMemo(() => {
    if (!searchQuery.trim()) return colleges;
    const q = searchQuery.toLowerCase().trim();
    return colleges.filter(c => {
      const nameStr = (c.name || '').toLowerCase();
      const shortStr = (c.short_name || c.code || '').toLowerCase();
      const afflStr = String(c.affl_no);
      return nameStr.includes(q) || shortStr.includes(q) || afflStr.includes(q);
    });
  }, [colleges, searchQuery]);

  // Auto-sync selectedCollegeAffl
  useEffect(() => {
    if (filteredColleges.length > 0) {
      const hasSelected = filteredColleges.some(c => Number(c.affl_no) === Number(selectedCollegeAffl));
      if (!hasSelected) {
        setSelectedCollegeAffl(Number(filteredColleges[0].affl_no));
      }
    }
  }, [filteredColleges, selectedCollegeAffl]);

  const currentEvent = useMemo(() => {
    return items.find(i => Number(i.item_id) === Number(selectedEventId));
  }, [items, selectedEventId]);

  const currentCol = useMemo(() => {
    return colleges.find(c => Number(c.affl_no) === Number(selectedCollegeAffl));
  }, [colleges, selectedCollegeAffl]);

  // Counts of events by mode for UI badges
  const modeCounts = useMemo(() => {
    return {
      all: items.length,
      onstage: items.filter(i => getEffectiveStageMode(i) === 'onstage').length,
      offstage: items.filter(i => getEffectiveStageMode(i) === 'offstage').length,
      screening: screeningItems.length,
      submission: submissionItems.length,
      general: items.filter(i => (i.phase || '').toLowerCase() === 'general' || (i.category || '').toLowerCase() === 'general').length,
      special: items.filter(i => isSpecialEvent(i) || (i.category || '').toUpperCase() === 'D' || /^SE\d/i.test(i.item_code || i.code || '')).length,
    };
  }, [items, screeningItems, submissionItems]);

  // Estimated rows count
  const estimatedRowsCount = useMemo(() => {
    if (category === 'college_wise') {
      if (scope === 'specific') {
        return registrations.filter(r => Number(r.college_affl_no) === Number(selectedCollegeAffl)).length;
      }
      return registrations.length;
    }
    if (category === 'event_wise') {
      if (scope === 'specific') {
        return registrations.filter(r => Number(r.item_id) === Number(selectedEventId)).length;
      }
      const targetIds = new Set(selectableItems.map(i => Number(i.item_id)));
      return registrations.filter(r => targetIds.has(Number(r.item_id))).length;
    }
    if (category === 'prefest') {
      if (scope === 'specific') {
        return registrations.filter(r => Number(r.item_id) === Number(selectedEventId)).length;
      }
      const targetIds = new Set(selectableItems.map(i => Number(i.item_id)));
      return registrations.filter(r => targetIds.has(Number(r.item_id))).length;
    }
    if (category === 'pdf') {
      if (pdfScopeType === 'college') {
        return registrations.filter(r => Number(r.college_affl_no) === Number(selectedCollegeAffl)).length;
      }
      return registrations.filter(r => Number(r.item_id) === Number(selectedEventId)).length;
    }
    return registrations.length;
  }, [category, scope, pdfScopeType, selectedCollegeAffl, selectedEventId, registrations, selectableItems]);

  // Dynamic preview filename with date and time timestamp
  const previewFilename = useMemo(() => {
    const timestamp = getFilenameTimestamp();

    if (category === 'prefest') {
      const typePrefix =
        preFestSubType === 'screening'
          ? 'screening'
          : preFestSubType === 'submission'
          ? 'submission'
          : 'prefest_all';

      if (scope === 'specific' && currentEvent) {
        const safeCode = currentEvent.item_code || currentEvent.code || `Item_${currentEvent.item_id}`;
        return `${safeCode}_${typePrefix}_links_${timestamp}.csv`;
      }
      if (packaging === 'separate') {
        return `PreFest_Links_${typePrefix.toUpperCase()}_Separate_Files_${timestamp}.zip`;
      }
      return `${typePrefix}_event_links_master_${timestamp}.csv`;
    }

    if (category === 'event_wise') {
      if (scope === 'specific' && currentEvent) {
        const safeCode = currentEvent.item_code || currentEvent.code || `Item_${currentEvent.item_id}`;
        return `Event_${safeCode}_participants_${timestamp}.csv`;
      }
      const modePrefix = eventModeFilter === 'all' ? 'ALL_EVENTS' : `MODE_${eventModeFilter.toUpperCase()}`;
      if (packaging === 'separate') {
        return `Event_Rosters_${modePrefix}_Separate_Files_${timestamp}.zip`;
      }
      return `${modePrefix}_participants_master_${timestamp}.csv`;
    }

    if (category === 'college_wise') {
      if (scope === 'specific' && currentCol) {
        return `College_${currentCol.affl_no}_${currentCol.short_name || 'College'}_participants_${timestamp}.csv`;
      }
      return `ALL_COLLEGES_participants_master_${timestamp}.csv`;
    }

    // PDF
    if (pdfScopeType === 'college' && currentCol) {
      return `College_${currentCol.affl_no}_${currentCol.short_name || 'College'}_Roster_${timestamp}.pdf`;
    }
    if (currentEvent) {
      const safeCode = currentEvent.item_code || currentEvent.code || `Item_${currentEvent.item_id}`;
      return `Event_${safeCode}_Roster_${timestamp}.pdf`;
    }
    return `Fest_Participants_Roster_${timestamp}.pdf`;
  }, [category, preFestSubType, eventModeFilter, packaging, scope, pdfScopeType, currentEvent, currentCol]);

  // Perform Export Execution
  const handleExecuteExport = () => {
    setIsExporting(true);
    try {
      // 1. PRE-FEST SCREENING & SUBMISSION LINKS CSV / ZIP
      if (category === 'prefest') {
        const headers = ['Chest No', 'Link', 'Event Name', 'Category', 'College'];

        const targetItems = scope === 'specific' && currentEvent
          ? [currentEvent]
          : selectableItems;

        const targetEventIds = new Set(targetItems.map(i => Number(i.item_id)));
        const targetRegs = registrations.filter(r => targetEventIds.has(Number(r.item_id)));

        if (targetRegs.length === 0) {
          alert('No registrations found for the selected pre-fest event scope.');
          return;
        }

        // SEPARATE FILES PER EVENT (ZIP ARCHIVE)
        if (scope === 'all' && packaging === 'separate') {
          const zipFiles: ZipFileEntry[] = [];

          targetItems.forEach(itm => {
            const eventRegs = targetRegs.filter(r => Number(r.item_id) === Number(itm.item_id));
            if (eventRegs.length === 0) return; // Skip events without candidates

            const rows: string[][] = [];
            eventRegs.forEach(reg => {
              const stu = findStudentByIdentifier(students, reg.cic_no || reg.chest_no);
              const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
              const chestNo = reg.chest_no || getCanonicalChestNo(stu) || (stu?.chest_no ? String(stu.chest_no) : `COL-${reg.college_affl_no}`);

              const sub = submissions.find(
                s =>
                  Number(s.item_id) === Number(reg.item_id) &&
                  (Number(s.college_affl_no) === Number(reg.college_affl_no) ||
                    String(s.chest_no).trim().toUpperCase() === String(chestNo).trim().toUpperCase())
              );

              const link = sub?.file_url || 'Not Submitted';
              const eventName = itm?.name_eng || itm?.name || (itm?.item_code ? `Event ${itm.item_code}` : `Item #${reg.item_id}`);
              const categoryName = itm?.category ? `${itm.phase || ''} (${itm.category})` : itm?.phase || 'General';
              const collegeLabel = col?.name ? `${col.name} (#${col.affl_no})` : `College #${reg.college_affl_no}`;

              rows.push([String(chestNo), link, eventName, categoryName, collegeLabel]);
            });

            // Sort: valid submitted links first, then chest no
            rows.sort((a, b) => {
              const aHas = a[1] !== 'Not Submitted' ? 0 : 1;
              const bHas = b[1] !== 'Not Submitted' ? 0 : 1;
              if (aHas !== bHas) return aHas - bHas;
              return a[0].localeCompare(b[0]);
            });

            const codeStr = itm.item_code || itm.code || `ITM_${itm.item_id}`;
            const nameStr = sanitizeFileName(itm.name_eng || itm.name || 'Event');
            const fileContent = generateCsvContent(headers, rows);
            zipFiles.push({
              name: `${codeStr}_${nameStr}_links.csv`,
              content: fileContent
            });
          });

          if (zipFiles.length === 0) {
            alert('No event links found to export into separate files.');
            return;
          }

          downloadZip(previewFilename, zipFiles);
          onClose();
          return;
        }

        // CONSOLIDATED SINGLE MASTER FILE (CSV)
        const rows: string[][] = [];
        targetRegs.forEach(reg => {
          const itm = items.find(i => Number(i.item_id) === Number(reg.item_id));
          const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
          const stu = findStudentByIdentifier(students, reg.cic_no || reg.chest_no);
          const chestNo = reg.chest_no || getCanonicalChestNo(stu) || (stu?.chest_no ? String(stu.chest_no) : `COL-${reg.college_affl_no}`);

          const sub = submissions.find(
            s =>
              Number(s.item_id) === Number(reg.item_id) &&
              (Number(s.college_affl_no) === Number(reg.college_affl_no) ||
                String(s.chest_no).trim().toUpperCase() === String(chestNo).trim().toUpperCase())
          );

          const link = sub?.file_url || 'Not Submitted';
          const eventName = itm?.name_eng || itm?.name || (itm?.item_code ? `Event ${itm.item_code}` : `Item #${reg.item_id}`);
          const categoryName = itm?.category ? `${itm.phase || ''} (${itm.category})` : itm?.phase || 'General';
          const collegeLabel = col?.name ? `${col.name} (#${col.affl_no})` : `College #${reg.college_affl_no}`;

          rows.push([String(chestNo), link, eventName, categoryName, collegeLabel]);
        });

        // Sort: valid submitted links first, then by event name and chest no
        rows.sort((a, b) => {
          const aHas = a[1] !== 'Not Submitted' ? 0 : 1;
          const bHas = b[1] !== 'Not Submitted' ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]);
        });

        downloadCsv(previewFilename, headers, rows);
        onClose();
        return;
      }

      // 2. EVENT-WISE PARTICIPANT ROSTER CSV / ZIP
      if (category === 'event_wise') {
        const headers = [
          'Sl No',
          'Event Code',
          'Event Name',
          'Event Phase',
          'Event Category',
          'Event Mode',
          'Event Type',
          'Blind Letter',
          'Chest No',
          'CIC No',
          'Student Name',
          'College Affiliation No',
          'College Code',
          'College Name',
          'Student Class',
          'Student Phase',
          'Screening Status'
        ];

        const targetItems = scope === 'specific' && currentEvent
          ? [currentEvent]
          : selectableItems;

        const targetItemIds = new Set(targetItems.map(i => Number(i.item_id)));
        const targetRegs = registrations.filter(r => targetItemIds.has(Number(r.item_id)));

        if (targetRegs.length === 0) {
          alert('No registrations found for the selected event scope.');
          return;
        }

        // SEPARATE FILES PER EVENT (ZIP ARCHIVE)
        if (scope === 'all' && packaging === 'separate') {
          const zipFiles: ZipFileEntry[] = [];

          targetItems.forEach(itm => {
            const eventRegs = targetRegs.filter(r => Number(r.item_id) === Number(itm.item_id));
            if (eventRegs.length === 0) return; // Skip events without registrations

            const sortedEventRegs = [...eventRegs].sort(
              (a, b) => (a.code_letter || '').localeCompare(b.code_letter || '') ||
                        Number(a.college_affl_no) - Number(b.college_affl_no)
            );

            let slNo = 1;
            const rows: (string | number)[][] = [];

            sortedEventRegs.forEach(reg => {
              const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
              const stu = findStudentByIdentifier(students, reg.cic_no || reg.chest_no);

              const isInstitutional =
                (reg.chest_no && reg.chest_no.startsWith('COL-')) || isSpecialGroupEvent(itm);
              const studentName = isInstitutional
                ? `${col?.name || 'College'} (College Entry)`
                : stu?.name || stu?.full_name || 'Participant';
              const cicNo = isInstitutional ? '—' : String(stu?.admission_no || stu?.cic_no || reg.cic_no || '—');
              const chestNo = isInstitutional
                ? reg.chest_no || `COL-${reg.college_affl_no}`
                : reg.chest_no || getCanonicalChestNo(stu);

              rows.push([
                slNo++,
                itm.item_code || itm.code || `ITM-${reg.item_id}`,
                itm.name_eng || itm.name || `Item #${reg.item_id}`,
                itm.phase || '—',
                itm.category || '—',
                formatPdfItemMode(itm),
                itm.item_type || ((itm.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
                reg.code_letter || '—',
                chestNo,
                cicNo,
                studentName,
                reg.college_affl_no || '',
                col?.short_name || col?.code || '',
                col?.name || `College #${reg.college_affl_no}`,
                stu?.class || '—',
                stu?.phase || '—',
                reg.screening_status || 'pending'
              ]);
            });

            const codeStr = itm.item_code || itm.code || `ITM_${itm.item_id}`;
            const nameStr = sanitizeFileName(itm.name_eng || itm.name || 'Event');
            const fileContent = generateCsvContent(headers, rows);
            zipFiles.push({
              name: `${codeStr}_${nameStr}_participants.csv`,
              content: fileContent
            });
          });

          if (zipFiles.length === 0) {
            alert('No event participant records found to package.');
            return;
          }

          downloadZip(previewFilename, zipFiles);
          onClose();
          return;
        }

        // CONSOLIDATED SINGLE MASTER FILE (CSV)
        let slNo = 1;
        const rows: (string | number)[][] = [];

        const sorted = [...targetRegs].sort(
          (a, b) => Number(a.item_id) - Number(b.item_id) || Number(a.college_affl_no) - Number(b.college_affl_no)
        );

        sorted.forEach(reg => {
          const itm = items.find(i => Number(i.item_id) === Number(reg.item_id));
          const col = colleges.find(c => Number(c.affl_no) === Number(reg.college_affl_no));
          const stu = findStudentByIdentifier(students, reg.cic_no || reg.chest_no);

          const isInstitutional =
            (reg.chest_no && reg.chest_no.startsWith('COL-')) || (itm && isSpecialGroupEvent(itm));
          const studentName = isInstitutional
            ? `${col?.name || 'College'} (College Entry)`
            : stu?.name || stu?.full_name || 'Participant';
          const cicNo = isInstitutional ? '—' : String(stu?.admission_no || stu?.cic_no || reg.cic_no || '—');
          const chestNo = isInstitutional
            ? reg.chest_no || `COL-${reg.college_affl_no}`
            : reg.chest_no || getCanonicalChestNo(stu);

          rows.push([
            slNo++,
            itm?.item_code || itm?.code || `ITM-${reg.item_id}`,
            itm?.name_eng || itm?.name || `Item #${reg.item_id}`,
            itm?.phase || '—',
            itm?.category || '—',
            itm ? formatPdfItemMode(itm) : '—',
            itm?.item_type || ((itm?.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
            reg.code_letter || '—',
            chestNo,
            cicNo,
            studentName,
            reg.college_affl_no || '',
            col?.short_name || col?.code || '',
            col?.name || `College #${reg.college_affl_no}`,
            stu?.class || '—',
            stu?.phase || '—',
            reg.screening_status || 'pending'
          ]);
        });

        downloadCsv(previewFilename, headers, rows);
        onClose();
        return;
      }

      // 3. COLLEGE-WISE PARTICIPANT ROSTER CSV
      if (category === 'college_wise') {
        const headers = [
          'Sl No',
          'College Affiliation No',
          'College Code',
          'College Name',
          'Chest No',
          'CIC No',
          'Student Name',
          'Class',
          'Student Phase',
          'Event Code',
          'Event Name',
          'Event Phase',
          'Event Category',
          'Event Mode',
          'Event Type',
          'Blind Letter',
          'Screening Status'
        ];

        let targetColleges = colleges;
        if (scope === 'specific') {
          targetColleges = colleges.filter(c => Number(c.affl_no) === Number(selectedCollegeAffl));
        }

        const rows: (string | number)[][] = [];
        let slNo = 1;

        targetColleges.forEach(col => {
          const colRegs = registrations.filter(r => Number(r.college_affl_no) === Number(col.affl_no));
          items.forEach(itm => {
            const itemRegs = colRegs.filter(r => Number(r.item_id) === Number(itm.item_id));
            itemRegs.forEach(reg => {
              const isInstitutional = (reg.chest_no && reg.chest_no.startsWith('COL-')) || isSpecialGroupEvent(itm);
              const stu = !isInstitutional ? findStudentByIdentifier(students, reg.cic_no || reg.chest_no) : undefined;
              const studentName = isInstitutional ? `${col.name} (College Entry)` : (stu?.name || stu?.full_name || 'Participant');
              const cicNo = isInstitutional ? '—' : String(stu?.admission_no || stu?.cic_no || reg.cic_no || '—');
              const chestNo = isInstitutional ? (reg.chest_no || `COL-${col.affl_no}`) : (reg.chest_no || getCanonicalChestNo(stu));

              rows.push([
                slNo++,
                col.affl_no,
                col.short_name || col.code || '',
                col.name,
                chestNo,
                cicNo,
                studentName,
                stu?.class || '—',
                stu?.phase || '—',
                itm.item_code || itm.code || `ITM-${itm.item_id}`,
                itm.name_eng || itm.name || `Item #${itm.item_id}`,
                itm.phase || '—',
                itm.category || '—',
                formatPdfItemMode(itm),
                itm.item_type || ((itm.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
                reg.code_letter || '—',
                reg.screening_status || 'pending'
              ]);
            });
          });
        });

        if (rows.length === 0) {
          alert('No participant records found for the selected college scope.');
          return;
        }

        downloadCsv(previewFilename, headers, rows);
        onClose();
        return;
      }

      // 4. PRINTABLE ROSTER PDF (EVENT OR COLLEGE)
      if (category === 'pdf') {
        if (pdfScopeType === 'college') {
          if (!currentCol) {
            alert('Please select a college institution to generate the PDF.');
            return;
          }

          const colRegs = registrations.filter(r => Number(r.college_affl_no) === Number(currentCol.affl_no));
          if (colRegs.length === 0) {
            alert(`No registrations found for ${currentCol.name}.`);
            return;
          }

          const pdfRows: ParticipantPdfRow[] = [];
          colRegs.forEach(r => {
            const itm = items.find(i => Number(i.item_id) === Number(r.item_id));
            const stu = findStudentByIdentifier(students, r.cic_no || r.chest_no);
            const isInstitutional = (r.chest_no && r.chest_no.startsWith('COL-')) || (itm && isSpecialGroupEvent(itm));

            pdfRows.push({
              studentName: isInstitutional ? `${currentCol.name} (College Entry)` : stu?.name || stu?.full_name || 'Participant',
              cicNo: isInstitutional ? '—' : String(stu?.admission_no || '—'),
              chestNo: isInstitutional ? (r.chest_no || `COL-${currentCol.affl_no}`) : (r.chest_no || getCanonicalChestNo(stu)),
              category: stu?.phase || itm?.phase || itm?.category || '—',
              itemName: itm?.name_eng || itm?.name || `Event #${r.item_id}`,
              itemCode: itm?.item_code || itm?.code || `ITM-${r.item_id}`,
              itemType: itm?.item_type || ((itm?.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
              itemMode: itm ? formatPdfItemMode(itm) : '—',
              blindCode: r.code_letter || 'Unassigned'
            });
          });

          pdfRows.sort((a, b) => a.studentName.localeCompare(b.studentName));

          const doc = generateParticipantsListPdf({
            collegeName: `${currentCol.name} (#${currentCol.affl_no})`,
            collegeAfflNo: currentCol.affl_no,
            participants: pdfRows,
            festName: festSettings?.fest_name || '14th Wafy Arts Fest',
            filterSummary: `${pdfRows.length} registered entries`
          });

          doc.save(previewFilename);
          onClose();
          return;
        }

        // PDF for Event
        if (!currentEvent) {
          alert('Please select a competition event to generate the PDF.');
          return;
        }

        const eventRegs = registrations.filter(r => Number(r.item_id) === Number(currentEvent.item_id));
        if (eventRegs.length === 0) {
          alert(`No registered students found for event "${currentEvent.name_eng || currentEvent.name || currentEvent.item_code}".`);
          return;
        }

        const pdfRows: ParticipantPdfRow[] = eventRegs.map(r => {
          const stu = findStudentByIdentifier(students, r.cic_no || r.chest_no);
          return {
            studentName: stu?.name || stu?.full_name || 'Participant',
            cicNo: String(stu?.admission_no || '—'),
            chestNo: r.chest_no || getCanonicalChestNo(stu),
            category: stu?.phase || currentEvent.phase || currentEvent.category || '—',
            itemName: currentEvent.name_eng || currentEvent.name || `Event #${currentEvent.item_id}`,
            itemCode: currentEvent.item_code || currentEvent.code || `ITM-${currentEvent.item_id}`,
            itemType: currentEvent.item_type || ((currentEvent.min_participants ?? 1) > 1 ? 'Group' : 'Single'),
            itemMode: formatPdfItemMode(currentEvent),
            blindCode: r.code_letter || 'Unassigned'
          };
        });

        const collegesCount = new Set(eventRegs.map(r => r.college_affl_no).filter(Boolean)).size;
        pdfRows.sort((a, b) => a.studentName.localeCompare(b.studentName));

        const doc = generateParticipantsListPdf({
          collegeName: `Event: ${currentEvent.item_code || currentEvent.code} - ${currentEvent.name_eng || currentEvent.name}`,
          collegeAfflNo: `${collegesCount} Participating Colleges`,
          participants: pdfRows,
          festName: festSettings?.fest_name || '14th Wafy Arts Fest',
          filterSummary: `${pdfRows.length} total participants from ${collegesCount} colleges`
        });

        doc.save(previewFilename);
        onClose();
        return;
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Festival Rosters & Data"
      description="Export screening links, full competition rosters by mode/phase, institutional rosters, or official PDF stage sheets."
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-[var(--text-muted)] font-mono flex items-center gap-2">
            <span>{estimatedRowsCount} entries matching scope</span>
            {scope === 'all' && packaging === 'separate' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                {selectableItems.length} Separate Files (ZIP)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="saffron"
              onClick={handleExecuteExport}
              disabled={isExporting || estimatedRowsCount === 0}
              className="font-heading font-bold gap-1.5"
            >
              {packaging === 'separate' && scope === 'all' ? (
                <FolderArchive className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isExporting
                  ? packaging === 'separate' && scope === 'all'
                    ? 'Packaging ZIP...'
                    : 'Exporting...'
                  : packaging === 'separate' && scope === 'all'
                  ? 'Download ZIP Bundle'
                  : 'Download Export'}
              </span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* 1. SELECT EXPORT FORMAT (4 MAIN OPTIONS) */}
        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* OPTION 1: PRE-FEST EVENTS */}
            <button
              type="button"
              onClick={() => {
                setCategory('prefest');
                setScope('all');
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                category === 'prefest'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sparkles className={`w-4 h-4 ${category === 'prefest' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                {category === 'prefest' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div>
                <div className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  Pre-Fest Links
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-sans leading-tight">
                  Screening &amp; submission links (Chest #, Link, Event)
                </div>
              </div>
            </button>

            {/* OPTION 2: EVENT-WISE CSV */}
            <button
              type="button"
              onClick={() => {
                setCategory('event_wise');
                setScope('all');
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                category === 'event_wise'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet className={`w-4 h-4 ${category === 'event_wise' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                {category === 'event_wise' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div>
                <div className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  Event-Wise (CSV / ZIP)
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-sans leading-tight">
                  Filter by mode, stage, screening, or special
                </div>
              </div>
            </button>

            {/* OPTION 3: COLLEGE-WISE CSV */}
            <button
              type="button"
              onClick={() => {
                setCategory('college_wise');
                setScope('all');
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                category === 'college_wise'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Building2 className={`w-4 h-4 ${category === 'college_wise' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                {category === 'college_wise' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div>
                <div className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  College-Wise (CSV)
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-sans leading-tight">
                  Rosters grouped by college institution
                </div>
              </div>
            </button>

            {/* OPTION 4: PRINTABLE PDF */}
            <button
              type="button"
              onClick={() => {
                setCategory('pdf');
                setScope('specific');
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                category === 'pdf'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText className={`w-4 h-4 ${category === 'pdf' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                {category === 'pdf' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div>
                <div className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  Printable PDF
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-sans leading-tight">
                  Official stage sheets with signatures
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2A. IF PRE-FEST: SUB-TYPE SELECTOR (SCREENING VS SUBMISSION) */}
        {category === 'prefest' && (
          <div className="space-y-1.5 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <label className="text-xs font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Pre-Fest Round Filter
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreFestSubType('screening');
                  setSearchQuery('');
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  preFestSubType === 'screening'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                <span>Screening ({screeningItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreFestSubType('submission');
                  setSearchQuery('');
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  preFestSubType === 'submission'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Submission ({submissionItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreFestSubType('all');
                  setSearchQuery('');
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  preFestSubType === 'all'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>All Pre-Fest ({allPreFestItems.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* 2B. IF EVENT-WISE: COMPREHENSIVE EVENT MODE FILTER */}
        {category === 'event_wise' && (
          <div className="space-y-1.5 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Filter by Event Mode &amp; Type
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {selectableItems.length} matching events
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {/* ALL */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('all');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'all'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">All Events</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.all}
                </span>
              </button>

              {/* ON STAGE */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('onstage');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'onstage'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">On Stage</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.onstage}
                </span>
              </button>

              {/* OFF STAGE */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('offstage');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'offstage'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">Off Stage</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.offstage}
                </span>
              </button>

              {/* SCREENING */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('screening');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'screening'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">Screening</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.screening}
                </span>
              </button>

              {/* SUBMISSION */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('submission');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'submission'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">Submission</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.submission}
                </span>
              </button>

              {/* GENERAL */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('general');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'general'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">General</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.general}
                </span>
              </button>

              {/* SPECIAL */}
              <button
                type="button"
                onClick={() => {
                  setEventModeFilter('special');
                  setSearchQuery('');
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  eventModeFilter === 'special'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">Special (Cat D)</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10">
                  {modeCounts.special}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 2C. IF PDF: CHOOSE EVENT VS COLLEGE */}
        {category === 'pdf' && (
          <div className="space-y-1.5 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <label className="text-xs font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              PDF Document Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPdfScopeType('event');
                  setSearchQuery('');
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pdfScopeType === 'event'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Event Stage Roster</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPdfScopeType('college');
                  setSearchQuery('');
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pdfScopeType === 'college'
                    ? 'border-[var(--f-saffron)] bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>College Delegation Roster</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. CHOOSE SCOPE: ALL VS SPECIFIC */}
        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            2. Choose Scope (All vs Specific)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={category === 'pdf'}
              onClick={() => setScope('all')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                scope === 'all'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 text-[var(--text-primary)] font-bold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              } ${category === 'pdf' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {category === 'college_wise'
                    ? `All Colleges (${colleges.length})`
                    : category === 'prefest'
                    ? `All ${
                        preFestSubType === 'screening'
                          ? 'Screening'
                          : preFestSubType === 'submission'
                          ? 'Submission'
                          : 'Pre-Fest'
                      } Events (${selectableItems.length})`
                    : `All ${eventModeFilter === 'all' ? '' : eventModeFilter.toUpperCase() + ' '}Events (${selectableItems.length})`}
                </span>
              </span>
              {scope === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
            </button>

            <button
              type="button"
              onClick={() => setScope('specific')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                scope === 'specific'
                  ? 'border-[var(--f-saffron)] bg-amber-500/10 text-[var(--text-primary)] font-bold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {category === 'college_wise' || (category === 'pdf' && pdfScopeType === 'college')
                    ? 'Specific College'
                    : 'Specific Event'}
                </span>
              </span>
              {scope === 'specific' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* 4. PACKAGING OPTION: SINGLE CONSOLIDATED FILE VS SEPARATE FILE PER EVENT (FOR ALL SCOPE) */}
        {scope === 'all' && (category === 'event_wise' || category === 'prefest') && (
          <div className="space-y-1.5 p-3 bg-gradient-to-r from-amber-500/5 to-transparent rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                3. Download Packaging Option
              </label>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {packaging === 'separate' ? 'ZIP Archive' : 'Single CSV'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {/* OPTION A: SINGLE FILE */}
              <button
                type="button"
                onClick={() => setPackaging('single')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  packaging === 'single'
                    ? 'border-[var(--f-saffron)] bg-amber-500/15 ring-1 ring-amber-500/30'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <FileSpreadsheet className={`w-4 h-4 shrink-0 mt-0.5 ${packaging === 'single' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-heading font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>All Events in 1 File</span>
                    {packaging === 'single' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    One single master CSV with all events, candidates, and details consolidated.
                  </div>
                </div>
              </button>

              {/* OPTION B: SEPARATE FILES PER EVENT (ZIP) */}
              <button
                type="button"
                onClick={() => setPackaging('separate')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  packaging === 'separate'
                    ? 'border-[var(--f-saffron)] bg-amber-500/15 ring-1 ring-amber-500/30'
                    : 'border-[var(--border-medium)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <FolderArchive className={`w-4 h-4 shrink-0 mt-0.5 ${packaging === 'separate' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-heading font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>Each Event in Separate File</span>
                    {packaging === 'separate' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    Separate individual CSV file for each event, bundled in a single ZIP download.
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 5. SPECIFIC SELECTOR (EVENT OR COLLEGE) */}
        {scope === 'specific' && (category !== 'college_wise' && !(category === 'pdf' && pdfScopeType === 'college')) && (
          <div className="space-y-2.5 p-3.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[var(--text-primary)] font-heading">
                Select {category === 'prefest' ? `${preFestSubType.toUpperCase()} Event` : 'Competition Event'}:
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {filteredItems.length} of {selectableItems.length} available
              </span>
            </div>

            {/* Live Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search event code, title, or phase..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown / Interactive Scrollable List */}
            {filteredItems.length > 0 ? (
              <div
                className="max-h-44 sm:max-h-48 overflow-y-auto overscroll-contain flex flex-col gap-1 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-medium)] custom-scrollbar"
                onWheel={e => e.stopPropagation()}
              >
                {filteredItems.map(itm => {
                  const isScreen = isScreeningEvent(itm) || Boolean(itm.is_screening);
                  const isSub = isSubmissionEvent(itm) || Boolean(itm.is_submission) || itm.mode === 'submission';
                  const tag = isScreen ? 'Screening' : isSub ? 'Submission' : getEffectiveStageMode(itm) === 'onstage' ? 'On Stage' : 'Off Stage';
                  const itemCode = itm.item_code || itm.code || `ITM-${itm.item_id}`;
                  const itemName = itm.name_eng || itm.name || 'Event';
                  const isSelected = Number(selectedEventId) === Number(itm.item_id);

                  return (
                    <button
                      type="button"
                      key={itm.item_id}
                      onClick={() => setSelectedEventId(Number(itm.item_id))}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            isSelected
                              ? 'bg-black/20 text-[#090d1a]'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {itemCode}
                        </span>
                        <span className="truncate">{itemName}</span>
                        <span className={`text-[10px] shrink-0 ${isSelected ? 'text-[#090d1a]/80' : 'text-[var(--text-muted)]'}`}>
                          ({tag} • {itm.phase || 'General'})
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#090d1a]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-amber-600 dark:text-amber-400 p-2.5 bg-amber-500/10 rounded-lg flex items-center justify-between border border-amber-500/20">
                <span>No events match &quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="underline font-bold text-xs cursor-pointer ml-2 hover:opacity-80"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {scope === 'specific' && (category === 'college_wise' || (category === 'pdf' && pdfScopeType === 'college')) && (
          <div className="space-y-2.5 p-3.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[var(--text-primary)] font-heading">
                Select College Institution:
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {filteredColleges.length} of {colleges.length} colleges
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search college name, short code, or affiliation #..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filteredColleges.length > 0 ? (
              <div
                className="max-h-44 sm:max-h-48 overflow-y-auto overscroll-contain flex flex-col gap-1 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-medium)] custom-scrollbar"
                onWheel={e => e.stopPropagation()}
              >
                {filteredColleges.map(col => {
                  const isSelected = Number(selectedCollegeAffl) === Number(col.affl_no);
                  return (
                    <button
                      type="button"
                      key={col.affl_no}
                      onClick={() => setSelectedCollegeAffl(Number(col.affl_no))}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-xs'
                          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            isSelected
                              ? 'bg-black/20 text-[#090d1a]'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          #{col.affl_no}
                        </span>
                        <span className="truncate">{col.name}</span>
                        <span className={`text-[10px] shrink-0 ${isSelected ? 'text-[#090d1a]/80' : 'text-[var(--text-muted)]'}`}>
                          ({col.short_name || col.code || 'COL'})
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#090d1a]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-amber-600 dark:text-amber-400 p-2.5 bg-amber-500/10 rounded-lg flex items-center justify-between border border-amber-500/20">
                <span>No colleges match &quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="underline font-bold text-xs cursor-pointer ml-2 hover:opacity-80"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. PREVIEW SUMMARY BANNER */}
        <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-xs space-y-1.5 font-sans">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Target Output File:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold truncate max-w-xs">
              {previewFilename}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Packaging Mode:</span>
            <span className="font-mono text-[var(--text-secondary)] font-semibold">
              {scope === 'all' && packaging === 'separate'
                ? `ZIP Archive with ${selectableItems.length} separate event CSV files`
                : scope === 'all'
                ? 'Single Master CSV file (all events combined)'
                : 'Single Event CSV file'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Included Columns:</span>
            <span className="font-mono text-[var(--text-secondary)]">
              {category === 'prefest'
                ? 'Chest No, Link, Event Name, Category, College'
                : category === 'college_wise'
                ? 'College #, Name, Chest #, CIC, Student, Class, Event Code, Name...'
                : category === 'event_wise'
                ? 'Sl No, Event Code, Name, Blind Letter, Chest #, CIC, Student, College...'
                : 'Official PDF Table with Chest Numbers & Signatures'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
