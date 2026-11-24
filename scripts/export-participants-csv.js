const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment configuration
const envPath = path.resolve(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function sanitizeFilename(str) {
  return String(str || 'unknown')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 60);
}

function getTimestampString() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function exportParticipants() {
  console.log('Fetching data from Supabase...');

  // 1. Fetch Colleges
  const { data: colleges, error: colErr } = await supabase
    .from('colleges')
    .select('*')
    .order('affl_no', { ascending: true });
  if (colErr) throw colErr;
  console.log(`Fetched ${colleges.length} colleges.`);

  // 2. Fetch Events
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('*')
    .order('item_code', { ascending: true });
  if (evErr) throw evErr;
  console.log(`Fetched ${events.length} events.`);

  // 3. Fetch Students (handling pagination if needed)
  let allStudents = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data: stuBatch, error: stuErr } = await supabase
      .from('students')
      .select('id, cic_no, name, class, phase, college_affl_no, phone')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (stuErr) throw stuErr;
    if (!stuBatch || stuBatch.length === 0) break;
    allStudents = allStudents.concat(stuBatch);
    if (stuBatch.length < pageSize) break;
    page++;
  }
  console.log(`Fetched ${allStudents.length} students.`);

  // 4. Fetch Chest Numbers
  const { data: chestRows, error: chestErr } = await supabase
    .from('chest_no')
    .select('cic_no, chest_no, college_affl_no');
  if (chestErr) {
    console.warn('Notice: chest_no fetch error:', chestErr.message);
  }

  // 5. Fetch Registrations
  let allRegistrations = [];
  page = 0;
  while (true) {
    const { data: regBatch, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (regErr) throw regErr;
    if (!regBatch || regBatch.length === 0) break;
    allRegistrations = allRegistrations.concat(regBatch);
    if (regBatch.length < pageSize) break;
    page++;
  }
  console.log(`Fetched ${allRegistrations.length} registrations.`);

  // Build Lookup Maps
  const collegeMap = new Map();
  colleges.forEach(c => collegeMap.set(Number(c.affl_no), c));

  const eventMap = new Map();
  events.forEach(e => eventMap.set(Number(e.item_id), e));

  const studentMap = new Map();
  allStudents.forEach(s => studentMap.set(Number(s.cic_no), s));

  const chestMap = new Map();
  (chestRows || []).forEach(c => {
    chestMap.set(`${c.college_affl_no}_${c.cic_no}`, c.chest_no);
    chestMap.set(String(c.cic_no), c.chest_no);
  });

  // Prepare directories
  const baseExportDir = path.resolve(__dirname, '..', 'exports');
  const collegeDir = path.join(baseExportDir, 'college-wise');
  const eventDir = path.join(baseExportDir, 'event-wise');

  fs.mkdirSync(collegeDir, { recursive: true });
  fs.mkdirSync(eventDir, { recursive: true });

  // Map each registration to an enriched row
  const enrichedRows = allRegistrations.map((reg, idx) => {
    const college = collegeMap.get(Number(reg.college_affl_no)) || {};
    const event = eventMap.get(Number(reg.item_id)) || {};
    const student = studentMap.get(Number(reg.cic_no)) || {};

    const chestNo =
      reg.chest_no ||
      chestMap.get(`${reg.college_affl_no}_${reg.cic_no}`) ||
      chestMap.get(String(reg.cic_no)) ||
      student.chest_no ||
      '';

    let formattedDate = '';
    if (reg.created_at) {
      try {
        const d = new Date(reg.created_at);
        formattedDate = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      } catch {
        formattedDate = reg.created_at;
      }
    }

    return {
      slNo: idx + 1,
      collegeAfflNo: reg.college_affl_no || '',
      collegeCode: college.short_name || college.code || '',
      collegeName: college.name || '',
      chestNo: String(chestNo),
      cicNo: reg.cic_no ? String(reg.cic_no) : '',
      studentName: student.name || 'Participant',
      studentClass: student.class || '',
      studentPhase: student.phase || '',
      eventItemId: reg.item_id || '',
      eventCode: event.item_code || '',
      eventNameEng: event.name_eng || '',
      eventNameMal: event.name_mal || '',
      eventPhase: event.phase || '',
      eventCategory: event.category || '',
      eventMode: event.mode || (event.is_submission ? 'submission' : 'onstage'),
      eventType: event.point_type || ((event.min_participants || 1) > 1 ? 'group' : 'single'),
      blindCodeLetter: reg.code_letter || '',
      screeningStatus: reg.screening_status || '',
      registeredAt: formattedDate
    };
  });

  console.log(`Enriched ${enrichedRows.length} total participant entries.`);

  // --- 1. COLLEGE-WISE CSV EXPORTS ---
  const collegeHeaders = [
    'Sl No',
    'College Affiliation No',
    'College Code',
    'College Name',
    'Chest No',
    'CIC No',
    'Student Name',
    'Student Class',
    'Student Phase',
    'Event Code',
    'Event Name (English)',
    'Event Name (Malayalam)',
    'Event Phase',
    'Event Category',
    'Event Mode',
    'Event Type',
    'Blind Letter',
    'Screening Status',
    'Registered At (IST)'
  ];

  function formatCollegeRow(r, customSlNo) {
    return [
      customSlNo !== undefined ? customSlNo : r.slNo,
      r.collegeAfflNo,
      r.collegeCode,
      r.collegeName,
      r.chestNo,
      r.cicNo,
      r.studentName,
      r.studentClass,
      r.studentPhase,
      r.eventCode,
      r.eventNameEng,
      r.eventNameMal,
      r.eventPhase,
      r.eventCategory,
      r.eventMode,
      r.eventType,
      r.blindCodeLetter,
      r.screeningStatus,
      r.registeredAt
    ].map(escapeCsv).join(',');
  }

  const timestamp = getTimestampString();

  // Master College CSV
  const utf8Bom = '\uFEFF';
  const masterCollegeCsvContent = utf8Bom + [
    collegeHeaders.map(escapeCsv).join(','),
    ...enrichedRows.map((r, i) => formatCollegeRow(r, i + 1))
  ].join('\r\n');

  fs.writeFileSync(
    path.join(collegeDir, `ALL_COLLEGES_participants_master_${timestamp}.csv`),
    masterCollegeCsvContent,
    'utf8'
  );

  // Group by College Affiliation Number
  const collegeGroups = new Map();
  enrichedRows.forEach(r => {
    const affl = Number(r.collegeAfflNo) || 0;
    if (!collegeGroups.has(affl)) collegeGroups.set(affl, []);
    collegeGroups.get(affl).push(r);
  });

  let collegeFilesCount = 0;
  for (const [affl, rows] of collegeGroups.entries()) {
    const college = collegeMap.get(affl) || {};
    const codePart = sanitizeFilename(college.short_name || college.code || `College_${affl}`);
    const filename = `College_${affl}_${codePart}_participants_${timestamp}.csv`;

    // Sort rows by student name, then event code
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.eventCode.localeCompare(b.eventCode));

    const csvContent = utf8Bom + [
      collegeHeaders.map(escapeCsv).join(','),
      ...rows.map((r, i) => formatCollegeRow(r, i + 1))
    ].join('\r\n');

    fs.writeFileSync(path.join(collegeDir, filename), csvContent, 'utf8');
    collegeFilesCount++;
  }
  console.log(`Generated ${collegeFilesCount} individual college CSV files in exports/college-wise/`);

  // --- 2. EVENT-WISE CSV EXPORTS ---
  const eventHeaders = [
    'Sl No',
    'Event Code',
    'Event Name (English)',
    'Event Name (Malayalam)',
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
    'Screening Status',
    'Registered At (IST)'
  ];

  function formatEventRow(r, customSlNo) {
    return [
      customSlNo !== undefined ? customSlNo : r.slNo,
      r.eventCode,
      r.eventNameEng,
      r.eventNameMal,
      r.eventPhase,
      r.eventCategory,
      r.eventMode,
      r.eventType,
      r.blindCodeLetter,
      r.chestNo,
      r.cicNo,
      r.studentName,
      r.collegeAfflNo,
      r.collegeCode,
      r.collegeName,
      r.studentClass,
      r.studentPhase,
      r.screeningStatus,
      r.registeredAt
    ].map(escapeCsv).join(',');
  }

  // Sort overall event rows by eventCode, then collegeAfflNo
  const sortedEventRows = [...enrichedRows].sort((a, b) =>
    a.eventCode.localeCompare(b.eventCode) || Number(a.collegeAfflNo) - Number(b.collegeAfflNo)
  );

  const masterEventCsvContent = utf8Bom + [
    eventHeaders.map(escapeCsv).join(','),
    ...sortedEventRows.map((r, i) => formatEventRow(r, i + 1))
  ].join('\r\n');

  fs.writeFileSync(
    path.join(eventDir, `ALL_EVENTS_participants_master_${timestamp}.csv`),
    masterEventCsvContent,
    'utf8'
  );

  // Group by Event item_id
  const eventGroups = new Map();
  enrichedRows.forEach(r => {
    const itemId = Number(r.eventItemId) || 0;
    if (!eventGroups.has(itemId)) eventGroups.set(itemId, []);
    eventGroups.get(itemId).push(r);
  });

  let eventFilesCount = 0;
  for (const [itemId, rows] of eventGroups.entries()) {
    const event = eventMap.get(itemId) || {};
    const codePart = sanitizeFilename(event.item_code || `Item_${itemId}`);
    const namePart = sanitizeFilename(event.name_eng || 'Event');
    const filename = `Event_${codePart}_${namePart}_participants_${timestamp}.csv`;

    // Sort rows by college affiliation no, then student name
    rows.sort((a, b) => Number(a.collegeAfflNo) - Number(b.collegeAfflNo) || a.studentName.localeCompare(b.studentName));

    const csvContent = utf8Bom + [
      eventHeaders.map(escapeCsv).join(','),
      ...rows.map((r, i) => formatEventRow(r, i + 1))
    ].join('\r\n');

    fs.writeFileSync(path.join(eventDir, filename), csvContent, 'utf8');
    eventFilesCount++;
  }
  console.log(`Generated ${eventFilesCount} individual event CSV files in exports/event-wise/`);

  console.log('\n--- Export Summary ---');
  console.log(`Total Registrations Processed: ${enrichedRows.length}`);
  console.log(`Colleges Exported: ${collegeFilesCount} (plus ALL_COLLEGES_participants_master.csv)`);
  console.log(`Events Exported: ${eventFilesCount} (plus ALL_EVENTS_participants_master.csv)`);
  console.log(`Files saved to: ${baseExportDir}`);
}

exportParticipants().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
