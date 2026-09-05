export type InterruptionType = 
  | 'emergency' 
  | 'scheduled' 
  | 'delayed' 
  | 'cancelled' 
  | 'rotational';

export type InterruptionStatus = 
  | 'ongoing' 
  | 'upcoming' 
  | 'delayed' 
  | 'cancelled' 
  | 'restored' 
  | 'completed';

export interface Interruption {
  id: number | string;
  fbPostId: string;
  fbPostUrl?: string;
  fbImageUrl?: string;       // Attached infographic or advisory graphic
  date: string;              // YYYY-MM-DD
  dateLabel: string;         // e.g. "Today (Sep 5)" or "Monday, Sep 7"
  timeStart: string;         // e.g. "08:00"
  timeEnd: string;           // e.g. "17:00"
  time: string;              // e.g. "8:00 AM – 5:00 PM"
  type: InterruptionType;
  status: InterruptionStatus;
  statusLabel: string;       // e.g. "Active Outage", "Delayed Start", "Cancelled"
  area: string;              // e.g. "San Roque & Tejero"
  city: string;              // e.g. "Cebu City"
  barangays: string[];       // e.g. ["San Roque", "Tejero"]
  streets: string;           // e.g. "M.J. Cuenco Ave, E. Aboitiz St"
  reason: string;            // Engineering or incident details
  fbCaption?: string;        // Full original caption preview
  fbTime?: string;           // e.g. "45m ago" or "Sep 5"
  isPast: boolean;           // 0 = active/upcoming, 1 = archived
  outcome?: 'restored' | 'completed' | 'cancelled' | 'ongoing';
  isSuperseded?: boolean;    // 1 if replaced by a more specific or newer post
  supersededById?: number | string;
  precedence?: number;       // 1 = tentative weekly, 2 = day schedule, 3 = live operational update
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrapeLog {
  id: number;
  scrapedAt: string;
  durationMs: number;
  postsFound: number;
  newAdvisories: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface AreaCoordinate {
  lat: string;
  lng: string;
  zoomQuery: string;
}
