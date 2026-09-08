import db, { computePrecedenceScore } from '@/db';

export function formatAreaTitle(barangays: string[], city?: string): string {
  if (!barangays || barangays.length === 0) return city || 'Metro Cebu';
  if (barangays.length === 1) return barangays[0];
  if (barangays.length === 2) return `${barangays[0]} & ${barangays[1]}`;
  if (barangays.length === 3) return `${barangays[0]}, ${barangays[1]} & ${barangays[2]}`;
  return `${barangays.slice(0, 3).join(', ')} +${barangays.length - 3} more`;
}

export interface ReconciliationStats {
  supersededCount: number;
  trimmedCount: number;
  activeCount: number;
}

/**
 * Reconcile a single newly inserted or updated interruption against existing records on the same date.
 */
export async function reconcileSingleInterruption(candidateId: number | string): Promise<{ superseded: number; trimmed: number }> {
  try {
    const candRes = await db.execute({
      sql: 'SELECT * FROM interruptions WHERE id = ?',
      args: [candidateId]
    });
    const candidate: any = candRes.rows[0];
    if (!candidate || candidate.is_superseded === 1) return { superseded: 0, trimmed: 0 };

    const stats = await reconcileAllInterruptions(candidate.date);
    return { superseded: stats.supersededCount, trimmed: stats.trimmedCount };
  } catch (err) {
    console.warn('[Superseder] reconcileSingleInterruption error:', err);
    return { superseded: 0, trimmed: 0 };
  }
}

/**
 * Reconciles all active interruptions in a highly-optimized single-pass in-memory batch.
 * Reduced from 25+ round trips to Turso down to just 1 SELECT and 1 BATCH WRITE (<800ms).
 */
