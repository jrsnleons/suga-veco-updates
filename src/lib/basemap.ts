export type BasemapStyle = 'dark' | 'voyager' | 'google' | 'hybrid' | 'light';

export interface BasemapStyleOption {
  name: string;
  description: string;
  path: string;
}

export const BASEMAP_STYLES: Record<BasemapStyle, BasemapStyleOption> = {
  dark: {
    name: 'Dark Voyager',
    description: 'CARTO sleek dark mode',
    path: 'dark_all',
  },
  voyager: {
    name: 'CARTO Voyager',
    description: 'CARTO detailed street map',
    path: 'voyager',
  },
  google: {
    name: 'Google Maps',
    description: 'Standard roadmap',
    path: 'google',
  },
  hybrid: {
    name: 'Google Satellite',
    description: 'Aerial satellite with labels',
    path: 'hybrid',
  },
  light: {
    name: 'Positron',
    description: 'CARTO minimal light',
    path: 'light_all',
  },
};

/**
 * Returns the CARTO API key if configured on the client.
 */
export function getCartoApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_BASEMAP_KEY ||
    ''
  ).trim();
}

/**
 * Resolves the basemap tile URL template for Leaflet.
 * Supports:
 * - CARTO Dark Voyager / Dark Matter (dark_all)
 * - CARTO Voyager, Positron via secure proxy or direct
 * - Google Maps standard roadmap (mt{s}.google.com/vt/lyrs=m)
 * - Google Maps hybrid satellite (mt{s}.google.com/vt/lyrs=y)
 * - Custom override via NEXT_PUBLIC_BASEMAP_URL
 */
export function getBasemapTileUrl(
  style: BasemapStyle = 'dark',
  customApiKey?: string
): string {
  const overrideUrl = process.env.NEXT_PUBLIC_BASEMAP_URL?.trim();
  const apiKey = customApiKey !== undefined ? customApiKey : getCartoApiKey();

  if (overrideUrl) {
    let url = overrideUrl;
    if (apiKey) {
      url = url.replace('YOUR_KEY', apiKey).replace('{key}', apiKey);
    } else {
      url = url.replace(/([?&])key=(?:YOUR_KEY|\{key\})(&|$)/, '$1').replace(/[?&]$/, '');
    }
    return url;
  }

  // Google Maps standard roadmap style
  if (style === 'google') {
    return 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  }

  // Google Satellite with roads & labels
  if (style === 'hybrid') {
    return 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
  }

  const stylePath = BASEMAP_STYLES[style]?.path || 'voyager';

  // If explicitly configured to bypass proxy and hit CARTO directly
  if (process.env.NEXT_PUBLIC_CARTO_DIRECT === 'true') {
    const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
    return `https://{s}.basemaps.cartocdn.com/rastertiles/${stylePath}/{z}/{x}/{y}.png${keyParam}`;
  }

  // Secure server-side proxy (hides API key from browser, cached at edge)
  return `/api/tiles/${stylePath}/{z}/{x}/{y}.png`;
}
