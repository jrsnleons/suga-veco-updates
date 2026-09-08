import { Interruption, InterruptionStatus, InterruptionType } from '@/types';
import { formatDateYMD, computeDateLabel } from '@/lib/status-utils';

// Known Cebu cities and municipalities
const CEBU_CITIES = [
  'Cebu City', 'Mandaue City', 'Talisay City', 'Consolacion', 
  'Liloan', 'Minglanilla', 'City of Naga', 'San Fernando'
];

const KNOWN_BARANGAYS = [
  // Consolacion
  'Cabangahan', 'Cansaga', 'Casili', 'Danglag', 'Garing', 'Jugan', 
  'Lamac', 'Nangka', 'Panas', 'Panoypoy', 'Pitogo', 'Poblacion Occidental', 
  'Poblacion Oriental', 'Polog', 'Pugalo', 'Pulpogan', 'Sacsac', 'Tayud', 
  'Tilhaong', 'Tolotolo', 'Tugbongan',
  // Liloan
  'Cabadiangan', 'Calero', 'Catarman', 'Cotcot', 'Jubay', 'Lataban', 
  'Mulao', 'Poblacion', 'San Roque', 'San Vicente', 'Santa Cruz', 
  'Tabla', 'Yati',
  // Cebu City
  'Lahug', 'Guadalupe', 'Mabolo', 'Kasambagan', 'Apas', 'Capitol Site',
  'Camputhaw', 'Banilad', 'Talamban', 'Bacayan', 'Busay', 'Pulangbato',
  'Tejero', 'Tinago', 'Pari-an', 'Ermita', 'Suba', 'Pasil',
  'Labangon', 'Tisa', 'Punta Princesa', 'Mambaling', 'Basak San Nicolas',
  'Basak Pardo', 'Bulacao', 'Inayawan', 'Kalunasan', 'Sapangdaku',
  'Cogon Ramos', 'Zapatera', 'Carreta', 'Sambag 1', 'Sambag 2', 'Lorega San Miguel',
  'Day-as', 'T. Padilla', 'Calamba', 'Pahina Central', 'Pahina San Nicolas', 'Sawang Calero',
  'Duljo Fatima', 'Quiot', 'Kinasang-an', 'Buhisan', 'Toong', 'Pamutan', 'Malubog', 'Babag', 'Sirao',
  // Mandaue City
  'Maguikay', 'Casuntingan', 'Tipolo', 'Subangdaku', 'Bakilid', 'Cabancalan',
  'Canduman', 'Tabok', 'Paknaan', 'Alang-Alang', 'Centro', 'Looc', 'Opao',
  'Ibabao-Estancia', 'Jagobiao', 'Labogon', 'Basak', 'Guizo', 'Cubacub', 'Pagsabungan',
  // Talisay City
  'Cadulawan', 'Linao', 'Tabunok', 'Dumlog', 'Pooc', 'Mohon', 'San Isidro',
  'Cansojong', 'Lawaan', 'Lagting', 'Camp IV', 'Biasong', 'Jaclupan', 'Manipis', 'Tangke',
  // Minglanilla
  'Lipata', 'Pakigne', 'Tungkil', 'Tunghaan', 'Vito', 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Calajo-an', 'Tubod', 'Tulay', 'Tungkop',
  // City of Naga
  'Colon', 'Tangke', 'Tinaan', 'Tuyan', 'Inayagan', 'Balirong', 'Cantao-an', 'Langtad', 'Mainit', 'Pangdan', 'Uling', 'Central Poblacion',
  // San Fernando
  'Panadtaran', 'Pitalo', 'Sangat', 'South Poblacion', 'Balungag', 'Bato', 'Ilaya', 'Liburon', 'Magsico'
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, enero: 1,
  feb: 2, february: 2, pebrero: 2,
  mar: 3, march: 3, marso: 3,
  apr: 4, april: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, hunyo: 6,
  jul: 7, july: 7, hulyo: 7,
  aug: 8, august: 8, agusto: 8,
  sep: 9, sept: 9, september: 9, setyembre: 9, septiyembre: 9, setiembre: 9,
  oct: 10, october: 10, oktubre: 10,
  nov: 11, november: 11, nobyembre: 11,
  dec: 12, december: 12, disyembre: 12,
};

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, dom: 0, domingo: 0,
  monday: 1, mon: 1, lunes: 1,
  tuesday: 2, tue: 2, tues: 2, martes: 2,
  wednesday: 3, wed: 3, miyerkoles: 3, miyerkules: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, huwebes: 4,
  friday: 5, fri: 5, biyernes: 5,
  saturday: 6, sat: 6, sabado: 6,
};

