'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Clock, MapPin, 
  CheckCircle2, ChevronRight, X, Plus, Zap, Star
} from 'lucide-react';
import { Interruption } from '@/types';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';
import { isOutageAffectingFavorites } from '@/lib/notification-manager';

interface GridPulseViewProps {
  outages: Interruption[];
  favorites: string[];
  onOpenDetail: (item: Interruption) => void;
  onToggleFavorite: (place: string) => void;
  onOpenPinDialog: () => void;
}

export const GridPulseView: React.FC<GridPulseViewProps> = ({
  outages,
  favorites,
  onOpenDetail,
  onToggleFavorite,
  onOpenPinDialog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeOutages = useMemo(() => outages.filter(o => !o.isPast), [outages]);
  const ongoingOutages = useMemo(() => activeOutages.filter(o => o.status === 'ongoing'), [activeOutages]);
  const upcomingTodayOutages = useMemo(() => activeOutages.filter(o => o.status === 'upcoming' || o.status === 'delayed'), [activeOutages]);

  // Search Logic
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedSearch) return null;
    return activeOutages.filter(o => {
      const haystack = [
        o.area,
        o.city,
        ...(o.barangays || []),
        o.streets,
        o.reason,
      ].join(' ').toLowerCase();
      return haystack.includes(trimmedSearch);
    });
  }, [activeOutages, trimmedSearch]);

  // Pinned Places Status Summary
  const pinnedStatus = useMemo(() => {
    if (favorites.length === 0) return [];
    return favorites.map(fav => {
      const matching = activeOutages.filter(o => isOutageAffectingFavorites(o, [fav]));
      const ongoing = matching.find(o => o.status === 'ongoing');
      const upcoming = matching.find(o => o.status === 'upcoming' || o.status === 'delayed');
      
      return {
        name: fav,
        ongoingOutage: ongoing || null,
        upcomingOutage: upcoming || null,
        isClear: !ongoing && !upcoming,
      };
    });
  }, [favorites, activeOutages]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* Minimal Header & Live Grid State                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[var(--label-primary)]">
            Grid Pulse
          </h1>
          <p className="text-[13px] text-[var(--label-secondary-alpha)]">
            Metro Cebu live power status
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tertiary-fill)] border border-[var(--hairline)]">
          <span className={`w-2 h-2 rounded-full ${ongoingOutages.length > 0 ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-green)] animate-pulse-green'}`} />
          <span className="text-[12px] font-mono-tabular font-semibold text-[var(--label-primary)]">
            {ongoingOutages.length > 0 ? `${ongoingOutages.length} Active Outage${ongoingOutages.length > 1 ? 's' : ''}` : 'All Grid Normal'}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pinned Locations Spotlight (if any pinned)                        */}
      {/* ------------------------------------------------------------------ */}
      {favorites.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[var(--label-secondary-alpha)] uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3 text-[var(--accent-orange)] fill-[var(--accent-orange)]" />
              <span>Your Pinned Places</span>
            </span>
            <button
              onClick={onOpenPinDialog}
              className="text-[11px] font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
            >
              Edit Pins
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pinnedStatus.map(item => {
              const hasActive = Boolean(item.ongoingOutage);
              const hasUpcoming = Boolean(item.upcomingOutage);

              return (
                <div
                  key={item.name}
                  onClick={() => {
                    if (item.ongoingOutage) onOpenDetail(item.ongoingOutage);
                    else if (item.upcomingOutage) onOpenDetail(item.upcomingOutage);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasActive 
                      ? 'bg-[var(--accent-red)]/[0.04] border-[var(--accent-red)]/35 cursor-pointer' 
                      : hasUpcoming 
                      ? 'bg-[var(--accent-blue)]/[0.04] border-[var(--accent-blue)]/30 cursor-pointer' 
                      : 'bg-[var(--secondary-bg)] border-[var(--hairline)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[14px] font-bold text-[var(--label-primary)] block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-[var(--label-secondary-alpha)] block">
                        {hasActive 
                          ? `Outage ends ~${item.ongoingOutage?.timeEnd || 'TBD'}` 
                          : hasUpcoming 
                          ? `${item.upcomingOutage?.dateLabel} (${item.upcomingOutage?.time})` 
                          : 'Power operating normally'}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-mono-tabular font-bold ${
                      hasActive
                        ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                        : hasUpcoming
                        ? 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
                        : 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        hasActive ? 'bg-[var(--accent-red)] animate-pulse-red' : hasUpcoming ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-green)]'
                      }`} />
                      <span>{hasActive ? 'OUTAGE' : hasUpcoming ? 'SCHEDULED' : 'ONLINE'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenPinDialog}
          className="w-full p-3.5 rounded-2xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 border border-[var(--hairline)] flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-[var(--label-primary)] block">
                Pin your area for instant brownout alerts
              </span>
              <span className="text-[11px] text-[var(--label-secondary-alpha)] block">
                Tap to select your barangay or city
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)] group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Clean Universal Search Bar                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <div className="relative flex items-center h-11 rounded-2xl bg-[var(--tertiary-fill)] px-3.5 focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/40 transition-all border border-[var(--hairline)]">
          <Search className="w-4 h-4 text-[var(--label-tertiary)] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any barangay or street..."
            aria-label="Search power status"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full pl-2.5 pr-8 bg-transparent text-[16px] sm:text-[14px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-[var(--label-tertiary)]/30 text-[var(--label-primary)] flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--label-tertiary)]/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search Results / All-Clear Verdict */}
        <AnimatePresence mode="wait">
          {trimmedSearch && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {searchResults && searchResults.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[var(--label-secondary-alpha)] px-1 block">
                    {searchResults.length} advisory match{searchResults.length > 1 ? 'es' : ''} for &ldquo;{searchQuery}&rdquo;:
                  </span>

                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenDetail(item)}
                      className="p-3.5 rounded-2xl border bg-[var(--secondary-bg)] border-[var(--hairline)] hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-[var(--label-secondary-alpha)] flex items-center gap-1 font-mono-tabular">
                            <MapPin className="w-3 h-3 text-[var(--accent-blue)]" />
                            <span>{item.city} • {item.dateLabel}</span>
                          </div>
                          <h3 className="text-[15px] font-bold text-[var(--label-primary)]">
                            {item.area}
                          </h3>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono-tabular font-bold ${
                          item.status === 'ongoing'
                            ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                            : 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
                        }`}>
                          {item.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--label-secondary-alpha)] pt-1 border-t border-[var(--hairline)]">
                        <span className="font-mono-tabular flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.time}</span>
                        </span>
                        <span className="text-[var(--accent-blue)] font-medium flex items-center gap-0.5">
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)] flex-shrink-0" />
                    <div>
                      <span className="text-[13px] font-bold text-[var(--label-primary)] block">
                        No outages found for &ldquo;{searchQuery}&rdquo;
                      </span>
                      <span className="text-[11px] text-[var(--label-secondary-alpha)] block">
                        Grid is operating normally with no scheduled brownouts.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(searchQuery)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] text-xs font-medium flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Pin</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Active & Upcoming Outages Stream                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)]">
            {ongoingOutages.length > 0 ? 'Active Interruptions' : 'Upcoming Schedule'}
          </span>
          <span className="text-[11px] font-mono-tabular text-[var(--label-secondary-alpha)]">
            {activeOutages.length} Total
          </span>
        </div>

        {activeOutages.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--secondary-bg)] border border-[var(--hairline)] text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-[15px] font-bold text-[var(--label-primary)]">
              No Power Outages Detected
            </div>
            <p className="text-xs text-[var(--label-secondary-alpha)] max-w-xs mx-auto">
              All Visayan Electric feeders in Metro Cebu are energized and running normally.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeOutages.map(item => {
              const isOngoing = item.status === 'ongoing';

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenDetail(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group space-y-3 ${
                    isOngoing
                      ? 'bg-[var(--secondary-bg)] border-[var(--accent-red)]/35 hover:border-[var(--accent-red)]/60'
                      : 'bg-[var(--secondary-bg)] border-[var(--hairline)] hover:border-[var(--label-tertiary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1 font-mono-tabular">
                        <MapPin className="w-3 h-3 text-[var(--accent-blue)]" />
                        <span>{item.city} • {item.dateLabel}</span>
                      </div>
                      <h3 className="text-[16px] font-bold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                        {item.area}
                      </h3>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono-tabular font-bold flex-shrink-0 ${
                      isOngoing
                        ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30'
                        : 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOngoing ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-blue)]'}`} />
                      <span>{item.statusLabel}</span>
                    </span>
                  </div>

                  {/* Countdown bar for ongoing */}
                  {isOngoing && (
                    <OutageCountdownBar
                      timeStart={item.timeStart}
                      timeEnd={item.timeEnd}
                      time={item.time}
                      status={item.status}
                    />
                  )}

                  <div className="flex items-center justify-between text-xs text-[var(--label-secondary-alpha)] pt-1 border-t border-[var(--hairline)] font-mono-tabular">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.time}</span>
                    </span>
                    <span className="text-[var(--accent-blue)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
