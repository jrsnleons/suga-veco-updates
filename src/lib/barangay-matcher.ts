import { Interruption, InterruptionStatus } from '@/types';

export interface BarangayFeatureProperties {
  barangay: string;
  rawName: string;
  city: string;
  psgc?: string;
}

export interface BarangayFeature {
  type: 'Feature';
  id?: string;
  properties: BarangayFeatureProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface BarangayGeoJSON {
  type: 'FeatureCollection';
  features: BarangayFeature[];
}

export interface BarangayOutageStatus {
  status: InterruptionStatus;
  outage: Interruption;
  barangayName: string;
  city: string;
}

/**
 * Normalizes barangay names for robust matching across dataset variations.
 */
export function normalizeBarangayName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    // Remove parenthetical notes e.g. (Pob.), (Ciudad), (Villa Gonzalo)
    .replace(/\s*\([^)]*\)/g, '')
    // Normalize abbreviations
    .replace(/\bsto\.?\s*/g, 'santo ')
    .replace(/\bsta\.?\s*/g, 'santa ')
    .replace(/\bsaint\b/g, 'san')
    // Ward naming variations (e.g. Ward 1 -> Poblacion Ward I)
    .replace(/\bward\s*([1-4]|i|ii|iii|iv)\b/g, (_m, p) => {
      const rom: Record<string, string> = {
        '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv',
        'i': 'i', 'ii': 'ii', 'iii': 'iii', 'iv': 'iv'
      };
      return `poblacion ward ${rom[p.toLowerCase()] || p}`;
    })
    // Roman numeral conversions
    .replace(/\b([a-z]+)\s*1\b/g, '$1 i')
    .replace(/\b([a-z]+)\s*2\b/g, '$1 ii')
    .replace(/\b([a-z]+)\s*3\b/g, '$1 iii')
    .replace(/\b([a-z]+)\s*4\b/g, '$1 iv')
    // Known spelling variants in Cebu
    .replace(/\btabunok\b/g, 'tabunoc')
    .replace(/\bduljo\s*fatima\b/g, 'duljo')
    .replace(/\bquiot\b/g, 'quiot pardo')
    .replace(/\bbudlaan\b/g, 'budla-an')
    .replace(/\bcalajoan\b/g, 'calajo-an')
    .replace(/\bpaknaan\b/g, 'pakna-an')
    .replace(/\btugbungan\b/g, 'tugbongan')
    .replace(/\btoong\b/g, 'to-ong')
    .replace(/\bto-ong\b/g, 'to-ong pardo')
    .replace(/\bhipodromo\b/g, 'hippodromo')
    .replace(/\bsan\s*nicolas\s*proper\b/g, 'san nicolas central')
    .replace(/\bpoblacion\s*pardo\b/g, 'pardo')
    .replace(/\bbuot\b/g, 'buot-taup pardo')
    .replace(/\bkinasang-?an\b/g, 'kinasang-an pardo')
    // Strip hyphens, punctuation and whitespace for comparison
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes city names for lookup.
 */
export function normalizeCityName(city: string): string {
  if (!city) return '';
  return city
    .toLowerCase()
    .replace(/\s*\(capital\)/i, '')
    .replace(/\bcity\s+of\s+/i, '')
    .replace(/\s+city\b/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Creates a fast lookup table from GeoJSON features.
 */
export function createBarangayLookupIndex(features: BarangayFeature[]) {
  const index = new Map<string, BarangayFeature>();

  for (const f of features) {
    const normB = normalizeBarangayName(f.properties.barangay);
    const normRaw = normalizeBarangayName(f.properties.rawName);
    const normCity = normalizeCityName(f.properties.city);

    // City-qualified keys (highest specificity)
    if (normCity && normB) index.set(`${normCity}::${normB}`, f);
    if (normCity && normRaw) index.set(`${normCity}::${normRaw}`, f);

    // Global barangay key (fallback across city borders)
    if (normB && !index.has(normB)) index.set(normB, f);
    if (normRaw && !index.has(normRaw)) index.set(normRaw, f);
  }

  return index;
}

const STATUS_PRIORITY: Record<InterruptionStatus, number> = {
  ongoing: 4,
  delayed: 3,
  upcoming: 2,
  cancelled: 1,
  completed: 0,
  restored: 0,
};

/**
 * Maps current outages to their corresponding barangay polygon features.
 * When multiple outages affect the same barangay, the higher severity/priority wins.
 */
export function buildActiveOutageBarangayMap(
  outages: Interruption[],
  lookupIndex: Map<string, BarangayFeature>
): Map<string, BarangayOutageStatus> {
  const outageMap = new Map<string, BarangayOutageStatus>();

  for (const outage of outages) {
    if (outage.isPast) continue;

    // Use listed barangays if available, otherwise parse area string
    const barangayList =
      outage.barangays && outage.barangays.length > 0
        ? outage.barangays
        : outage.area.split(/[,&/]| and /i).map(s => s.trim()).filter(Boolean);

    const normCity = normalizeCityName(outage.city);

    for (const bName of barangayList) {
      const normB = normalizeBarangayName(bName);
      if (!normB) continue;

      // Try city-qualified lookup first, then global lookup
      const feature =
        lookupIndex.get(`${normCity}::${normB}`) ||
        lookupIndex.get(normB);

      if (feature) {
        const featureKey = feature.id || `${feature.properties.city}::${feature.properties.barangay}`;
        const existing = outageMap.get(featureKey);

        const currentPrio = STATUS_PRIORITY[outage.status] ?? 1;
        const existingPrio = existing ? (STATUS_PRIORITY[existing.status] ?? 0) : -1;

        if (!existing || currentPrio > existingPrio) {
          outageMap.set(featureKey, {
            status: outage.status,
            outage,
            barangayName: feature.properties.barangay,
            city: feature.properties.city,
          });
        }
      }
    }
  }

  return outageMap;
}