export interface ParsedRawPost {
  postId: string;
  url?: string;
  text: string;
  postedAt?: string;
  img?: string;
}

/**
 * Extracts and resolves the target event date from raw post text and reference post timestamp.
 */
export function extractPostDate(text: string, referenceDateStr?: string): { resolvedDate: string; dateLabel: string } {
  const normalized = text.normalize('NFKD').toLowerCase();
  
  // Base reference date (defaults to current PHT date)
  let refDate = new Date();
  if (referenceDateStr) {
    const parsedRef = new Date(referenceDateStr);
    if (!isNaN(parsedRef.getTime())) {
      refDate = parsedRef;
    }
  }

  // 1. Check for explicit Month + Day: e.g. "September 6, 2026", "Sept 6", "Sep. 6", "Septiyembre 6"
  const explicitMonthMatch = normalized.match(
    /\b(january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec|enero|pebrero|marso|abril|mayo|hunyo|hulyo|agusto|setyembre|septiyembre|setiembre|oktubre|nobyembre|disyembre)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i
  );

  if (explicitMonthMatch) {
    const monthKey = explicitMonthMatch[1].toLowerCase().replace(/\.$/, '');
    const monthNum = MONTH_MAP[monthKey];
    const dayNum = parseInt(explicitMonthMatch[2], 10);
    const yearNum = explicitMonthMatch[3] ? parseInt(explicitMonthMatch[3], 10) : refDate.getFullYear();

    if (monthNum && dayNum >= 1 && dayNum <= 31) {
      const y = yearNum;
      const m = String(monthNum).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      return {
        resolvedDate: iso,
        dateLabel: computeDateLabel(iso, refDate),
      };
    }
  }

  // 2. Check for Day + Month format: e.g. "6 September 2026", "06 Sept"
  const dayFirstMatch = normalized.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec|enero|pebrero|marso|abril|mayo|hunyo|hulyo|agusto|setyembre|septiyembre|setiembre|oktubre|nobyembre|disyembre)\.?(?:,?\s+(\d{4}))?\b/i
  );

  if (dayFirstMatch) {
    const dayNum = parseInt(dayFirstMatch[1], 10);
    const monthKey = dayFirstMatch[2].toLowerCase().replace(/\.$/, '');
    const monthNum = MONTH_MAP[monthKey];
    const yearNum = dayFirstMatch[3] ? parseInt(dayFirstMatch[3], 10) : refDate.getFullYear();

    if (monthNum && dayNum >= 1 && dayNum <= 31) {
      const y = yearNum;
      const m = String(monthNum).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      return {
        resolvedDate: iso,
        dateLabel: computeDateLabel(iso, refDate),
      };
    }
  }

  // 3. Check for Relative Day Keywords in English, Cebuano, and Tagalog
  // TOMORROW: "tomorrow", "ugma", "sa ugma", "sunod adlaw", "bukas", "ugmang adlawa"
  if (
    /\b(tomorrow|ugma|sa\s+ugma|sunod\s+adlaw|ugmang\s+adlawa|bukas|kinabuwasan)\b/i.test(normalized)
  ) {
    const target = new Date(refDate);
    target.setDate(target.getDate() + 1);
    const iso = formatDateYMD(target);
    return {
      resolvedDate: iso,
      dateLabel: computeDateLabel(iso, refDate),
    };
  }

  // TODAY: "today", "karon", "karong adlawa", "karong adlaw", "ngayong araw", "ngayon", "tonight", "karong gabii"
  if (
    /\b(today|karon|karong\s+adlawa|karong\s+adlaw|ngayong\s+araw|ngayon|tonight|karong\s+gabii|karong\s+buntag|karong\s+hapon)\b/i.test(normalized)
  ) {
    const iso = formatDateYMD(refDate);
    return {
      resolvedDate: iso,
      dateLabel: computeDateLabel(iso, refDate),
    };
  }

  // YESTERDAY: "yesterday", "gahapon", "kagahapon", "kahapon"
  if (
    /\b(yesterday|gahapon|kagahapon|kahapon)\b/i.test(normalized)
  ) {
    const target = new Date(refDate);
    target.setDate(target.getDate() - 1);
    const iso = formatDateYMD(target);
    return {
      resolvedDate: iso,
      dateLabel: computeDateLabel(iso, refDate),
    };
  }

  // 4. Check for Weekday names: e.g. "this Saturday", "on Friday", "Sabado", "Biyernes"
  const weekdayMatch = normalized.match(
    /\b(?:on\s+|this\s+|karong\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkoles|miyerkules|huwebes|biyernes|sabado|domingo)\b/i
  );

  if (weekdayMatch) {
    const key = weekdayMatch[1].toLowerCase();
    const targetWeekday = WEEKDAY_MAP[key];
    if (typeof targetWeekday === 'number') {
      const currentWeekday = refDate.getDay();
      let diff = targetWeekday - currentWeekday;
      if (diff < 0) diff += 7; // next occurrence
      if (diff === 0 && !/\b(today|karon)\b/i.test(normalized)) {
        // If post mentions same weekday without "today", assume today
        diff = 0;
      }
      const target = new Date(refDate);
      target.setDate(target.getDate() + diff);
      const iso = formatDateYMD(target);
      return {
        resolvedDate: iso,
        dateLabel: computeDateLabel(iso, refDate),
      };
    }
  }

  // Fallback to reference date (today)
  const fallbackIso = formatDateYMD(refDate);
  return {
    resolvedDate: fallbackIso,
    dateLabel: computeDateLabel(fallbackIso, refDate),
  };
}

