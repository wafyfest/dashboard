import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.live' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function auditLive() {
  console.log('====================================================');
  console.log('🔍 COMPREHENSIVE AUDIT OF LIVE DATABASE');
  console.log('Project: ' + process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('====================================================\n');

  // 1. Fetch all 93 events
  const { data: events, error: eErr } = await sb.from('events').select('*').order('item_id');
  if (eErr || !events) {
    console.error('Failed to fetch events:', eErr);
    process.exit(1);
  }
  console.log(`Loaded ${events.length} events from public.events.\n`);

  // 2. Fetch all registrations from LIVE
  const { data: allRegs, error: rErr } = await sb.from('registrations').select('*').order('item_id');
  if (rErr || !allRegs) {
    console.error('Failed to fetch registrations:', rErr);
    process.exit(1);
  }
  console.log(`Loaded ${allRegs.length} total registrations from public.registrations.\n`);

  // 3. Find any registrations with COL-% or cic_no IS NULL
  const colRegs = allRegs.filter(r => (r.chest_no && r.chest_no.startsWith('COL-')) || r.cic_no == null);
  console.log(`Found ${colRegs.length} total registrations with COL-% or NULL cic_no across the festival.`);

  // Group by event
  const colByEvent = {};
  for (const r of colRegs) {
    colByEvent[r.item_id] = colByEvent[r.item_id] || [];
    colByEvent[r.item_id].push(r);
  }

  console.log('\n--- Breakdown of COL- / NULL cic_no by Event ---');
  for (const [itemIdStr, regs] of Object.entries(colByEvent)) {
    const ev = events.find(e => e.item_id === Number(itemIdStr));
    console.log(`- Item #${itemIdStr} (${ev?.item_code} - ${ev?.name_eng}): ${regs.length} entries`);
  }

  // 4. Detailed audit of all 4 Special (Category D) events
  console.log('\n====================================================');
  console.log('📋 AUDIT OF SPECIAL / CATEGORY D EVENTS (SE090 - SE093)');
  console.log('====================================================');

  const specialCodes = ['SE090', 'SE091', 'SE092', 'SE093'];
  for (const code of specialCodes) {
    const ev = events.find(e => e.item_code === code);
    if (!ev) continue;
    const evRegs = allRegs.filter(r => r.item_id === ev.item_id);

    console.log(`\n📌 [${ev.item_code}] ${ev.name_eng} (${ev.name_mal || ''})`);
    console.log(`   Phase: ${ev.phase} | Category: ${ev.category} | Mode: ${ev.mode} | Point Type: ${ev.point_type}`);
    console.log(`   Participants Bound: min=${ev.min_participants}, max=${ev.max_participants}, no_of=${ev.no_of_participants}`);
    console.log(`   Total Registrations in LIVE: ${evRegs.length}`);

    const colEntries = evRegs.filter(r => r.chest_no && r.chest_no.startsWith('COL-'));
    const studentEntries = evRegs.filter(r => !r.chest_no || !r.chest_no.startsWith('COL-'));

    console.log(`   - Institutional (COL-xx) entries: ${colEntries.length}`);
    console.log(`   - Student entries (numeric chest / cic): ${studentEntries.length}`);

    if (evRegs.length > 0) {
      console.log('   All registration rows:');
      evRegs.forEach(r => {
        console.log(`     Affl #${r.college_affl_no} -> chest_no: "${r.chest_no}", cic_no: ${r.cic_no}`);
      });
    } else {
      console.log('   (No registrations currently)');
    }
  }

  // 5. Check if ANY normal event (item 1 through 89) has unintended COL- entries
  console.log('\n====================================================');
  console.log('🔍 CHECKING FOR UNINTENDED COL- ENTRIES IN STANDARD EVENTS');
  console.log('====================================================');

  const standardColRegs = colRegs.filter(r => r.item_id < 90);
  if (standardColRegs.length === 0) {
    console.log('✅ NONE! All standard events (1-89) have proper individual student chest numbers.');
  } else {
    console.warn(`⚠️ Warning: Found ${standardColRegs.length} COL- registrations in standard events!`);
    standardColRegs.forEach(r => {
      const ev = events.find(e => e.item_id === r.item_id);
      console.log(`   Item ${r.item_id} (${ev?.item_code}): Affl #${r.college_affl_no}, chest: "${r.chest_no}"`);
    });
  }

  // 6. Check SE092 (Expo) in detail
  console.log('\n====================================================');
  console.log('🔍 SE092 (Expo) CONFIGURATION CHECK');
  console.log('====================================================');
  const expo = events.find(e => e.item_code === 'SE092');
  console.log({
    item_id: expo?.item_id,
    item_code: expo?.item_code,
    name_eng: expo?.name_eng,
    phase: expo?.phase,
    point_type: expo?.point_type,
    no_of_participants: expo?.no_of_participants,
    min_participants: expo?.min_participants,
    max_participants: expo?.max_participants
  });

  // 7. Check prefest_registrations and submission_entries in LIVE
  console.log('\n====================================================');
  console.log('🔍 PRE-FEST & SUBMISSIONS IN LIVE');
  console.log('====================================================');
  const { data: subs } = await sb.from('submission_entries').select('item_id, college_affl_no, chest_no');
  console.log(`Total submission_entries in LIVE: ${subs?.length}`);
  if (subs && subs.length > 0) {
    const subByItem = {};
    subs.forEach(s => { subByItem[s.item_id] = (subByItem[s.item_id] || 0) + 1; });
    console.log('Submissions by item_id:', subByItem);
  }
}

auditLive();
