import { Interruption } from '@/types';
import { parseTimeToMinutes, formatDateYMD } from '@/lib/status-utils';

export interface NotificationPreferences {
  enabled: boolean;
  oneHourAdvance: boolean;
  newAdvisories: boolean;
  statusChanges: boolean;
  powerRestored: boolean;
  morningBriefing: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  oneHourAdvance: true,
  newAdvisories: true,
  statusChanges: true,
  powerRestored: true,
  morningBriefing: true,
};

const PREFS_KEY = 'veco_notification_prefs';
const NOTIFIED_EVENTS_KEY = 'veco_notified_events';
const KNOWN_OUTAGE_IDS_KEY = 'veco_known_outage_ids';

/**
 * Check if the current browser environment supports the Web Notifications API.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if running as a standalone PWA on iOS.
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

/**
 * Get current browser notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Load user notification preferences from localStorage.
 */
export function getNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_PREFS;
}

/**
 * Save user notification preferences to localStorage.
 */
export function saveNotificationPrefs(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

/**
 * Sent events history store (with 7-day TTL auto-cleanup).
 */
interface NotifiedRecord {
  [key: string]: number; // key -> timestamp ms
}

function getNotifiedRecords(): NotifiedRecord {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(NOTIFIED_EVENTS_KEY);
    if (raw) {
      const records: NotifiedRecord = JSON.parse(raw);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const filtered: NotifiedRecord = {};
      for (const [key, ts] of Object.entries(records)) {
        if (now - ts < sevenDays) {
          filtered[key] = ts;
        }
      }
      return filtered;
    }
  } catch {}
  return {};
}

export function hasBeenNotified(key: string): boolean {
  const records = getNotifiedRecords();
  return Boolean(records[key]);
}

export function markAsNotified(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getNotifiedRecords();
    records[key] = Date.now();
    localStorage.setItem(NOTIFIED_EVENTS_KEY, JSON.stringify(records));
  } catch {}
}

export function clearNotifiedHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NOTIFIED_EVENTS_KEY);
    localStorage.removeItem(KNOWN_OUTAGE_IDS_KEY);
  } catch {}
}

/**
 * Check if a given interruption directly affects any of the user's pinned locations.
 */
export function isOutageAffectingFavorites(item: Interruption, favorites: string[]): boolean {
  if (!favorites || favorites.length === 0) return false;
  
  return favorites.some(fav => {
    const fLower = fav.trim().toLowerCase();
    if (!fLower) return false;

    // Check if fav is equal to city
    if (item.city && item.city.toLowerCase() === fLower) return true;

    // Check if fav matches any barangay
    if (
      item.barangays &&
      item.barangays.some(
        b => b.toLowerCase() === fLower || b.toLowerCase().includes(fLower) || fLower.includes(b.toLowerCase())
      )
    ) {
      return true;
    }

    // Check if fav matches area string or streets
    if (item.area && item.area.toLowerCase().includes(fLower)) return true;
    if (item.streets && item.streets.toLowerCase().includes(fLower)) return true;

    return false;
  });
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[] | number;
  renotify?: boolean;
}

/**
 * Dispatch a rich local browser / Service Worker notification.
 */
export async function sendLocalNotification(
  title: string,
  options?: ExtendedNotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const defaultOptions: ExtendedNotificationOptions = {
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options,
  };

  try {
    // Try Service Worker registration first (standard for PWAs)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions as NotificationOptions);
        return true;
      }
    }

    // Fallback to standard window Notification
    new Notification(title, defaultOptions as NotificationOptions);
    return true;
  } catch (err) {
    console.warn('Could not dispatch notification:', err);
    return false;
  }
}

/**
 * Send an immediate test notification to verify device sound, banner, and permissions.
 */
export async function sendTestNotification(): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return false;

  return sendLocalNotification('⚡ SUGA Grid Test Alert', {
    body: 'Notification system is working! You will receive power alerts for your pinned areas.',
    tag: 'suga_test_alert',
    renotify: true,
  });
}

/**
 * Evaluates all outages against user favorites and triggers notifications.
 */
