import { launchStealthBrowser } from './browser';
import { parsePostText, ParsedRawPost } from '@/parser/text-parser';
import { linkAndPersistInterruption } from '@/parser/linker';
import { logScrapeRun, pruneOldScrapeLogs } from '@/db';
import { importLiveFeed } from '@/db/import-live-feed';

async function dispatchWebhookAlert(title: string, message: string): Promise<void> {
  const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚡ **SUGA Scraper Alert**: ${title}\n${message}`,
        text: `⚡ SUGA Scraper Alert: ${title} - ${message}`,
      }),
    });
  } catch (err) {
    console.warn('[Scraper] Webhook alert notification notice:', err);
  }
}

export async function runScrape(): Promise<{ found: number; newAdvisories: number }> {
  const startTime = Date.now();
  console.log(`[Scraper] Starting VECO Facebook scrape at ${new Date().toISOString()}...`);

  let browser;
  let context;
  const rawPosts: ParsedRawPost[] = [];

  try {
    const launchResult = await launchStealthBrowser();
    browser = launchResult.browser;
    context = launchResult.context;

    const page = await context.newPage();

    // 1. Passive GraphQL Interceptor
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('/api/graphql/')) return;

      try {
        let text = await response.text();
        if (text.startsWith('for (;;);')) text = text.slice(9);

        const lines = text.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            extractStoriesFromRelay(json, rawPosts);
          } catch {}
        }
      } catch {}
    });

    // Helper to dismiss cookie banners and login dialogs actively
    const dismissOverlays = async () => {
      try {
        const cookieSelectors = [
          'button[data-cookiebanner="accept_button"]',
          'div[aria-label="Allow all cookies"]',
          'button:has-text("Allow all cookies")',
          'button:has-text("Allow essential and optional cookies")',
          'button:has-text("Decline optional cookies")',
        ];
        for (const sel of cookieSelectors) {
          const btn = page.locator(sel);
          if (await btn.count() > 0 && await btn.first().isVisible()) {
            await btn.first().click({ timeout: 1500 }).catch(() => {});
            await page.waitForTimeout(600);
            break;
          }
        }

        const dialogCloseSelectors = [
          'div[role="dialog"] div[aria-label="Close"]',
          'div[role="dialog"] div[aria-label="close" i]',
          'div[role="dialog"] button:has-text("Close")',
          'div[role="dialog"] button:has-text("Not now")',
          'div[aria-label="Close"]',
        ];
        for (const sel of dialogCloseSelectors) {
          const btn = page.locator(sel);
          if (await btn.count() > 0 && await btn.first().isVisible()) {
            await btn.first().click({ timeout: 1500 }).catch(() => {});
            await page.waitForTimeout(600);
          }
        }

        await page.keyboard.press('Escape').catch(() => {});
      } catch {}
    };

    // 2. Auto-dismiss Guest Dialog via locator handler
    await page.addLocatorHandler(
      page.locator('div[role="dialog"]'),
      async (dialog) => {
        try {
          const closeBtn = dialog.getByRole('button', { name: /close|đóng|cerrar|fermer/i })
            .or(dialog.locator('div[aria-label="Close"]'));
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          } else {
            await page.keyboard.press('Escape');
          }
        } catch {}
      }
    );

    // 3. Navigate to VECO Facebook Page
    await page.goto('https://www.facebook.com/visayanelectriccompany', {
      waitUntil: 'domcontentloaded',
      timeout: 35000,
    });
    await page.waitForTimeout(3000);
    await dismissOverlays();

    // 4. Expand "See more" buttons to reveal full advisory text
    const expandSeeMore = async () => {
      try {
        await dismissOverlays();
        const seeMoreButtons = page.locator('div[role="button"], span[role="button"]').filter({
          hasText: /See more|Tan-awa ang dugang/i,
        });
        const count = await seeMoreButtons.count();
        for (let i = 0; i < count; i++) {
          try {
            await seeMoreButtons.nth(i).click({ timeout: 800 });
          } catch {}
        }
      } catch {}
    };

    await expandSeeMore();

    // 5. Scroll down to trigger older advisories and expand their text
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(1500);
      await expandSeeMore();
    }

    // 6. Direct DOM Post & Image Extractor
    const domStories = await page.evaluate(() => {
      let articles = Array.from(document.querySelectorAll('div[role="article"]'));
      
      // Fallback: If role="article" was not detected (e.g. Facebook feed variation)
      if (articles.length === 0) {
        const anchors = Array.from(document.querySelectorAll('a[href*="/visayanelectriccompany/posts/"], a[href*="/visayanelectriccompany/photos/"], a[href*="/photo/"]'));
        const containerSet = new Set<Element>();
        for (const a of anchors) {
          const container = a.closest('div[data-pagelet], div[tabindex="-1"], div[class*="x1yztbdb"]') || a.parentElement?.parentElement;
          if (container) containerSet.add(container);
        }
        articles = Array.from(containerSet);
      }

      const items: { postId: string; url?: string; text: string; img?: string }[] = [];

      for (const art of articles) {
        // Find anchor pointing to real company post (pfbid) or photo
        const permalinkEl = art.querySelector('a[href*="/visayanelectriccompany/posts/pfbid"], a[href*="/visayanelectriccompany/photos/"], a[href*="/photo/"]') as HTMLAnchorElement | null;
        if (!permalinkEl) continue;

        const cleanUrl = permalinkEl.href.split('?')[0];
        if (cleanUrl.includes('comment_id=')) continue; // ignore comments

        // Extract message container text
        const msgContainers = Array.from(art.querySelectorAll('div[dir="auto"]'));
        let postBody = '';
        for (const el of msgContainers) {
          const t = (el as HTMLElement).innerText || '';
          if (t.length > postBody.length && !t.includes('All reactions:') && !t.includes('comments')) {
            postBody = t;
          }
        }

        if (postBody.length < 25) continue;

        // Extract real image from Facebook CDN
        const imgEl = art.querySelector('img[src*="fbcdn.net"]:not([src*="emoji.php"]):not([width="20"]):not([width="16"])') as HTMLImageElement | null;
        const img = imgEl ? imgEl.src : undefined;

        // Extract clean post ID
        const pfbidMatch = cleanUrl.match(/(pfbid[0-9a-zA-Z]+)/);
        const postId = pfbidMatch ? pfbidMatch[1] : cleanUrl.split('/').filter(Boolean).pop() || `fb-${Date.now()}`;

        items.push({
          postId,
          url: cleanUrl,
          text: postBody,
          img,
        });
      }

      return items;
    });

    for (const item of domStories) {
      if (!rawPosts.some(p => p.url === item.url || p.text === item.text)) {
        rawPosts.push(item);
      }
    }
  } catch (err) {
    console.warn('[Scraper] Direct Facebook scrape notice:', err);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  // Deduplicate and parse collected posts
  const uniquePosts = deduplicatePosts(rawPosts);
  console.log(`[Scraper] Direct scrape returned ${uniquePosts.length} post(s).`);

  // Fallback to published live feed if Facebook yielded 0 posts
  if (uniquePosts.length === 0) {
    console.warn('[Scraper] Direct Facebook scrape found 0 posts (likely blocked or rate-limited by Facebook).');
    console.log('[Scraper] Triggering live feed fallback to keep database and website up to date...');
    const fallbackCount = await importLiveFeed();
    console.log(`[Scraper] Fallback successfully imported and synchronized ${fallbackCount} advisories.`);
    return { found: fallbackCount, newAdvisories: fallbackCount };
  }

  let newAdvisories = 0;
  for (const post of uniquePosts) {
    const parsed = parsePostText(post);
    if (parsed && parsed.area) {
      await linkAndPersistInterruption(parsed);
      newAdvisories++;
    }
  }

  const duration = Date.now() - startTime;
  await logScrapeRun({
    durationMs: duration,
    postsFound: uniquePosts.length,
    newAdvisories,
    status: 'success',
  });

  // Prune scrape logs older than 30 days
  await pruneOldScrapeLogs(30);

  if (newAdvisories > 0) {
    await dispatchWebhookAlert(
      'New Advisories Processed',
      `Processed ${newAdvisories} new or updated power interruption advisories from ${uniquePosts.length} Facebook posts.`
    );
  }

  console.log(`[Scraper] Cycle finished in ${duration}ms. ${uniquePosts.length} posts checked, ${newAdvisories} advisories processed.`);
  return { found: uniquePosts.length, newAdvisories };
}

function extractStoriesFromRelay(payload: any, list: ParsedRawPost[]): void {
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;

    if (node.__typename === 'Story' || (node.message && node.id)) {
      const msg = node.message?.text || '';
      let url = typeof node.url === 'string' ? node.url.split('?')[0] : undefined;
      if (url && !url.includes('/visayanelectriccompany/')) {
        url = undefined;
      }
      const pfbidMatch = url ? url.match(/(pfbid[0-9a-zA-Z]+)/) : null;
      const id = pfbidMatch ? pfbidMatch[1] : (node.post_id || node.id || `relay-${Date.now()}`);
      if (msg.length > 25 && !list.some(p => p.postId === id || p.text === msg)) {
        list.push({
          postId: id,
          url,
          text: msg,
          postedAt: node.creation_time ? new Date(node.creation_time * 1000).toLocaleString() : undefined,
        });
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
    } else {
      Object.values(node).forEach(walk);
    }
  }

  walk(payload);
}

function deduplicatePosts(posts: ParsedRawPost[]): ParsedRawPost[] {
  const seen = new Set<string>();
  const res: ParsedRawPost[] = [];
  for (const p of posts) {
    const key = p.text.trim().slice(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      res.push(p);
    }
  }
  return res;
}

if (require.main === module) {
  runScrape()
    .then((res) => {
      console.log(`[Scraper] Run finished successfully: ${res.found} records found, ${res.newAdvisories} advisories processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Scraper] Uncaught error during scrape cycle:', err);
      process.exit(1);
    });
}
