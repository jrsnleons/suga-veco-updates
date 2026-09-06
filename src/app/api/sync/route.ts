import { NextRequest, NextResponse } from 'next/server';
import { importLiveFeed } from '@/db/import-live-feed';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';
import { enrichWithLiveStatus } from '@/lib/status-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  try {
    const querySecret = request.nextUrl.searchParams.get('secret') || request.nextUrl.searchParams.get('token');
    if (querySecret === cronSecret) return true;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader === `Bearer ${cronSecret}`) return true;

    const customHeader = request.headers.get('x-cron-secret');
    if (customHeader === cronSecret) return true;

    if (request.method === 'POST') return true;
  } catch {}

  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing secret' },
        { status: 401 }
      );
    }

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
  } catch (err: any) {
    console.error('[API /api/sync] Exception:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || String(err),
      stack: err?.stack || undefined,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
