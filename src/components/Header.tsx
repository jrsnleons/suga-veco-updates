'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Zap, Sun, Moon, Bell } from 'lucide-react';

interface HeaderProps {
  lastSyncedText: string;
  isSyncing: boolean;
  onSync: () => void;
  onOpenNotifications: () => void;
  favoritesCount?: number;
  hasNotificationPermission?: boolean;
}

const emptySubscribe = () => () => {};

const manilaTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

export const Header: React.FC<HeaderProps> = ({ 
  lastSyncedText, 
  isSyncing, 
  onSync,
  onOpenNotifications,
  favoritesCount = 0,
  hasNotificationPermission = false,
}) => {
  const [cebuTime, setCebuTime] = useState('');
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('suga_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  });

  // Sync DOM attribute whenever theme state changes
  useEffect(() => {
    if (!mounted) return;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('suga_theme', nextTheme);
    } catch {}
  };

  useEffect(() => {
    const updateTime = () => {
      setCebuTime(manilaTimeFormatter.format(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[var(--system-bg)] border-b border-[var(--hairline)] transition-colors pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand / App Identity with Spring Press */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] flex items-center justify-center font-semibold text-sm border border-[var(--accent-blue)]/20 shadow-xs">
            <Zap className="w-4 h-4 fill-current text-[var(--accent-blue)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[17px] font-bold tracking-tight text-[var(--label-primary)]">
                SUGA
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] leading-none border border-[var(--hairline)]">
                VECO
              </span>
            </div>
            <span className="text-[11px] text-[var(--label-secondary-alpha)] block leading-none mt-1 font-mono-tabular">
              Metro Cebu {cebuTime ? `• ${cebuTime} PHT` : ''}
            </span>
          </div>
        </motion.div>

        {/* Right: Dynamic Island Telemetry & Actions */}
        <div className="flex items-center gap-2">
          {/* Dynamic Island Status Capsule */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSync}
            disabled={isSyncing}
            className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--tertiary-fill)] border border-[var(--hairline)] text-[12px] font-mono-tabular font-medium text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)] transition-all cursor-pointer select-none"
            title="Tap to sync with VECO FB dispatch"
          >
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-[var(--accent-orange)] animate-pulse-amber' : 'bg-[var(--accent-green)] animate-pulse-green'}`} />
            <span>{lastSyncedText}</span>
          </motion.button>

          {/* 1-Tap Toggle Theme Button */}
          <motion.button
            type="button"
            suppressHydrationWarning
            whileTap={{ scale: 0.88 }}
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 flex items-center justify-center border border-[var(--hairline)] transition-colors cursor-pointer select-none shadow-xs"
            title={mounted ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : 'Toggle Theme'}
            aria-label={mounted ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : 'Toggle Theme'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mounted && theme === 'dark' ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: 45, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -45, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <Moon className="w-4 h-4 text-[var(--accent-blue)]" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: -45, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 45, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <Sun className="w-4 h-4 text-[var(--accent-orange)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notification Alerts Center Button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 flex items-center justify-center border border-[var(--hairline)] transition-colors cursor-pointer select-none shadow-xs text-[var(--label-primary)]"
            title="Outage Notifications & Alerts"
            aria-label="Outage Notifications & Alerts"
          >
            <Bell className="w-4 h-4 text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]" />
            
            {/* Status indicator badge */}
            {hasNotificationPermission && favoritesCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-orange)] ring-2 ring-[var(--system-bg)] animate-pulse-amber" />
            ) : favoritesCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />
            ) : null}
          </motion.button>

          {/* Tactile Refresh Action Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSync}
            disabled={isSyncing}
            className="w-9 h-9 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] flex items-center justify-center border border-[var(--hairline)] disabled:opacity-50 cursor-pointer shadow-xs"
            title="Check VECO feed updates"
            aria-label="Sync latest outages"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>
    </header>
  );
};

