import { jsPDF } from 'jspdf';

export interface ParticipantPdfRow {
  studentName: string;
  cicNo: string;
  chestNo: string;
  category: string;
  itemName: string;
  itemCode: string;
  itemType: string;
  itemMode?: string;
  blindCode: string;
}

export interface GenerateParticipantsListPdfOptions {
  collegeName?: string;
  collegeAfflNo?: number | string;
  participants: ParticipantPdfRow[];
  festName?: string;
  filterSummary?: string;
}

export function generateParticipantsListPdf({
  collegeName = 'Participating College',
  collegeAfflNo = '11',
  participants,
  festName = 'WSF ARTS FEST',
  filterSummary
}: GenerateParticipantsListPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // Column layout (Sum = 273mm)
  const cols = [
    { key: 'idx', label: '#', width: 10, align: 'center' as const },
    { key: 'name', label: 'STUDENT NAME', width: 50, align: 'left' as const },
    { key: 'cic', label: 'CIC / ADM NO', width: 26, align: 'left' as const },
    { key: 'chest', label: 'CHEST NO', width: 22, align: 'center' as const },
    { key: 'category', label: 'PHASE / CAT', width: 26, align: 'left' as const },
    { key: 'event', label: 'COMPETITION EVENT', width: 68, align: 'left' as const },
    { key: 'code', label: 'ITEM CODE', width: 22, align: 'center' as const },
    { key: 'mode', label: 'TYPE / MODE', width: 28, align: 'center' as const },
    { key: 'letter', label: 'BLIND CODE', width: 21, align: 'center' as const },
  ];

  const colX: number[] = [];
  let accumX = margin;
  cols.forEach(c => {
    colX.push(accumX);
    accumX += c.width;
  });

  const rowHeight = 6.8;
  const bottomThreshold = pageHeight - margin - 10;

  // Helper to draw the table header
  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    cols.forEach((col, idx) => {
      const x = colX[idx];
      if (col.align === 'center') {
        doc.text(col.label, x + col.width / 2, y + 4.5, { align: 'center' });
      } else {
        doc.text(col.label, x + 2, y + 4.5);
      }
    });

    return y + 6.5;
  };

  // Helper to draw the top banner on Page 1
  const drawPage1Header = () => {
    // Navy Banner
    doc.setFillColor(19, 34, 56); // #132238
    doc.rect(margin, margin, contentWidth, 20, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(festName.toUpperCase(), margin + 8, margin + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(190, 210, 235);
    doc.text('COORDINATION OF ISLAMIC COLLEGES (CIC) • ARTS & CULTURAL FESTIVAL', margin + 8, margin + 14);

    // Right Badge
    doc.setFillColor(37, 99, 235); // Blue pill
    doc.roundedRect(pageWidth - margin - 75, margin + 5, 67, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('OFFICIAL PARTICIPANTS ROSTER', pageWidth - margin - 41.5, margin + 11.2, { align: 'center' });

    // College & Meta Info Bar
    const metaY = margin + 23;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, metaY, contentWidth, 12, 1.5, 1.5, 'FD');

    // College Name
    doc.setTextColor(19, 34, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(collegeName, margin + 4, metaY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Affiliation No: ${collegeAfflNo}`, margin + 4, metaY + 9.8);

    // Meta right side: Count & Date
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Entries: ${participants.length}`, pageWidth - margin - 4, metaY + 5.5, { align: 'right' });

    const genDateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const genTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${genDateStr}, ${genTimeStr}`, pageWidth - margin - 4, metaY + 9.8, { align: 'right' });

    // Filter indicator if any
    let tableStartY = metaY + 15;
    if (filterSummary) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Active Filter: ${filterSummary}`, margin + 1, tableStartY - 1.5);
    }

    return tableStartY;
  };

  // Helper for subsequent page headers
  const drawSubsequentPageHeader = () => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, margin, contentWidth, 8, 'FD');

    doc.setTextColor(19, 34, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${festName.toUpperCase()} • ${collegeName} (Affl No: ${collegeAfflNo})`, margin + 4, margin + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Participants Roster Directory', pageWidth - margin - 4, margin + 5.2, { align: 'right' });

    return drawTableHeader(margin + 10);
  };

  // --- Start Rendering ---
  let currentY = drawPage1Header();
  currentY = drawTableHeader(currentY);

  if (participants.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 12, 'FD');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No registered competition participants found for this college.', margin + contentWidth / 2, currentY + 7.5, {
      align: 'center'
    });
  } else {
    participants.forEach((p, idx) => {
      // Check if page break is needed
      if (currentY + rowHeight > bottomThreshold) {
        doc.addPage();
        currentY = drawSubsequentPageHeader();
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 249, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'FD');

      // #
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(String(idx + 1), colX[0] + cols[0].width / 2, currentY + 4.5, { align: 'center' });

      // Student Name
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const studentNameStr = p.studentName.length > 28 ? p.studentName.slice(0, 26) + '...' : p.studentName;
      doc.text(studentNameStr, colX[1] + 2, currentY + 4.5);

      // CIC / Adm No
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const cicStr = p.cicNo.length > 15 ? p.cicNo.slice(0, 14) + '..' : p.cicNo;
      doc.text(cicStr, colX[2] + 2, currentY + 4.5);

      // Chest No
      doc.setTextColor(19, 34, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(p.chestNo, colX[3] + cols[3].width / 2, currentY + 4.5, { align: 'center' });

      // Category / Phase
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(p.category, colX[4] + 2, currentY + 4.5);

      // Competition Event
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const eventStr = p.itemName.length > 38 ? p.itemName.slice(0, 36) + '...' : p.itemName;
      doc.text(eventStr, colX[5] + 2, currentY + 4.5);

      // Item Code
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(p.itemCode, colX[6] + cols[6].width / 2, currentY + 4.5, { align: 'center' });

      // Type / Mode
      const typeModeStr = `${p.itemType || 'Single'} / ${p.itemMode || 'On'}`;
      doc.text(typeModeStr, colX[7] + cols[7].width / 2, currentY + 4.5, { align: 'center' });

      // Blind Code
      if (p.blindCode && p.blindCode !== 'Unassigned') {
        doc.setTextColor(217, 119, 6); // Amber #D97706
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(p.blindCode, colX[8] + cols[8].width / 2, currentY + 4.5, { align: 'center' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.text('-', colX[8] + cols[8].width / 2, currentY + 4.5, { align: 'center' });
      }

      currentY += rowHeight;
    });
  }

  // Add Page Numbers and Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 7, pageWidth - margin, pageHeight - 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Official Computer-Generated Document • Arts & Cultural Fest Management System',
      margin,
      pageHeight - 4
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  return doc;
}
