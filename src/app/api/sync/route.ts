import { NextRequest, NextResponse } from 'next/server';
import { importLiveFeed } from '@/db/import-live-feed';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';
import { enrichWithLiveStatus } from '@/lib/status-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function verifyCronAuth(request: NextRequest): boolean {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      // No secret configured, allow all requests (zero-friction setup)
      return true;
    }

    // Check Bearer token in Authorization header (standard for Vercel Cron & HTTP headers)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }

    // Check custom headers
    const customHeader = request.headers.get('x-cron-secret');
    if (customHeader && customHeader === cronSecret) {
      return true;
    }

    // Check URL query parameters safely using request.nextUrl
    const secretParam = request.nextUrl.searchParams.get('secret') || request.nextUrl.searchParams.get('token');
    if (secretParam && secretParam === cronSecret) {
      return true;
    }

    // Allow browser POST requests
    if (request.method === 'POST') {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[API /api/sync] Auth check error:', err);
    return false;
  }
}

async function handleSync(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    console.log('[API /api/sync] Synchronizing latest VECO advisories...');
    const count = await importLiveFeed();

    const rawOutages = await getAllInterruptions();
    const outages = rawOutages.map(o => enrichWithLiveStatus(o));
    const latestLog = await getLatestScrapeLog();

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully. ${count} records processed.`,
      lastSynced: latestLog ? latestLog.scrapedAt : new Date().toISOString(),
      total: outages.length,
      data: outages,
    });
  } catch (error: any) {
    console.error('[API /api/sync] Error during sync:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || String(error) || 'Sync cycle encountered an issue',
        details: error?.stack || undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
