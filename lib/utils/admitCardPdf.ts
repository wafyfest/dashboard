import { jsPDF } from 'jspdf';
import { Student, College, Registration, FestSettings } from '../types/fest';

interface GenerateAdmitCardOptions {
  student: Student;
  college?: College;
  registrations: Registration[];
  festSettings?: FestSettings;
  chestNo: string;
}

export function generateAdmitCardPdf({
  student,
  college,
  registrations,
  festSettings,
  chestNo
}: GenerateAdmitCardOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Outer Decorative Border
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.6);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, 275);

  doc.setDrawColor(19, 34, 56);
  doc.setLineWidth(0.3);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 271);

  // 1. Header Banner
  doc.setFillColor(19, 34, 56); // Navy #132238
  doc.rect(margin, margin, contentWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const festTitle = (festSettings?.fest_name || 'WSF ARTS FEST 2025').toUpperCase();
  doc.text(festTitle, pageWidth / 2, margin + 7.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 210, 235);
  doc.text(
    'COORDINATION OF ISLAMIC COLLEGES (CIC) • ARTS & CULTURAL FESTIVAL',
    pageWidth / 2,
    margin + 13,
    { align: 'center' }
  );

  doc.setFillColor(37, 99, 235); // Blue #2563EB accent pill
  doc.roundedRect(pageWidth / 2 - 40, margin + 17, 80, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL PARTICIPANT ADMIT CARD', pageWidth / 2, margin + 21.2, { align: 'center' });

  // 2. Student Profile Card
  let currentY = margin + 31;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

  // Chest Number Highlight Box (Top Right of Student Card)
  doc.setFillColor(19, 34, 56);
  doc.roundedRect(margin + contentWidth - 42, currentY + 4, 38, 18, 2, 2, 'F');
  doc.setTextColor(180, 200, 225);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CHEST NUMBER', margin + contentWidth - 23, currentY + 9, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(chestNo, margin + contentWidth - 23, currentY + 18, { align: 'center' });

  // Student Details List
  const studentName = (student.name || student.full_name || 'STUDENT').toUpperCase();
  const cicNo = String(student.admission_no ?? student.cic_no ?? student.cic_number ?? 'N/A');
  const collegeName = college?.name || `College #${student.college_affl_no || ''}`;
  const afflText = college?.affl_no ? ` (Affl No: ${college.affl_no})` : '';
  const className = student.class || 'N/A';
  const categoryPhase = (student.phase || student.category || 'N/A').toUpperCase();

  doc.setTextColor(19, 34, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(studentName, margin + 6, currentY + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CIC Registration No:', margin + 6, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cicNo, margin + 42, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Institution:', margin + 6, currentY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const collegeStr = doc.splitTextToSize(`${collegeName}${afflText}`, contentWidth - 55);
  doc.text(collegeStr, margin + 26, currentY + 23);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Class:', margin + 6, currentY + 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(className, margin + 18, currentY + 31);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Category / Phase:', margin + 48, currentY + 31);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(categoryPhase, margin + 78, currentY + 31);

  currentY += 44;

  // 3. Registered Competitions Table
  doc.setTextColor(19, 34, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('REGISTERED COMPETITIONS & SCHEDULE', margin, currentY);

  currentY += 4;

  // Table Header
  const colX = {
    idx: margin,
    code: margin + 10,
    name: margin + 35,
    phase: margin + 105,
    mode: margin + 128,
    status: margin + 155
  };

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 7, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('#', colX.idx + 3, currentY + 4.8);
  doc.text('ITEM CODE', colX.code + 2, currentY + 4.8);
  doc.text('COMPETITION EVENT', colX.name + 2, currentY + 4.8);
  doc.text('CATEGORY', colX.phase + 2, currentY + 4.8);
  doc.text('MODE', colX.mode + 2, currentY + 4.8);
  doc.text('STAGE / STATUS', colX.status + 2, currentY + 4.8);

  currentY += 7;

  // Table Rows
  if (registrations.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 10, 'FD');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No registered competitions currently assigned to this student.', margin + contentWidth / 2, currentY + 6, {
      align: 'center'
    });
    currentY += 10;
  } else {
    registrations.forEach((reg, i) => {
      const rowHeight = 8;
      const isEven = i % 2 === 0;

      doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 252, isEven ? 255 : 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'FD');

      const itemCode = reg.item?.item_code || reg.item?.code || `ITM-${reg.item_id}`;
      const itemName = reg.item?.name_eng || reg.item?.name || `Event #${reg.item_id}`;
      const itemPhase = reg.item?.phase || student.phase || 'General';
      const itemMode = (reg.item?.mode || 'Onstage').toUpperCase();
      const itemStatus = reg.code_letter ? `Code: ${reg.code_letter}` : 'Confirmed';

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(String(i + 1), colX.idx + 3, currentY + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.text(itemCode, colX.code + 2, currentY + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const truncatedName = itemName.length > 36 ? itemName.slice(0, 34) + '...' : itemName;
      doc.text(truncatedName, colX.name + 2, currentY + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(itemPhase, colX.phase + 2, currentY + 5.2);
      doc.text(itemMode, colX.mode + 2, currentY + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(itemStatus, colX.status + 2, currentY + 5.2);

      currentY += rowHeight;
    });
  }

  currentY += 8;

  // 4. Important Guidelines Section
  doc.setFillColor(254, 252, 232); // Subtle amber/yellow notice box
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(margin, currentY, contentWidth, 28, 1.5, 1.5, 'FD');

  doc.setTextColor(133, 77, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RULES & INSTRUCTIONS FOR CANDIDATE:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(113, 63, 18);
  const rules = [
    '1. The student must bring and present this official Admit Card along with valid college photo ID card.',
    '2. Participants must report to the backstage stage desk at least 30 minutes prior to the scheduled item call.',
    '3. Group event members must assemble simultaneously with their respective college manager.',
    '4. Code letters and lots will be assigned anonymously before the commencement of the onstage stage call.',
    '5. Any substitution or medical replacement requires prior authorization through the institutional committee.'
  ];

  rules.forEach((rule, idx) => {
    doc.text(rule, margin + 4, currentY + 9.5 + idx * 3.6);
  });

  currentY += 34;

  // 5. Verification & Signature Blocks
  const boxHeight = 22;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Box 1: Institutional Verification
  doc.rect(margin, currentY, 55, boxHeight);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Institution Seal / Stamp', margin + 3, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('COLLEGE PRINCIPAL / MANAGER', margin + 3, currentY + boxHeight - 2.5);

  // Box 2: Candidate Security Verification
  doc.rect(margin + 62, currentY, 58, boxHeight);
  doc.text('Candidate Identification', margin + 65, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`CIC Verification ID:`, margin + 65, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${cicNo}-${chestNo}`, margin + 65, currentY + 14);
  doc.setTextColor(100, 116, 139);
  doc.text('CANDIDATE SIGNATURE', margin + 65, currentY + boxHeight - 2.5);

  // Box 3: Fest Convener Authorized Signatory
  doc.rect(margin + 127, currentY, 55, boxHeight);
  doc.text('Festival Central Directorate', margin + 130, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 34, 56);
  doc.text('FEST GENERAL CONVENER', margin + 130, currentY + boxHeight - 2.5);

  // 6. Security Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.text(
    `Generated via Wafy Arts Fest Portal • Date: ${dateStr} ${timeStr} • Unique Ref: ${student.id.slice(0, 12)}`,
    margin,
    285
  );

  return doc;
}