export function parsePostIntoBarangayOutages(post: ParsedRawPost): Partial<Interruption>[] {
  if (!post.text || post.text.length < 25) return [];

  const normalizedText = post.text.normalize('NFKD');
  const upper = normalizedText.toUpperCase();

  // 1. Detect Category & Status
  let type: InterruptionType = 'scheduled';
  let status: InterruptionStatus = 'upcoming';
  let statusLabel = 'Scheduled';

  if (
    upper.includes('CANCEL') || 
    upper.includes('WILL NOT PUSH THROUGH') || 
    upper.includes('DEFERRED') ||
    upper.includes('POSTPONED') ||
    upper.includes('GIKANSELA') ||
    upper.includes('GIDEFER') ||
    upper.includes('DILI MADAYON') ||
    upper.includes('KANSELADO')
  ) {
    type = 'cancelled';
    status = 'cancelled';
    statusLabel = 'Cancelled';
  } else if (
    upper.includes('DELAY') || 
    upper.includes('RESCHEDULED') || 
    upper.includes('STARTED AT') ||
    upper.includes('NALANGAN') ||
    upper.includes('NAUSAB')
  ) {
    type = 'delayed';
    status = 'delayed';
    statusLabel = 'Delayed Start';
  } else if (
    upper.includes('EMERGENCY') || 
    upper.includes('UNSCHEDULED') || 
    upper.includes('TRIPPED') || 
    upper.includes('FEEDER TRIP') ||
    upper.includes('LINE TRIP') ||
    upper.includes('SUBSTATION TRIP') ||
    upper.includes('PAGKAPALONG') ||
    upper.includes('NAPALONG') ||
    upper.includes('BLACKOUT')
  ) {
    type = 'emergency';
    status = 'ongoing';
    statusLabel = 'Active Outage';
  } else if (
    upper.includes('RESTOR') || 
    upper.includes('NORMALIZ') || 
    upper.includes('ENERGIZED') ||
    upper.includes('CONCLUDED') ||
    upper.includes('FINAL UPDATE') ||
    upper.includes('ENDED') ||
    upper.includes('NABALIK NA') ||
    upper.includes('NAKABALIK NA') ||
    upper.includes('SUGA NA')
  ) {
    type = upper.includes('ROTATIONAL') ? 'rotational' : 'scheduled';
    status = 'restored';
    statusLabel = 'Restored';
  } else if (upper.includes('ROTATIONAL') || upper.includes('MANUAL LOAD') || upper.includes('NGCP') || upper.includes('LOAD SHEDDING')) {
    type = 'rotational';
    status = upper.includes('ONGOING') ? 'ongoing' : 'upcoming';
    statusLabel = status === 'ongoing' ? 'In Progress' : 'Rotational';
  }

  // 2. Extract City
  let matchedCity = 'Cebu City';
  for (const city of CEBU_CITIES) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(normalizedText)) {
      matchedCity = city;
      break;
    }
  }

  // 3. Extract Barangays
  const matchedBarangays: string[] = [];
  for (const brgy of KNOWN_BARANGAYS) {
    if (new RegExp(`\\b${brgy}\\b`, 'i').test(normalizedText)) {
      matchedBarangays.push(brgy);
    }
  }

  const isRelevant = upper.includes('POWER INTERRUPTION') || upper.includes('ADVISORY') || upper.includes('OUTAGE') || upper.includes('BROWNOUT') || upper.includes('MAINTENANCE') || upper.includes('KURYENTE');
  if (matchedBarangays.length === 0 && !isRelevant) {
    return [];
  }

  // 4. Extract Time Range
  const timeMatch12 = normalizedText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|NN|nn|MN|mn))\s*(?:–|-|to|until|hangtod|hangtud)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|NN|nn|MN|mn))/i);
  const timeMatch24 = !timeMatch12 ? normalizedText.match(/(\d{1,2}:\d{2})\s*(?:–|-|to|until|hangtod|hangtud)\s*(\d{1,2}:\d{2})/) : null;
  const timeMatchMilitary = (!timeMatch12 && !timeMatch24) ? normalizedText.match(/(\d{4}H?)\s*(?:–|-|to|until)\s*(\d{4}H?)/i) : null;
  
  const timeMatch = timeMatch12 || timeMatch24 || timeMatchMilitary;
  const timeDisplay = timeMatch ? `${timeMatch[1].trim()} – ${timeMatch[2].trim()}` : 'Time announced on site';

  // 5. Extract Accurate Event Date (Text-First Ground Truth)
  const dateInfo = extractPostDate(normalizedText, post.postedAt);
  const isPast = status === 'restored';

  // Extract clean post url
  let fbPostUrl = post.url;
  if (!fbPostUrl || fbPostUrl === 'https://www.facebook.com/visayanelectriccompany') {
    if (post.postId && post.postId.startsWith('pfbid')) {
      fbPostUrl = `https://www.facebook.com/visayanelectriccompany/posts/${post.postId}`;
    } else {
      fbPostUrl = 'https://www.facebook.com/visayanelectriccompany/posts/pfbid02z7WtfsaL9Y9KJvCc3Ffguq8dBvMHtjEFjMSWRwbtVnAfjcJDnCPRar6dZsQPwctml';
    }
  }

  const generalStreets = extractStreetsSnippet(normalizedText);
  const reason = extractReasonSnippet(normalizedText);

  // If explicit barangays found, generate 1 card entity per barangay
  if (matchedBarangays.length > 0) {
    return matchedBarangays.map(brgy => {
      const specificStreets = extractBarangaySpecificStreets(normalizedText, brgy) || generalStreets;
      const otherBarangays = matchedBarangays.filter(b => b !== brgy);

      return {
        fbPostId: post.postId,
        fbPostUrl,
        fbImageUrl: post.img,
        date: dateInfo.resolvedDate,
        dateLabel: dateInfo.dateLabel,
        timeStart: timeMatch ? timeMatch[1] : '08:00',
        timeEnd: timeMatch ? timeMatch[2] : '17:00',
        time: timeDisplay,
        type,
        status,
        statusLabel,
        area: brgy,
        barangay: brgy,
        city: matchedCity,
        barangays: [brgy],
        streets: specificStreets,
        reason,
        fbCaption: normalizedText.slice(0, 350),
        fbTime: post.postedAt || 'Recently',
        isPast,
        outcome: status === 'restored' ? 'restored' : (status === 'cancelled' ? 'cancelled' : undefined),
        originPostId: post.postId,
        originPostUrl: fbPostUrl,
        latestPostId: post.postId,
        latestPostUrl: fbPostUrl,
        otherAffectedBarangays: otherBarangays,
      };
    });
  }

  // Fallback for corridor / city-wide post (no explicit barangay list)
  const landmarkTitle = extractLandmarkOrCorridor(normalizedText, matchedCity);
  return [{
    fbPostId: post.postId,
    fbPostUrl,
    fbImageUrl: post.img,
    date: dateInfo.resolvedDate,
    dateLabel: dateInfo.dateLabel,
    timeStart: timeMatch ? timeMatch[1] : '08:00',
    timeEnd: timeMatch ? timeMatch[2] : '17:00',
    time: timeDisplay,
    type,
    status,
    statusLabel,
    area: landmarkTitle,
    barangay: landmarkTitle,
    city: matchedCity,
    barangays: [landmarkTitle],
    streets: generalStreets,
    reason,
    fbCaption: normalizedText.slice(0, 350),
    fbTime: post.postedAt || 'Recently',
    isPast,
    outcome: status === 'restored' ? 'restored' : (status === 'cancelled' ? 'cancelled' : undefined),
    originPostId: post.postId,
    originPostUrl: fbPostUrl,
    latestPostId: post.postId,
    latestPostUrl: fbPostUrl,
    otherAffectedBarangays: [],
  }];
}

