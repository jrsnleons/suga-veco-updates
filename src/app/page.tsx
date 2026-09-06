'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interruption } from '@/types';
import { enrichWithLiveStatus } from '@/lib/status-utils';
import { loadCachedOutages, saveCachedOutages, formatCachedTime } from '@/lib/offline-storage';
import { Header } from '@/components/Header';
import { GridPulseView } from '@/components/GridPulseView';
import { RadarMap } from '@/components/RadarMap';
import { StatusFeed } from '@/components/StatusFeed';
import { CalendarView } from '@/components/CalendarView';
import { DetailModal } from '@/components/DetailModal';
import { PinAreaDialog } from '@/components/PinAreaDialog';
import { NotificationDialog } from '@/components/NotificationDialog';
import { BottomNav, ActiveTab } from '@/components/BottomNav';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { SystemErrorToast } from '@/components/SystemErrorToast';
import { evaluateOutageNotifications, getNotificationPermission } from '@/lib/notification-manager';

export default function Home() {
  // Initial state hydrated instantly from offline cache if available
  const [outages, setOutages] = useState<Interruption[]>(() => {
    if (typeof window === 'undefined') return [];
    const cached = loadCachedOutages();
    return cached?.data ? cached.data.map(o => enrichWithLiveStatus(o)) : [];
  });

  const [currentTab, setCurrentTab] = useState<ActiveTab>('pulse');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('veco_favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [selectedItem, setSelectedItem] = useState<Interruption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState(() => {
    if (typeof window === 'undefined') return 'Checking...';
    const cached = loadCachedOutages();
    return cached?.cachedAt ? formatCachedTime(cached.cachedAt) : 'Checking...';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync notification permission status on mount
  useEffect(() => {
    setHasNotificationPermission(getNotificationPermission() === 'granted');
  }, []);

  // Run notification evaluation engine whenever outages or favorites change
  useEffect(() => {
    if (outages.length > 0 && favorites.length > 0) {
      evaluateOutageNotifications(outages, favorites);
    }
  }, [outages, favorites]);

  // Error state for system-down popup
  const [fetchError, setFetchError] = useState(false);
  const [fetchErrorMessage, setFetchErrorMessage] = useState('');
  const failureCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);

  const saveFavorites = (favs: string[]) => {
    setFavorites(favs);
    try {
      localStorage.setItem('veco_favorites', JSON.stringify(favs));
    } catch {}
  };

  const handleToggleFavorite = (brgy: string) => {
    if (!brgy) return;
    const clean = brgy.trim();
    if (favorites.includes(clean)) {
      saveFavorites(favorites.filter(f => f !== clean));
    } else {
      saveFavorites([...favorites, clean]);
    }
  };

  // Load Outages from API
  const loadOutages = useCallback((signal?: AbortSignal) => {
    fetch('/api/outages', { signal })
      .then(res => {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return res.json();
      })
      .then(data => {
        lastFetchTimeRef.current = Date.now();
        if (data.data) {
          const enriched = data.data.map((o: Interruption) => enrichWithLiveStatus(o));
          setOutages(enriched);
          // Persist fresh data to offline storage
          saveCachedOutages(enriched, data.lastSynced);
        }
        if (data.lastSynced) {
          const d = new Date(data.lastSynced);
          setLastSyncedText(`Synced ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        } else {
          setLastSyncedText('Live');
        }

        failureCountRef.current = 0;
        setFetchError(false);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Could not fetch latest outages:', err);
        
        // Check if cached data already exists
        const cached = loadCachedOutages();
        if (cached && cached.data.length > 0) {
          setLastSyncedText(formatCachedTime(cached.cachedAt));
        } else {
          setLastSyncedText('Offline mode');
        }

        failureCountRef.current += 1;
        // Only trigger popup if offline and no cached data is available
        if (failureCountRef.current >= 2 && (!cached || cached.data.length === 0)) {
          setFetchError(true);
          setFetchErrorMessage(
            'Unable to reach the schedule server. Data shown may be outdated. Please check your connection and try again.'
          );
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadOutages(controller.signal);
    const interval = setInterval(() => loadOutages(), 60000);

    // Periodically re-evaluate statuses in real time as the clock advances
    const clockTick = setInterval(() => {
      setOutages(prev => prev.map(o => enrichWithLiveStatus(o)));
    }, 30000);

    // Auto-revalidate when returning to tab or regaining focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // If more than 2 minutes elapsed since last fetch, re-check immediately
        if (Date.now() - lastFetchTimeRef.current > 120000) {
          loadOutages();
        }
      }
    };

    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 120000) {
        loadOutages();
      }
    };

    // Monitor online/offline events
    const handleOnline = () => {
      loadOutages();
    };
    const handleOffline = () => {
      const cached = loadCachedOutages();
      setLastSyncedText(cached?.cachedAt ? formatCachedTime(cached.cachedAt) : 'Offline');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      controller.abort();
      clearInterval(interval);
      clearInterval(clockTick);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadOutages]);

  // Handle Manual Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncedText('Syncing feed...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          const enriched = result.data.map((o: Interruption) => enrichWithLiveStatus(o));
          setOutages(enriched);
          saveCachedOutages(enriched, result.lastSynced);
        }
        setLastSyncedText('Synced just now');
        setFetchError(false);
        failureCountRef.current = 0;
        lastFetchTimeRef.current = Date.now();
      } else {
        // Fallback to fetching outages directly
        loadOutages();
      }
    } catch {
      loadOutages();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenDetail = (item: Interruption) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-[var(--system-bg)] text-[var(--label-primary)] transition-colors">
      <Header 
        lastSyncedText={lastSyncedText}
        isSyncing={isSyncing}
        onSync={handleSync}
        onOpenNotifications={() => setIsNotificationDialogOpen(true)}
        favoritesCount={favorites.length}
        hasNotificationPermission={hasNotificationPermission}
      />

      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      <main className="max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] space-y-6">
        <AnimatePresence mode="wait">
          {currentTab === 'pulse' && (
            <motion.div 
              key="pulse"
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            >
              <GridPulseView
                outages={outages}
                favorites={favorites}
                onOpenDetail={handleOpenDetail}
                onToggleFavorite={handleToggleFavorite}
                onOpenPinDialog={() => setIsPinDialogOpen(true)}
              />
            </motion.div>
          )}

          {currentTab === 'radar' && (
            <motion.div 
              key="radar"
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            >
              <RadarMap 
                outages={outages}
                onOpenDetail={handleOpenDetail}
              />
            </motion.div>
          )}

          {currentTab === 'watchlist' && (
            <motion.div 
              key="watchlist"
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            >
              <StatusFeed 
                outages={outages}
                favorites={favorites}
                onOpenDetail={handleOpenDetail}
                onOpenPinDialog={() => setIsPinDialogOpen(true)}
              />
            </motion.div>
          )}

          {currentTab === 'timeline' && (
            <motion.div 
              key="timeline"
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            >
              <CalendarView 
                outages={outages}
                onOpenDetail={handleOpenDetail}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* System Error Toast */}
      <SystemErrorToast
        isVisible={fetchError}
        onDismiss={() => setFetchError(false)}
        onRetry={() => loadOutages()}
        message={fetchErrorMessage}
      />

      <DetailModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseDetail}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />

      <PinAreaDialog 
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />

      <NotificationDialog
        isOpen={isNotificationDialogOpen}
        onClose={() => {
          setIsNotificationDialogOpen(false);
          setHasNotificationPermission(getNotificationPermission() === 'granted');
        }}
        favorites={favorites}
        onOpenPinDialog={() => setIsPinDialogOpen(true)}
      />

      <BottomNav 
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
      />
    </div>
  );
}
