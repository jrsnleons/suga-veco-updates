import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Suga — Cebu Power & Brownout Tracker',
  description: 'Clean, minimalist, and searchable power interruption schedule tracker for Visayan Electric (VECO) in Metro Cebu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-6 pb-28 select-none">
        {children}
      </body>
    </html>
  );
}
