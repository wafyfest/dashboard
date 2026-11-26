import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCampaignSettingRegistration() {
  console.log('🧪 Starting Campaign Setting (SE090) Verification Test...\n');

  // Test 1: Verify existing registrations are preserved
  console.log('1️⃣ Checking existing registrations for SE090 in database...');
  const { data: existingRegs, error: existErr } = await sb
    .from('registrations')
    .select('*')
    .eq('item_id', 90);

  if (existErr) {
    console.error('❌ Failed to fetch registrations:', existErr);
    process.exit(1);
  }

  console.log(`✅ Existing SE090 registrations preserved: ${existingRegs.length} rows found.`);
  if (existingRegs.length < 6) {
    console.error('❌ Expected at least 6 existing registrations!');
    process.exit(1);
  }

  // Test 2: Verify event definition for SE090
  console.log('\n2️⃣ Verifying public.events configuration for SE090...');
  const { data: eventRow, error: evErr } = await sb
    .from('events')
    .select('*')
    .eq('item_id', 90)
    .single();

  if (evErr || !eventRow) {
    console.error('❌ Failed to fetch event SE090:', evErr);
    process.exit(1);
  }

  console.log('Event details:', {
    item_id: eventRow.item_id,
    item_code: eventRow.item_code,
    name_eng: eventRow.name_eng,
    point_type: eventRow.point_type,
    min_participants: eventRow.min_participants,
    max_participants: eventRow.max_participants,
    no_of_participants: eventRow.no_of_participants,
  });

  if (
    eventRow.point_type !== 'group' ||
    eventRow.min_participants !== 5 ||
    eventRow.max_participants !== 5 ||
    eventRow.no_of_participants !== 5
  ) {
    console.error('❌ SE090 does not have expected group bounds (5 participants)');
    process.exit(1);
  }
  console.log('✅ Event SE090 correctly configured as 5-participant group event.');

  // Test 3: Test register_college_for_item_tx with 5 students for college affl 77
  console.log('\n3️⃣ Testing group registration of 5 students for college 77 in SE090...');
  
  // Fetch 5 unblocked students from college 77
  const { data: blockedList } = await sb
    .from('blocked_students')
    .select('cic_no')
    .eq('is_active', true);
  const blockedCics = new Set((blockedList || []).map(b => b.cic_no));

  const { data: students77, error: stuErr } = await sb
    .from('students')
    .select('cic_no, name')
    .eq('college_affl_no', 77);

  const eligibleStudents = (students77 || []).filter(s => !blockedCics.has(s.cic_no)).slice(0, 5);

  if (stuErr || eligibleStudents.length < 5) {
    console.error('❌ College 77 does not have 5 unblocked students:', stuErr || eligibleStudents.length);
    process.exit(1);
  }

  const cicList = eligibleStudents.map(s => String(s.cic_no));
  console.log(`Registering 5 students: ${cicList.join(', ')}`);

  const { data: rpcRes, error: rpcErr } = await sb.rpc('register_college_for_item_tx', {
    p_item_id: 90,
    p_college_affl_no: 77,
    p_chest_nos: cicList
  });

  if (rpcErr) {
    console.error('❌ register_college_for_item_tx failed:', rpcErr);
    process.exit(1);
  }

  console.log(`✅ RPC succeeded! Returned ${rpcRes.length} registration rows.`);
  const chests = rpcRes.map(r => r.chest_no);
  console.log(`Registered chest numbers: ${chests.join(', ')}`);

  // Ensure NONE of the registered chests is COL-77
  if (chests.some(c => c.startsWith('COL-'))) {
    console.error('❌ Found institutional chest_no in result:', chests);
    process.exit(1);
  }

  if (rpcRes.length !== 5) {
    console.error(`❌ Expected 5 registered rows, got ${rpcRes.length}`);
    process.exit(1);
  }
  console.log('✅ 5 student rows verified with valid student chest numbers!');

  // Clean up college 77 test registration
  console.log('\n4️⃣ Cleaning up college 77 test registration...');
  const { error: cleanErr } = await sb.rpc('register_college_for_item_tx', {
    p_item_id: 90,
    p_college_affl_no: 77,
    p_chest_nos: []
  });

  if (cleanErr) {
    console.error('❌ Failed to clean up test registration:', cleanErr);
    process.exit(1);
  }
  console.log('✅ Cleaned up test registration.');

  // Test 5: Verify SE091 (Moral Video Making) still behaves as an institutional registration
  console.log('\n5️⃣ Verifying SE091 (Moral Video Making) still registers as institutional COL- entry...');
  const { data: se091Res, error: se091Err } = await sb.rpc('register_college_for_item_tx', {
    p_item_id: 91,
    p_college_affl_no: 77,
    p_chest_nos: ['COL-77']
  });

  if (se091Err) {
    console.error('❌ SE091 registration failed:', se091Err);
    process.exit(1);
  }

  if (se091Res.length !== 1 || se091Res[0].chest_no !== 'COL-77') {
    console.error('❌ SE091 did not register as COL-77:', se091Res);
    process.exit(1);
  }
  console.log('✅ SE091 successfully registered as COL-77 institutional entry.');

  // Clean up SE091 test registration
  await sb.rpc('register_college_for_item_tx', {
    p_item_id: 91,
    p_college_affl_no: 77,
    p_chest_nos: []
  });
  console.log('✅ Cleaned up SE091 test entry.');

  console.log('\n🎉 ALL CAMPAIGN SETTING TESTS PASSED PERFECTLY!\n');
}

testCampaignSettingRegistration();
