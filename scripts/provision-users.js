/**
 * provision-users.js
 * Creates Supabase auth accounts for all 25 colleges + 1 admin
 * Run with: node scripts/provision-users.js
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment (set via CLI arg or env)
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://mwzhidbsioveoggjkhmi.supabase.co';
// Service role key must be passed as first CLI arg: node provision-users.js <service_role_key>
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/provision-users.js <SUPABASE_SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- College data (from DB) ---
const colleges = [
  { affl_no: 1,   email: 'kkhmiac@gmail.com',                    name: 'KKHM ISLAMIC & ARTS COLLEGE' },
  { affl_no: 2,   email: 'rasheediyyacollege@gmail.com',         name: 'RASHEEDIYYA ISLAMIC & ARTS COLLEGE' },
  { affl_no: 4,   email: 'kavanurmajmaa@gmail.com',              name: "MAJMA'A SHAREE-ATH & ARTS COLLEGE" },
  { affl_no: 11,  email: 'wafypmsa@gmail.com',                   name: 'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE' },
  { affl_no: 17,  email: 'duiac.wafy@gmail.com',                 name: 'DARUL ULOOM ISLAMIC & ARTS COLLEGE' },
  { affl_no: 21,  email: 'bafaqiwafy@gmail.com',                 name: 'BAFAKHY ISLAMIC & ARTS COLLEGE' },
  { affl_no: 32,  email: 'asshuhadamamba@gmail.com',             name: "ASSHUHADA ISLAMIC DA'WA COLLEGE" },
  { affl_no: 33,  email: 'dicwafycollege@gmail.com',             name: 'DARUSSALAM ISLAMIC & ARTS COLLEGE' },
  { affl_no: 35,  email: 'mtmstudentschokli@gmail.com',          name: 'MTM ISLAMIC & ARTS COLLEGE' },
  { affl_no: 47,  email: 'micwafyathanikkal@gmail.com',          name: 'MAQDOOMIYYA COLLEGE FOR ISLAMIC STUDIES (MIC)' },
  { affl_no: 51,  email: 'Ihsanuthwalaba@gmail.com',             name: 'DARUL IHSAN ISLAMIC ACADEMY' },
  { affl_no: 54,  email: 'uiakokkachal@gmail.com',               name: 'UMERALI SHIHAB THANGAL ISLAMIC ACADEMY' },
  { affl_no: 76,  email: 'umariyyawafi@gmail.com',               name: 'MAJLIS UMARIYYA ISLAMIC & ARTS COLLEGE' },
  { affl_no: 77,  email: 'wafycampus1@gmail.com',                name: 'WAFY CAMPUS' },
  { affl_no: 85,  email: 'Mioinfomunduparamba@gmail.com',        name: 'SHIHAB THANGAL ISLAMIC & ARTS COLLEGE' },
  { affl_no: 101, email: 'madarijussunna@gmail.com',             name: 'MADARIJUSSUNNA ISLAMIC COLLEGE' },
  // affl_no 115 has no email — skip
  { affl_no: 117, email: 'swahabaislamicacademy@gmail.com',      name: 'SWAHABA ISLAMIC ACADEMY' },
  { affl_no: 123, email: 'rahmaniyawafy123@gmail.com',           name: 'RAHMANIYA ISLAMIC & ARTS COLLEGE' },
  // affl_no 126, 127 have no email — skip
  { affl_no: 129, email: 'darulathfalwafyartscollege@gmail.com', name: 'DARUL ATHFAL WAFY ARTS COLLEGE' },
  { affl_no: 131, email: 'wafyperumundachery@gmail.com',         name: 'VARAKKAL MULLAKOYA THANGAL WAFY COLLEGE' },
  { affl_no: 134, email: 'wafycollegekdy@gmail.com',             name: 'SHAMSUL ULAMA MEMORIAL RIYALUSSALIHEEN WAFY COLLEGE' },
  { affl_no: 138, email: 'muneerulislamkundumon@gmail.com',       name: 'MUNEERUL ISLAM ARABIC (WAFY) COLLEGE' },
];

function extractUsername(email) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generatePassword(username) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  const rand = crypto.randomBytes(10).toString('hex').slice(0, 10);
  return username.slice(0, 4) + '@Wafy' + rand.toUpperCase();
}

async function createUser(email, password, fullName, role, collegeAfflNo) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, college_affl_no: collegeAfflNo }
  });
  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      return { skipped: true, email };
    }
    throw error;
  }

  // Insert profile row
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    role,
    college_affl_no: collegeAfflNo,
    full_name: fullName
  });
  if (profileError) {
    console.warn(`  ⚠ Profile insert failed for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email };
}

async function main() {
  const credentials = [];

  console.log('\n🔑 WSF Arts Fest — User Provisioning\n');
  console.log('━'.repeat(60));

  // --- Admin account ---
  const adminEmail = 'admin@wsfartsfest.in';
  const adminPass = 'Admin@Wafy' + crypto.randomBytes(5).toString('hex').toUpperCase();
  try {
    const r = await createUser(adminEmail, adminPass, 'Fest Admin', 'admin', null);
    if (r.skipped) {
      console.log(`⏭  Admin: ${adminEmail} — already exists, skipped`);
    } else {
      console.log(`✅ Admin: ${adminEmail}`);
      credentials.push({ role: 'admin', college: 'Fest Admin Committee', email: adminEmail, password: adminPass });
    }
  } catch (e) {
    console.error(`❌ Admin failed: ${e.message}`);
  }

  // --- College accounts ---
  for (const col of colleges) {
    const username = extractUsername(col.email);
    const password = generatePassword(username);
    try {
      const r = await createUser(col.email, password, col.name, 'college', col.affl_no);
      if (r.skipped) {
        console.log(`⏭  [${col.affl_no}] ${col.email} — already exists, skipped`);
      } else {
        console.log(`✅ [${col.affl_no}] ${col.email}`);
        credentials.push({
          role: 'college',
          affl_no: col.affl_no,
          college: col.name,
          email: col.email,
          username,
          password
        });
      }
    } catch (e) {
      console.error(`❌ [${col.affl_no}] ${col.email} — ${e.message}`);
    }
  }

  // --- No-email colleges (manual placeholder) ---
  const noEmail = [
    { affl_no: 115, name: 'MALIK DEENAR QURAN RESEARCH INSTITUTE - WAFY CAMPUS' },
    { affl_no: 126, name: 'PANGIL AHMED KUTTY MUSLIYAR WAFY COLLEGE' },
    { affl_no: 127, name: 'HUJJATHUL ISLAM WAFY COLLEGE' },
  ];
  for (const col of noEmail) {
    console.log(`⚠  [${col.affl_no}] ${col.name} — no email in DB, skipped`);
    credentials.push({ role: 'college', affl_no: col.affl_no, college: col.name, email: '(no email)', username: '—', password: '—' });
  }

  // --- Print credential table ---
  console.log('\n' + '━'.repeat(60));
  console.log('📋 CREDENTIALS TABLE (SAVE THIS — passwords shown only once)\n');
  console.log('Role       | affl_no | College                              | Email                                | Username              | Password');
  console.log('───────────|─────────|──────────────────────────────────────|──────────────────────────────────────|───────────────────────|─────────────────────');
  for (const c of credentials) {
    const role     = (c.role || '').padEnd(9);
    const affl     = String(c.affl_no ?? 'admin').padEnd(7);
    const college  = (c.college || '').slice(0, 36).padEnd(36);
    const email    = (c.email || '').padEnd(36);
    const username = (c.username || 'admin').padEnd(21);
    const pass     = c.password || '—';
    console.log(`${role} | ${affl} | ${college} | ${email} | ${username} | ${pass}`);
  }

  console.log('\n✅ Provisioning complete.\n');
  console.log('⚠  IMPORTANT: 3 colleges have no email and were skipped:');
  console.log('   affl_no 115, 126, 127 — please update their email in the DB first.\n');
}

main().catch(console.error);
