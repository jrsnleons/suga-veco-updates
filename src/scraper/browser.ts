import { chromium, Browser, BrowserContext } from 'patchright';
import fs from 'fs';
import path from 'path';

export async function launchStealthBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  let browser: Browser;

  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
        '--window-size=1920,1080',
        '--lang=en-US,en',
      ]
    });
  } catch {
    // Fallback to default chromium binary
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
        '--window-size=1920,1080',
      ]
    });
  }

  const sessionPath = path.join(process.cwd(), 'data', 'fb-session.json');
  const hasSession = fs.existsSync(sessionPath);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Manila',
    storageState: hasSession ? sessionPath : undefined,
  });

  return { browser, context };
}
