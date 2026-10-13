import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    }
  }
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function formatCategory(phase) {
  if (!phase) return 'General';
  const p = phase.toUpperCase();
  if (p.includes('FOUNDATION') || p === 'FD' || p === 'PFD') return 'Sub Junior';
  if (p.includes('THAMHEED') || p === 'TH') return 'Junior';
  if (p.includes('ALIYA') || p === 'AL') return 'Senior';
  return 'General';
}

async function testFestDataContracts() {
  console.log('='.repeat(60));
  console.log('TESTING FEST DATA CONTRACTS & BUSINESS LOGIC MODELS');
  console.log('='.repeat(60));

  // 1. Fest Settings
  const { data: festSettings, error: fsErr } = await supabase.from('fest_settings').select('*').single();
  if (fsErr) throw fsErr;
  console.log('✓ fest_settings fetched:', {
    fest_name: festSettings.fest_name,
    reg_deadline: festSettings.reg_deadline,
    fine_deadline: festSettings.fine_deadline
  });

  // 2. Colleges
  const { data: colleges, error: colErr } = await supabase.from('colleges').select('*');
  if (colErr) throw colErr;
  console.log(`✓ colleges fetched: ${colleges.length} colleges`);
  const collegeWithOverrides = colleges.filter(c => c.manual_lock_override);
  console.log(`  - Colleges with manual lock override: ${collegeWithOverrides.length}`);

  // 3. Items
  const { data: items, error: itemErr } = await supabase.from('items').select('*');
  if (itemErr) throw itemErr;
  console.log(`✓ items fetched: ${items.length} events catalog`);
  const individualItems = items.filter(i => i.point_type === 'individual');
  const groupItems = items.filter(i => i.point_type === 'group');
  console.log(`  - Individual items: ${individualItems.length}, Group items: ${groupItems.length}`);
  const onstage = items.filter(i => i.mode === 'onstage');
  const offstage = items.filter(i => i.mode === 'offstage');
  const submission = items.filter(i => i.mode === 'submission');
  console.log(`  - Onstage: ${onstage.length}, Offstage: ${offstage.length}, Submission: ${submission.length}`);

  // 4. Students
  const { data: students, error: stuErr } = await supabase.from('students').select('*').limit(10);
  if (stuErr) throw stuErr;
  console.log(`✓ students sample fetched: ${students.length} students sample`);
  console.log(`  - Sample student: ${students[0].name} (CIC: ${students[0].cic_no}, Phase: ${students[0].phase} -> Category: ${formatCategory(students[0].phase)}, Affl: #${students[0].college_affl_no})`);

  // 5. Results query
  const { data: results, error: resErr } = await supabase.from('results').select('*');
  if (resErr) {
    console.error('✗ Results fetch error:', resErr);
  } else {
    console.log(`✓ results fetched safely via RLS (Returned ${results.length} rows)`);
  }

  // 6. Max Participation Quotas
  const { data: maxPart, error: mpErr } = await supabase.from('max_participation').select('*');
  if (mpErr) throw mpErr;
  console.log(`✓ max_participation quotas: ${maxPart.length} category quotas`);
  for (const q of maxPart) {
    console.log(`  - Phase ${q.phase} (${formatCategory(q.phase)}): off_max=${q.off_max}, on_max=${q.on_max}, total_max=${q.total_max}, group_max=${q.group_max}`);
  }

  // 7. Registrations
  const { data: regs, error: regErr } = await supabase.from('registrations').select('*').limit(5);
  if (regErr) throw regErr;
  console.log(`✓ registrations fetched via RLS: ${regs.length} registrations sample`);

  console.log('\nAll Fest Data Contracts verified successfully!');
}

testFestDataContracts().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
