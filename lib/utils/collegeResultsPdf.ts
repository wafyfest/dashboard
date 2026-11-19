import { jsPDF } from 'jspdf';
import { formatIstDisplay } from './istDate';

export interface CollegeResultPdfRow {
  itemCode: string;
  itemName: string;
  category: string;
  participantName: string;
  chestNo: string;
  rankText: string;
  gradeText: string;
  pointsText: string;
}

export interface GenerateCollegeResultsPdfOptions {
  collegeName: string;
  collegeAfflNo: number | string;
  collegeCode?: string;
  results: CollegeResultPdfRow[];
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  festTitle?: string;
}

export function generateCollegeResultsPdf({
  collegeName,
  collegeAfflNo,
  collegeCode,
  results,
  totalPoints,
  firstCount,
  secondCount,
  thirdCount,
  festTitle = 'WAFY ARTS FEST'
}: GenerateCollegeResultsPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // Table Columns (Sum = 273mm)
  const cols = [
    { key: 'idx', label: '#', width: 10, align: 'center' as const },
    { key: 'code', label: 'CODE', width: 22, align: 'center' as const },
    { key: 'event', label: 'COMPETITION EVENT', width: 75, align: 'left' as const },
    { key: 'category', label: 'PHASE / CAT', width: 28, align: 'left' as const },
    { key: 'participant', label: 'PARTICIPANT / TEAM', width: 72, align: 'left' as const },
    { key: 'position', label: 'POSITION', width: 26, align: 'center' as const },
    { key: 'grade', label: 'GRADE', width: 18, align: 'center' as const },
    { key: 'points', label: 'POINTS', width: 22, align: 'center' as const }
  ];

  const colX: number[] = [];
  let accumX = margin;
  cols.forEach(c => {
    colX.push(accumX);
    accumX += c.width;
  });

  const rowHeight = 7.0;
  const bottomThreshold = pageHeight - margin - 12;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 7, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    cols.forEach((col, idx) => {
      let x = colX[idx];
      if (col.align === 'center') {
        x += col.width / 2;
        doc.text(col.label, x, y + 4.8, { align: 'center' });
      } else {
        doc.text(col.label, x + 2, y + 4.8);
      }
    });
  };

  const drawPageHeader = (isFirstPage: boolean) => {
    // Top Brand Accent Bar
    doc.setFillColor(217, 119, 6); // amber-600 / saffron
    doc.rect(margin, margin, contentWidth, 2.5, 'F');

    // Title & Institution Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(festTitle, margin, margin + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('OFFICIAL PUBLISHED RESULTS STATEMENT', margin, margin + 13);

    // College Affiliation Box (Right-aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const colCodeText = collegeCode ? ` (${collegeCode})` : '';
    const colNameFull = `${collegeName}${colCodeText}`;
    doc.text(colNameFull, pageWidth - margin, margin + 8.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Institution Affiliation #${collegeAfflNo}`, pageWidth - margin, margin + 13, { align: 'right' });

    let nextY = margin + 18;

    // Summary Metric Cards on First Page
    if (isFirstPage) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, nextY, contentWidth, 12, 1.5, 1.5, 'FD');

      const statY = nextY + 7.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(120, 53, 15); // amber-900

      const statsText = [
        `TOTAL POINTS EARNED: ${totalPoints} PTS`,
        `FIRST PRIZES: ${firstCount}`,
        `SECOND PRIZES: ${secondCount}`,
        `THIRD PRIZES: ${thirdCount}`,
        `TOTAL SCORED ENTRIES: ${results.length}`
      ].join('   |   ');

      doc.text(statsText, margin + contentWidth / 2, statY, { align: 'center' });
      nextY += 16;
    } else {
      nextY += 2;
    }

    drawTableHeader(nextY);
    return nextY + 7;
  };

  let currentY = drawPageHeader(true);

  if (results.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No published results found for this institution.', margin + contentWidth / 2, currentY + 15, { align: 'center' });
  } else {
    results.forEach((row, idx) => {
      if (currentY + rowHeight > bottomThreshold) {
        doc.addPage('a4', 'landscape');
        currentY = drawPageHeader(false);
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'FD');

      doc.setFontSize(7.5);

      // Index
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), colX[0] + cols[0].width / 2, currentY + 4.8, { align: 'center' });

      // Event Code
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(row.itemCode, colX[1] + cols[1].width / 2, currentY + 4.8, { align: 'center' });

      // Event Name
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const truncEvent = row.itemName.length > 44 ? row.itemName.slice(0, 42) + '...' : row.itemName;
      doc.text(truncEvent, colX[2] + 2, currentY + 4.8);

      // Category
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(row.category || 'General', colX[3] + 2, currentY + 4.8);

      // Participant / Team
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const truncPart = row.participantName.length > 38 ? row.participantName.slice(0, 36) + '...' : row.participantName;
      doc.text(truncPart, colX[4] + 2, currentY + 3.3);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(row.chestNo ? `Chest: ${row.chestNo}` : 'Team Entry', colX[4] + 2, currentY + 5.8);

      // Position
      doc.setFontSize(7.5);
      if (row.rankText.includes('1st')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9); // amber-700
      } else if (row.rankText.includes('2nd')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // slate-600
      } else if (row.rankText.includes('3rd')) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(194, 65, 12); // orange-700
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
      }
      doc.text(row.rankText, colX[5] + cols[5].width / 2, currentY + 4.8, { align: 'center' });

      // Grade
      doc.setFont('helvetica', row.gradeText !== '—' ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row.gradeText, colX[6] + cols[6].width / 2, currentY + 4.8, { align: 'center' });

      // Points
      doc.setFont('helvetica', 'bold');
      if (row.pointsText !== '0' && row.pointsText !== '—') {
        doc.setTextColor(16, 185, 129); // emerald
      } else {
        doc.setTextColor(148, 163, 184); // slate-400
      }
      doc.text(row.pointsText, colX[7] + cols[7].width / 2, currentY + 4.8, { align: 'center' });

      currentY += rowHeight;
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  const nowDisplay = formatIstDisplay(new Date().toISOString());

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - margin - 2, pageWidth - margin, pageHeight - margin - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Statement Generated on: ${nowDisplay}`, margin, pageHeight - margin + 2);
    doc.text(`Official Tabulation Registry • Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - margin + 2, { align: 'right' });
  }

  return doc;
}
