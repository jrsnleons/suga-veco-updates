export type BasemapStyle = 'voyager' | 'dark' | 'light';

export interface BasemapStyleOption {
  name: string;
  description: string;
  path: string;
}

export const BASEMAP_STYLES: Record<BasemapStyle, BasemapStyleOption> = {
  voyager: {
    name: 'Voyager',
    description: 'CARTO detailed street map',
    path: 'voyager',
  },
  dark: {
    name: 'Dark Matter',
    description: 'CARTO dark contrast',
    path: 'dark_all',
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
 * 
 * To prevent exposing your API key in the browser and eliminate Vercel NEXT_PUBLIC_* warnings,
 * tiles are served via the server-side proxy route: `/api/tiles/{style}/{z}/{x}/{y}.png`.
 * 
 * If you prefer direct CARTO CDN requests or have a custom tile URL, set NEXT_PUBLIC_BASEMAP_URL.
 */
export function getBasemapTileUrl(
  style: BasemapStyle = 'voyager',
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

  const stylePath = BASEMAP_STYLES[style]?.path || 'voyager';

  // If explicitly configured to bypass proxy and hit CARTO directly
  if (process.env.NEXT_PUBLIC_CARTO_DIRECT === 'true') {
    const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
    return `https://{s}.basemaps.cartocdn.com/rastertiles/${stylePath}/{z}/{x}/{y}.png${keyParam}`;
  }

  // Secure server-side proxy (hides API key from browser, cached at edge)
  return `/api/tiles/${stylePath}/{z}/{x}/{y}.png`;
}
