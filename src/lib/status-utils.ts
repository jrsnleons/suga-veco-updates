import { Interruption, InterruptionStatus } from '@/types';

/**
 * Parses time strings into minutes from midnight (0 - 1439).
 * Supports:
 * - 24-hour strings: "08:00", "13:30", "01:15"
 * - 12-hour strings: "1:45 PM", "11:00 AM", "12:30 PM", "8:00 AM"
 * - substrings inside ranges: "11:00 AM – 1:30 PM"
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // Try 12-hour format: e.g. "1:45 PM" or "11:00 AM"
  const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // Try 24-hour format: e.g. "13:45", "09:00", "8:00"
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const m = parseInt(m24[2], 10);
    return h * 60 + m;
  }

  // General fallback: match first time pattern in string
  const general = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (general) {
    let h = parseInt(general[1], 10);
    const m = parseInt(general[2], 10);
    const ampm = general[3] ? general[3].toUpperCase() : null;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  return null;
}

export interface LiveStatusResult {
  status: InterruptionStatus;
  statusLabel: string;
  isPast: boolean;
  isLive: boolean;
}

const phtDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });

/**
 * Format a Date to YYYY-MM-DD strictly in Philippine Standard Time (Asia/Manila)
 */
export function formatDateYMD(date: Date = new Date()): string {
  return phtDateFormatter.format(date);
}

/**
 * Computes dynamic live status based on the current clock time.
 * 
 * Rules:
 * - Cancelled stays 'cancelled' (Cancelled)
 * - Restored stays 'restored' (Restored)
 * - Date < Today -> 'completed' (Restored, isPast = true)
 * - Date > Today -> 'upcoming' (Scheduled, isPast = false)
 * - Date === Today:
 *   - If current time < start time: 'upcoming' (Scheduled) / 'delayed' (Delayed Start)
 *   - If start time <= current time <= end time: 'ongoing' (In Progress / Active Outage)
 *   - If current time > end time: 'completed' (Restored, isPast = true)
 */
export function computeLiveStatus(
  item: {
    date: string;
    timeStart?: string;
    timeEnd?: string;
    time?: string;
    type?: string;
    status?: string;
    statusLabel?: string;
    isPast?: boolean;
  },
  now: Date = new Date()
): LiveStatusResult {
  // If explicitly cancelled
  if (item.status === 'cancelled') {
    return {
      status: 'cancelled',
      statusLabel: 'Cancelled',
      isPast: Boolean(item.isPast),
      isLive: false,
    };
  }

  // If explicitly restored
  if (item.status === 'restored') {
    return {
      status: 'restored',
      statusLabel: 'Restored',
      isPast: true,
      isLive: false,
    };
  }

  const todayStr = formatDateYMD(now);
  const itemDate = item.date || todayStr;

  // Past dates
  if (itemDate < todayStr) {
    return {
      status: 'completed',
      statusLabel: 'Restored',
      isPast: true,
      isLive: false,
    };
  }

  // Future dates
  if (itemDate > todayStr) {
    return {
      status: 'upcoming',
      statusLabel: 'Scheduled',
      isPast: false,
      isLive: false,
    };
  }

  // Today (itemDate === todayStr)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Extract start and end minutes
  let startMinutes = parseTimeToMinutes(item.timeStart);
  let endMinutes = parseTimeToMinutes(item.timeEnd);

  // If timeStart or timeEnd weren't parseable, try parsing from display time (e.g. "11:00 AM – 1:30 PM")
  if ((startMinutes === null || endMinutes === null) && item.time) {
    const parts = item.time.split(/[–-]/);
    if (parts.length >= 2) {
      if (startMinutes === null) startMinutes = parseTimeToMinutes(parts[0]);
      if (endMinutes === null) endMinutes = parseTimeToMinutes(parts[1]);
    }
  }

  // Default times if still unknown
  if (startMinutes === null) startMinutes = 8 * 60; // 8:00 AM default
  if (endMinutes === null) endMinutes = 17 * 60;   // 5:00 PM default

  // Handle overnight windows (e.g. 23:00 to 03:00)
  const isOvernight = endMinutes < startMinutes;

  let isCurrentlyActive = false;
  let isHasEnded = false;
  let isUpcoming = false;

  if (isOvernight) {
    isCurrentlyActive = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    isHasEnded = currentMinutes > endMinutes && currentMinutes < startMinutes;
    isUpcoming = false;
  } else {
    if (currentMinutes < startMinutes) {
      isUpcoming = true;
    } else if (currentMinutes > endMinutes) {
      isHasEnded = true;
    } else {
      isCurrentlyActive = true;
    }
  }

  // 1. If it has already ended today
  if (isHasEnded) {
    return {
      status: 'completed',
      statusLabel: 'Restored',
      isPast: true,
      isLive: false,
    };
  }

  // 2. If it is scheduled for later today
  if (isUpcoming) {
    if (item.type === 'delayed' || item.status === 'delayed') {
      return {
        status: 'delayed',
        statusLabel: 'Delayed Start',
        isPast: false,
        isLive: false,
      };
    }
    return {
      status: 'upcoming',
      statusLabel: 'Scheduled',
      isPast: false,
      isLive: false,
    };
  }

  // 3. If it is currently active right now
  if (isCurrentlyActive) {
    const isEmergency = item.type === 'emergency';
    return {
      status: 'ongoing',
      statusLabel: isEmergency ? 'Active Outage' : 'In Progress',
      isPast: false,
      isLive: true,
    };
  }

  // Fallback
  return {
    status: 'upcoming',
    statusLabel: 'Scheduled',
    isPast: false,
    isLive: false,
  };
}

/**
 * Helper to enrich an interruption with dynamic live status.
 */
export function enrichWithLiveStatus(item: Interruption, now: Date = new Date()): Interruption {
  const live = computeLiveStatus(item, now);
  return {
    ...item,
    status: live.status,
    statusLabel: live.statusLabel,
    isPast: live.isPast,
  };
}
