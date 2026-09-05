import { launchStealthBrowser } from '../src/scraper/browser';

async function test() {
  console.log('Launching browser...');
  const { browser, context } = await launchStealthBrowser();
  const page = await context.newPage();

  console.log('Navigating to VECO Facebook page...');
  try {
    const res = await page.goto('https://www.facebook.com/visayanelectriccompany', { 
      waitUntil: 'domcontentloaded', 
      timeout: 35000 
    });
    console.log('HTTP Status:', res ? res.status() : 'no res');
    await page.waitForTimeout(6000);

    const title = await page.title();
    console.log('Page Title:', title);

    // Look for all links
    const links: string[] = await page.$$eval('a', (anchors: HTMLAnchorElement[]) => {
      return anchors.map(a => a.href);
    });

    const postLinks = links.filter(href => 
      href.includes('/posts/') || 
      href.includes('/photos/') || 
      href.includes('permalink.php') ||
      href.includes('story_fbid') ||
      href.includes('/videos/') ||
      href.includes('pfbid')
    );

    console.log('Total links on page:', links.length);
    console.log('Post/media links found:', postLinks.length);
    const unique = Array.from(new Set(postLinks));
    console.log('Unique post/media links:');
    unique.forEach(u => console.log('  ->', u));

    // Also check page content for pfbid or posts
    const html = await page.content();
    const pfbidMatches = Array.from(html.matchAll(/pfbid[0-9a-zA-Z]+/g)).map(m => m[0]);
    console.log('pfbid matches found:', pfbidMatches.length);
    if (pfbidMatches.length > 0) {
      console.log('Sample pfbids:', Array.from(new Set(pfbidMatches)).slice(0, 10));
    }

    // Check for story_fbid
    const fbidMatches = Array.from(html.matchAll(/story_fbid=(\d+)/g)).map(m => m[1]);
    console.log('story_fbid matches found:', fbidMatches.length);
    if (fbidMatches.length > 0) {
      console.log('Sample story_fbids:', Array.from(new Set(fbidMatches)).slice(0, 10));
    }

    // Check for facebook.com/visayanelectriccompany/posts/
    const postsMatches = Array.from(html.matchAll(/visayanelectriccompany\/posts\/([0-9a-zA-Z]+)/g)).map(m => m[0]);
    console.log('visayanelectriccompany/posts matches:', postsMatches.length);
    if (postsMatches.length > 0) {
      console.log('Sample posts matches:', Array.from(new Set(postsMatches)).slice(0, 10));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

test();
