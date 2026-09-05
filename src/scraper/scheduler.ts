import cron from 'node-cron';
import { runScrape } from './fb-scraper';

console.log('[Scheduler] Initializing 30-minute automated VECO scraper cron job...');

// Schedule for every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log(`[Scheduler] 30-minute trigger fired at ${new Date().toISOString()}`);
  try {
    await runScrape();
  } catch (err) {
    console.error('[Scheduler] Scrape error:', err);
  }
});

// Run once immediately on start
runScrape().catch(err => console.error('[Scheduler] Initial scrape notice:', err));
