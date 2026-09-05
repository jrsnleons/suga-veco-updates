'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Sun, Moon, Monitor } from 'lucide-react';

interface HeaderProps {
  lastSyncedText: string;
  isSyncing: boolean;
  onSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lastSyncedText, isSyncing, onSync }) => {
  const [cebuTime, setCebuTime] = useState('');
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const saved = localStorage.getItem('suga_theme') as 'system' | 'light' | 'dark' | null;
      return saved || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    if (themeMode === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  const handleCycleTheme = () => {
    const nextTheme = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
    setThemeMode(nextTheme);
    try {
      localStorage.setItem('suga_theme', nextTheme);
    } catch {}
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setCebuTime(new Intl.DateTimeFormat('en-US', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 ios-vibrancy-nav transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand / App Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] flex items-center justify-center font-semibold text-sm">
            <Zap className="w-4 h-4 fill-current text-[var(--accent-blue)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--label-primary)]">
                SUGA
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] leading-none">
                VECO
              </span>
            </div>
            <span className="text-[11px] text-[var(--label-secondary-alpha)] block leading-none mt-1">
              Metro Cebu {cebuTime ? `• ${cebuTime} PHT` : ''}
            </span>
          </div>
        </div>

        {/* Right: Telemetry status & Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--tertiary-fill)] text-[12px] text-[var(--label-secondary-alpha)] font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-[var(--accent-orange)] animate-pulse' : 'bg-[var(--accent-green)]'}`} />
            <span>{lastSyncedText}</span>
          </div>

          {/* Theme Selector Button */}
          <button
            onClick={handleCycleTheme}
            className="w-9 h-9 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--label-secondary)] flex items-center justify-center ios-press cursor-pointer"
            title={`Theme: ${themeMode} (Tap to change)`}
            aria-label="Toggle theme mode"
          >
            {themeMode === 'system' ? (
              <Monitor className="w-4 h-4 text-[var(--label-secondary)]" />
            ) : themeMode === 'light' ? (
              <Sun className="w-4 h-4 text-[var(--accent-orange)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--accent-blue)]" />
            )}
          </button>

          {/* Refresh Action Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-9 h-9 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] flex items-center justify-center ios-press disabled:opacity-50 cursor-pointer"
            title="Check VECO feed updates"
            aria-label="Sync latest outages"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
