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
    .substring(0, 50);
}

async function exportScreeningAndSubmissionLinks() {
  console.log('Fetching screening and submission events & links from Supabase...');

  // 1. Fetch Events
  const { data: events, error: evErr } = await supabase.from('events').select('*');
  if (evErr) throw evErr;

  const targetEvents = events.filter(e => e.is_screening || e.is_submission || e.mode === 'submission');
  const targetEventMap = new Map();
  const eventUuidMap = new Map();
  targetEvents.forEach(e => {
    targetEventMap.set(Number(e.item_id), e);
    eventUuidMap.set(e.id, e);
  });
  console.log(`Found ${targetEvents.length} screening/submission events.`);

  // 2. Fetch Registrations
  let allRegistrations = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data: regBatch, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (regErr) throw regErr;
    if (!regBatch || regBatch.length === 0) break;
    allRegistrations = allRegistrations.concat(regBatch);
    if (regBatch.length < pageSize) break;
    page++;
  }

  // Filter registrations for target events
  const targetRegs = allRegistrations.filter(r => targetEventMap.has(Number(r.item_id)));
  console.log(`Found ${targetRegs.length} registrations across screening/submission events.`);

  // 3. Fetch Chest numbers
  const { data: chestRows } = await supabase.from('chest_no').select('cic_no, chest_no, college_affl_no');
  const chestLookup = new Map();
  (chestRows || []).forEach(c => {
    chestLookup.set(`${c.college_affl_no}_${c.cic_no}`, String(c.chest_no));
    chestLookup.set(String(c.cic_no), String(c.chest_no));
  });

  // 4. Fetch Submissions from submission_entries and prefest_submissions
  const { data: subEntries } = await supabase.from('submission_entries').select('*');
  const { data: pfSubs } = await supabase.from('prefest_submissions').select('*');

  const linkLookup = new Map();
  (subEntries || []).forEach(s => {
    if (s.file_url) {
      if (s.chest_no) linkLookup.set(`${s.item_id}:chest:${String(s.chest_no).trim().toUpperCase()}`, s.file_url);
      if (s.college_affl_no) linkLookup.set(`${s.item_id}:col:${Number(s.college_affl_no)}`, s.file_url);
    }
  });

  (pfSubs || []).forEach(ps => {
    if (ps.youtube_url) {
      const ev = eventUuidMap.get(ps.event_id) || targetEventMap.get(Number(ps.event_id));
      if (ev) {
        linkLookup.set(`${ev.item_id}:col:${Number(ps.college_affl_no)}`, ps.youtube_url);
        if (ps.chest_no) {
          linkLookup.set(`${ev.item_id}:chest:${String(ps.chest_no).trim().toUpperCase()}`, ps.youtube_url);
        }
      }
    }
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const headers = ['Chest No', 'Link', 'Event Name', 'Category'];

  const rows = targetRegs.map(reg => {
    const itmId = Number(reg.item_id);
    const colAffl = Number(reg.college_affl_no);
    const ev = targetEventMap.get(itmId) || {};

    const chestNo =
      reg.chest_no ||
      chestLookup.get(`${colAffl}_${reg.cic_no}`) ||
      chestLookup.get(String(reg.cic_no)) ||
      `COL-${colAffl}`;

    // Lookup link
    const link =
      linkLookup.get(`${itmId}:chest:${String(chestNo).trim().toUpperCase()}`) ||
      linkLookup.get(`${itmId}:col:${colAffl}`) ||
      'Not Submitted';

    const eventName = ev.name_eng || ev.name || ev.item_code || `Item #${itmId}`;
    const category = ev.category ? `${ev.phase || ''} (${ev.category})` : ev.phase || 'General';

    return {
      itemId: itmId,
      itemCode: ev.item_code || `ITM-${itmId}`,
      eventName,
      chestNo: String(chestNo),
      link,
      category,
      csvRow: [
        String(chestNo),
        link,
        eventName,
        category
      ]
    };
  });

  // Sort rows: first rows with submitted links, then by event name, then chest no
  rows.sort((a, b) => {
    const aHasLink = a.link !== 'Not Submitted' ? 0 : 1;
    const bHasLink = b.link !== 'Not Submitted' ? 0 : 1;
    if (aHasLink !== bHasLink) return aHasLink - bHasLink;
    return a.eventName.localeCompare(b.eventName) || a.chestNo.localeCompare(b.chestNo);
  });

  const outDir = path.resolve(__dirname, '..', 'exports', 'screening-submissions');
  const eventWiseDir = path.join(outDir, 'event-wise');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(eventWiseDir, { recursive: true });

  const utf8Bom = '\uFEFF';

  // 1. Master combined CSV
  const masterCsvContent =
    utf8Bom +
    [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.csvRow.map(escapeCsv).join(','))
    ].join('\r\n');

  const masterFilePath = path.join(outDir, `screening_and_submission_links_master_${timestampStr}.csv`);
  fs.writeFileSync(masterFilePath, masterCsvContent, 'utf8');

  // Master Screening only
  const screeningRows = rows.filter(r => {
    const ev = targetEventMap.get(r.itemId);
    return Boolean(ev && ev.is_screening);
  });
  const screeningCsvContent =
    utf8Bom +
    [
      headers.map(escapeCsv).join(','),
      ...screeningRows.map(r => r.csvRow.map(escapeCsv).join(','))
    ].join('\r\n');
  fs.writeFileSync(path.join(outDir, `prefest_screening_links_master_${timestampStr}.csv`), screeningCsvContent, 'utf8');

  // Master Submission only
  const submissionRows = rows.filter(r => {
    const ev = targetEventMap.get(r.itemId);
    return Boolean(ev && (ev.is_submission || ev.mode === 'submission'));
  });
  const submissionCsvContent =
    utf8Bom +
    [
      headers.map(escapeCsv).join(','),
      ...submissionRows.map(r => r.csvRow.map(escapeCsv).join(','))
    ].join('\r\n');
  fs.writeFileSync(path.join(outDir, `prefest_submission_links_master_${timestampStr}.csv`), submissionCsvContent, 'utf8');

  // 2. Event-wise individual CSV files
  const eventGroupMap = new Map();
  rows.forEach(r => {
    if (!eventGroupMap.has(r.itemId)) eventGroupMap.set(r.itemId, []);
    eventGroupMap.get(r.itemId).push(r);
  });

  let eventFilesCount = 0;
  for (const [itemId, groupRows] of eventGroupMap.entries()) {
    const ev = targetEventMap.get(itemId) || {};
    const codePart = sanitizeFilename(ev.item_code || `Item_${itemId}`);
    const namePart = sanitizeFilename(ev.name_eng || 'Event');
    const filename = `Event_${codePart}_${namePart}_links_${timestampStr}.csv`;

    const eventCsvContent =
      utf8Bom +
      [
        headers.map(escapeCsv).join(','),
        ...groupRows.map(r => r.csvRow.map(escapeCsv).join(','))
      ].join('\r\n');

    fs.writeFileSync(path.join(eventWiseDir, filename), eventCsvContent, 'utf8');
    eventFilesCount++;
  }

  console.log(`\n--- Export Summary ---`);
  console.log(`Master CSV: ${masterFilePath}`);
  console.log(`Event-Wise Files: Generated ${eventFilesCount} CSVs in ${eventWiseDir}`);
  console.log(`Total Rows: ${rows.length} (Submitted links: ${rows.filter(r => r.link !== 'Not Submitted').length})`);
}

exportScreeningAndSubmissionLinks().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
