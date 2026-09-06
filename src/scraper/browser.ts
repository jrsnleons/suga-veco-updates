import { chromium, Browser, BrowserContext } from 'patchright';
import fs from 'fs';
import path from 'path';

export async function launchStealthBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  let browser: Browser;

  const isLinux = process.platform === 'linux';
  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-infobars',
    '--window-size=1920,1080',
    '--lang=en-US,en',
  ];

  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: launchArgs,
    });
  } catch {
    // Fallback to default chromium binary
    browser = await chromium.launch({
      headless: true,
      args: launchArgs,
    });
  }

  const sessionPath = path.join(process.cwd(), 'data', 'fb-session.json');
  const hasSession = fs.existsSync(sessionPath);

  const userAgent = isLinux
    ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent,
    locale: 'en-US',
    timezoneId: 'Asia/Manila',
    storageState: hasSession ? sessionPath : undefined,
  });

  return { browser, context };
}
