import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student, College, Registration, FestSettings } from '../types/fest';

interface GenerateAdmitCardOptions {
  student: Student;
  college?: College;
  registrations: Registration[];
  festSettings?: FestSettings;
  chestNo: string;
}

// In-memory cache for the base template data URL
let cachedTemplateDataUrl: string | null = null;

/**
 * Fits any student photo source into the exact rounded shape of the candidate photo box:
 * 1. Preserves aspect ratio with cover crop (top-biased for head & portrait framing).
 * 2. Clips with smooth rounded corners (rx=14, ry=14 matching the 723x1024 template).
 * 3. Adds crisp subtle outline border matching template line art.
 * 4. Operates in both browser (Canvas) and Node.js (Sharp) environments.
 */
async function prepareCandidatePhoto(photoUrl: string): Promise<string | null> {
  if (!photoUrl || typeof photoUrl !== 'string') return null;

  // Browser environment using Canvas
  if (typeof window !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const targetW = 149;
          const targetH = 150;
          const r = 14;
          const scale = 2; // 2x supersampling for crisp print

          const canvas = document.createElement('canvas');
          canvas.width = targetW * scale;
          canvas.height = targetH * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          // Calculate cover crop preserving aspect ratio
          const imgRatio = img.width / img.height;
          const targetRatio = targetW / targetH;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;

          if (imgRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            // Top-bias crop (15% from top) so face and cap remain centered
            sy = Math.max(0, (img.height - sh) * 0.15);
          }

          const cr = r * scale;
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(0, 0, canvas.width, canvas.height, cr);
          } else {
            ctx.moveTo(cr, 0);
            ctx.lineTo(canvas.width - cr, 0);
            ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cr);
            ctx.lineTo(canvas.width, canvas.height - cr);
            ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cr, canvas.height);
            ctx.lineTo(cr, canvas.height);
            ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cr);
            ctx.lineTo(0, cr);
            ctx.quadraticCurveTo(0, 0, cr, 0);
            ctx.closePath();
          }
          ctx.clip();

          // Draw cropped photo
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          // Draw subtle crisp border
          ctx.strokeStyle = '#718096';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(1.2, 1.2, canvas.width - 2.4, canvas.height - 2.4, cr);
          } else {
            ctx.moveTo(cr, 1.2);
            ctx.lineTo(canvas.width - cr, 1.2);
            ctx.quadraticCurveTo(canvas.width - 1.2, 1.2, canvas.width - 1.2, cr);
            ctx.lineTo(canvas.width - 1.2, canvas.height - cr);
            ctx.quadraticCurveTo(canvas.width - 1.2, canvas.height - 1.2, canvas.width - cr, canvas.height - 1.2);
            ctx.lineTo(cr, canvas.height - 1.2);
            ctx.quadraticCurveTo(1.2, canvas.height - 1.2, 1.2, canvas.height - cr);
            ctx.lineTo(1.2, cr);
            ctx.quadraticCurveTo(1.2, 1.2, cr, 1.2);
            ctx.closePath();
          }
          ctx.stroke();

          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = photoUrl;
    });
  }

  // Server-side / Node.js environment fallback
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    try {
      const nodeRequire = eval('require');
      const sharp = nodeRequire('sharp');
      let inputBuffer: Buffer;
      if (photoUrl.startsWith('data:')) {
        const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, '');
        inputBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const fs = nodeRequire('fs');
        if (fs.existsSync(photoUrl)) {
          inputBuffer = fs.readFileSync(photoUrl);
        } else {
          return null;
        }
      }

      const targetW = 149;
      const targetH = 150;
      const r = 14;

      const maskSvg = Buffer.from(`
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${targetW}" height="${targetH}" rx="${r}" ry="${r}" fill="#000000" />
        </svg>
      `);

      const borderSvg = Buffer.from(`
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="${targetW - 1}" height="${targetH - 1}" rx="${r}" ry="${r}" fill="none" stroke="#718096" stroke-width="1.2" />
        </svg>
      `);

      const resized = await sharp(inputBuffer)
        .ensureAlpha()
        .resize(targetW, targetH, { fit: 'cover', position: 'north' })
        .png()
        .toBuffer();

      const finalPhoto = await sharp(resized)
        .composite([
          { input: maskSvg, blend: 'dest-in' },
          { input: borderSvg, blend: 'over' }
        ])
        .png()
        .toBuffer();

      return 'data:image/png;base64,' + finalPhoto.toString('base64');
    } catch {
      return null;
    }
  }

  return null;
}

