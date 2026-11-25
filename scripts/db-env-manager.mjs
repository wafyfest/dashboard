import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { WebSocket } from 'undici';
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');
const envTestPath = path.join(rootDir, '.env.test');
const envLivePath = path.join(rootDir, '.env.live');

const action = process.argv[2] || 'status';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const res = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      res[key] = val;
    }
  }
  return res;
}

function getActiveEnv() {
  const localEnv = parseEnv(envLocalPath);
  const url = localEnv.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url.includes('kwdyjcrdilmaqpolgqds')) return 'TEST';
  if (url.includes('mwzhidbsioveoggjkhmi')) return 'LIVE';
  return 'UNKNOWN';
}

async function showStatus() {
  const current = getActiveEnv();
  const env = parseEnv(envLocalPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL || '(none)';

  console.log('\n=============================================');
  console.log('📊 SUPABASE DUAL-DATABASE ENVIRONMENT STATUS');
  console.log('=============================================');
  console.log(`Current Active DB : ${current === 'TEST' ? '🧪 TEST DATABASE' : current === 'LIVE' ? '🔴 LIVE PRODUCTION DATABASE' : '⚠️ UNKNOWN'}`);
  console.log(`Supabase URL      : ${url}`);
  console.log(`App Name          : ${env.NEXT_PUBLIC_APP_NAME || '(default)'}`);

  // Test connection
  if (env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    try {
      const sb = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false }, realtime: { createWebSocket: () => null } }
      );
      const { count: colCount, error: colErr } = await sb.from('colleges').select('*', { count: 'exact', head: true });
      const { count: stuCount, error: stuErr } = await sb.from('students').select('*', { count: 'exact', head: true });
      const { count: regCount, error: regErr } = await sb.from('registrations').select('*', { count: 'exact', head: true });

      if (colErr) {
        console.log(`Connection Status : ⚠️ Connected with table warning: ${colErr.message}`);
      } else {
        console.log(`Connection Status : 🟢 Healthy (Accessible)`);
        console.log(`Snapshot Counts   : Colleges: ${colCount}, Students: ${stuCount}, Registrations: ${regCount}`);
      }
    } catch (err) {
      console.log(`Connection Status : ❌ Failed to connect: ${err.message}`);
    }
  }

  console.log('=============================================\n');
}

function switchToTest() {
  if (!fs.existsSync(envTestPath)) {
    console.error('❌ .env.test file not found!');
    process.exit(1);
  }
  fs.copyFileSync(envTestPath, envLocalPath);
  console.log('✅ Copied .env.test -> .env.local');

  try {
    execSync('npx supabase link --project-ref kwdyjcrdilmaqpolgqds', { stdio: 'pipe' });
    console.log('🔗 Linked Supabase CLI to TEST project (kwdyjcrdilmaqpolgqds)');
  } catch (err) {
    // CLI linking is optional for local development
  }

  console.log('\n🧪 Environment successfully switched to TEST database!');
  console.log('You can now safely test any feature without affecting live data.\n');
}

function switchToLive() {
  if (!fs.existsSync(envLivePath)) {
    console.error('❌ .env.live file not found!');
    process.exit(1);
  }
  fs.copyFileSync(envLivePath, envLocalPath);
  console.log('✅ Copied .env.live -> .env.local');

  try {
    execSync('npx supabase link --project-ref mwzhidbsioveoggjkhmi', { stdio: 'pipe' });
    console.log('🔗 Linked Supabase CLI to LIVE project (mwzhidbsioveoggjkhmi)');
  } catch (err) {
    // CLI linking is optional for local development
  }

  console.log('\n🔴 Environment successfully switched to LIVE production database!');
  console.log('⚠️ WARNING: Any manual writes or API calls will affect real live data!\n');
}

async function syncTestData() {
  console.log('\n🔄 Starting TEST DB Data Sync...');
  console.log('1. Switching to test environment...');
  switchToTest();

  console.log('\n2. Executing End-to-End Live ➔ Test Database Clone...');
  execSync('node scripts/clone-live-to-test.mjs', { stdio: 'inherit' });

  console.log('\n🎉 TEST database is 100% synchronized with live data and verified ready!\n');
}

function deployMigrationsToLive() {
  console.log('\n⚠️ ==============================================');
  console.log('🚀 DEPLOYING SCHEMA MIGRATIONS TO LIVE DATABASE');
  console.log('⚠️ ==============================================');
  console.log('Note: Only new SQL migration files will be applied.');
  console.log('NO data in live tables will be overwritten or touched.\n');

  try {
    execSync('npx supabase db push --remote=mwzhidbsioveoggjkhmi --yes', { stdio: 'inherit' });
    console.log('\n🎉 Migrations successfully deployed to LIVE production database!\n');
  } catch (err) {
    console.error('\n❌ Migration deployment failed:', err.message);
    process.exit(1);
  }
}

switch (action) {
  case 'status':
    showStatus();
    break;
  case 'use-test':
    switchToTest();
    break;
  case 'use-live':
    switchToLive();
    break;
  case 'sync-test':
    syncTestData();
    break;
  case 'sync-auth':
    execSync('node scripts/sync-auth-from-live-to-test.mjs', { stdio: 'inherit' });
    break;
  case 'deploy-live':
    deployMigrationsToLive();
    break;
  default:
    console.log(`Unknown action "${action}". Valid actions: status, use-test, use-live, sync-test, deploy-live`);
    break;
}
