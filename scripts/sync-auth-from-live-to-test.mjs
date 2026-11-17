import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LIVE_REF = 'mwzhidbsioveoggjkhmi';
const TEST_REF = 'kwdyjcrdilmaqpolgqds';

function queryRemote(projectRef, sql, isReadOnly = true) {
  const tmpSql = path.resolve(process.cwd(), `.temp_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  try {
    fs.writeFileSync(tmpSql, sql, 'utf8');
    const flag = isReadOnly ? '--read-only' : '--yes';
    const cmd = `npx supabase db query --remote=${projectRef} ${flag} --file "${tmpSql}"`;
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    
    // Find the JSON output starting from the first '{' after boundary
    const jsonStart = out.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(out.slice(jsonStart));
      return parsed.rows || [];
    }
    return [];
  } catch (err) {
    if (err.stdout) console.error('STDOUT:', err.stdout.toString());
    if (err.stderr) console.error('STDERR:', err.stderr.toString());
    throw err;
  } finally {
    if (fs.existsSync(tmpSql)) {
      try { fs.unlinkSync(tmpSql); } catch {}
    }
  }
}

async function syncAuth() {
  console.log('\n=============================================');
  console.log('🔐 SYNCING SUPABASE AUTH FROM LIVE TO TEST DB');
  console.log('=============================================');
  console.log(`Live Source DB : ${LIVE_REF}`);
  console.log(`Test Target DB : ${TEST_REF}\n`);

  // 1. Fetch auth.users from LIVE
  console.log('⏳ Fetching auth.users from LIVE database...');
  const users = queryRemote(LIVE_REF, `
    SELECT
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at, confirmed_at,
      email_change_token_current, email_change_confirm_status, banned_until,
      reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
      is_anonymous
    FROM auth.users;
  `, true);

  console.log(`✅ Fetched ${users.length} users from LIVE`);

  // 2. Fetch auth.identities from LIVE
  console.log('⏳ Fetching auth.identities from LIVE database...');
  const identities = queryRemote(LIVE_REF, `
    SELECT
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at, email
    FROM auth.identities;
  `, true);

  console.log(`✅ Fetched ${identities.length} identities from LIVE\n`);

  // Helper to format values for SQL
  const sqlVal = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  // 3. Upsert auth.users into TEST DB
  console.log('⏳ Upserting auth.users into TEST database...');
  const userStatements = users.map(u => `
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at,
      email_change_token_current, email_change_confirm_status, banned_until,
      reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
      is_anonymous
    ) VALUES (
      ${sqlVal(u.id)}, ${sqlVal(u.instance_id)}, ${sqlVal(u.aud)}, ${sqlVal(u.role)}, ${sqlVal(u.email)}, ${sqlVal(u.encrypted_password)},
      ${sqlVal(u.email_confirmed_at)}, ${sqlVal(u.invited_at)}, ${sqlVal(u.confirmation_token)}, ${sqlVal(u.confirmation_sent_at)},
      ${sqlVal(u.recovery_token)}, ${sqlVal(u.recovery_sent_at)}, ${sqlVal(u.email_change_token_new)}, ${sqlVal(u.email_change)},
      ${sqlVal(u.email_change_sent_at)}, ${sqlVal(u.last_sign_in_at)}, ${sqlVal(u.raw_app_meta_data)}, ${sqlVal(u.raw_user_meta_data)},
      ${sqlVal(u.is_super_admin)}, ${sqlVal(u.created_at)}, ${sqlVal(u.updated_at)}, ${sqlVal(u.phone)}, ${sqlVal(u.phone_confirmed_at)},
      ${sqlVal(u.phone_change)}, ${sqlVal(u.phone_change_token)}, ${sqlVal(u.phone_change_sent_at)},
      ${sqlVal(u.email_change_token_current)}, ${sqlVal(u.email_change_confirm_status)}, ${sqlVal(u.banned_until)},
      ${sqlVal(u.reauthentication_token)}, ${sqlVal(u.reauthentication_sent_at)}, ${sqlVal(u.is_sso_user)}, ${sqlVal(u.deleted_at)},
      ${sqlVal(u.is_anonymous)}
    )
    ON CONFLICT (id) DO UPDATE SET
      instance_id = EXCLUDED.instance_id,
      aud = EXCLUDED.aud,
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      invited_at = EXCLUDED.invited_at,
      confirmation_token = EXCLUDED.confirmation_token,
      confirmation_sent_at = EXCLUDED.confirmation_sent_at,
      recovery_token = EXCLUDED.recovery_token,
      recovery_sent_at = EXCLUDED.recovery_sent_at,
      email_change_token_new = EXCLUDED.email_change_token_new,
      email_change = EXCLUDED.email_change,
      email_change_sent_at = EXCLUDED.email_change_sent_at,
      last_sign_in_at = EXCLUDED.last_sign_in_at,
      raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      is_super_admin = EXCLUDED.is_super_admin,
      updated_at = EXCLUDED.updated_at,
      phone = EXCLUDED.phone,
      phone_confirmed_at = EXCLUDED.phone_confirmed_at,
      phone_change = EXCLUDED.phone_change,
      phone_change_token = EXCLUDED.phone_change_token,
      phone_change_sent_at = EXCLUDED.phone_change_sent_at,
      email_change_token_current = EXCLUDED.email_change_token_current,
      email_change_confirm_status = EXCLUDED.email_change_confirm_status,
      banned_until = EXCLUDED.banned_until,
      reauthentication_token = EXCLUDED.reauthentication_token,
      reauthentication_sent_at = EXCLUDED.reauthentication_sent_at,
      is_sso_user = EXCLUDED.is_sso_user,
      deleted_at = EXCLUDED.deleted_at,
      is_anonymous = EXCLUDED.is_anonymous;
  `).join('\n');

  queryRemote(TEST_REF, userStatements, false);
  console.log(`✅ ${users.length} auth.users successfully synced into TEST DB`);

  // 4. Upsert auth.identities into TEST DB
  console.log('⏳ Upserting auth.identities into TEST database...');
  const identityStatements = identities.map(i => `
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      ${sqlVal(i.id)}, ${sqlVal(i.provider_id)}, ${sqlVal(i.user_id)}, ${sqlVal(i.identity_data)}, ${sqlVal(i.provider)},
      ${sqlVal(i.last_sign_in_at)}, ${sqlVal(i.created_at)}, ${sqlVal(i.updated_at)}
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      last_sign_in_at = EXCLUDED.last_sign_in_at,
      updated_at = EXCLUDED.updated_at;
  `).join('\n');

  queryRemote(TEST_REF, identityStatements, false);
  console.log(`✅ ${identities.length} auth.identities successfully synced into TEST DB`);

  // 5. Verification on TEST DB
  const testUserCount = queryRemote(TEST_REF, 'SELECT count(*) as count FROM auth.users;', true);
  const testIdentityCount = queryRemote(TEST_REF, 'SELECT count(*) as count FROM auth.identities;', true);

  console.log('\n=============================================');
  console.log('🎉 AUTH SYNC COMPLETE');
  console.log(`Test DB auth.users count      : ${testUserCount[0]?.count}`);
  console.log(`Test DB auth.identities count : ${testIdentityCount[0]?.count}`);
  console.log('All login credentials, emails, and passwords now match LIVE exactly!');
  console.log('=============================================\n');
}

syncAuth().catch(err => {
  console.error('\n❌ Auth sync failed:', err);
  process.exit(1);
});
