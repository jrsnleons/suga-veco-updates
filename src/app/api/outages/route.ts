import { NextResponse } from 'next/server';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';
import { importLiveFeed } from '@/db/import-live-feed';
import { enrichWithLiveStatus } from '@/lib/status-utils';

export const dynamic = 'force-dynamic';

// 30 minutes in milliseconds
const STALE_THRESHOLD_MS = 30 * 60 * 1000;
// Cooldown between background sync attempts (5 minutes)
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

let isSyncing = false;
let lastSyncAttempt = 0;

async function triggerBackgroundSyncIfStale(lastSyncedAt?: string | null): Promise<void> {
  const now = Date.now();
  if (isSyncing || (now - lastSyncAttempt) < SYNC_COOLDOWN_MS) {
    return;
  }

  let isStale = false;
  if (!lastSyncedAt) {
    isStale = true;
  } else {
    const lastSyncTime = new Date(lastSyncedAt).getTime();
    if (isNaN(lastSyncTime) || (now - lastSyncTime) > STALE_THRESHOLD_MS) {
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
      // Otherwise trigger asynchronous background sync if stale
      triggerBackgroundSyncIfStale(latestLog?.scrapedAt);
    }

    const outages = rawOutages.map(o => enrichWithLiveStatus(o));

    return NextResponse.json({
      success: true,
      total: outages.length,
      lastSynced: latestLog ? latestLog.scrapedAt : null,
      data: outages,
    });
  } catch (error) {
    console.error('API /api/outages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outages' },
      { status: 500 }
    );
  }
}
