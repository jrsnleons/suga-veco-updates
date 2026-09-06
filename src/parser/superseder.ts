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

  const precStatements = (allRes.rows as any[]).map(r => ({
    sql: 'UPDATE interruptions SET precedence = ? WHERE id = ?',
    args: [computePrecedenceScore(r), r.id]
  }));
  for (let i = 0; i < precStatements.length; i += 50) {
    await db.batch(precStatements.slice(i, i + 50), 'write');
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

  const dupStatements: { sql: string; args: any[] }[] = [];
  let dupRemoved = 0;
  for (const d of dupRes.rows as any[]) {
    const allIds: number[] = String(d.ids).split(',').map(Number);
    const dropIds = allIds.filter(id => id !== Number(d.keep_id));
    for (const dropId of dropIds) {
      dupStatements.push({
        sql: 'UPDATE interruptions SET is_superseded = 1, superseded_by_id = ? WHERE id = ?',
        args: [d.keep_id, dropId]
      });
      dupRemoved++;
    }
  }
  for (let i = 0; i < dupStatements.length; i += 50) {
    await db.batch(dupStatements.slice(i, i + 50), 'write');
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

    interface MutableRecord {
      id: number;
      city: string;
      barangays: string[];
      isSuperseded: boolean;
      supersededById?: number;
      areaTitle: string;
      dirty: boolean;
    }

    const mutableRecords: MutableRecord[] = (recordsRes.rows as any[]).map(r => {
      let b: string[] = [];
      try { b = JSON.parse(r.barangays_json || '[]'); } catch {}
      return {
        id: Number(r.id),
        city: r.city,
        barangays: b,
        isSuperseded: false,
        areaTitle: r.area_title,
        dirty: false,
      };
    });

    for (let i = 0; i < mutableRecords.length; i++) {
      const top = mutableRecords[i];
      if (top.isSuperseded || top.barangays.length === 0) continue;

      const topLower = new Set(top.barangays.map(b => b.toLowerCase().trim()));

      for (let j = i + 1; j < mutableRecords.length; j++) {
        const lower = mutableRecords[j];
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

    const batchStatements: { sql: string; args: any[] }[] = [];
    for (const rec of mutableRecords) {
      if (!rec.dirty) continue;
      if (rec.isSuperseded) {
        batchStatements.push({
          sql: 'UPDATE interruptions SET is_superseded = 1, superseded_by_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [rec.supersededById, rec.id]
        });
      } else {
        batchStatements.push({
          sql: 'UPDATE interruptions SET barangays_json = ?, area_title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [JSON.stringify(rec.barangays), rec.areaTitle, rec.id]
        });
      }
    }

    if (batchStatements.length > 0) {
      await db.batch(batchStatements, 'write');
    }
  }

  const countRes = await db.execute('SELECT COUNT(*) as c FROM interruptions WHERE is_superseded = 0');
  const activeCount: number = Number(countRes.rows[0]?.c || 0);
  console.log(`[Superseder] Reconciliation complete. Active: ${activeCount}, Total Superseded: ${totalSuperseded}, Trimmed: ${totalTrimmed}`);

  return { supersededCount: totalSuperseded, trimmedCount: totalTrimmed, activeCount };
}
