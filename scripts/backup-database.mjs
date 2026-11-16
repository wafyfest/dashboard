import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ordered list of tables to backup
const TABLES = [
  'colleges',
  'profiles',
  'events',
  'students',
  'chest_no',
  'registrations',
  'late_registrations',
  'prefest_registrations',
  'prefest_submissions',
  'prefest_registration_settings',
  'replacements',
  'code_letters',
  'submission_entries',
  'stages',
  'schedules',
  'points_matrix',
  'results',
  'appeals',
  'entry_locks',
  'event_deadline_settings',
  'fest_settings',
  'max_participation',
  'registration_logs',
  'volunteers',
  'announcements',
  'blocked_students',
  'fest_committee',
  'system_audit_logs',
  'rate_limit_entries'
];

function sanitizeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function fetchTableData(tableName) {
  const pageSize = 1000;
  let allRows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      // Table might not exist or be accessible
      return { error: error.message, rows: [] };
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += pageSize;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return { error: null, rows: allRows };
}

async function backup() {
  const tagArg = process.argv.slice(2).filter(a => !a.startsWith('--')).join('-').replace(/[^a-zA-Z0-9_-]/g, '_') || '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderName = tagArg ? `snapshot_${tagArg}_${timestamp}` : `backup_${timestamp}`;
  const backupDir = path.join(process.cwd(), 'supabase', 'backups', folderName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`🚀 Starting database backup...`);
  if (tagArg) console.log(`🏷️  Snapshot Tag: [${tagArg}]`);
  console.log(`📁 Backup destination: ${backupDir}\n`);

  const manifest = {
    tag: tagArg || 'scheduled_or_manual',
    timestamp: new Date().toISOString(),
    projectUrl: supabaseUrl,
    tables: {},
    totalRecords: 0
  };

  const sqlStatements = [];
  sqlStatements.push(`-- WSF Fest Database Backup: ${manifest.timestamp}\n`);
  sqlStatements.push(`BEGIN;\n`);

  for (const table of TABLES) {
    process.stdout.write(`⏳ Backing up "${table}"... `);
    const { error, rows } = await fetchTableData(table);

    if (error) {
      console.log(`⚠️ Skipped (${error})`);
      manifest.tables[table] = { status: 'skipped', error };
      continue;
    }

    manifest.tables[table] = { status: 'success', count: rows.length };
    manifest.totalRecords += rows.length;

    // Save JSON format
    const jsonPath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');

    // Build SQL INSERT statements
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');

      sqlStatements.push(`-- Table: ${table} (${rows.length} rows)`);
      for (const row of rows) {
        const values = columns.map(col => sanitizeSqlVal(row[col])).join(', ');
        sqlStatements.push(`INSERT INTO "${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
      }
      sqlStatements.push('');
    }

    console.log(`✅ ${rows.length} rows`);
  }

  sqlStatements.push(`COMMIT;\n`);

  // Write SQL combined backup
  const sqlPath = path.join(backupDir, `full_data_backup.sql`);
  fs.writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf-8');

  // Write manifest file
  const manifestPath = path.join(backupDir, `manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Back up Supabase Storage Buckets
  console.log(`\n📦 Backing up Supabase Storage buckets...`);
  const buckets = ['fest-receipts', 'fest-public-docs', 'committee-photos'];
  const storageDir = path.join(backupDir, 'storage');

  for (const bucket of buckets) {
    const { data: fileList, error: listErr } = await supabase.storage.from(bucket).list();
    if (listErr) {
      console.log(`⚠️ Bucket "${bucket}" skip: ${listErr.message}`);
      continue;
    }

    const files = (fileList || []).filter(f => f.name !== '.emptyFolderPlaceholder');
    console.log(`📁 Bucket "${bucket}": ${files.length} file(s) found`);

    if (files.length > 0) {
      const bucketFolder = path.join(storageDir, bucket);
      if (!fs.existsSync(bucketFolder)) fs.mkdirSync(bucketFolder, { recursive: true });

      for (const file of files) {
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(file.name);
        if (!dlErr && blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          fs.writeFileSync(path.join(bucketFolder, file.name), buffer);
          console.log(`   ⬇️ Downloaded: ${file.name}`);
        }
      }
    }
  }

  console.log(`\n=============================================`);
  console.log(`🎉 Backup completed successfully!`);
  console.log(`📊 Total records backed up: ${manifest.totalRecords}`);
  console.log(`📄 SQL Backup: ${sqlPath}`);
  console.log(`📄 JSON Files: ${backupDir}`);
  console.log(`=============================================\n`);
}

backup().catch((err) => {
  console.error('❌ Backup failed with error:', err);
  process.exit(1);
});