async function getBaseTemplateDataUrl(): Promise<string> {
  if (cachedTemplateDataUrl) return cachedTemplateDataUrl;

  // Browser environment: fetch from static public directory
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/images/hall_ticket_base_template.png');
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedTemplateDataUrl = reader.result as string;
          resolve(cachedTemplateDataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Failed to fetch template from /images, will render vector fallback if needed', e);
    }
  }

  // Server-side / Node.js environment fallback (for scripts / tests)
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    try {
      const nodeRequire = eval('require');
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const templatePath = path.resolve('public/images/hall_ticket_base_template.png');
      if (fs.existsSync(templatePath)) {
        const b64 = fs.readFileSync(templatePath).toString('base64');
        cachedTemplateDataUrl = 'data:image/png;base64,' + b64;
        return cachedTemplateDataUrl;
      }
    } catch {
      // ignore
    }
  }

  return '';
}

export async function generateAdmitCardPdf({
  student,
  college,
  registrations,
  festSettings,
  chestNo
}: GenerateAdmitCardOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Base template coordinate scaling:
  // Original template resolution: 723 x 1024
  // Standard A4 dimensions in mm: 210 x 297
  const sx = 210 / 723;
  const sy = 297 / 1024;

  const baseImg = await getBaseTemplateDataUrl();
  if (baseImg) {
    doc.addImage(baseImg, 'PNG', 0, 0, 210, 297);
  }

  // 1. Dynamic QR Code: Encodes ONLY the student's CIC Number
  const cicNumber = String(student.admission_no ?? student.cic_no ?? student.cic_number ?? chestNo);
  try {
    const qrDataUrl = await QRCode.toDataURL(cicNumber, {
      width: 250,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    // QR position on 723x1024: x=534, y=93, w=61, h=61
    doc.addImage(qrDataUrl, 'PNG', 534 * sx, 93 * sy, 61 * sx, 61 * sy);
  } catch (err) {
    console.error('Failed to generate QR code:', err);
  }

  // 2. Candidate Table Values
  const studentName = (student.name || student.full_name || 'STUDENT').toUpperCase();
  const collegeName = (college?.name || `College #${student.college_affl_no || ''}`).toUpperCase();
  const phaseName = (student.phase || student.category || 'GENERAL').toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  // CHEST NO (Row 1)
  doc.setFontSize(10);
  doc.text(String(chestNo), 180 * sx, 369 * sy);

  // CIC NO (Row 2)
  doc.text(cicNumber, 180 * sx, 400 * sy);

  // NAME (Row 3 - with sizing safety if long)
  const nameFontSize = studentName.length > 28 ? 8 : studentName.length > 22 ? 9 : 9.5;
  doc.setFontSize(nameFontSize);
  doc.text(studentName, 180 * sx, 431 * sy);

  // PHASE (Row 4)
  doc.setFontSize(10);
  doc.text(phaseName, 180 * sx, 462 * sy);

  // COLLEGE (Row 5 - with sizing safety)
  const collegeFontSize = collegeName.length > 35 ? 7.5 : collegeName.length > 25 ? 8 : 8.5;
  doc.setFontSize(collegeFontSize);
  const collegeText = doc.splitTextToSize(collegeName, (515 - 180) * sx);
  doc.text(collegeText, 180 * sx, 492 * sy);

  // 3. Candidate Photo (Fitted accurately to the rounded placeholder box: 534, 345, 149, 150)
  if (student.photo_url) {
    try {
      const fittedPhotoDataUrl = await prepareCandidatePhoto(student.photo_url);
      if (fittedPhotoDataUrl) {
        doc.addImage(fittedPhotoDataUrl, 'PNG', 534 * sx, 345 * sy, 149 * sx, 150 * sy);
      }
    } catch (err) {
      console.warn('Could not render candidate photo:', err);
    }
  }

  // 4. Events Table (Strictly Off-Stage events, deduplicated by item)
  // Ensure clean white canvas under the dark header
  doc.setFillColor(255, 255, 255);
  doc.rect(33 * sx, 593 * sy, 658 * sx, 182 * sy, 'F');

  // Filter strictly to off-stage events (the template is "OFF STAGE HALLTICKET")
  const offstageRegs = registrations.filter(r => {
    const m = (r.item?.mode || (r as any).mode || '').toLowerCase().trim();
    return m !== 'onstage' && m !== 'on_stage' && m !== 'on stage';
  });

  // Deduplicate by item_id / item_code to prevent duplicate rows for the same event
  const seenItems = new Set<string | number>();
  const displayEvents: Registration[] = [];
  for (const reg of offstageRegs) {
    const key = reg.item_id || reg.item?.item_code || reg.item?.id;
    if (key && !seenItems.has(key)) {
      seenItems.add(key);
      displayEvents.push(reg);
    }
  }

  const numEvents = displayEvents.length;
  const tableTop = 592;
  const rowHeight = numEvents > 6 ? Math.floor(180 / numEvents) : 30;

  // Set line styling for table borders matching template
  doc.setDrawColor(120, 124, 128);
  doc.setLineWidth(0.2);

  displayEvents.forEach((reg, i) => {
    const yTop = tableTop + i * rowHeight;
    const yBottom = tableTop + (i + 1) * rowHeight;
    const yText = (yTop + Math.floor(rowHeight * 0.65)) * sy;

    const itemCode = reg.item?.item_code || reg.item?.code || `ITM-${reg.item_id}`;
    const itemName = reg.item?.name_eng || reg.item?.name || `Event #${reg.item_id}`;

    // Format scheduled time if available
    let timeStr = '';
    const regAny = reg as any;
    if (regAny.schedule?.starting) {
      try {
        const d = new Date(regAny.schedule.starting);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const hrStr = String(hours).padStart(2, '0');
        timeStr = `${day}/${month}/${year} ${hrStr}:${minutes} ${ampm}`;
      } catch {
        timeStr = '';
      }
    }

    // Horizontal bottom line closing this row
    doc.line(34 * sx, yBottom * sy, 689 * sx, yBottom * sy);

    // Vertical column divider lines
    doc.line(34 * sx, yTop * sy, 34 * sx, yBottom * sy);
    doc.line(100 * sx, yTop * sy, 100 * sx, yBottom * sy);
    doc.line(188 * sx, yTop * sy, 188 * sx, yBottom * sy);
    doc.line(386 * sx, yTop * sy, 386 * sy, yBottom * sy);
    doc.line(578 * sx, yTop * sy, 578 * sx, yBottom * sy);
    doc.line(689 * sx, yTop * sy, 689 * sx, yBottom * sy);

    const pdfFontSize = numEvents > 6 ? 7.5 : 8.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pdfFontSize);

    // Sl No (center of col 34-100)
    doc.text(String(i + 1), 67 * sx, yText, { align: 'center' });

    // Code (center of col 100-188)
    doc.text(itemCode, 144 * sx, yText, { align: 'center' });

    // Item Name (left of col 188-386)
    const truncatedItem = itemName.length > 27 ? itemName.slice(0, 25) + '...' : itemName;
    doc.text(truncatedItem, 198 * sx, yText, { align: 'left' });

    // Date & Time (center of col 386-578)
    if (timeStr) {
      doc.text(timeStr, 482 * sx, yText, { align: 'center' });
    }

    // Sign column (578-689) is left blank for stage invigilator
  });

  // 5. Place & Downloading Date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const downloadDate = `${day}-${month}-${year}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Pang', 140 * sx, 838 * sy);
  doc.text(downloadDate, 140 * sx, 865 * sy);

  // 6. Candidate Name under Signature (centered along the candidate signature block axis at x=527)
  doc.setFontSize(9);
  doc.text(studentName, 527 * sx, 871 * sy, { align: 'center' });

  return doc;
}
