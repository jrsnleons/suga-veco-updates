'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  lastSyncedText: string;
  isSyncing: boolean;
  onSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lastSyncedText, isSyncing, onSync }) => {
  const [cebuTime, setCebuTime] = useState('');
  
  // Defaults strictly to 'light' mode unless explicitly saved as 'dark' in localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('suga_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Sync DOM attribute whenever theme state changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSelectTheme = (selectedTheme: 'light' | 'dark') => {
    setTheme(selectedTheme);
    try {
      localStorage.setItem('suga_theme', selectedTheme);
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

          {/* Theme Selector Segmented Control (Defaults to Light, Persists on Dark) */}
          <div
            className="flex items-center p-0.5 rounded-full bg-[var(--tertiary-fill)] border border-[var(--hairline)]"
            role="group"
            aria-label="Theme mode switcher"
          >
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ios-press ${
                theme === 'light'
                  ? 'bg-[var(--secondary-bg)] text-[var(--accent-orange)] shadow-xs'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]'
              }`}
              title="Light Mode (Default)"
              aria-label="Switch to Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ios-press ${
                theme === 'dark'
                  ? 'bg-[var(--elevated-surface)] text-[var(--accent-blue)] shadow-xs'
                  : 'text-[var(--label-tertiary)] hover:text-[var(--label-secondary)]'
              }`}
              title="Dark Mode (Persisted)"
              aria-label="Switch to Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

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
