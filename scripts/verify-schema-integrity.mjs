import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runIntegrityCheck() {
  console.log('🔍 Running Supabase Schema & RPC Integrity Check...\n');
  let hasFailure = false;

  // 1. Verify critical tables exist
  const criticalTables = [
    'events',
    'colleges',
    'students',
    'chest_no',
    'registrations',
    'late_registrations',
    'entry_locks',
    'event_deadline_settings',
    'fest_settings',
  ];

  for (const table of criticalTables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table check failed for "${table}":`, error.message);
      hasFailure = true;
    } else {
      console.log(`✅ Table "${table}" is accessible`);
    }
  }

  // 2. Check backwards-compatible items view
  const { error: itemsErr } = await supabase.from('items').select('*', { count: 'exact', head: true });
  if (itemsErr) {
    console.warn(`⚠️ Compatibility view "items" is not present: ${itemsErr.message}`);
  } else {
    console.log(`✅ Compatibility view "items" is present`);
  }

  // 3. Dry-run critical RPC functions & triggers
  console.log('\n🧪 Testing stored procedures (RPCs) & Triggers...');

  // a) register_college_for_item_tx with an actual student to exercise check_registration_quota() trigger
  const { data: sampleChest } = await supabase
    .from('chest_no')
    .select('chest_no, college_affl_no, cic_no')
    .not('chest_no', 'is', null)
    .limit(1)
    .single();

  if (sampleChest) {
    const testChest = String(sampleChest.chest_no);
    const testCollege = Number(sampleChest.college_affl_no);

    // Look up student's phase to ensure phase-eligibility passes
    const { data: stu } = await supabase
      .from('students')
      .select('phase')
      .eq('cic_no', sampleChest.cic_no)
      .maybeSingle();

    const stuPhase = stu?.phase || 'General';

    // Find an event matching student's phase or General
    const { data: matchingEvent } = await supabase
      .from('events')
      .select('item_id')
      .ilike('phase', stuPhase)
      .limit(1)
      .maybeSingle();

    const testItem = matchingEvent?.item_id || 87;

    // Fetch existing registrations for the test item & college to restore after test
    const { data: existingRegs } = await supabase
      .from('registrations')
      .select('chest_no')
      .eq('item_id', testItem)
      .eq('college_affl_no', testCollege);
    const originalChests = (existingRegs || []).map(r => String(r.chest_no));

    // Exercise the RPC + trg_check_registration_quota with a real participant
    const { error: regRpcErr } = await supabase.rpc('register_college_for_item_tx', {
      p_item_id: testItem,
      p_college_affl_no: testCollege,
      p_chest_nos: [testChest],
    });

    if (regRpcErr) {
      console.error('❌ register_college_for_item_tx (trigger check) failed:', regRpcErr.message, `(${regRpcErr.code})`);
      hasFailure = true;
    } else {
      console.log('✅ register_college_for_item_tx & check_registration_quota() trigger executed successfully');
    }

    // Restore original state
    await supabase.rpc('register_college_for_item_tx', {
      p_item_id: testItem,
      p_college_affl_no: testCollege,
      p_chest_nos: originalChests,
    });
  } else {
    // Fallback: empty array check
    const { error: regRpcErr } = await supabase.rpc('register_college_for_item_tx', {
      p_item_id: 87,
      p_college_affl_no: 138,
      p_chest_nos: [],
    });
    if (regRpcErr) {
      console.error('❌ register_college_for_item_tx failed:', regRpcErr.message, `(${regRpcErr.code})`);
      hasFailure = true;
    } else {
      console.log('✅ register_college_for_item_tx executed successfully');
    }
  }

  // b) get_college_net_fine
  const { data: fineData, error: fineErr } = await supabase.rpc('get_college_net_fine', {
    p_affl_no: 138,
  });

  if (fineErr) {
    console.warn('⚠️ get_college_net_fine warning:', fineErr.message);
  } else {
    console.log('✅ get_college_net_fine executed successfully. Result:', fineData);
  }

  console.log('\n=============================================');
  if (hasFailure) {
    console.error('🚨 Schema integrity check FAILED. Please review errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All schema and RPC integrity checks PASSED.');
    process.exit(0);
  }
}

runIntegrityCheck().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
