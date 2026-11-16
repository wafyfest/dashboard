import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('🧪 Testing register_college_for_item_tx with institutional registration for SE090...');

  // 1. Register SE090 (Campaign Setting, item_id: 90) for college 77
  const { data: regData, error: regErr } = await sb.rpc('register_college_for_item_tx', {
    p_item_id: 90,
    p_college_affl_no: 77,
    p_chest_nos: ['COL-77']
  });

  if (regErr) {
    console.error('❌ Failed to register SE090:', regErr);
    process.exit(1);
  }

  console.log('✅ Registration RPC returned:', regData);

  // 2. Query registrations table
  const { data: checkRow, error: checkErr } = await sb
    .from('registrations')
    .select('*')
    .eq('item_id', 90)
    .eq('college_affl_no', 77)
    .single();

  if (checkErr || !checkRow) {
    console.error('❌ Failed to find row in registrations:', checkErr);
    process.exit(1);
  }

  console.log('✅ Found row in registrations:', checkRow);
  if (checkRow.chest_no !== 'COL-77') {
    console.error('❌ Expected chest_no COL-77, got:', checkRow.chest_no);
    process.exit(1);
  }

  // 3. Clean up by calling RPC with empty p_chest_nos (unregister)
  const { data: unregData, error: unregErr } = await sb.rpc('register_college_for_item_tx', {
    p_item_id: 90,
    p_college_affl_no: 77,
    p_chest_nos: []
  });

  if (unregErr) {
    console.error('❌ Failed to unregister SE090:', unregErr);
    process.exit(1);
  }

  console.log('✅ Cleaned up registration via unregister RPC.');
  console.log('🎉 Special Group Institutional Registration RPC test PASSED!');
}

test();
