import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_STYLES: Record<string, string> = {
  voyager: 'voyager',
  dark: 'dark_all',
  dark_all: 'dark_all',
  light: 'light_all',
  light_all: 'light_all',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 4) {
    return new Response(
      'Invalid tile path. Expected format: /api/tiles/{style}/{z}/{x}/{y}.png',
      { status: 400 }
    );
  }

  const rawStyle = slug[0].toLowerCase();
  const stylePath = ALLOWED_STYLES[rawStyle] || 'voyager';

  const z = parseInt(slug[1], 10);
  const x = parseInt(slug[2], 10);
  const y = parseInt(slug[3].replace(/\.png$/i, '').replace(/@\d+x$/i, ''), 10);

  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    return new Response('Invalid tile coordinates', { status: 400 });
  }

  const apiKey = (
    process.env.CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_BASEMAP_KEY ||
    'cb1_2yot_1_2b3242df6295b75592f04af9'
  ).trim();

  const cartoUrl = `https://basemaps.cartocdn.com/rastertiles/${stylePath}/${z}/${x}/${y}.png?key=${apiKey}`;

  try {
    const res = await fetch(cartoUrl, {
      headers: {
        'User-Agent': 'VecoBrownoutTracker/1.0',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*',
      },
    });

    if (!res.ok) {
      return new Response(res.statusText, { status: res.status });
    }

    const contentType = res.headers.get('Content-Type') || 'image/png';

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache at edge & browser for 30 days, revalidate in background
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Tile proxy error:', error);
    return new Response('Error fetching map tile', { status: 502 });
  }
}