export async function reconcileAllInterruptions(targetDate?: string): Promise<ReconciliationStats> {
  console.log(`[Superseder] Running fast in-memory area reconciliation${targetDate ? ' for ' + targetDate : ''}...`);
  
  // 1. Fetch all active interruptions in ONE single query
  const allRes = await db.execute({
    sql: `
      SELECT id, date, time_start, area_title, barangay_name, city, precedence, type, status, status_label, reason, fb_caption, barangays_json,
             origin_post_id, origin_post_url, latest_post_id, latest_post_url, update_history_json, fb_post_time
      FROM interruptions 
      WHERE is_superseded = 0 ${targetDate ? 'AND date = ?' : ''}
      ORDER BY date ASC, id ASC
    `,
    args: targetDate ? [targetDate] : []
  });

  interface MutableRecord {
    id: number;
    date: string;
    timeStart: string;
    city: string;
    areaTitle: string;
    barangayName: string;
    precedence: number;
    barangays: string[];
    status: string;
    statusLabel: string;
    fbTime: string;
    fbCaption: string;
    originPostId?: string;
    originPostUrl?: string;
    latestPostId?: string;
    latestPostUrl?: string;
    updateHistory: any[];
    isSuperseded: boolean;
    supersededById?: number;
    dirty: boolean;
  }

  const allRecords: MutableRecord[] = (allRes.rows as any[]).map(r => {
    let b: string[] = [];
    try { b = JSON.parse(r.barangays_json || '[]'); } catch {}
    let hist: any[] = [];
    try { hist = JSON.parse(r.update_history_json || '[]'); } catch {}

    const calculatedPrec = computePrecedenceScore(r);
    const brgyName = String(r.barangay_name || (b[0]) || r.area_title);
    return {
      id: Number(r.id),
      date: String(r.date),
      timeStart: String(r.time_start),
      city: String(r.city),
      areaTitle: brgyName,
      barangayName: brgyName,
      precedence: calculatedPrec,
      barangays: b,
      status: String(r.status || 'upcoming'),
      statusLabel: String(r.status_label || 'Scheduled'),
      fbTime: String(r.fb_post_time || ''),
      fbCaption: String(r.fb_caption || ''),
      originPostId: r.origin_post_id ? String(r.origin_post_id) : undefined,
      originPostUrl: r.origin_post_url ? String(r.origin_post_url) : undefined,
      latestPostId: r.latest_post_id ? String(r.latest_post_id) : undefined,
      latestPostUrl: r.latest_post_url ? String(r.latest_post_url) : undefined,
      updateHistory: hist,
      isSuperseded: false,
      dirty: false,
    };
  });

  let totalSuperseded = 0;
  let totalTrimmed = 0;
  let totalDeduplicated = 0;

  // 2. In-memory Deduplication of identical slots
  const slotMap = new Map<string, MutableRecord[]>();
  for (const rec of allRecords) {
    const key = `${rec.date}__${rec.timeStart}__${rec.city}__${rec.areaTitle}`;
    const group = slotMap.get(key) || [];
    group.push(rec);
    slotMap.set(key, group);
  }

  for (const [, group] of slotMap) {
    if (group.length > 1) {
      // Keep the record with the highest ID
      const highest = group.reduce((max, r) => r.id > max.id ? r : max, group[0]);
      for (const rec of group) {
        if (rec.id !== highest.id && !rec.isSuperseded) {
          rec.isSuperseded = true;
          rec.supersededById = highest.id;
          rec.dirty = true;
          totalDeduplicated++;
        }
      }
    }
  }

  // 3. Group remaining active records by date for area-specific superseding
  const dateGroups = new Map<string, MutableRecord[]>();
  for (const rec of allRecords) {
    if (rec.isSuperseded) continue;
    const group = dateGroups.get(rec.date) || [];
    group.push(rec);
    dateGroups.set(rec.date, group);
  }

  for (const [, records] of dateGroups) {
    // Sort descending by precedence, then by ID descending
    records.sort((a, b) => {
      if (b.precedence !== a.precedence) return b.precedence - a.precedence;
      return b.id - a.id;
    });

    for (let i = 0; i < records.length; i++) {
      const top = records[i];
      if (top.isSuperseded || top.barangays.length === 0) continue;

      const topLower = new Set(top.barangays.map(b => b.toLowerCase().trim()));

      for (let j = i + 1; j < records.length; j++) {
        const lower = records[j];
        if (lower.isSuperseded || lower.barangays.length === 0) continue;

        const overlap = lower.barangays.filter(b => topLower.has(b.toLowerCase().trim()));
        if (overlap.length === 0) continue;

        const remaining = lower.barangays.filter(b => !topLower.has(b.toLowerCase().trim()));

        if (remaining.length === 0) {
          lower.isSuperseded = true;
          lower.supersededById = top.id;
          lower.dirty = true;
          totalSuperseded++;
        } else {
          lower.barangays = remaining;
          lower.areaTitle = formatAreaTitle(remaining, lower.city);
          lower.dirty = true;
          totalTrimmed++;
        }
      }
    }
  }

  // 4. Batch all updates in ONE single round trip (or 100-item chunks)
  const batchStatements: { sql: string; args: any[] }[] = [];
  for (const rec of allRecords) {
    if (!rec.dirty) continue;
    if (rec.isSuperseded) {
      batchStatements.push({
        sql: 'UPDATE interruptions SET is_superseded = 1, superseded_by_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [rec.supersededById || null, rec.id]
      });
    } else {
      batchStatements.push({
        sql: 'UPDATE interruptions SET barangays_json = ?, area_title = ?, precedence = ?, latest_post_id = ?, latest_post_url = ?, update_history_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [
          JSON.stringify(rec.barangays),
          rec.areaTitle,
          rec.precedence,
          rec.latestPostId || null,
          rec.latestPostUrl || null,
          JSON.stringify(rec.updateHistory || []),
          rec.id
        ]
      });
    }
  }

  if (batchStatements.length > 0) {
    console.log(`[Superseder] Writing ${batchStatements.length} reconciled updates in batches...`);
    for (let i = 0; i < batchStatements.length; i += 100) {
      await db.batch(batchStatements.slice(i, i + 100));
    }
  }

  const activeCount = allRecords.filter(r => !r.isSuperseded).length;
  console.log(`[Superseder] Reconciliation complete. Active: ${activeCount}, Superseded: ${totalSuperseded + totalDeduplicated}, Trimmed: ${totalTrimmed}`);

  return { 
    supersededCount: totalSuperseded + totalDeduplicated, 
    trimmedCount: totalTrimmed, 
    activeCount 
  };
}
