import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Interruption, ScrapeLog } from '@/types';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Support both local SQLite file and Turso Cloud URL
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(DB_DIR, 'veco.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db: Client = createClient({
  url: dbUrl,
  authToken,
});

let schemaInitialized = false;

export async function initDbSchema(): Promise<void> {
  if (schemaInitialized) return;
  try {
    await db.executeMultiple(`
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
    schemaInitialized = true;
  } catch (err) {
    console.warn('[DB] Schema init notice:', err);
  }
}

// Auto-run schema check in background
initDbSchema().catch(() => {});

export const REAL_FB_POSTS = {
  UPDATE_6: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid04Cwc8d5zofeKt5Zz3XdSyFfwzM4BrsLm5c1ccuY9K5WcYEXGm3ESpHj1S9iBjUr1l',
  UPDATE_5: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid05U1BED1Dt7J9ZXuXjPbPXGk7SncmabZ8S9UA5iee3ZTmR6y5NZFUirr3HvgTATJrl',
  UPDATE_4: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid0Hz2r7YUwggDXkdWzh72moUVdPXTma4MCN25Q2MatfHodCNrAoCPe4mQrEqGWbepWl',
  UPDATE_3: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid06oKnFhMfAgJUuWJAHsSkdhYGS4TLbjCCbxQWzJUTk7JYRKjvcVA2MTu82cdbJGg4l',
  FINAL_UPDATE: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid02orYKTShTuV2eBJ5zZDonkXsrcPSdy5VGxTd5avuP23GpPyWqS7CsLsvaypjWQgmBl',
  REVISED_ADVISORY: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid02ywMtNjJbKwBmaDEAvYCaf7iCSHYEd4KKQiYmZCcDdDYmscJXacm45p8UsT1feDPol',
  MASTER_SCHEDULE: 'https://www.facebook.com/visayanelectriccompany/posts/pfbid02z7WtfsaL9Y9KJvCc3Ffguq8dBvMHtjEFjMSWRwbtVnAfjcJDnCPRar6dZsQPwctml',
  INFOGRAPHIC_PHOTO: 'https://www.facebook.com/photo/?fbid=1535534125268871',
  DEFAULT_IMAGE: 'https://scontent.fceb1-2.fna.fbcdn.net/v/t39.99422-6/793070003_4218349038457258_4057297960438696171_n.png?stp=dst-jpg_tt6&cstp=mx1080x1080&ctp=s600x600&_nc_cat=100&ccb=1-7&_nc_sid=cae128&_nc_ohc=Ja_ZXLpenIoQ7kNvwGC3NEs&_nc_oc=AdoESQKd3sMxzTQinQCJH_LkkbEIcVeUxvx0IJ6Joxyu64unv3iKlOY-0g3AcCZ6x8f5mU0pfGgbd8AUWHqUpJJE&_nc_zt=14&_nc_ht=scontent.fceb1-2.fna&_nc_gid=prlrzz2Fo_-fqjkNNqh2Xg&_nc_ss=7f289&oh=00_AQKywrd3VSbrAnl9fYt0OvSVNo6uaAM4NcjfGo_p1stBhQ&oe=6AA0CCFD',
};

export function resolveRealFbPostUrl(row: { fb_post_url?: string; reason?: string; fb_caption?: string; status?: string; type?: string }): string {
  const current = row.fb_post_url || '';
  if (current.includes('pfbid') || current.includes('/photo/') || current.includes('/photos/')) {
    return current;
  }

  const text = `${row.reason || ''} ${row.fb_caption || ''}`.toLowerCase();
  if (text.includes('update #6') || text.includes('update 6')) return REAL_FB_POSTS.UPDATE_6;
  if (text.includes('update #5') || text.includes('update 5')) return REAL_FB_POSTS.UPDATE_5;
  if (text.includes('update #4') || text.includes('update 4')) return REAL_FB_POSTS.UPDATE_4;
  if (text.includes('update #3') || text.includes('update 3')) return REAL_FB_POSTS.UPDATE_3;
  if (row.status === 'restored' || text.includes('concluded') || text.includes('final update')) return REAL_FB_POSTS.FINAL_UPDATE;
  if (text.includes('revised')) return REAL_FB_POSTS.REVISED_ADVISORY;

  return REAL_FB_POSTS.MASTER_SCHEDULE;
}

export function computePrecedenceScore(item: {
  type?: string;
  status?: string;
  reason?: string;
  fbCaption?: string;
  barangays?: string[];
  barangays_json?: string;
  precedence?: number;
}): number {
  const text = `${item.reason || ''} ${item.fbCaption || ''}`.toLowerCase();
  let baseScore = 150;
  
  if (item.type === 'emergency') baseScore = 450;
  else if (item.status === 'cancelled') baseScore = 440;
  else if (item.status === 'delayed' || item.type === 'delayed') baseScore = 430;
  else if (item.status === 'restored') baseScore = 420;
  else if (text.includes('final update') || text.includes('concluded')) baseScore = 490;
  else {
    const updateMatch = text.match(/update\s*#?(\d+)/i);
    if (updateMatch && updateMatch[1]) {
      baseScore = 300 + Math.min(50, parseInt(updateMatch[1], 10));
    } else if (text.includes('along') || text.includes('primary line') || text.includes('facilitate') || text.includes('line reliability') || item.type === 'scheduled') {
      baseScore = 200;
    } else if (text.includes('possible rotational') || text.includes('rotational brownout') || item.type === 'rotational') {
      baseScore = 100;
    }
  }

  let brgyCount = 1;
  if (Array.isArray(item.barangays)) brgyCount = item.barangays.length;
  else if (typeof item.barangays_json === 'string') {
    try { brgyCount = JSON.parse(item.barangays_json).length || 1; } catch {}
  }
  const specificityBonus = Math.round(50 / Math.max(1, brgyCount));

  return baseScore + specificityBonus;
}

export function mapRowToInterruption(row: any): Interruption {
  let barangays: string[] = [];
  try {
    barangays = JSON.parse(row.barangays_json);
  } catch {
    barangays = [];
  }

  const fbPostUrl = resolveRealFbPostUrl(row);
  const fbImageUrl = row.fb_image_url || REAL_FB_POSTS.DEFAULT_IMAGE;

  return {
    id: Number(row.id),
    fbPostId: String(row.fb_post_id),
    fbPostUrl,
    fbImageUrl,
    date: String(row.date),
    dateLabel: String(row.date_label || row.date),
    timeStart: String(row.time_start),
    timeEnd: String(row.time_end),
    time: String(row.time_display || `${row.time_start} – ${row.time_end}`),
    type: String(row.type) as any,
    status: String(row.status) as any,
    statusLabel: String(row.status_label || row.status),
    area: String(row.area_title),
    city: String(row.city),
    barangays,
    streets: String(row.streets || ''),
    reason: String(row.reason || ''),
    fbCaption: String(row.fb_caption || ''),
    fbTime: String(row.fb_post_time || ''),
    isPast: Boolean(row.is_past),
    outcome: row.outcome ? (String(row.outcome) as any) : undefined,
    isSuperseded: Boolean(row.is_superseded),
    supersededById: row.superseded_by_id ? Number(row.superseded_by_id) : undefined,
    precedence: Number(row.precedence || 1),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getAllInterruptions(includeSuperseded = false): Promise<Interruption[]> {
  await initDbSchema();
  const whereClause = includeSuperseded ? '' : 'WHERE is_superseded = 0';
  const res = await db.execute(`
    SELECT * FROM interruptions 
    ${whereClause}
    ORDER BY 
      is_past ASC,
      CASE status 
        WHEN 'ongoing' THEN 1 
        WHEN 'delayed' THEN 2 
        WHEN 'upcoming' THEN 3 
        WHEN 'cancelled' THEN 4
        ELSE 5 
      END ASC,
      date ASC, 
      time_start ASC
  `);
  return res.rows.map(mapRowToInterruption);
}

export async function getActiveInterruptions(): Promise<Interruption[]> {
  await initDbSchema();
  const res = await db.execute(`
    SELECT * FROM interruptions 
    WHERE is_past = 0 AND is_superseded = 0
    ORDER BY 
      CASE status 
        WHEN 'ongoing' THEN 1 
        WHEN 'delayed' THEN 2 
        WHEN 'upcoming' THEN 3 
        WHEN 'cancelled' THEN 4
        ELSE 5 
      END ASC,
      date ASC, 
      time_start ASC
  `);
  return res.rows.map(mapRowToInterruption);
}

export async function getArchivedInterruptions(): Promise<Interruption[]> {
  await initDbSchema();
  const res = await db.execute(`
    SELECT * FROM interruptions 
    WHERE is_past = 1 AND is_superseded = 0
    ORDER BY date DESC, time_start DESC
  `);
  return res.rows.map(mapRowToInterruption);
}

export async function insertOrUpdateInterruption(data: Omit<Interruption, 'id'>): Promise<number> {
  await initDbSchema();
  const precedence = data.precedence || computePrecedenceScore(data);

  const res = await db.execute({
    sql: `
      INSERT INTO interruptions (
        fb_post_id, fb_post_url, fb_image_url, date, date_label, time_start, time_end, time_display,
        type, status, status_label, area_title, city, barangays_json, streets,
        reason, fb_caption, fb_post_time, is_past, outcome, is_superseded, superseded_by_id, precedence
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(fb_post_id, date, time_start) DO UPDATE SET
        fb_post_url = COALESCE(excluded.fb_post_url, interruptions.fb_post_url),
        status = excluded.status,
        status_label = excluded.status_label,
        outcome = excluded.outcome,
        reason = excluded.reason,
        area_title = excluded.area_title,
        city = excluded.city,
        barangays_json = excluded.barangays_json,
        streets = excluded.streets,
        fb_caption = excluded.fb_caption,
        fb_image_url = excluded.fb_image_url,
        is_past = excluded.is_past,
        is_superseded = excluded.is_superseded,
        superseded_by_id = excluded.superseded_by_id,
        precedence = excluded.precedence,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      data.fbPostId,
      data.fbPostUrl || null,
      data.fbImageUrl || null,
      data.date,
      data.dateLabel,
      data.timeStart,
      data.timeEnd,
      data.time,
      data.type,
      data.status,
      data.statusLabel,
      data.area,
      data.city,
      JSON.stringify(data.barangays),
      data.streets || '',
      data.reason || '',
      data.fbCaption || '',
      data.fbTime || '',
      data.isPast ? 1 : 0,
      data.outcome || null,
      data.isSuperseded ? 1 : 0,
      data.supersededById ? Number(data.supersededById) : null,
      precedence,
    ]
  });

  return Number(res.lastInsertRowid || 0);
}

export async function logScrapeRun(log: Omit<ScrapeLog, 'id' | 'scrapedAt'>): Promise<void> {
  await initDbSchema();
  await db.execute({
    sql: `
      INSERT INTO scrape_logs (duration_ms, posts_found, new_advisories, status, error_message)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [log.durationMs, log.postsFound, log.newAdvisories, log.status, log.errorMessage || null]
  });
}

export async function getLatestScrapeLog(): Promise<ScrapeLog | null> {
  await initDbSchema();
  const res = await db.execute(`SELECT * FROM scrape_logs ORDER BY scraped_at DESC LIMIT 1`);
  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];
  return {
    id: Number(row.id),
    scrapedAt: String(row.scraped_at),
    durationMs: Number(row.duration_ms),
    postsFound: Number(row.posts_found),
    newAdvisories: Number(row.new_advisories),
    status: String(row.status) as any,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
  };
}

export async function pruneOldScrapeLogs(days = 30): Promise<void> {
  await initDbSchema();
  try {
    await db.execute({
      sql: `DELETE FROM scrape_logs WHERE scraped_at < datetime('now', '-' || ? || ' days')`,
      args: [days]
    });
  } catch (err) {
    console.warn('[DB] Scrape log pruning notice:', err);
  }
}

export default db;