export function parsePostText(post: ParsedRawPost): Partial<Interruption> | null {
  const list = parsePostIntoBarangayOutages(post);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  // If multiple barangays, create a combined reference card (for legacy callers)
  const first = list[0];
  const allBarangays = list.map(l => l.area || '').filter(Boolean);
  const areaTitle = allBarangays.slice(0, 3).join(', ') + (allBarangays.length > 3 ? ` +${allBarangays.length - 3} more` : '');

  return {
    ...first,
    area: areaTitle,
    barangays: allBarangays,
    otherAffectedBarangays: allBarangays.slice(1),
  };
}

function extractBarangaySpecificStreets(text: string, brgy: string): string | null {
  const colonRegex = new RegExp(`${brgy}\\s*[:\\-–]\\s*([^;\\n\\.]+)`, 'i');
  const m1 = text.match(colonRegex);
  if (m1 && m1[1] && m1[1].trim().length > 3) {
    return m1[1].trim().slice(0, 120);
  }

  const parenRegex = new RegExp(`${brgy}\\s*\\(([^)]+)\\)`, 'i');
  const m2 = text.match(parenRegex);
  if (m2 && m2[1] && m2[1].trim().length > 3) {
    return m2[1].trim().slice(0, 120);
  }

  return null;
}

function extractLandmarkOrCorridor(text: string, city: string): string {
  const m = text.match(/(?:portion of|along|vicinity of|substation|feeder)\s+([A-Za-z0-9\s,\.]+?)(?:,|\.|\n|from|to|between)/i);
  if (m && m[1] && m[1].trim().length > 3) {
    return m[1].trim().slice(0, 50);
  }
  return city;
}

function extractStreetsSnippet(text: string): string {
  const m = text.match(/(?:along|portions of|streets of|including|sitio|purok|subdivision)\s+([^\.\n]+)/i);
  if (m && m[1]) {
    return m[1].trim().slice(0, 120);
  }
  return '';
}

function extractReasonSnippet(text: string): string {
  const m = text.match(/(?:due to|to allow|purpose|reason|facilitate|relocation of|upgrading of|maintenance of|in line with)\s+([^\.\n]+)/i);
  if (m && m[1]) {
    return m[1].trim().slice(0, 160);
  }
  return 'System improvement and distribution reliability work.';
}


