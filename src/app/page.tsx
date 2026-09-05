'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interruption } from '@/types';
import { enrichWithLiveStatus } from '@/lib/status-utils';
import { Header } from '@/components/Header';
import { SavedPlaces } from '@/components/SavedPlaces';
import { StatusFeed } from '@/components/StatusFeed';
import { CalendarView } from '@/components/CalendarView';
import { ArchiveList } from '@/components/ArchiveList';
import { DetailModal } from '@/components/DetailModal';
import { PinAreaDialog } from '@/components/PinAreaDialog';
import { BottomNav, ActiveTab } from '@/components/BottomNav';

export default function Home() {
  const [outages, setOutages] = useState<Interruption[]>([]);
  const [currentTab, setCurrentTab] = useState<ActiveTab>('status');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['Lahug', 'Guadalupe']);
  const [selectedItem, setSelectedItem] = useState<Interruption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState('Checking...');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('veco_favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

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

  // Fetch Outages from API
  const fetchOutages = useCallback(async () => {
    try {
      const res = await fetch('/api/outages');
      if (!res.ok) throw new Error('Failed to load data');
      const data = await res.json();
      if (data.data) {
        setOutages(data.data.map((o: Interruption) => enrichWithLiveStatus(o)));
      }
      if (data.lastSynced) {
        const d = new Date(data.lastSynced);
        setLastSyncedText(`Synced ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        setLastSyncedText('Live');
      }
    } catch (err) {
      console.warn('Could not fetch latest outages:', err);
      setLastSyncedText('Offline mode');
    }
  }, []);

  useEffect(() => {
    fetchOutages();
    const interval = setInterval(fetchOutages, 60000);
    // Periodically re-evaluate statuses in real time as the clock advances
    const clockTick = setInterval(() => {
      setOutages(prev => prev.map(o => enrichWithLiveStatus(o)));
    }, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(clockTick);
    };
  }, [fetchOutages]);

  // Handle Manual Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncedText('Scraping FB feed...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setOutages(result.data.map((o: Interruption) => enrichWithLiveStatus(o)));
        }
        setLastSyncedText('Synced just now');
      } else {
        setLastSyncedText('Sync skipped');
      }
    } catch {
      setLastSyncedText('Sync unavailable');
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
    <div className="max-w-xl mx-auto space-y-5">
      <Header 
        lastSyncedText={lastSyncedText}
        isSyncing={isSyncing}
        onSync={handleSync}
      />

      <AnimatePresence mode="wait">
        {currentTab === 'status' && (
          <motion.div 
            key="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-5"
          >
            <SavedPlaces 
              favorites={favorites}
              outages={outages}
              onSelect={(brgy) => setSearchQuery(brgy)}
              onOpenPinDialog={() => setIsPinDialogOpen(true)}
              onRemove={handleToggleFavorite}
            />

            <StatusFeed 
              outages={outages}
              onOpenDetail={handleOpenDetail}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </motion.div>
        )}

        {currentTab === 'calendar' && (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <CalendarView 
              outages={outages}
              onOpenDetail={handleOpenDetail}
            />
          </motion.div>
        )}

        {currentTab === 'archive' && (
          <motion.div 
            key="archive"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <ArchiveList 
              outages={outages}
              onOpenDetail={handleOpenDetail}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <DetailModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseDetail}
        isFavorite={selectedItem ? favorites.includes(selectedItem.barangays[0] || selectedItem.area) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      <PinAreaDialog 
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />

      <BottomNav 
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
      />
    </div>
  );
}
