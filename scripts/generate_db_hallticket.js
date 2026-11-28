const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const QRCode = require('qrcode');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

// Read environment
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying database for student HASHIM MV (CIC: 21018)...');

  const targetCic = 21018;

  const { data: student, error: stuErr } = await supabase
    .from('students')
    .select('*, college:colleges(*)')
    .eq('cic_no', targetCic)
    .single();

  if (stuErr || !student) {
    throw new Error('Student query failed: ' + (stuErr?.message || 'not found'));
  }

  // Fetch all registrations for this college
  const { data: allRegs, error: regErr } = await supabase
    .from('registrations')
    .select('*, item:items(*)')
    .eq('college_affl_no', student.college_affl_no);

  if (regErr) {
    throw new Error('Registrations query failed: ' + regErr.message);
  }

  // Filter registrations containing this student
  const studentRawRegs = allRegs.filter(r => {
    if (r.cic_no == targetCic || r.chest_no === '596' || r.student_id === student.id) return true;
    if (r.participants?.some(p => p.cic_no == targetCic || p.id === student.id)) return true;
    return false;
  });

  // 1. Filter strictly to OFF-STAGE events (the template is "OFF STAGE HALLTICKET")
  const offstageRegs = studentRawRegs.filter(r => {
    const m = (r.item?.mode || '').toLowerCase().trim();
    return m !== 'onstage' && m !== 'on_stage' && m !== 'on stage';
  });

  // 2. Deduplicate by item_id / item_code so no duplicate rows ever appear
  const seenItems = new Set();
  const regs = [];
  for (const r of offstageRegs) {
    const key = r.item_id || r.item?.item_code;
    if (key && !seenItems.has(key)) {
      seenItems.add(key);
      regs.push(r);
    }
  }

  console.log(`Loaded from DB: ${student.name} (CIC: ${student.cic_no}, Chest: 596)`);
  console.log(`College: ${student.college?.name}`);
  console.log(`Number of unique off-stage events: ${regs.length}`);

  const baseImgPath = path.resolve('public/images/hall_ticket_base_template.png');
  const meta = await sharp(baseImgPath).metadata();
  const w = meta.width;
  const h = meta.height; // 723 x 1024

  // 1. Generate QR Code containing ONLY student's CIC Number
  const cicStr = String(student.cic_no);
  const qrBuffer = await QRCode.toBuffer(cicStr, {
    width: 63,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  // 2. Current downloading date as DD-MM-YYYY
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const downloadDate = `${day}-${month}-${year}`;

  const chestNo = '596';
  const name = String(student.name).toUpperCase();
  const phase = String(student.phase || 'Aliya').toUpperCase();
  const collegeName = String(student.college?.name || 'MAJLIS UMARIYYA ISLAMIC & ARTS COLLEGE').toUpperCase();

  // 3. Dynamic events rows (strictly matching regs.length)
  const numEvents = regs.length;
  const tableTop = 592;
  const rowHeight = numEvents > 6 ? Math.floor(180 / numEvents) : 30;

  let eventSvgGrid = '';
  let eventSvgTexts = '';

  regs.forEach((reg, i) => {
    const yTop = tableTop + i * rowHeight;
    const yBottom = tableTop + (i + 1) * rowHeight;
    const yText = yTop + Math.floor(rowHeight * 0.65);

    const itemCode = reg.item?.item_code || `ITM-${reg.item_id}`;
    const itemName = reg.item?.name_eng || reg.item?.name || `Item ${reg.item_id}`;
    const cleanItemName = (itemName.length > 27 ? itemName.slice(0, 25) + '...' : itemName).replace(/&/g, '&amp;');

    // Horizontal bottom line of the row
    eventSvgGrid += `<line x1="34" y1="${yBottom}" x2="689" y2="${yBottom}" stroke="#787c80" stroke-width="1" />`;

    // Vertical column divider lines
    eventSvgGrid += `
      <line x1="34" y1="${yTop}" x2="34" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
      <line x1="100" y1="${yTop}" x2="100" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
      <line x1="188" y1="${yTop}" x2="188" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
      <line x1="386" y1="${yTop}" x2="386" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
      <line x1="578" y1="${yTop}" x2="578" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
      <line x1="689" y1="${yTop}" x2="689" y2="${yBottom}" stroke="#787c80" stroke-width="1" />
    `;

    const fontSize = numEvents > 6 ? '10.5' : '11.5';
    eventSvgTexts += `
      <text x="67" y="${yText}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#0f172a" text-anchor="middle">${i + 1}</text>
      <text x="144" y="${yText}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#0f172a" text-anchor="middle">${itemCode}</text>
      <text x="198" y="${yText}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#0f172a" text-anchor="start">${cleanItemName}</text>
      <text x="482" y="${yText}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#0f172a" text-anchor="middle"></text>
    `;
  });

  const safeCollegeName = collegeName.replace(/&/g, '&amp;');
  const safeCandidateName = name.replace(/&/g, '&amp;');

  const svgOverlay = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Candidate Table Values -->
      <text x="180" y="370" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#000000">${chestNo}</text>
      <text x="180" y="401" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#000000">${cicStr}</text>
      <text x="180" y="432" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#000000">${safeCandidateName}</text>
      <text x="180" y="463" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#000000">${phase}</text>
      <text x="180" y="494" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="bold" fill="#000000">${safeCollegeName}</text>

      <!-- Dynamic Event Rows & Lines -->
      ${eventSvgGrid}
      ${eventSvgTexts}

      <!-- Place -->
      <text x="140" y="838" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#000000">Pang</text>

      <!-- Downloading Date under Place -->
      <text x="140" y="865" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#000000">${downloadDate}</text>

      <!-- Candidate Name under signature (perfectly centered under the candidate signature block at x=527) -->
      <text x="527" y="871" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#000000" text-anchor="middle">${safeCandidateName}</text>
    </svg>
  `);

  const outImgPath = path.resolve('public/images/hall_ticket_db_example.png');
  await sharp(baseImgPath)
    .composite([
      { input: qrBuffer, left: 533, top: 92 },
      { input: svgOverlay, left: 0, top: 0 }
    ])
    .png({ quality: 100 })
    .toFile(outImgPath);

  // Copy to artifact directory for rendering in chat
  const artifactDir = 'C:/Users/PRD/.gemini/antigravity/brain/39fb931d-d78b-4455-a7a4-d574c15c11ed';
  fs.copyFileSync(outImgPath, path.join(artifactDir, 'hall_ticket_db_example.png'));

  // Also create vector PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const sx = 210 / 723;
  const sy = 297 / 1024;
  const b64 = fs.readFileSync(baseImgPath).toString('base64');
  doc.addImage('data:image/png;base64,' + b64, 'PNG', 0, 0, 210, 297);

  const qrDataUrl = await QRCode.toDataURL(cicStr, { width: 250, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', 533 * sx, 92 * sy, 63 * sx, 63 * sy);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(chestNo, 180 * sx, 369 * sy);
  doc.text(cicStr, 180 * sx, 400 * sy);
  doc.setFontSize(9.5);
  doc.text(name, 180 * sx, 431 * sy);
  doc.setFontSize(10);
  doc.text(phase, 180 * sx, 462 * sy);
  doc.setFontSize(8.5);
  const collegeLines = doc.splitTextToSize(collegeName, (515 - 180) * sx);
  doc.text(collegeLines, 180 * sx, 492 * sy);

  // Dynamic Event Rows in PDF
  doc.setDrawColor(120, 124, 128);
  doc.setLineWidth(0.2);
  regs.forEach((reg, i) => {
    const yTop = tableTop + i * rowHeight;
    const yBottom = tableTop + (i + 1) * rowHeight;
    const yText = (yTop + Math.floor(rowHeight * 0.65)) * sy;

    const itemCode = reg.item?.item_code || `ITM-${reg.item_id}`;
    const itemName = reg.item?.name_eng || reg.item?.name || `Item ${reg.item_id}`;
    const cleanItemName = itemName.length > 27 ? itemName.slice(0, 25) + '...' : itemName;

    // Horizontal bottom line
    doc.line(34 * sx, yBottom * sy, 689 * sx, yBottom * sy);

    // Vertical dividers
    doc.line(34 * sx, yTop * sy, 34 * sx, yBottom * sy);
    doc.line(100 * sx, yTop * sy, 100 * sx, yBottom * sy);
    doc.line(188 * sx, yTop * sy, 188 * sx, yBottom * sy);
    doc.line(386 * sx, yTop * sy, 386 * sy, yBottom * sy);
    doc.line(578 * sx, yTop * sy, 578 * sx, yBottom * sy);
    doc.line(689 * sx, yTop * sy, 689 * sx, yBottom * sy);

    const pdfFontSize = numEvents > 6 ? 7.5 : 8.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pdfFontSize);
    doc.text(String(i + 1), 67 * sx, yText, { align: 'center' });
    doc.text(itemCode, 144 * sx, yText, { align: 'center' });
    doc.text(cleanItemName, 198 * sx, yText, { align: 'left' });
  });

  doc.setFontSize(8.5);
  doc.text('Pang', 140 * sx, 838 * sy);
  doc.text(downloadDate, 140 * sx, 865 * sy);
  doc.setFontSize(9);
  doc.text(name, 527 * sx, 871 * sy, { align: 'center' });

  const pdfPath = path.resolve('public/images/hall_ticket_db_example.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(doc.output('arraybuffer')));
  fs.copyFileSync(pdfPath, path.join(artifactDir, 'hall_ticket_db_example.pdf'));

  console.log('Saved DB hall ticket successfully to:', outImgPath);
}

run().catch(console.error);
