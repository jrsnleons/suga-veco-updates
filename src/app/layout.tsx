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
      <body className="antialiased min-h-screen bg-[var(--system-bg)] text-[var(--label-primary)]">
        {children}
      </body>
    </html>
  );
}
