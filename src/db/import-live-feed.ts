import { db, initDbSchema, computePrecedenceScore, logScrapeRun, REAL_FB_POSTS } from './index';
import { Interruption, InterruptionStatus, InterruptionType } from '@/types';
import { computeLiveStatus, computeDateLabel, formatDateYMD } from '../lib/status-utils';
import { getCanonicalCityForBarangay } from '../lib/geo-data';
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
  const startTime = Date.now();
  await initDbSchema();
  console.log('Fetching live outages from published feed...');
  const res = await fetch('https://eulclavie.com/demowebsites/veco-outage/outages.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch live feed: ${res.statusText}`);
  }

  const data: any[] = await res.json();
  console.log(`Received ${data.length} items from live feed. Preparing batch statements...`);

  const statements: { sql: string; args: any[] }[] = [];

  for (const item of data) {
    const timeDisplay = `${formatTime12(item.start)} – ${formatTime12(item.end)}`;
    
    const todayManila = formatDateYMD();
    const dateStr = item.date || todayManila;
    const dateLabel = computeDateLabel(dateStr);

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
    const targetAreas = areas.length > 0 ? areas : [areaTitle];

    for (const brgy of targetAreas) {
      const otherBarangays = targetAreas.filter(b => b !== brgy);
      const uniqueFbPostId = targetAreas.length > 1 ? `${fbInfo.postId}#${brgy}` : fbInfo.postId;

      // Determine the specific canonical city for this barangay
      const matchingGroup = item.groups?.find((g: any) => (g.areas || []).some((a: string) => a.toLowerCase().trim() === brgy.toLowerCase().trim()));
      const groupCity = matchingGroup?.label ? matchingGroup.label.split('·')[0].trim() : undefined;
      const brgyCity = getCanonicalCityForBarangay(brgy, groupCity || city);

      const interruption: Omit<Interruption, 'id'> = {
        fbPostId: uniqueFbPostId,
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
        area: brgy,
        barangay: brgy,
        city: brgyCity,
        barangays: [brgy],
        streets,
        reason: item.reason || (type === 'rotational' ? 'Rotational brownout schedule per grid demand.' : 'Scheduled system improvement work.'),
        fbCaption: `ADVISORY: ${item.title || 'Power Interruption'}\n\n${item.reason || ''}\n\nAffected Area: ${brgy}`,
        fbTime: dateStr,
        isPast,
        outcome: status === 'restored' ? 'restored' : (status === 'cancelled' ? 'cancelled' : undefined),
        originPostId: fbInfo.postId,
        originPostUrl: fbInfo.postUrl,
        latestPostId: fbInfo.postId,
        latestPostUrl: fbInfo.postUrl,
        otherAffectedBarangays: otherBarangays,
      };

      const precedence = computePrecedenceScore(interruption);

      statements.push({
        sql: `
          INSERT INTO interruptions (
            fb_post_id, fb_post_url, fb_image_url, date, date_label, time_start, time_end, time_display,
            type, status, status_label, area_title, city, barangays_json, streets,
            reason, fb_caption, fb_post_time, is_past, outcome, is_superseded, superseded_by_id, precedence,
            barangay_name, origin_post_id, origin_post_url, latest_post_id, latest_post_url,
            update_history_json, other_barangays_json
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?
          )
          ON CONFLICT(fb_post_id, date, time_start) DO UPDATE SET
            fb_post_url = COALESCE(excluded.fb_post_url, interruptions.fb_post_url),
            status = excluded.status,
            status_label = excluded.status_label,
            outcome = excluded.outcome,
            reason = excluded.reason,
            area_title = excluded.area_title,
            barangay_name = excluded.barangay_name,
            city = excluded.city,
            barangays_json = excluded.barangays_json,
            streets = excluded.streets,
            fb_caption = excluded.fb_caption,
            fb_image_url = excluded.fb_image_url,
            is_past = excluded.is_past,
            is_superseded = excluded.is_superseded,
            superseded_by_id = excluded.superseded_by_id,
            precedence = excluded.precedence,
            origin_post_id = COALESCE(interruptions.origin_post_id, excluded.origin_post_id),
            origin_post_url = COALESCE(interruptions.origin_post_url, excluded.origin_post_url),
            latest_post_id = excluded.latest_post_id,
            latest_post_url = excluded.latest_post_url,
            update_history_json = excluded.update_history_json,
            other_barangays_json = excluded.other_barangays_json,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [
          interruption.fbPostId,
          interruption.fbPostUrl || null,
          interruption.fbImageUrl || null,
          interruption.date,
          interruption.dateLabel,
          interruption.timeStart,
          interruption.timeEnd,
          interruption.time,
          interruption.type,
          interruption.status,
          interruption.statusLabel,
          interruption.area,
          interruption.city,
          JSON.stringify(interruption.barangays),
          interruption.streets || null,
          interruption.reason || null,
          interruption.fbCaption || null,
          interruption.fbTime || null,
          interruption.isPast ? 1 : 0,
          interruption.outcome || null,
          interruption.isSuperseded ? 1 : 0,
          interruption.supersededById || null,
          precedence,
          brgy,
          fbInfo.postId,
          fbInfo.postUrl || null,
          fbInfo.postId,
          fbInfo.postUrl || null,
          JSON.stringify([]),
          JSON.stringify(otherBarangays),
        ]
      });
    }
  }

  console.log(`Executing batch writes for ${statements.length} items...`);
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    await db.batch(statements.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Reconciling interruptions to apply area-specific superseding...`);
  const stats = await reconcileAllInterruptions();
  console.log(`Reconciliation complete: ${stats.activeCount} active, ${stats.supersededCount} superseded, ${stats.trimmedCount} trimmed.`);

  const durationMs = Date.now() - startTime;
  await logScrapeRun({
    durationMs,
    postsFound: statements.length,
    newAdvisories: statements.length,
    status: 'success'
  });

  console.log(`Successfully imported and updated ${statements.length} live advisories into SQLite/Turso in ${durationMs}ms!`);
  return statements.length;
}


