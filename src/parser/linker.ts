import { insertOrUpdateInterruption, computePrecedenceScore } from '@/db';
import { Interruption } from '@/types';
import { reconcileSingleInterruption } from './superseder';

export async function linkAndPersistInterruption(parsed: Partial<Interruption>): Promise<void> {
  if (!parsed.fbPostId || !parsed.area) return;

  const interruptionData: Omit<Interruption, 'id'> = {
    fbPostId: parsed.fbPostId,
    fbPostUrl: parsed.fbPostUrl || undefined,
    fbImageUrl: parsed.fbImageUrl || (parsed as any).img || undefined,
    date: parsed.date || new Date().toISOString().split('T')[0],
    dateLabel: parsed.dateLabel || 'Upcoming',
    timeStart: parsed.timeStart || '08:00',
    timeEnd: parsed.timeEnd || '17:00',
    time: parsed.time || '8:00 AM – 5:00 PM',
    type: parsed.type || 'scheduled',
    status: parsed.status || 'upcoming',
    statusLabel: parsed.statusLabel || 'Scheduled',
    area: parsed.area || 'Metro Cebu',
    city: parsed.city || 'Cebu City',
    barangays: parsed.barangays || [],
    streets: parsed.streets || '',
    reason: parsed.reason || '',
    fbCaption: parsed.fbCaption || '',
    fbTime: parsed.fbTime || 'Recently',
    isPast: Boolean(parsed.isPast),
    outcome: parsed.outcome || undefined,
    isSuperseded: false,
    precedence: parsed.precedence || computePrecedenceScore(parsed),
  };

  const id = await insertOrUpdateInterruption(interruptionData);
  console.log(`[Linker] Persisted advisory #${id} (${interruptionData.area}) with precedence ${interruptionData.precedence}`);

  // Run area-specific superseder to override earlier broad/weekly plans for matching areas
  const { superseded, trimmed } = await reconcileSingleInterruption(id);
  if (superseded > 0 || trimmed > 0) {
    console.log(`[Linker] Advisory #${id} superseded ${superseded} older schedule(s) and trimmed ${trimmed} partial overlapping schedule(s).`);
  }
}
