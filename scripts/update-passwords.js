/**
 * update-passwords.js
 * Updates all college + admin auth accounts: password = emailprefix@wafy{RAND4}
 * e.g. kkhmiac@gmail.com → kkhmiac@wafyX3K9
 * Run with: node scripts/update-passwords.js <SERVICE_ROLE_KEY>
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://mwzhidbsioveoggjkhmi.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/update-passwords.js <SUPABASE_SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const colleges = [
  { affl_no: 1,    email: 'kkhmiac@gmail.com' },
  { affl_no: 2,    email: 'rasheediyyacollege@gmail.com' },
  { affl_no: 4,    email: 'kavanurmajmaa@gmail.com' },
  { affl_no: 11,   email: 'wafypmsa@gmail.com' },
  { affl_no: 17,   email: 'duiac.wafy@gmail.com' },
  { affl_no: 21,   email: 'bafaqiwafy@gmail.com' },
  { affl_no: 32,   email: 'asshuhadamamba@gmail.com' },
  { affl_no: 33,   email: 'dicwafycollege@gmail.com' },
  { affl_no: 35,   email: 'mtmstudentschokli@gmail.com' },
  { affl_no: 47,   email: 'micwafyathanikkal@gmail.com' },
  { affl_no: 51,   email: 'ihsanuthwalaba@gmail.com' },
  { affl_no: 54,   email: 'uiakokkachal@gmail.com' },
  { affl_no: 76,   email: 'umariyyawafi@gmail.com' },
  { affl_no: 77,   email: 'wafycampus1@gmail.com' },
  { affl_no: 85,   email: 'mioinfomunduparamba@gmail.com' },
  { affl_no: 101,  email: 'madarijussunna@gmail.com' },
  { affl_no: 117,  email: 'swahabaislamicacademy@gmail.com' },
  { affl_no: 123,  email: 'rahmaniyawafy123@gmail.com' },
  { affl_no: 129,  email: 'darulathfalwafyartscollege@gmail.com' },
  { affl_no: 131,  email: 'wafyperumundachery@gmail.com' },
  { affl_no: 134,  email: 'wafycollegekdy@gmail.com' },
  { affl_no: 138,  email: 'muneerulislamkundumon@gmail.com' },
  { affl_no: null, email: 'admin@wsfartsfest.in' },
];

// Deterministic random per email (same password each run for same email)
function getPassword(email) {
  const prefix = email.split('@')[0];
  const rand = crypto.createHash('sha256').update(email).digest('hex').slice(0, 4).toUpperCase();
  return `${prefix}@wafy${rand}`;
}

async function main() {
  console.log('\n🔄 WSF Arts Fest — Password Update\n');
  console.log('━'.repeat(70));

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) { console.error('Failed to list users:', error.message); process.exit(1); }

  const credentials = [];

  for (const col of colleges) {
    const password = getPassword(col.email);
    const emailLower = col.email.toLowerCase();
    const user = users.find(u => u.email?.toLowerCase() === emailLower);

    if (!user) { console.log(`⚠  Not found: ${col.email} — skipped`); continue; }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });

    if (updateError) {
      console.error(`❌ [${String(col.affl_no ?? 'admin').padEnd(3)}] ${col.email} — ${updateError.message}`);
    } else {
      console.log(`✅ [${String(col.affl_no ?? 'admin').padEnd(3)}] ${col.email.padEnd(42)} → ${password}`);
      credentials.push({ affl_no: col.affl_no, email: col.email, password });
    }
  }

  console.log('\n' + '━'.repeat(70));
  console.log('📋 CREDENTIALS TABLE\n');
  console.log('affl | College Email                                  | Password');
  console.log('─────|────────────────────────────────────────────────|──────────────────────────────────────');
  for (const c of credentials) {
    const affl  = String(c.affl_no ?? 'adm').padEnd(4);
    const email = c.email.padEnd(46);
    console.log(`${affl} | ${email} | ${c.password}`);
  }
  console.log('\n✅ Done.\n');
}

main().catch(console.error);
