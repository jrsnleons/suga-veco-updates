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
 * Reconcile a single newly inserted or updated interruption against existing records.
 */
export async function reconcileSingleInterruption(candidateId: number | string): Promise<{ superseded: number; trimmed: number }> {
  const candRes = await db.execute({
    sql: 'SELECT * FROM interruptions WHERE id = ?',
    args: [candidateId]
  });
  const candidate: any = candRes.rows[0];
  if (!candidate || candidate.is_superseded === 1) return { superseded: 0, trimmed: 0 };

  let candBrgys: string[] = [];
  try { candBrgys = JSON.parse(candidate.barangays_json || '[]'); } catch {}
  if (candBrgys.length === 0) return { superseded: 0, trimmed: 0 };

  const candPrec = computePrecedenceScore(candidate);

  const rivalsRes = await db.execute({
    sql: `
      SELECT * FROM interruptions 
      WHERE date = ? AND id != ? AND is_superseded = 0
    `,
    args: [candidate.date, candidate.id]
  });
  const rivals: any[] = rivalsRes.rows;

  let superseded = 0;
  let trimmed = 0;

  for (const rival of rivals) {
    const rivalPrec = computePrecedenceScore(rival);

    // Only supersede if candidate has strictly higher precedence, or same precedence and candidate is newer
    if (candPrec < rivalPrec) continue;
    if (candPrec === rivalPrec && candidate.id <= rival.id) continue;

    let rivalBrgys: string[] = [];
    try { rivalBrgys = JSON.parse(rival.barangays_json || '[]'); } catch {}
    if (rivalBrgys.length === 0) continue;

    const candLower = new Set(candBrgys.map((b: string) => b.toLowerCase().trim()));
    const overlap = rivalBrgys.filter((b: string) => candLower.has(b.toLowerCase().trim()));

    if (overlap.length === 0) continue;

    const remaining = rivalBrgys.filter((b: string) => !candLower.has(b.toLowerCase().trim()));

    if (remaining.length === 0) {
      await db.execute({
        sql: `
          UPDATE interruptions 
          SET is_superseded = 1, superseded_by_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [candidate.id, rival.id]
      });
      superseded++;
      console.log(`[Superseder] Interruption #${rival.id} (${rival.area_title}) fully superseded by #${candidate.id}`);
    } else {
      const newTitle = formatAreaTitle(remaining, rival.city);
      await db.execute({
        sql: `
          UPDATE interruptions 
          SET barangays_json = ?, area_title = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [JSON.stringify(remaining), newTitle, rival.id]
      });
      trimmed++;
      console.log(`[Superseder] Trimmed ${overlap.length} area(s) from #${rival.id}. Retaining ${remaining.length} untouched on schedule: ${newTitle}`);
    }
  }

  return { superseded, trimmed };
}

/**
 * Reconciles the full interruptions table (or for a specific target date).
 */
export async function reconcileAllInterruptions(targetDate?: string): Promise<ReconciliationStats> {
  console.log(`[Superseder] Running area-specific reconciliation${targetDate ? ' for ' + targetDate : ''}...`);
  
  // 1. Calculate & persist accurate precedence score for all records
  const allRes = await db.execute({
    sql: `
      SELECT id, type, status, reason, fb_caption, barangays_json FROM interruptions
      ${targetDate ? 'WHERE date = ?' : ''}
    `,
    args: targetDate ? [targetDate] : []
  });

  for (const r of allRes.rows as any[]) {
    const prec = computePrecedenceScore(r);
    await db.execute({
      sql: 'UPDATE interruptions SET precedence = ? WHERE id = ?',
      args: [prec, r.id]
    });
  }

  // 2. Deduplicate identical slots if any (same date, same time_start, same city & area_title)
  const dupRes = await db.execute({
    sql: `
      SELECT date, time_start, area_title, city, COUNT(*) as count, MAX(id) as keep_id, GROUP_CONCAT(id) as ids
      FROM interruptions
      ${targetDate ? 'WHERE date = ?' : ''}
      GROUP BY date, time_start, area_title, city
      HAVING count > 1
    `,
    args: targetDate ? [targetDate] : []
  });

  let dupRemoved = 0;
  for (const d of dupRes.rows as any[]) {
    const allIds: number[] = String(d.ids).split(',').map(Number);
    const dropIds = allIds.filter(id => id !== Number(d.keep_id));
    for (const dropId of dropIds) {
      await db.execute({
        sql: 'UPDATE interruptions SET is_superseded = 1, superseded_by_id = ? WHERE id = ?',
        args: [d.keep_id, dropId]
      });
      dupRemoved++;
    }
  }
  if (dupRemoved > 0) {
    console.log(`[Superseder] Cleaned ${dupRemoved} duplicate slot(s).`);
  }

  // 3. Fetch all active dates
  const dateRes = await db.execute({
    sql: `
      SELECT DISTINCT date FROM interruptions 
      WHERE is_superseded = 0 ${targetDate ? 'AND date = ?' : ''}
      ORDER BY date ASC
    `,
    args: targetDate ? [targetDate] : []
  });

  let totalSuperseded = 0;
  let totalTrimmed = 0;

  for (const dateRow of dateRes.rows as any[]) {
    const date = dateRow.date;
    const recordsRes = await db.execute({
      sql: `
        SELECT id, precedence, type, status, reason, fb_caption, barangays_json, area_title, city
        FROM interruptions
        WHERE date = ? AND is_superseded = 0
        ORDER BY precedence DESC, id DESC
      `,
      args: [date]
    });
    const records = recordsRes.rows as any[];

    for (let i = 0; i < records.length; i++) {
      const top = records[i];
      const checkTopRes = await db.execute({
        sql: 'SELECT is_superseded FROM interruptions WHERE id = ?',
        args: [top.id]
      });
      const checkTop: any = checkTopRes.rows[0];
      if (checkTop?.is_superseded) continue;

      let topBrgys: string[] = [];
      try { topBrgys = JSON.parse(top.barangays_json || '[]'); } catch {}
      if (topBrgys.length === 0) continue;

      const topLower = new Set(topBrgys.map((b: string) => b.toLowerCase().trim()));

      for (let j = i + 1; j < records.length; j++) {
        const lower = records[j];
        const checkLowerRes = await db.execute({
          sql: 'SELECT is_superseded, barangays_json FROM interruptions WHERE id = ?',
          args: [lower.id]
        });
        const checkLower: any = checkLowerRes.rows[0];
        if (checkLower?.is_superseded) continue;

        let lowerBrgys: string[] = [];
        try { lowerBrgys = JSON.parse(checkLower.barangays_json || '[]'); } catch {}
        if (lowerBrgys.length === 0) continue;

        const overlap = lowerBrgys.filter((b: string) => topLower.has(b.toLowerCase().trim()));
        if (overlap.length === 0) continue;

        const remaining = lowerBrgys.filter((b: string) => !topLower.has(b.toLowerCase().trim()));

        if (remaining.length === 0) {
          await db.execute({
            sql: `
              UPDATE interruptions 
              SET is_superseded = 1, superseded_by_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [top.id, lower.id]
          });
          totalSuperseded++;
        } else {
          const newTitle = formatAreaTitle(remaining, lower.city);
          await db.execute({
            sql: `
              UPDATE interruptions 
              SET barangays_json = ?, area_title = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [JSON.stringify(remaining), newTitle, lower.id]
          });
          totalTrimmed++;
        }
      }
    }
  }

  const countRes = await db.execute('SELECT COUNT(*) as c FROM interruptions WHERE is_superseded = 0');
  const activeCount: number = Number(countRes.rows[0]?.c || 0);
  console.log(`[Superseder] Reconciliation complete. Active: ${activeCount}, Total Superseded: ${totalSuperseded}, Trimmed: ${totalTrimmed}`);

  return { supersededCount: totalSuperseded, trimmedCount: totalTrimmed, activeCount };
}
