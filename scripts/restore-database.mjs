import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Find latest backup folder or use target argument
const backupsBaseDir = path.join(process.cwd(), 'supabase', 'backups');
let targetBackupDir = process.argv[2];

if (!targetBackupDir) {
  if (!fs.existsSync(backupsBaseDir)) {
    console.error('❌ No backup directory found at supabase/backups');
    process.exit(1);
  }

  const entries = fs.readdirSync(backupsBaseDir)
    .filter(name => name.startsWith('backup_'))
    .sort()
    .reverse();

  if (entries.length === 0) {
    console.error('❌ No backup folders found inside supabase/backups');
    process.exit(1);
  }

  targetBackupDir = path.join(backupsBaseDir, entries[0]);
}

console.log(`🚀 Starting database restore...`);
console.log(`📁 Source backup: ${targetBackupDir}\n`);

// Restore in strict foreign-key order
const RESTORE_ORDER = [
  'colleges',
  'profiles',
  'events',
  'students',
  'chest_no',
  'max_participation',
  'fest_settings',
  'event_deadline_settings',
  'entry_locks',
  'registrations',
  'late_registrations',
  'prefest_registrations',
  'prefest_submissions',
  'prefest_registration_settings',
  'replacements',
  'code_letters',
  'stages',
  'schedules',
  'points_matrix',
  'results',
  'appeals',
  'volunteers',
  'announcements',
  'fest_committee',
  'blocked_students'
];

async function restore() {
  const manifestPath = path.join(targetBackupDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log(`📋 Backup Timestamp: ${manifest.timestamp}`);
    console.log(`📊 Records in manifest: ${manifest.totalRecords}\n`);
  }

  for (const table of RESTORE_ORDER) {
    const jsonPath = path.join(targetBackupDir, `${table}.json`);
    if (!fs.existsSync(jsonPath)) {
      continue;
    }

    const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    if (!rows || rows.length === 0) {
      console.log(`⚪ Table "${table}": 0 rows (skipped)`);
      continue;
    }

    process.stdout.write(`⏳ Restoring "${table}" (${rows.length} rows)... `);

    // Upsert in batches of 500
    const chunkSize = 500;
    let failed = false;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, { ignoreDuplicates: false });
      if (error) {
        console.log(`\n❌ Error restoring batch for "${table}": ${error.message}`);
        failed = true;
        break;
      }
    }

    if (!failed) {
      console.log(`✅ Success`);
    }
  }

  console.log(`\n=============================================`);
  console.log(`🎉 Database restore process finished!`);
  console.log(`ℹ️ Alternatively, execute "full_data_backup.sql" directly in Supabase SQL Editor.`);
  console.log(`=============================================\n`);
}

restore().catch(err => {
  console.error('❌ Restore failed with error:', err);
  process.exit(1);
});
