import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Helper to auto-load .env or .env.local if present
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

async function pushToTurso() {
  console.log('====================================================');
  console.log('  VECO Outage Tracker -> Turso Cloud Database Sync  ');
  console.log('====================================================\n');

  if (!tursoUrl || !tursoToken) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN!\n');
    console.log('To push your local data to Turso:');
    console.log('1. Create a free Turso account at https://turso.tech or run:');
    console.log('     brew install tursodatabase/tap/turso');
    console.log('     turso auth signup');
    console.log('     turso db create veco-db');
    console.log('2. Get your URL and Token:');
    console.log('     turso db show veco-db --url');
    console.log('     turso db tokens create veco-db');
    console.log('3. Add them to your .env or run:');
    console.log('     TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run turso:push\n');
    process.exit(1);
  }

  const localDbPath = path.join(process.cwd(), 'data', 'veco.db');
  if (!fs.existsSync(localDbPath)) {
    console.error(`❌ Local database not found at ${localDbPath}. Run "npm run import-live" first.`);
    process.exit(1);
  }

  console.log(`🔌 Connecting to local database: file:${localDbPath}`);
  const localDb = createClient({ url: `file:${localDbPath}` });

  console.log(`☁️  Connecting to Turso Cloud: ${tursoUrl.replace(/(libsql:\/\/[^.]+).*/, '$1...')}`);
  const tursoDb = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. Initialize schema on Turso
  console.log('📦 Ensuring schema and indexes exist on Turso...');
  await tursoDb.executeMultiple(`
    CREATE TABLE IF NOT EXISTS interruptions (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      fb_post_id           TEXT NOT NULL,
      fb_post_url          TEXT,
      fb_image_url         TEXT,
      date                 TEXT NOT NULL,
      date_label           TEXT,
      time_start           TEXT NOT NULL,
      time_end             TEXT NOT NULL,
      time_display         TEXT,
      type                 TEXT NOT NULL,
      status               TEXT NOT NULL,
      status_label         TEXT,
      area_title           TEXT NOT NULL,
      city                 TEXT NOT NULL,
      barangays_json       TEXT NOT NULL,
      streets              TEXT,
      reason               TEXT,
      fb_caption           TEXT,
      fb_post_time         TEXT,
      is_past              INTEGER DEFAULT 0,
      outcome              TEXT,
      is_superseded        INTEGER DEFAULT 0,
      superseded_by_id     INTEGER,
      precedence           INTEGER DEFAULT 1,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(fb_post_id, date, time_start)
    );

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      scraped_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms          INTEGER,
      posts_found          INTEGER,
      new_advisories       INTEGER,
      status               TEXT,
      error_message        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_date ON interruptions(date);
    CREATE INDEX IF NOT EXISTS idx_is_past ON interruptions(is_past);
    CREATE INDEX IF NOT EXISTS idx_status ON interruptions(status);
    CREATE INDEX IF NOT EXISTS idx_is_superseded ON interruptions(is_superseded);
  `);

  // 2. Fetch local records
  const localRows = await localDb.execute('SELECT * FROM interruptions');
  console.log(`📋 Found ${localRows.rows.length} interruptions in local database.`);

  // 3. Batch push to Turso in chunks
  const CHUNK_SIZE = 25;
  let pushedCount = 0;

  for (let i = 0; i < localRows.rows.length; i += CHUNK_SIZE) {
    const chunk = localRows.rows.slice(i, i + CHUNK_SIZE);
    const statements = chunk.map(row => ({
      sql: `
        INSERT INTO interruptions (
          id, fb_post_id, fb_post_url, fb_image_url, date, date_label, time_start, time_end, time_display,
          type, status, status_label, area_title, city, barangays_json, streets,
          reason, fb_caption, fb_post_time, is_past, outcome, is_superseded, superseded_by_id, precedence
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(fb_post_id, date, time_start) DO UPDATE SET
          fb_post_url = excluded.fb_post_url,
          fb_image_url = excluded.fb_image_url,
          status = excluded.status,
          status_label = excluded.status_label,
          outcome = excluded.outcome,
          reason = excluded.reason,
          area_title = excluded.area_title,
          city = excluded.city,
          barangays_json = excluded.barangays_json,
          streets = excluded.streets,
          fb_caption = excluded.fb_caption,
          is_past = excluded.is_past,
          is_superseded = excluded.is_superseded,
          superseded_by_id = excluded.superseded_by_id,
          precedence = excluded.precedence,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        row.id,
        row.fb_post_id,
        row.fb_post_url,
        row.fb_image_url,
        row.date,
        row.date_label,
        row.time_start,
        row.time_end,
        row.time_display,
        row.type,
        row.status,
        row.status_label,
        row.area_title,
        row.city,
        row.barangays_json,
        row.streets,
        row.reason,
        row.fb_caption,
        row.fb_post_time,
        row.is_past,
        row.outcome,
        row.is_superseded,
        row.superseded_by_id,
        row.precedence,
      ]
    }));

    await tursoDb.batch(statements, 'write');
    pushedCount += chunk.length;
    process.stdout.write(`\r🚀 Pushed ${pushedCount} / ${localRows.rows.length} records to Turso...`);
  }
  console.log('\n');

  // 4. Sync scrape logs
  const localLogs = await localDb.execute('SELECT * FROM scrape_logs ORDER BY scraped_at DESC LIMIT 50');
  if (localLogs.rows.length > 0) {
    const logStatements = localLogs.rows.map(log => ({
      sql: `
        INSERT INTO scrape_logs (scraped_at, duration_ms, posts_found, new_advisories, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [log.scraped_at, log.duration_ms, log.posts_found, log.new_advisories, log.status, log.error_message]
    }));
    await tursoDb.batch(logStatements, 'write');
    console.log(`📝 Synced ${localLogs.rows.length} scrape logs to Turso.`);
  }

  // 5. Verify data on Turso
  const verifyRes = await tursoDb.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_superseded = 0 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_superseded = 1 THEN 1 ELSE 0 END) as superseded
    FROM interruptions
  `);

  const stats: any = verifyRes.rows[0];
  console.log('\n====================================================');
  console.log('✅ SYNC TO TURSO COMPLETED SUCCESSFULLY!');
  console.log(`   Total Records on Turso:     ${stats.total}`);
  console.log(`   Active Advisories:          ${stats.active}`);
  console.log(`   Superseded Records:         ${stats.superseded}`);
  console.log('====================================================\n');
  console.log('Now, in your Vercel Project Settings > Environment Variables:');
  console.log(`1. Add TURSO_DATABASE_URL = "${tursoUrl}"`);
  console.log(`2. Add TURSO_AUTH_TOKEN   = "(your token)"`);
  console.log('Your Next.js app will now read and write directly to Turso Cloud!\n');
}

pushToTurso().catch(err => {
  console.error('\n❌ Error pushing to Turso:', err);
  process.exit(1);
});
