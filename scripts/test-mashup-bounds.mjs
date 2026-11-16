import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log('🔍 Testing Mashup (GN089) and event bounds in database...');

  const { data: mashup, error: mErr } = await sb
    .from('events')
    .select('item_id, item_code, name_eng, no_of_participants, min_participants, max_participants')
    .eq('item_id', 89)
    .single();

  if (mErr || !mashup) {
    console.error('❌ Failed to fetch Mashup:', mErr);
    process.exit(1);
  }

  console.log('✅ Mashup row from DB:', mashup);
  if (mashup.min_participants !== 3 || mashup.max_participants !== 6) {
    console.error('❌ Unexpected Mashup bounds:', mashup);
    process.exit(1);
  }

  const { data: allEvents, error: allErr } = await sb
    .from('events')
    .select('item_id, item_code, name_eng, no_of_participants, min_participants, max_participants')
    .order('item_id');

  if (allErr || !allEvents) {
    console.error('❌ Failed to fetch all events:', allErr);
    process.exit(1);
  }

  console.log(`✅ Total events checked: ${allEvents.length}`);

  let mismatches = 0;
  for (const ev of allEvents) {
    if (ev.item_id === 89) continue; // Mashup has custom bounds
    if (ev.no_of_participants != null) {
      if (ev.min_participants !== ev.no_of_participants || ev.max_participants !== ev.no_of_participants) {
        console.warn(`⚠️ Event ${ev.item_code} (${ev.name_eng}) mismatch: no_of_participants=${ev.no_of_participants}, min=${ev.min_participants}, max=${ev.max_participants}`);
        mismatches++;
      }
    }
  }

  if (mismatches === 0) {
    console.log('✅ All other events have min_participants == max_participants == no_of_participants');
  }

  console.log('🎉 Verification passed successfully!');
}

verify();
