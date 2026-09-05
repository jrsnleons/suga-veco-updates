import { launchStealthBrowser } from './browser';
import { parsePostText, ParsedRawPost } from '@/parser/text-parser';
import { linkAndPersistInterruption } from '@/parser/linker';
import { logScrapeRun, pruneOldScrapeLogs } from '@/db';

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

    // 2. Auto-dismiss Guest Dialog
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
    await page.waitForTimeout(3500);

    // 4. Expand "See more" buttons to reveal full advisory text
    const expandSeeMore = async () => {
      try {
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
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(1200);
      await expandSeeMore();
    }

    // 6. Direct DOM Post & Image Extractor
    const domStories = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('div[role="article"]'));
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
    console.warn('[Scraper] Network or browser notice:', err);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  // Deduplicate and parse collected posts
  let newAdvisories = 0;
  const uniquePosts = deduplicatePosts(rawPosts);

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
  runScrape().then(() => process.exit(0)).catch(() => process.exit(1));
}
