import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { SmoothScroll } from '@/components/SmoothScroll';

export const metadata: Metadata = {
  title: 'SUGA: Cebu Power & Brownout Tracker',
  description: 'Clean, native iOS-tier power interruption schedule and live telemetry tracker for Visayan Electric (VECO) in Metro Cebu.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SUGA Grid',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var saved = localStorage.getItem('suga_theme');
                if (saved === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            })();`,
          }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.warn('SW registration failed:', err);
                });
              });
            }`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--system-bg)] text-[var(--label-primary)] transition-colors duration-200">
        <SmoothScroll />
        <div className="fixed inset-0 pointer-events-none -z-10 ios-ambient-canvas" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

