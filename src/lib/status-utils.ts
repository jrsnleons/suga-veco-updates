import { Interruption, InterruptionStatus } from '@/types';

/**
 * Parses time strings into minutes from midnight (0 - 1439).
 * Supports:
 * - 24-hour strings: "08:00", "13:30", "01:15", "0800H", "1700H"
 * - 12-hour strings: "1:45 PM", "11:00 AM", "12:30 PM", "8:00 AM", "12:00 NN", "12 NN", "12:00 MN", "12 MN"
 * - Substrings inside ranges: "11:00 AM – 1:30 PM", "8:00 AM to 5:00 PM"
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // Special noon & midnight aliases
  if (/12(?::00)?\s*(?:NN|NOON)/i.test(trimmed)) {
    return 12 * 60; // 12:00 PM (720 mins)
  }
  if (/12(?::00)?\s*(?:MN|MIDNIGHT)/i.test(trimmed)) {
    return 0; // 12:00 AM (0 mins)
  }

  // 12-hour format: e.g. "1:45 PM", "11:00 AM", "8am", "5pm", "8:00AM"
  const m12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // 24-hour standard format: e.g. "13:45", "09:00", "8:00"
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const m = parseInt(m24[2], 10);
    return h * 60 + m;
  }

  // Military notation format: e.g. "0800H", "1700H", "0830h"
  const mMilitary = trimmed.match(/^(\d{2})(\d{2})H?$/i);
  if (mMilitary) {
    const h = parseInt(mMilitary[1], 10);
    const m = parseInt(mMilitary[2], 10);
    return h * 60 + m;
  }

  // General fallback: match first time pattern in string
  const general = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|NN|MN)?/i);
  if (general) {
    let h = parseInt(general[1], 10);
    const m = general[2] ? parseInt(general[2], 10) : 0;
    const ampm = general[3] ? general[3].toUpperCase() : null;
    if (ampm === 'NN' || ampm === 'NOON') return 12 * 60;
    if (ampm === 'MN' || ampm === 'MIDNIGHT') return 0;
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
 * Returns the current minutes from midnight (0 - 1439) in Philippine Standard Time (Asia/Manila).
 */
export function getPHTMinutes(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let h = 0;
  let m = 0;
  for (const part of parts) {
    if (part.type === 'hour') h = parseInt(part.value, 10);
    if (part.type === 'minute') m = parseInt(part.value, 10);
  }
  if (h === 24) h = 0;
  return h * 60 + m;
}

/**
 * Dynamically computes a human-friendly relative date label based on current Philippine Standard Time.
 * Returns:
 * - "Today (Sep 9)" if date matches today
 * - "Tomorrow (Sep 10)" if date matches tomorrow
 * - "Yesterday (Sep 8)" if date matches yesterday
 * - "Friday (Sep 11)" if date is within 6 days
 * - "Sep 20, 2026" for other dates
 */
export function computeDateLabel(dateStr?: string, now: Date = new Date()): string {
  if (!dateStr) return 'Scheduled';

  const todayStr = formatDateYMD(now);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDateYMD(tomorrowDate);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatDateYMD(yesterdayDate);

  try {
    const d = new Date(dateStr + 'T00:00:00+08:00');
    if (isNaN(d.getTime())) return dateStr;

    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });

    if (dateStr === todayStr) {
      return `Today (${formatted})`;
    }
    if (dateStr === tomorrowStr) {
      return `Tomorrow (${formatted})`;
    }
    if (dateStr === yesterdayStr) {
      return `Yesterday (${formatted})`;
    }

    // Check if within the next 6 days
    const currentYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(now);
    const itemYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(d);

    if (currentYear === itemYear) {
      return `${weekday} (${formatted})`;
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  } catch {
    return dateStr;
  }
}

/**
 * Computes dynamic live status based on the current clock time.
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

  // Future dates (tomorrow and beyond)
  if (itemDate > todayStr) {
    return {
      status: 'upcoming',
      statusLabel: 'Scheduled',
      isPast: false,
      isLive: false,
    };
  }

  // Today (itemDate === todayStr)
  const currentMinutes = getPHTMinutes(now);

  // Extract start and end minutes
  let startMinutes = parseTimeToMinutes(item.timeStart);
  let endMinutes = parseTimeToMinutes(item.timeEnd);

  if ((startMinutes === null || endMinutes === null) && item.time) {
    const parts = item.time.split(/[–-]/);
    if (parts.length >= 2) {
      if (startMinutes === null) startMinutes = parseTimeToMinutes(parts[0]);
      if (endMinutes === null) endMinutes = parseTimeToMinutes(parts[1]);
    }
  }

  if (startMinutes === null) startMinutes = 8 * 60; // 8:00 AM default
  if (endMinutes === null) endMinutes = 17 * 60;   // 5:00 PM default

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

  return {
    status: 'upcoming',
    statusLabel: 'Scheduled',
    isPast: false,
    isLive: false,
  };
}

/**
 * Helper to enrich an interruption with dynamic live status and fresh relative date labels.
 */
export function enrichWithLiveStatus(item: Interruption, now: Date = new Date()): Interruption {
  const live = computeLiveStatus(item, now);
  const dateLabel = computeDateLabel(item.date, now);

  return {
    ...item,
    dateLabel,
    status: live.status,
    statusLabel: live.statusLabel,
    isPast: live.isPast,
  };
}

/**
 * Groups a list of interruptions into structured day categories relative to today.
 */
export function groupOutagesByDay(outages: Interruption[], now: Date = new Date()) {
  const todayStr = formatDateYMD(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDateYMD(tomorrowDate);

  const active = outages.filter(o => !o.isPast);
  const ongoing = active.filter(o => o.date === todayStr && o.status === 'ongoing');
  const upcomingToday = active.filter(o => o.date === todayStr && (o.status === 'upcoming' || o.status === 'delayed'));
  const tomorrow = active.filter(o => o.date === tomorrowStr);
  const future = active.filter(o => o.date > tomorrowStr);
  const past = outages.filter(o => o.isPast || o.date < todayStr);

  return {
    ongoing,
    upcomingToday,
    tomorrow,
    future,
    past,
    allActive: active,
  };
}

