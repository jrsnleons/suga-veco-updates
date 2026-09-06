import { NextResponse } from 'next/server';
import { runScrape } from '@/scraper/fb-scraper';
import { importLiveFeed } from '@/db/import-live-feed';
import { getAllInterruptions, getLatestScrapeLog } from '@/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    let result = { found: 0, newAdvisories: 0 };
    if (process.env.VERCEL === '1') {
      console.log('[API /api/sync] Running on Vercel serverless runtime: syncing via published feed.');
      const count = await importLiveFeed();
      result = { found: count, newAdvisories: count };
    } else {
      try {
        result = await runScrape();
      } catch (err) {
        console.warn('Facebook direct scrape fallback to live feed:', err);
        const count = await importLiveFeed();
        result = { found: count, newAdvisories: count };
      }
    }

    const outages = await getAllInterruptions();
    const latestLog = await getLatestScrapeLog();

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${result.found} records processed.`,
      lastSynced: latestLog ? latestLog.scrapedAt : new Date().toISOString(),
      total: outages.length,
      data: outages,
    });
  } catch (error) {
    console.error('API /api/sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync cycle encountered an issue' },
      { status: 500 }
    );
  }
}
