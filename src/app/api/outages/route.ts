import { NextResponse } from 'next/server';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';
import { importLiveFeed } from '@/db/import-live-feed';
import { enrichWithLiveStatus } from '@/lib/status-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 30 minutes in milliseconds
const STALE_THRESHOLD_MS = 30 * 60 * 1000;
// Cooldown between background sync attempts (5 minutes)
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
// In-memory cache TTL (20 seconds) for ultra-fast <5ms responses
const IN_MEMORY_TTL_MS = 20 * 1000;

let isSyncing = false;
let lastSyncAttempt = 0;

interface CachedApiResponse {
  payload: any;
  cachedAt: number;
}
let cachedResponse: CachedApiResponse | null = null;

export function invalidateApiCache(): void {
  cachedResponse = null;
}

function parseSqliteUtcTime(timestampStr?: string | null): number {
  if (!timestampStr) return 0;
  try {
    const normalized = timestampStr.includes('T') || timestampStr.includes('Z') || timestampStr.includes('+')
      ? timestampStr
      : `${timestampStr.replace(' ', 'T')}Z`;
    const t = new Date(normalized).getTime();
    return isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

async function triggerBackgroundSyncIfStale(lastSyncedAt?: string | null): Promise<void> {
  const now = Date.now();
  if (isSyncing || (now - lastSyncAttempt) < SYNC_COOLDOWN_MS) {
    return;
  }

  let isStale = false;
  if (!lastSyncedAt) {
    isStale = true;
  } else {
    const lastSyncTime = parseSqliteUtcTime(lastSyncedAt);
    if (lastSyncTime === 0 || (now - lastSyncTime) > STALE_THRESHOLD_MS) {
      isStale = true;
    }
  }

  if (!isStale) return;

  isSyncing = true;
  lastSyncAttempt = now;

  // Execute in background without blocking response
  (async () => {
    try {
      console.log('[API /api/outages] Stale data detected (>30m). Initiating background SWR sync...');
      const count = await importLiveFeed();
      cachedResponse = null;
      console.log(`[API /api/outages] Background SWR sync completed successfully. ${count} records processed.`);
    } catch (err) {
      console.warn('[API /api/outages] Background SWR sync notice:', err);
    } finally {
      isSyncing = false;
    }
  })();
}

export async function GET() {
  try {
    const now = Date.now();

    // Fast-path: Return cached in-memory response if fresh (<20s)
    if (cachedResponse && (now - cachedResponse.cachedAt) < IN_MEMORY_TTL_MS) {
      return NextResponse.json(cachedResponse.payload);
    }

    let rawOutages = await getAllInterruptions();
    let latestLog = await getLatestScrapeLog();

    // If database is completely empty (e.g. initial deployment), seed immediately on first hit
    if (rawOutages.length === 0) {
      console.log('[API /api/outages] Database is empty. Performing initial synchronous sync...');
      try {
        await importLiveFeed();
        rawOutages = await getAllInterruptions();
        latestLog = await getLatestScrapeLog();
      } catch (err) {
        console.warn('[API /api/outages] Initial sync notice:', err);
      }
    } else {
      // Otherwise trigger asynchronous background sync if genuinely stale
      triggerBackgroundSyncIfStale(latestLog?.scrapedAt);
    }

    const outages = rawOutages.map(o => enrichWithLiveStatus(o));

    const payload = {
      success: true,
      total: outages.length,
      lastSynced: latestLog ? latestLog.scrapedAt : null,
      data: outages,
    };

    cachedResponse = {
      payload,
      cachedAt: now,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('API /api/outages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outages' },
      { status: 500 }
    );
  }
}
