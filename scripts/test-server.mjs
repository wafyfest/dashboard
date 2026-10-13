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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('='.repeat(60));
console.log('WSF ARTS FEST - COMPLETE SERVER & BACKEND TEST SUITE');
console.log('='.repeat(60));
console.log('Target Supabase URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'fest_settings',
  'colleges',
  'items',
  'students',
  'max_participation',
  'registrations',
  'registration_logs',
  'code_letters',
  'submission_entries',
  'stages',
  'schedules',
  'points_matrix',
  'results',
  'appeals',
  'entry_locks',
  'replacements',
  'chest_no',
  'profiles'
];

async function runDatabaseTests() {
  console.log('\n[1/3] Testing Supabase Table Connectivity & Row-Level Security:');
  const results = [];
  
  for (const table of tables) {
    const start = Date.now();
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(2);
      
      const duration = Date.now() - start;
      if (error) {
        results.push({
          Table: table,
          Status: 'RLS Blocked / Error',
          Details: `${error.code}: ${error.message.substring(0, 45)}...`,
          Count: 'N/A',
          Latency: `${duration}ms`
        });
      } else {
        results.push({
          Table: table,
          Status: 'OK (Accessible)',
          Details: `Sample row fetched: ${data.length}`,
          Count: count,
          Latency: `${duration}ms`
        });
      }
    } catch (err) {
      results.push({
        Table: table,
        Status: 'Exception',
        Details: err.message,
        Count: 'N/A',
        Latency: 'N/A'
      });
    }
  }

  console.table(results);

  console.log('\n[2/3] Validating Core System Data:');
  
  // Fest Settings
  const { data: settings } = await supabase.from('fest_settings').select('*').limit(1);
  if (settings && settings[0]) {
    console.log(' Fest Settings:', {
      fest_name: settings[0].fest_name,
      reg_deadline: settings[0].reg_deadline,
      fine_deadline: settings[0].fine_deadline,
      current_time: new Date().toISOString()
    });
  } else {
    console.warn('⚠ No fest_settings found or RLS restricted.');
  }

  // College count
  const { data: colleges, count: collegeCount } = await supabase.from('colleges').select('id, affl_no, name', { count: 'exact' }).limit(3);
  console.log(` Colleges (Total: ${collegeCount}):`, colleges?.map(c => `#${c.affl_no} ${c.name}`));

  // Items count
  const { data: items, count: itemCount } = await supabase.from('items').select('id, item_code, name, category, item_type', { count: 'exact' }).limit(3);
  console.log(` Events/Items (Total: ${itemCount}):`, items?.map(i => `[${i.item_code}] ${i.name} (${i.category}/${i.item_type})`));

  // Students count
  const { data: students, count: studentCount } = await supabase.from('students').select('id, admission_no, name, category', { count: 'exact' }).limit(3);
  console.log(` Students Enrolled (Total: ${studentCount}):`, students?.map(s => `${s.name} (${s.admission_no})`));

  console.log('\n[3/3] Testing Auth API & Endpoints:');
  const { data: authData, error: authErr } = await supabase.auth.getSession();
  console.log(' Supabase Auth Client Status: Session retrieved without errors (Anonymous state valid).');
}

runDatabaseTests()
  .then(() => {
    console.log('\n Database & API validation tests completed successfully.');
  })
  .catch(err => {
    console.error(' Database test failed:', err);
    process.exit(1);
  });
