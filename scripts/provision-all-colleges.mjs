/**
 * provision-all-colleges.mjs
 * Dynamic Auth Provisioning Script for WSF Arts Fest
 * Fetches all active colleges directly from Supabase and creates auth accounts & profiles.
 *
 * Run with:
 *   node scripts/provision-all-colleges.mjs <SUPABASE_SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing in environment.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Usage: node scripts/provision-all-colleges.mjs <SUPABASE_SERVICE_ROLE_KEY>');
  console.error('   or set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function generatePassword() {
  return crypto.randomBytes(16).toString('base64'); // Strong, throwaway initial password
}

async function main() {
  console.log('\n🚀 Starting WSF Arts Fest Dynamic College Auth Provisioning...\n');

  // Fetch all colleges from DB
  const { data: colleges, error: colError } = await supabase
    .from('colleges')
    .select('id, affl_no, name, email')
    .order('affl_no', { ascending: true });

  if (colError || !colleges) {
    console.error('❌ Failed to fetch colleges from Supabase:', colError?.message);
    process.exit(1);
  }

  console.log(`Found ${colleges.length} colleges in Supabase database.\n`);

  const results = [];

  for (const col of colleges) {
    const afflNo = col.affl_no;
    const name = col.name;
    const email = col.email?.trim().toLowerCase() || `college${afflNo}@wsfartsfest.in`;
    const password = generatePassword();

    try {
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: 'college', college_affl_no: afflNo }
      });

      if (createError) {
        if (createError.message.includes('already exists') || createError.message.includes('already been registered')) {
          console.log(`⏭ [Affl #${afflNo}] ${name} (${email}) — Already registered`);
          results.push({ affl_no: afflNo, name, email, status: 'EXISTING_SKIPPED' });
          continue;
        }
        console.warn(`⚠ [Affl #${afflNo}] ${name} (${email}) — User creation error:`, createError.message);
        results.push({ affl_no: afflNo, name, email, status: 'ERROR', error: createError.message });
        continue;
      }

      const userId = userData.user.id;

      // Upsert into profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        role: 'college',
        college_affl_no: afflNo,
        full_name: name
      });

      if (profileError) {
        console.warn(`⚠ [Affl #${afflNo}] Profile upsert error:`, profileError.message);
      }

      console.log(`✅ [Affl #${afflNo}] ${name} -> ${email} | Account provisioned (use password reset to access)`);
      results.push({ affl_no: afflNo, name, email, status: 'CREATED' });
    } catch (err) {
      console.error(`❌ [Affl #${afflNo}] Unexpected error:`, err.message);
      results.push({ affl_no: afflNo, name, email, status: 'ERROR', error: err.message });
    }
  }

  console.log(`\n🎉 Provisioning complete!`);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
