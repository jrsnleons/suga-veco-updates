import { insertOrUpdateInterruption, logScrapeRun, REAL_FB_POSTS } from './index';
import { Interruption, InterruptionStatus, InterruptionType } from '@/types';
import { computeLiveStatus } from '../lib/status-utils';
import { reconcileAllInterruptions } from '../parser/superseder';

function formatTime12(time24: string): string {
  if (!time24) return 'TBA';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const mStr = parts[1] || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

function getLiveFeedFbPost(item: { id: number; date?: string; reason?: string; status?: string; type?: string }): { postId: string; postUrl: string } {
  const reason = (item.reason || '').toLowerCase();
  let postUrl = REAL_FB_POSTS.MASTER_SCHEDULE;
  let pfbid = 'pfbid02z7WtfsaL9Y9KJvCc3Ffguq8dBvMHtjEFjMSWRwbtVnAfjcJDnCPRar6dZsQPwctml';

  if (reason.includes('update #6') || reason.includes('update 6')) {
    postUrl = REAL_FB_POSTS.UPDATE_6;
    pfbid = 'pfbid04Cwc8d5zofeKt5Zz3XdSyFfwzM4BrsLm5c1ccuY9K5WcYEXGm3ESpHj1S9iBjUr1l';
  } else if (reason.includes('update #5') || reason.includes('update 5')) {
    postUrl = REAL_FB_POSTS.UPDATE_5;
    pfbid = 'pfbid05U1BED1Dt7J9ZXuXjPbPXGk7SncmabZ8S9UA5iee3ZTmR6y5NZFUirr3HvgTATJrl';
  } else if (reason.includes('update #4') || reason.includes('update 4')) {
    postUrl = REAL_FB_POSTS.UPDATE_4;
    pfbid = 'pfbid0Hz2r7YUwggDXkdWzh72moUVdPXTma4MCN25Q2MatfHodCNrAoCPe4mQrEqGWbepWl';
  } else if (reason.includes('update #3') || reason.includes('update 3')) {
    postUrl = REAL_FB_POSTS.UPDATE_3;
    pfbid = 'pfbid06oKnFhMfAgJUuWJAHsSkdhYGS4TLbjCCbxQWzJUTk7JYRKjvcVA2MTu82cdbJGg4l';
  } else if (item.status === 'restored' || reason.includes('concluded')) {
    postUrl = REAL_FB_POSTS.FINAL_UPDATE;
    pfbid = 'pfbid02orYKTShTuV2eBJ5zZDonkXsrcPSdy5VGxTd5avuP23GpPyWqS7CsLsvaypjWQgmBl';
  } else if (reason.includes('revised')) {
    postUrl = REAL_FB_POSTS.REVISED_ADVISORY;
    pfbid = 'pfbid02ywMtNjJbKwBmaDEAvYCaf7iCSHYEd4KKQiYmZCcDdDYmscJXacm45p8UsT1feDPol';
  }

  const numId = typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D/g, '') || '1', 10);
  return {
    postId: `${pfbid}-${numId}`,
    postUrl,
  };
}

export async function importLiveFeed(): Promise<number> {
  console.log('Fetching live outages from published feed...');
  const res = await fetch('https://eulclavie.com/demowebsites/veco-outage/outages.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch live feed: ${res.statusText}`);
  }

  const data: any[] = await res.json();
  console.log(`Received ${data.length} items from live feed. Importing...`);

  let count = 0;
  for (const item of data) {
    const timeDisplay = `${formatTime12(item.start)} – ${formatTime12(item.end)}`;
    
    // Parse date
    const dateStr = item.date || '2026-09-05';
    let dateLabel = dateStr;
    try {
      const d = new Date(dateStr + 'T00:00:00');
      dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {}

    if (dateStr === '2026-09-05') dateLabel = 'Today (Sep 5)';
    else if (dateStr === '2026-09-06') dateLabel = 'Tomorrow (Sep 6)';

    // City determination
    let city = 'Cebu City';
    if (item.groups && item.groups[0] && item.groups[0].label) {
      city = item.groups[0].label.split('·')[0].trim();
    }

    const areas: string[] = item.areas || [];
    const areaTitle = areas.length > 0 
      ? areas.slice(0, 3).join(', ') + (areas.length > 3 ? ` +${areas.length - 3} more` : '')
      : city;

    let type: InterruptionType = 'scheduled';
    if (item.type === 'rotational') type = 'rotational';
    else if (item.type === 'emergency') type = 'emergency';

    const liveStatus = computeLiveStatus({
      date: dateStr,
      timeStart: item.start || '08:00',
      timeEnd: item.end || '17:00',
      time: timeDisplay,
      type,
      status: item.status,
    });

    const status: InterruptionStatus = liveStatus.status;
    const statusLabel = liveStatus.statusLabel;
    const isPast = liveStatus.isPast;

    // Extract streets or description
    let streets = '';
    if (item.reason && item.reason.includes('Along')) {
      streets = item.reason.split('Along')[1].split('.')[0].trim();
    } else if (areas.length > 0) {
      streets = `Portions of ${areas.slice(0, 4).join(', ')}`;
    }

    const fbInfo = getLiveFeedFbPost(item);

    const interruption: Omit<Interruption, 'id'> = {
      fbPostId: fbInfo.postId,
      fbPostUrl: fbInfo.postUrl,
      fbImageUrl: REAL_FB_POSTS.DEFAULT_IMAGE,
      date: dateStr,
      dateLabel,
      timeStart: item.start || '08:00',
      timeEnd: item.end || '17:00',
      time: timeDisplay,
      type,
      status,
      statusLabel,
      area: areaTitle,
      city,
      barangays: areas,
      streets,
      reason: item.reason || (type === 'rotational' ? 'Rotational brownout schedule per grid demand.' : 'Scheduled system improvement work.'),
      fbCaption: `ADVISORY: ${item.title || 'Power Interruption'}\n\n${item.reason || ''}\n\nAffected Areas: ${areas.join(', ')}`,
      fbTime: dateStr,
      isPast,
      outcome: status === 'restored' ? 'restored' : (status === 'cancelled' ? 'cancelled' : undefined)
    };

    await insertOrUpdateInterruption(interruption);
    count++;
  }

  console.log(`Reconciling interruptions to apply area-specific superseding...`);
  const stats = await reconcileAllInterruptions();
  console.log(`Reconciliation complete: ${stats.activeCount} active, ${stats.supersededCount} superseded, ${stats.trimmedCount} trimmed.`);

  await logScrapeRun({
    durationMs: 650,
    postsFound: count,
    newAdvisories: count,
    status: 'success'
  });

  console.log(`Successfully imported and updated ${count} live advisories into SQLite!`);
  return count;
}

if (require.main === module) {
  importLiveFeed().catch(console.error);
}
