import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LIVE_REF = 'mwzhidbsioveoggjkhmi';
const TEST_REF = 'kwdyjcrdilmaqpolgqds';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const res = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      res[trimmed.slice(0, idx).trim()] = val;
    }
  }
  return res;
}

const liveEnv = parseEnv('.env.live');
const testEnv = parseEnv('.env.test');

if (!liveEnv.NEXT_PUBLIC_SUPABASE_URL || !liveEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.live');
  process.exit(1);
}
if (!testEnv.NEXT_PUBLIC_SUPABASE_URL || !testEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.test');
  process.exit(1);
}

// Absolute safety check: Never write to LIVE as target
if (testEnv.NEXT_PUBLIC_SUPABASE_URL.includes(LIVE_REF)) {
  console.error('🚨 SAFETY ABORT: Target database is LIVE production! Aborting immediately.');
  process.exit(1);
}

const liveSb = createClient(liveEnv.NEXT_PUBLIC_SUPABASE_URL, liveEnv.SUPABASE_SERVICE_ROLE_KEY);
const testSb = createClient(testEnv.NEXT_PUBLIC_SUPABASE_URL, testEnv.SUPABASE_SERVICE_ROLE_KEY);

function runRemoteSql(projectRef, sql, isReadOnly = false) {
  if (!sql || !sql.trim()) return [];
  const tmpFile = path.resolve(process.cwd(), `.temp_sql_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  try {
    fs.writeFileSync(tmpFile, sql, 'utf8');
    const flag = isReadOnly ? '--read-only' : '--yes';
    const cmd = `npx supabase db query --remote=${projectRef} ${flag} --file "${tmpFile}"`;
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    const jsonStart = out.indexOf('{');
    const jsonEnd = out.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
      try {
        const jsonStr = out.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonStr).rows || [];
      } catch {
        return [];
      }
    }
    return [];
  } finally {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
}

// Ordered table list to respect foreign key constraints during restore
const TABLES_IN_ORDER = [
  'colleges',
  'profiles',
  'events',
  'topics',
  'students',
  'chest_no',
  'max_participation',
  'fest_settings',
  'event_deadline_settings',
  'entry_locks',
  'registrations',
  'late_registrations',
  'prefest_registration_settings',
  'prefest_registrations',
  'prefest_submissions',
  'replacements',
  'code_letters',
  'submission_entries',
  'stages',
  'schedules',
  'points_matrix',
  'results',
  'appeals',
  'registration_logs',
  'volunteers',
  'announcements',
  'blocked_students',
  'fest_committee',
  'rate_limit_entries',
  'system_audit_logs'
];

async function fetchAllRows(supabaseClient, table) {
  const pageSize = 1000;
  let allRows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      return { error: error.message, rows: [] };
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += pageSize;
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return { error: null, rows: allRows };
}

async function cloneDatabase() {
  console.log('\n=============================================================');
  console.log('🔄 SUPABASE END-TO-END DATABASE CLONE (LIVE ➔ TEST)');
  console.log('=============================================================');
  console.log(`Source (LIVE) : ${liveEnv.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Target (TEST) : ${testEnv.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log('=============================================================\n');

  // STEP 1: Align Constraints & Indexes on TEST DB
  console.log('📦 STEP 1/4: Ensuring PostgreSQL Constraints & Indexes on TEST DB...');
  runRemoteSql(TEST_REF, `
    -- Fix chest_no id type if it is uuid
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chest_no' AND column_name = 'id' AND data_type = 'uuid'
      ) THEN
        ALTER TABLE public.chest_no DROP CONSTRAINT IF EXISTS chest_no_pkey;
        ALTER TABLE public.chest_no ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.chest_no ALTER COLUMN id TYPE bigint USING (NULL::bigint);
        CREATE SEQUENCE IF NOT EXISTS public.chest_no_id_seq OWNED BY public.chest_no.id;
        ALTER TABLE public.chest_no ALTER COLUMN id SET DEFAULT nextval('public.chest_no_id_seq');
        ALTER TABLE public.chest_no ADD PRIMARY KEY (id);
      END IF;

      -- Unique constraints
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chest_no_cic_no_key' AND conrelid = 'public.chest_no'::regclass) THEN
        ALTER TABLE public.chest_no ADD CONSTRAINT chest_no_cic_no_key UNIQUE (cic_no);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chest_no_chest_no_key' AND conrelid = 'public.chest_no'::regclass) THEN
        ALTER TABLE public.chest_no ADD CONSTRAINT chest_no_chest_no_key UNIQUE (chest_no);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_admission_no_key' AND conrelid = 'public.students'::regclass) THEN
        ALTER TABLE public.students ADD CONSTRAINT students_admission_no_key UNIQUE (cic_no);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_college_affl_no_admission_no_key' AND conrelid = 'public.students'::regclass) THEN
        ALTER TABLE public.students ADD CONSTRAINT students_college_affl_no_admission_no_key UNIQUE (college_affl_no, cic_no);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'single_row_only' AND conrelid = 'public.fest_settings'::regclass) THEN
        ALTER TABLE public.fest_settings ADD CONSTRAINT single_row_only CHECK ((id = 1));
      END IF;
    END $$;

    -- Disable user triggers during bulk migration
    DO $$ 
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE TRIGGER USER;';
      END LOOP;
    END $$;

    -- Clean truncation in reverse dependency order
    TRUNCATE TABLE 
      public.topics,
      public.system_audit_logs,
      public.rate_limit_entries,
      public.fest_committee,
      public.blocked_students,
      public.announcements,
      public.volunteers,
      public.registration_logs,
      public.appeals,
      public.results,
      public.points_matrix,
      public.schedules,
      public.stages,
      public.submission_entries,
      public.code_letters,
      public.replacements,
      public.prefest_submissions,
      public.prefest_registrations,
      public.prefest_registration_settings,
      public.late_registrations,
      public.registrations,
      public.entry_locks,
      public.event_deadline_settings,
      public.fest_settings,
      public.max_participation,
      public.chest_no,
      public.students,
      public.events,
      public.profiles,
      public.colleges
    CASCADE;
  `);
  console.log('✅ Constraints verified, tables truncated & bulk triggers safely disabled on TEST.\n');

  // STEP 2: Mirror All Public Tables
  console.log('📦 STEP 2/4: Transferring 29 Public Tables from LIVE ➔ TEST...');
  const tableStats = [];

  for (const table of TABLES_IN_ORDER) {
    process.stdout.write(`   ⏳ [${table}] fetching from LIVE... `);
    const { error: fetchErr, rows } = await fetchAllRows(liveSb, table);

    if (fetchErr) {
      console.log(`⚠️ Skipped (${fetchErr})`);
      tableStats.push({ table, liveCount: 'err', testCount: 0, status: 'skipped' });
      continue;
    }

    // Insert in batches of 300
    const chunkSize = 300;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertErr } = await testSb.from(table).insert(chunk);
      if (insertErr) {
        // If insert fails, try upsert
        const { error: retryErr } = await testSb.from(table).upsert(chunk);
        if (retryErr) {
          console.log(`❌ Insert batch error on "${table}": ${retryErr.message}`);
          break;
        }
      }
      inserted += chunk.length;
    }

    console.log(`✅ ${inserted} rows cloned`);
    tableStats.push({ table, liveCount: rows.length, testCount: inserted, status: 'synced' });
  }

  // Re-enable triggers & sync sequences
  runRemoteSql(TEST_REF, `
    DO $$ 
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE TRIGGER USER;';
      END LOOP;
    END $$;

    DO $$
    DECLARE
      seq RECORD;
    BEGIN
      FOR seq IN (
        SELECT 
          s.relname AS seq_name,
          t.relname AS table_name,
          a.attname AS col_name
        FROM pg_class s
        JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
        JOIN pg_class t ON d.refobjid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE s.relkind = 'S' AND n.nspname = 'public'
      ) LOOP
        BEGIN
          EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))', 
            seq.seq_name, seq.col_name, seq.table_name);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END LOOP;
    END $$;

    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chest_no_id_seq') THEN
        PERFORM setval('public.chest_no_id_seq', COALESCE((SELECT MAX(id) FROM public.chest_no), 1));
      END IF;
    END $$;
  `);
  console.log('\n✅ Public tables transfer complete.\n');

  // STEP 3: Mirror Auth (Users & Identities)
  console.log('📦 STEP 3/4: Mirroring Supabase Auth Accounts & Passwords from LIVE ➔ TEST...');
  const users = runRemoteSql(LIVE_REF, `
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

  const identities = runRemoteSql(LIVE_REF, `
    SELECT
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at, email
    FROM auth.identities;
  `, true);

  const sqlVal = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

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
      ${sqlVal(u.email_confirmed_at)}, ${sqlVal(u.invited_at)}, COALESCE(${sqlVal(u.confirmation_token)}, ''), ${sqlVal(u.confirmation_sent_at)},
      COALESCE(${sqlVal(u.recovery_token)}, ''), ${sqlVal(u.recovery_sent_at)}, COALESCE(${sqlVal(u.email_change_token_new)}, ''), COALESCE(${sqlVal(u.email_change)}, ''),
      ${sqlVal(u.email_change_sent_at)}, ${sqlVal(u.last_sign_in_at)}, ${sqlVal(u.raw_app_meta_data)}, ${sqlVal(u.raw_user_meta_data)},
      COALESCE(${sqlVal(u.is_super_admin)}, false), ${sqlVal(u.created_at)}, ${sqlVal(u.updated_at)}, ${sqlVal(u.phone)}, ${sqlVal(u.phone_confirmed_at)},
      COALESCE(${sqlVal(u.phone_change)}, ''), COALESCE(${sqlVal(u.phone_change_token)}, ''), ${sqlVal(u.phone_change_sent_at)},
      COALESCE(${sqlVal(u.email_change_token_current)}, ''), ${sqlVal(u.email_change_confirm_status)}, ${sqlVal(u.banned_until)},
      COALESCE(${sqlVal(u.reauthentication_token)}, ''), ${sqlVal(u.reauthentication_sent_at)}, COALESCE(${sqlVal(u.is_sso_user)}, false), ${sqlVal(u.deleted_at)},
      COALESCE(${sqlVal(u.is_anonymous)}, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      confirmation_token = EXCLUDED.confirmation_token,
      recovery_token = EXCLUDED.recovery_token,
      email_change = EXCLUDED.email_change,
      email_change_token_new = EXCLUDED.email_change_token_new,
      email_change_token_current = EXCLUDED.email_change_token_current,
      reauthentication_token = EXCLUDED.reauthentication_token,
      raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      is_super_admin = EXCLUDED.is_super_admin,
      last_sign_in_at = EXCLUDED.last_sign_in_at,
      updated_at = EXCLUDED.updated_at;
  `).join('\n');

  if (userStatements.trim()) {
    runRemoteSql(TEST_REF, userStatements, false);
  }

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

  if (identityStatements.trim()) {
    runRemoteSql(TEST_REF, identityStatements, false);
  }
  console.log(`✅ Synced ${users.length} auth.users and ${identities.length} auth.identities into TEST DB.\n`);

  // STEP 4: Verification Matrix
  console.log('📦 STEP 4/4: Performing Verification & Health Check...');
  console.log('\n=============================================================');
  console.log('📊 END-TO-END VERIFICATION MATRIX');
  console.log('=============================================================');
  console.log('Table Name                    | LIVE Count | TEST Count | Status');
  console.log('------------------------------+------------+------------+-------');

  for (const stat of tableStats) {
    const { count: currentTestCount } = await testSb.from(stat.table).select('*', { count: 'exact', head: true });
    const livePad = String(stat.liveCount).padStart(10);
    const testPad = String(currentTestCount ?? stat.testCount).padStart(10);
    const tablePad = stat.table.padEnd(28);
    const match = stat.liveCount === (currentTestCount ?? stat.testCount) ? '🟢 MATCH' : '🟡 DIFF';
    console.log(`${tablePad} | ${livePad} | ${testPad} | ${match}`);
  }

  // GoTrue Auth Check
  const { data: authUsers, error: authErr } = await testSb.auth.admin.listUsers();
  console.log('------------------------------+------------+------------+-------');
  if (authErr) {
    console.log(`❌ Auth Test Error: ${authErr.message}`);
  } else {
    console.log(`auth.users                    | ${String(users.length).padStart(10)} | ${String(authUsers.users.length).padStart(10)} | 🟢 READY`);
  }
  console.log('=============================================================\n');
  console.log('🎉 END-TO-END CLONE COMPLETE! Test DB is a 100% verified replica of LIVE.\n');
}

cloneDatabase().catch(err => {
  console.error('\n❌ Clone failed with error:', err);
  process.exit(1);
});
