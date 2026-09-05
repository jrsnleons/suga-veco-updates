import { Interruption, InterruptionStatus, InterruptionType } from '@/types';

// Known Cebu cities and barangays
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

export interface ParsedRawPost {
  postId: string;
  url?: string;
  text: string;
  postedAt?: string;
  img?: string;
}

export function parsePostText(post: ParsedRawPost): Partial<Interruption> | null {
  if (!post.text || post.text.length < 25) return null;

  // Normalize Unicode characters (e.g. mathematical bold fonts commonly used by Facebook pages like 𝐔𝐏𝐃𝐀𝐓𝐄)
  const normalizedText = post.text.normalize('NFKD');
  const upper = normalizedText.toUpperCase();

  // 1. Detect Category & Status
  let type: InterruptionType = 'scheduled';
  let status: InterruptionStatus = 'upcoming';
  let statusLabel = 'Scheduled';

  if (upper.includes('CANCEL') || upper.includes('WILL NOT PUSH THROUGH') || upper.includes('DEFERRED')) {
    type = 'cancelled';
    status = 'cancelled';
    statusLabel = 'Cancelled';
  } else if (upper.includes('DELAY') || upper.includes('RESCHEDULED') || upper.includes('STARTED AT')) {
    type = 'delayed';
    status = 'delayed';
    statusLabel = 'Delayed Start';
  } else if (upper.includes('EMERGENCY') || upper.includes('UNSCHEDULED') || upper.includes('TRIPPED') || upper.includes('FEEDER TRIP')) {
    type = 'emergency';
    status = 'ongoing';
    statusLabel = 'Active Outage';
  } else if (
    upper.includes('RESTOR') || 
    upper.includes('NORMALIZ') || 
    upper.includes('ENERGIZED') ||
    upper.includes('CONCLUDED') ||
    upper.includes('FINAL UPDATE') ||
    upper.includes('ENDED')
  ) {
    type = upper.includes('ROTATIONAL') ? 'rotational' : 'scheduled';
    status = 'restored';
    statusLabel = 'Restored';
  } else if (upper.includes('ROTATIONAL') || upper.includes('MANUAL LOAD') || upper.includes('NGCP')) {
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

  if (matchedBarangays.length === 0) {
    if (!upper.includes('POWER INTERRUPTION') && !upper.includes('ADVISORY') && !upper.includes('OUTAGE') && !upper.includes('BROWNOUT')) {
      return null;
    }
    matchedBarangays.push(matchedCity);
  }

  // 4. Extract Time Range
  const timeMatch = normalizedText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
  const timeDisplay = timeMatch ? `${timeMatch[1]} – ${timeMatch[2]}` : 'Time announced on site';

  // 5. Extract Date
  const dateMatch = normalizedText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i);
  const dateStr = dateMatch ? dateMatch[0] : 'Today (Sep 5)';

  const areaTitle = matchedBarangays.slice(0, 3).join(', ') + (matchedBarangays.length > 3 ? ` +${matchedBarangays.length - 3} more` : '');
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

  return {
    fbPostId: post.postId,
    fbPostUrl,
    fbImageUrl: post.img,
    date: '2026-09-04',
    dateLabel: dateStr,
    timeStart: timeMatch ? timeMatch[1] : '08:00',
    timeEnd: timeMatch ? timeMatch[2] : '17:00',
    time: timeDisplay,
    type,
    status,
    statusLabel,
    area: areaTitle,
    city: matchedCity,
    barangays: matchedBarangays,
    streets: extractStreetsSnippet(normalizedText),
    reason: extractReasonSnippet(normalizedText),
    fbCaption: normalizedText.slice(0, 350),
    fbTime: post.postedAt || 'Recently',
    isPast,
    outcome: status === 'restored' ? 'restored' : (status === 'cancelled' ? 'cancelled' : undefined),
  };
}

function extractStreetsSnippet(text: string): string {
  const m = text.match(/(?:along|portions of|streets of|including)\s+([^\.\n]+)/i);
  if (m && m[1]) {
    return m[1].trim().slice(0, 120);
  }
  return '';
}

function extractReasonSnippet(text: string): string {
  const m = text.match(/(?:due to|to allow|purpose|reason|facilitate)\s+([^\.\n]+)/i);
  if (m && m[1]) {
    return m[1].trim().slice(0, 160);
  }
  return 'System improvement and distribution reliability work.';
}
