import { Interruption } from '@/types';

const STORAGE_KEY = 'suga_cached_outages';
const IDB_DB_NAME = 'suga_veco_offline';
const IDB_STORE_NAME = 'outages_store';
const IDB_KEY = 'latest_outages';

export interface CachedOutagesPayload {
  data: Interruption[];
  lastSynced: string | null;
  cachedAt: number;
}

// -------------------------------------------------------------
// IndexedDB Helpers (No 5MB Quota Limits)
// -------------------------------------------------------------

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    try {
      const request = window.indexedDB.open(IDB_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDb(payload: CachedOutagesPayload): Promise<void> {
  try {
    const db = await openIndexedDb();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put(payload, IDB_KEY);
  } catch {
    // Gracefully ignore IndexedDB write errors
  }
}

export async function loadCachedOutagesFromIndexedDb(): Promise<CachedOutagesPayload | null> {
  try {
    const db = await openIndexedDb();
    if (!db) return null;
    return new Promise(resolve => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.get(IDB_KEY);
      request.onsuccess = () => {
        const result = request.result;
        if (result && Array.isArray(result.data)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// LocalStorage Helpers (Instant 0ms Synchronous Mount Hydration)
// -------------------------------------------------------------

/**
 * Strips non-essential heavyweight fields for quota-safe localStorage caching.
 */
function createSlimOutage(item: Interruption): Interruption {
  return {
    ...item,
    fbCaption: item.fbCaption ? item.fbCaption.slice(0, 120) : '',
    otherAffectedBarangays: undefined,
  };
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
 * Persists outages to both IndexedDB (full dataset) and localStorage (quota-safe active set).
 */
export function saveCachedOutages(data: Interruption[], lastSynced?: string | null): void {
  if (typeof window === 'undefined') return;

  const payload: CachedOutagesPayload = {
    data,
    lastSynced: lastSynced || null,
    cachedAt: Date.now(),
  };

  // 1. Asynchronously persist complete dataset to IndexedDB (safe for 100MB+)
  saveToIndexedDb(payload).catch(() => {});

  // 2. Synchronously save a quota-safe subset to localStorage (< 300KB)
  try {
    // Filter to active, upcoming, and recent items for instant start
    const recentOutages = data
      .filter(item => !item.isPast || item.status === 'ongoing' || item.status === 'upcoming')
      .map(createSlimOutage);

    const safeData = recentOutages.length > 0 ? recentOutages : data.slice(0, 300).map(createSlimOutage);

    const slimPayload: CachedOutagesPayload = {
      data: safeData,
      lastSynced: lastSynced || null,
      cachedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(slimPayload));
  } catch (err: any) {
    // If QuotaExceededError occurs, fall back to minimal active set or clear stale keys
    try {
      const minimalData = data.slice(0, 100).map(createSlimOutage);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: minimalData,
        lastSynced: lastSynced || null,
        cachedAt: Date.now(),
      }));
    } catch {
      // Storage completely full or blocked; IndexedDB still holds full offline copy
      console.warn('[OfflineStorage] Storage quota reached, using IndexedDB offline persistence.');
    }
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