export async function evaluateOutageNotifications(
  outages: Interruption[],
  favorites: string[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  if (!favorites || favorites.length === 0) return;

  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;

  const now = new Date();
  const todayStr = formatDateYMD(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Retrieve previously known outage IDs
  let knownIds: (string | number)[] = [];
  try {
    const raw = localStorage.getItem(KNOWN_OUTAGE_IDS_KEY);
    if (raw) knownIds = JSON.parse(raw);
  } catch {}

  const isInitialRun = knownIds.length === 0;

  for (const item of outages) {
    // Strictly filter to user's favorites
    if (!isOutageAffectingFavorites(item, favorites)) {
      continue;
    }

    const itemDate = item.date || todayStr;
    const isToday = itemDate === todayStr;

    // -------------------------------------------------------------
    // 1. 1-Hour Advance Warning (for Today's scheduled outages)
    // -------------------------------------------------------------
    if (prefs.oneHourAdvance && isToday && !item.isPast && item.status !== 'cancelled' && item.status !== 'restored') {
      let startMinutes = parseTimeToMinutes(item.timeStart);
      if (startMinutes === null && item.time) {
        const parts = item.time.split(/[–-]/);
        if (parts.length > 0) startMinutes = parseTimeToMinutes(parts[0]);
      }

      if (startMinutes !== null) {
        const minutesUntil = startMinutes - currentMinutes;
        // Trigger if start is between 1 and 65 minutes away
        if (minutesUntil > 0 && minutesUntil <= 65) {
          const key = `1hr_${item.id}_${todayStr}`;
          if (!hasBeenNotified(key)) {
            const timeDesc = minutesUntil <= 15 ? `${minutesUntil} mins` : `~1 hour`;
            await sendLocalNotification(`⚡ Scheduled Outage in ${timeDesc}: ${item.area}`, {
              body: `Power interruption scheduled today from ${item.time}. Affected: ${item.streets || item.area} (${item.city}).`,
              tag: key,
              data: { id: item.id, date: item.date },
            });
            markAsNotified(key);
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. New Advisory Captured Alert
    // -------------------------------------------------------------
    if (prefs.newAdvisories && !isInitialRun) {
      const isNewId = !knownIds.includes(item.id);
      if (isNewId && !item.isPast) {
        const key = `new_${item.id}`;
        if (!hasBeenNotified(key)) {
          const areaDesc = item.area || (item.barangays && item.barangays.join(', ')) || item.city;
          await sendLocalNotification(`📢 New VECO Outage Advisory: ${areaDesc}`, {
            body: `${item.dateLabel} • ${item.time}. Reason: ${item.reason || 'Network Maintenance'} (${item.city}).`,
            tag: key,
            data: { id: item.id, date: item.date },
          });
          markAsNotified(key);
        }
      }
    }

    // -------------------------------------------------------------
    // 3. Status Change Updates (Cancelled / Delayed / Emergency)
    // -------------------------------------------------------------
    if (prefs.statusChanges && !item.isPast) {
      if (item.status === 'cancelled') {
        const key = `cancelled_${item.id}`;
        if (!hasBeenNotified(key)) {
          await sendLocalNotification(`❌ Outage Cancelled: ${item.area}`, {
            body: `VECO has cancelled the scheduled power interruption for ${item.dateLabel} in ${item.area} (${item.city}).`,
            tag: key,
            data: { id: item.id, date: item.date },
          });
          markAsNotified(key);
        }
      } else if (item.status === 'delayed') {
        const key = `delayed_${item.id}_${todayStr}`;
        if (!hasBeenNotified(key)) {
          await sendLocalNotification(`⏳ Outage Delayed: ${item.area}`, {
            body: `The start of the scheduled interruption in ${item.area} (${item.city}) has been delayed by VECO.`,
            tag: key,
            data: { id: item.id, date: item.date },
          });
          markAsNotified(key);
        }
      }
    }

    // -------------------------------------------------------------
    // 4. Power Restored / Completed Alert
    // -------------------------------------------------------------
    if (prefs.powerRestored && isToday) {
      if (item.status === 'restored' || item.status === 'completed') {
        const key = `restored_${item.id}_${todayStr}`;
        if (!hasBeenNotified(key)) {
          // Check if it was notified previously as 1hr or ongoing so we only notify if relevant
          const wasMonitored = hasBeenNotified(`1hr_${item.id}_${todayStr}`) || hasBeenNotified(`new_${item.id}`);
          if (wasMonitored) {
            await sendLocalNotification(`💡 Power Restored: ${item.area}`, {
              body: `Power interruption in ${item.area} (${item.city}) has concluded. Grid operating normally.`,
              tag: key,
              data: { id: item.id, date: item.date },
            });
            markAsNotified(key);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // 5. Daily Morning Briefing (Between 6:00 AM and 9:30 AM)
  // ---------------------------------------------------------------
  if (prefs.morningBriefing) {
    const hour = now.getHours();
    if (hour >= 6 && hour <= 9) {
      const morningKey = `morning_${todayStr}`;
      if (!hasBeenNotified(morningKey)) {
        const todaysFavOutages = outages.filter(
          o => (o.date === todayStr || (!o.date && !o.isPast)) &&
               !o.isPast &&
               o.status !== 'cancelled' &&
               isOutageAffectingFavorites(o, favorites)
        );

        if (todaysFavOutages.length > 0) {
          const areas = Array.from(new Set(todaysFavOutages.map(o => o.area))).slice(0, 2).join(', ');
          const extra = todaysFavOutages.length > 2 ? ` and ${todaysFavOutages.length - 2} more` : '';
          await sendLocalNotification(`📅 Today's Power Outlook: Metro Cebu`, {
            body: `${todaysFavOutages.length} power interruption(s) scheduled today affecting ${areas}${extra}.`,
            tag: morningKey,
          });
        }
        markAsNotified(morningKey);
      }
    }
  }

  // Update known outage IDs
  const allCurrentIds = outages.map(o => o.id);
  try {
    localStorage.setItem(KNOWN_OUTAGE_IDS_KEY, JSON.stringify(allCurrentIds));
  } catch {}
}
