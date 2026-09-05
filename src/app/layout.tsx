import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SUGA — Cebu Power & Brownout Tracker',
  description: 'Clean, native iOS-tier power interruption schedule and live telemetry tracker for Visayan Electric (VECO) in Metro Cebu.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SUGA Grid',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
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
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--system-bg)] text-[var(--label-primary)] transition-colors duration-200">
        <div className="fixed inset-0 pointer-events-none -z-10 ios-ambient-canvas" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
