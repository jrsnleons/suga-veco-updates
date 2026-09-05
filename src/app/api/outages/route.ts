import { NextResponse } from 'next/server';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';
import { enrichWithLiveStatus } from '@/lib/status-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawOutages = await getAllInterruptions();
    const outages = rawOutages.map(o => enrichWithLiveStatus(o));
    const latestLog = await getLatestScrapeLog();

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
