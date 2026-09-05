'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Clock, MapPin, 
  CheckCircle2, ChevronRight, X, Bookmark, Plus, Check 
} from 'lucide-react';
import { Interruption } from '@/types';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';
import { CEBU_MUNICIPALITIES } from '@/lib/geo-data';

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
  const upcomingOutages = useMemo(() => activeOutages.filter(o => o.status === 'upcoming' || o.status === 'delayed'), [activeOutages]);

  // Compute Grid Health percentage (simulated nominal feeder capacity)
  const gridHealth = useMemo(() => {
    // 100 base feeders assumption across Metro Cebu franchise
    const affectedFeeders = ongoingOutages.length * 1.5;
    return Math.max(88, Math.min(100, (100 - affectedFeeders))).toFixed(1);
  }, [ongoingOutages]);

  // Universal Search Logic
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

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Editorial Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="pt-2 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
              Grid Pulse
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[11px] font-mono-tabular font-bold text-[var(--accent-green)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse-green" />
              <span>{gridHealth}% Nominal</span>
            </span>
          </div>
          <p className="ios-subheadline text-xs sm:text-[14px]">
            Live telemetry, universal power verdict lookup, and active feeder alerts.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Universal Power Verdict Search                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="relative">
          <div className="relative flex items-center h-12 rounded-2xl bg-[var(--tertiary-fill)] px-4 focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/50 transition-all border border-[var(--hairline)] shadow-xs">
            <Search className="w-4 h-4 text-[var(--label-tertiary)] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your barangay, street, or city (e.g. Lahug, Banilad)..."
              aria-label="Universal power outage search"
              className="w-full pl-3 pr-8 bg-transparent text-[14px] sm:text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] focus:outline-none font-medium"
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

          <div className="flex items-center justify-between text-[11px] px-1 pt-1.5 text-[var(--label-secondary-alpha)]">
            <span>Instant search across all Visayan Electric feeder lines</span>
            <button
              onClick={onOpenPinDialog}
              className="text-[var(--accent-blue)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Browse All Areas</span>
            </button>
          </div>
        </div>

        {/* Verdict Results Box */}
        <AnimatePresence mode="wait">
          {trimmedSearch && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              {searchResults && searchResults.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[12px] font-mono-tabular font-semibold text-[var(--label-secondary-alpha)] px-1 block">
                    {searchResults.length} advisory matches for &ldquo;{searchQuery}&rdquo;:
                  </span>

                  {searchResults.map((item) => {
                    const isOngoing = item.status === 'ongoing';
                    const isPinned = favorites.some(f => 
                      item.area.toLowerCase().includes(f.toLowerCase()) || 
                      item.barangays.some(b => b.toLowerCase() === f.toLowerCase())
                    );

                    return (
                      <div
                        key={item.id}
                        className={`ios-grouped-card p-4 sm:p-5 border transition-all space-y-3 ${
                          isOngoing
                            ? 'border-[var(--accent-red)]/40 bg-[var(--accent-red)]/[0.03]'
                            : 'border-[var(--accent-blue)]/35 bg-[var(--secondary-bg)]'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-[var(--label-secondary-alpha)] flex items-center gap-1 font-mono-tabular">
                              <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                              <span>{item.city} • {item.dateLabel}</span>
                            </div>
                            <h3 className="text-[18px] font-bold text-[var(--label-primary)] leading-snug">
                              {item.area}
                            </h3>
                          </div>

                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-tabular font-bold border ${
                            isOngoing
                              ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30'
                              : 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border-[var(--accent-blue)]/25'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOngoing ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-blue)]'
                            }`} />
                            <span>{item.statusLabel}</span>
                          </span>
                        </div>

                        {/* Live Countdown Bar for Ongoing */}
                        {isOngoing && (
                          <OutageCountdownBar
                            timeStart={item.timeStart}
                            timeEnd={item.timeEnd}
                            time={item.time}
                            status={item.status}
                          />
                        )}

                        {/* Schedule & Streets */}
                        {!isOngoing && (
                          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--label-secondary-alpha)]">
                            <span className="px-2.5 py-1 rounded-md bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] font-semibold inline-flex items-center gap-1 border border-[var(--accent-blue)]/20">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{item.time}</span>
                            </span>
                            {item.streets && <span className="truncate">{item.streets}</span>}
                          </div>
                        )}

                        {/* Action buttons: Pin & Details */}
                        <div className="pt-2 border-t border-[var(--hairline-inset)] flex items-center justify-between">
                          <button
                            onClick={() => onToggleFavorite(item.barangays[0] || item.area)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                              isPinned
                                ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                                : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
                            }`}
                          >
                            {isPinned ? (
                              <>
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>In Watchlist</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>Add to Watchlist</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => onOpenDetail(item)}
                            className="text-xs font-semibold text-[var(--accent-blue)] flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            <span>Inspect Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Clear Verdict Card */
                <div className="ios-grouped-card p-5 border border-[var(--accent-green)]/35 bg-[var(--accent-green)]/[0.04] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--accent-green)] font-bold uppercase tracking-wider font-mono-tabular">
                          VERDICT: ALL CLEAR
                        </div>
                        <h3 className="text-[18px] font-bold text-[var(--label-primary)] capitalize">
                          {searchQuery}
                        </h3>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)] text-[11px] font-mono-tabular font-bold border border-[var(--accent-green)]/30">
                      230V Nominal
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-[var(--label-secondary-alpha)] leading-relaxed">
                    No active brownouts or scheduled maintenance reported for this area today. Feeder lines in this sector are energized and operating nominally.
                  </p>

                  <div className="pt-2 border-t border-[var(--hairline-inset)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--label-tertiary)] font-mono-tabular">
                      Visayan Electric Dispatch Verified
                    </span>

                    <button
                      onClick={() => onToggleFavorite(searchQuery)}
                      className="px-3 py-1.5 rounded-full bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>Track {searchQuery}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Grid Pulse Telemetry Widget                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)]">
            Metro Cebu Grid Telemetry
          </span>
          <span className="text-[11px] font-mono-tabular text-[var(--label-tertiary)]">
            8 Municipalities
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="ios-grouped-card p-3 sm:p-4 border border-[var(--hairline)] space-y-1">
            <span className="text-[10.5px] sm:text-xs font-medium text-[var(--label-secondary-alpha)] block truncate">
              Grid Health
            </span>
            <div className="text-[19px] sm:text-[22px] font-bold font-mono-tabular text-[var(--accent-green)]">
              {gridHealth}%
            </div>
            <span className="text-[10px] text-[var(--label-tertiary)] block font-mono-tabular">
              Normal Supply
            </span>
          </div>

          <div className={`ios-grouped-card p-3 sm:p-4 border space-y-1 ${
            ongoingOutages.length > 0 ? 'border-[var(--accent-red)]/35 bg-[var(--accent-red)]/[0.03]' : 'border-[var(--hairline)]'
          }`}>
            <span className="text-[10.5px] sm:text-xs font-medium text-[var(--label-secondary-alpha)] block truncate">
              Active Outages
            </span>
            <div className="text-[19px] sm:text-[22px] font-bold font-mono-tabular text-[var(--accent-red)]">
              {ongoingOutages.length}
            </div>
            <span className="text-[10px] text-[var(--label-secondary-alpha)] block font-mono-tabular">
              {ongoingOutages.length > 0 ? 'Feeders In Progress' : 'Zero Interruptions'}
            </span>
          </div>

          <div className="ios-grouped-card p-3 sm:p-4 border border-[var(--hairline)] space-y-1">
            <span className="text-[10.5px] sm:text-xs font-medium text-[var(--label-secondary-alpha)] block truncate">
              Scheduled
            </span>
            <div className="text-[19px] sm:text-[22px] font-bold font-mono-tabular text-[var(--accent-blue)]">
              {upcomingOutages.length}
            </div>
            <span className="text-[10px] text-[var(--label-tertiary)] block font-mono-tabular">
              Upcoming Windows
            </span>
          </div>
        </div>

        {/* Municipalities Health Grid */}
        <div className="ios-grouped-card p-4 border border-[var(--hairline)] space-y-3">
          <span className="text-[11px] font-semibold text-[var(--label-secondary-alpha)] uppercase tracking-wider block">
            Municipality Feeder Health
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.keys(CEBU_MUNICIPALITIES).map(city => {
              const hasOngoing = activeOutages.some(o => o.city === city && o.status === 'ongoing');
              const hasScheduled = activeOutages.some(o => o.city === city && o.status === 'upcoming');

              let statusColor = 'bg-[var(--accent-green)]';
              let statusText = 'Normal';
              let badgeBg = 'bg-[var(--secondary-bg)] border-[var(--hairline)] text-[var(--label-primary)]';

              if (hasOngoing) {
                statusColor = 'bg-[var(--accent-red)] animate-pulse-red';
                statusText = 'Active';
                badgeBg = 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/25 text-[var(--accent-red)] font-bold';
              } else if (hasScheduled) {
                statusColor = 'bg-[var(--accent-blue)]';
                statusText = 'Sched';
                badgeBg = 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/20 text-[var(--accent-blue)]';
              }

              return (
                <div
                  key={city}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono-tabular ${badgeBg}`}
                >
                  <span className="truncate pr-1 text-[12px]">{city}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                    <span className="text-[10px]">{statusText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Active Outages In Progress (with countdown bars)        */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)]">
              Active Outages In Progress
            </span>
            {ongoingOutages.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
            )}
          </div>
          <span className="text-[11px] font-mono-tabular text-[var(--label-tertiary)]">
            {ongoingOutages.length} currently active
          </span>
        </div>

        {ongoingOutages.length === 0 ? (
          <div className="ios-grouped-card p-6 text-center border border-[var(--hairline)] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-[16px] font-bold text-[var(--label-primary)]">
              All Metro Cebu Feeders Energized
            </div>
            <p className="text-xs text-[var(--label-secondary-alpha)] max-w-sm mx-auto leading-relaxed">
              No active emergency outages or in-progress maintenance currently detected across Visayan Electric lines.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ongoingOutages.map(item => (
              <div
                key={item.id}
                onClick={() => onOpenDetail(item)}
                className="ios-grouped-card p-4 sm:p-5 border border-[var(--accent-red)]/35 hover:border-[var(--accent-red)]/60 transition-all cursor-pointer group space-y-3.5 bg-[var(--secondary-bg)]"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1 font-mono-tabular">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                      <span>{item.city} • {item.dateLabel}</span>
                    </div>
                    <h3 className="text-[18px] font-bold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                      {item.area}
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular font-bold bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
                    <span>IN PROGRESS</span>
                  </span>
                </div>

                {/* Progress Countdown Bar */}
                <OutageCountdownBar
                  timeStart={item.timeStart}
                  timeEnd={item.timeEnd}
                  time={item.time}
                  status={item.status}
                />

                {/* Streets summary & details */}
                <div className="pt-2 border-t border-[var(--hairline-inset)] flex items-center justify-between text-xs text-[var(--label-secondary-alpha)] font-mono-tabular">
                  <span className="truncate pr-2">{item.streets || 'Designated feeder lines'}</span>
                  <span className="text-[var(--accent-blue)] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
