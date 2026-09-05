import { Interruption } from '@/types';

const STORAGE_KEY = 'suga_cached_outages';

export interface CachedOutagesPayload {
  data: Interruption[];
  lastSynced: string | null;
  cachedAt: number;
}

/**
 * Loads cached outages synchronously from localStorage for 0ms initial page hydration.
 */
export function loadCachedOutages(): CachedOutagesPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      return {
        data: parsed.data,
        lastSynced: parsed.lastSynced || null,
        cachedAt: parsed.cachedAt || Date.now(),
      };
    }
  } catch (err) {
    console.warn('[OfflineStorage] Could not parse cached outages:', err);
  }
  return null;
}

/**
 * Persists the latest retrieved outages to localStorage.
 */
export function saveCachedOutages(data: Interruption[], lastSynced?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedOutagesPayload = {
      data,
      lastSynced: lastSynced || null,
      cachedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[OfflineStorage] Could not persist outages:', err);
  }
}

/**
 * Formats a timestamp into a human-friendly "Cached at 2:30 PM" string.
 */
export function formatCachedTime(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    return `Cached ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return 'Cached offline';
  }
}
