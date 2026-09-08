'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Clock, MapPin, 
  CheckCircle2, ChevronRight, X, Plus, Radio, Calendar,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Interruption } from '@/types';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';
import { isOutageAffectingFavorites } from '@/lib/notification-manager';
import { formatDateYMD, groupOutagesByDay } from '@/lib/status-utils';
import { getCanonicalCityForBarangay } from '@/lib/geo-data';

interface GridPulseViewProps {
  outages: Interruption[];
  favorites: string[];
  onOpenDetail: (item: Interruption) => void;
  onToggleFavorite: (place: string) => void;
  onOpenPinDialog: () => void;
}

const CEBU_MUNICIPALITIES = [
  'all',
  'Cebu City',
  'Mandaue City',
  'Talisay City',
  'Consolacion',
  'Liloan',
  'Minglanilla',
  'City of Naga',
  'San Fernando'
] as const;

const CARD_LIMIT = 4;

export const GridPulseView: React.FC<GridPulseViewProps> = ({
  outages,
  favorites,
  onOpenDetail,
  onToggleFavorite,
  onOpenPinDialog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  // Progressive disclosure states (expand/collapse large lists)
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [showAllToday, setShowAllToday] = useState(false);
  const [showAllTomorrow, setShowAllTomorrow] = useState(false);
  const [showAllFuture, setShowAllFuture] = useState(false);

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateYMD(now), [now]);

  // Filter outages by selected city before grouping
  const cityFilteredOutages = useMemo(() => {
    if (selectedCity === 'all') return outages;
    return outages.filter(o => o.city === selectedCity);
  }, [outages, selectedCity]);

  const { ongoing, upcomingToday, tomorrow, future, allActive } = useMemo(() => {
    return groupOutagesByDay(cityFilteredOutages, now);
  }, [cityFilteredOutages, now]);

  // Overall city outage stats for tab indicator dots and matrix cards
  const cityOutageStats = useMemo(() => {
    const stats: Record<string, { ongoing: number; upcoming: number; total: number }> = {};
    for (const city of CEBU_MUNICIPALITIES) {
      if (city === 'all') continue;
      stats[city] = { ongoing: 0, upcoming: 0, total: 0 };
    }

    for (const o of outages) {
      if (o.isPast) continue;
      if (!stats[o.city]) {
        stats[o.city] = { ongoing: 0, upcoming: 0, total: 0 };
      }
      stats[o.city].total++;
      if (o.status === 'ongoing') stats[o.city].ongoing++;
      else stats[o.city].upcoming++;
    }
    return stats;
  }, [outages]);

  // Search Logic across all active outages
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedSearch) return null;
    return outages.filter(o => {
      if (o.isPast) return false;
      const haystack = [
        o.area,
        o.barangay,
        o.city,
        ...(o.barangays || []),
        ...(o.otherAffectedBarangays || []),
        o.streets,
        o.reason,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(trimmedSearch);
    });
  }, [outages, trimmedSearch]);

  // Pinned Places Status Summary (Strictly separating today's live status from tomorrow's schedule)
  const pinnedStatus = useMemo(() => {
    if (favorites.length === 0) return [];
    return favorites.map(fav => {
      const matching = outages.filter(o => !o.isPast && isOutageAffectingFavorites(o, [fav]));
      const activeOngoing = matching.find(o => o.date === todayStr && o.status === 'ongoing');
      const activeUpcoming = matching.find(o => o.date === todayStr && (o.status === 'upcoming' || o.status === 'delayed'));
      const tomorrowItem = matching.find(o => o.date > todayStr && o.dateLabel.toLowerCase().includes('tomorrow'));
      const futureItem = matching.find(o => o.date > todayStr && !o.dateLabel.toLowerCase().includes('tomorrow'));
      
      const canonicalCity = getCanonicalCityForBarangay(fav);
      const fallbackNominal: Interruption = {
        id: -1,
        fbPostId: `nominal-${fav}`,
        date: todayStr,
        dateLabel: 'Today',
        timeStart: '00:00',
        timeEnd: '23:59',
        time: '24 Hours',
        type: 'scheduled',
        status: 'restored',
        statusLabel: '230V Nominal • All Clear',
        area: fav,
        barangay: fav,
        city: canonicalCity,
        barangays: [fav],
        streets: 'All feeders and lines energizing this area are operating normally.',
        reason: 'Grid stability is nominal with no ongoing or scheduled power interruptions recorded.',
        fbCaption: `Status for ${fav}, ${canonicalCity}: All Visayan Electric power lines are energized with 230V nominal supply.`,
        fbTime: todayStr,
        isPast: false,
      };

      return {
        name: fav,
        city: canonicalCity,
        ongoingOutage: activeOngoing || null,
        upcomingToday: activeUpcoming || null,
        tomorrowOutage: tomorrowItem || null,
        futureOutage: futureItem || null,
        primaryOutage: activeOngoing || activeUpcoming || tomorrowItem || futureItem || fallbackNominal,
      };
    });
  }, [favorites, outages, todayStr]);

  // Sliced collections for progressive rendering (keeps DOM lightweight)
  const visibleOngoing = useMemo(() => {
    if (showAllOngoing || ongoing.length <= CARD_LIMIT) return ongoing;
    return ongoing.slice(0, CARD_LIMIT);
  }, [ongoing, showAllOngoing]);

  const visibleToday = useMemo(() => {
    if (showAllToday || upcomingToday.length <= CARD_LIMIT) return upcomingToday;
    return upcomingToday.slice(0, CARD_LIMIT);
  }, [upcomingToday, showAllToday]);

  const visibleTomorrow = useMemo(() => {
    if (showAllTomorrow || tomorrow.length <= CARD_LIMIT) return tomorrow;
    return tomorrow.slice(0, CARD_LIMIT);
  }, [tomorrow, showAllTomorrow]);

  const visibleFuture = useMemo(() => {
    if (showAllFuture || future.length <= CARD_LIMIT) return future;
    return future.slice(0, CARD_LIMIT);
  }, [future, showAllFuture]);

  const renderOutageCard = (item: Interruption) => {
    const isOngoing = item.status === 'ongoing';
    const otherCount = (item.otherAffectedBarangays || []).length;

    return (
      <div
        key={item.id}
        onClick={() => onOpenDetail(item)}
        className={`p-4 rounded-2xl border transition-all cursor-pointer group space-y-2.5 ${
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
              {item.barangay || item.area}
            </h3>
            {otherCount > 0 && (
              <span className="text-[11px] text-[var(--label-tertiary)] block font-mono-tabular">
                Part of advisory covering {otherCount + 1} areas
              </span>
            )}
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

        {/* Specific streets snippet if available */}
        {item.streets && (
          <p className="text-xs text-[var(--label-secondary-alpha)] line-clamp-1 leading-relaxed">
            {item.streets}
          </p>
        )}

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
  };

  return (
    <div className="space-y-5">
      {/* Minimal Header & Live Grid State */}
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
          <span className={`w-2 h-2 rounded-full ${ongoing.length > 0 ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-green)] animate-pulse-green'}`} />
          <span className="text-[12px] font-mono-tabular font-semibold text-[var(--label-primary)]">
            {ongoing.length > 0 ? `${ongoing.length} Active Outage${ongoing.length > 1 ? 's' : ''}` : 'All Grid Normal'}
          </span>
        </div>
      </div>

      {/* Pinned Locations Spotlight */}
      {favorites.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[var(--label-secondary-alpha)] uppercase tracking-wider">
              Pinned Locations
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
              const hasUpcomingToday = Boolean(item.upcomingToday);
              const hasTomorrow = Boolean(item.tomorrowOutage);
              const hasFuture = Boolean(item.futureOutage);

              return (
                <div
                  key={item.name}
                  onClick={() => onOpenDetail(item.primaryOutage)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    hasActive 
                      ? 'bg-[var(--accent-red)]/[0.04] border-[var(--accent-red)]/35 hover:border-[var(--accent-red)]/60' 
                      : hasUpcomingToday 
                      ? 'bg-[var(--accent-blue)]/[0.04] border-[var(--accent-blue)]/30 hover:border-[var(--accent-blue)]/50' 
                      : 'bg-[var(--secondary-bg)] border-[var(--hairline)] hover:border-[var(--accent-blue)]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-[var(--label-primary)]">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[var(--label-tertiary)] font-mono-tabular">
                          ({item.city})
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--label-secondary-alpha)] block">
                        {hasActive 
                          ? `Active outage: ${item.ongoingOutage?.time}` 
                          : hasUpcomingToday 
                          ? `Scheduled today: ${item.upcomingToday?.time}` 
                          : hasTomorrow 
                          ? `Normal today • Tomorrow: ${item.tomorrowOutage?.time}` 
                          : hasFuture 
                          ? `Normal today • ${item.futureOutage?.dateLabel}: ${item.futureOutage?.time}` 
                          : 'Power operating normally (230V Nominal)'}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-mono-tabular font-bold flex-shrink-0 ${
                      hasActive
                        ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                        : hasUpcomingToday
                        ? 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
                        : 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        hasActive ? 'bg-[var(--accent-red)] animate-pulse-red' : hasUpcomingToday ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-green)]'
                      }`} />
                      <span>{hasActive ? 'OUTAGE' : hasUpcomingToday ? 'SCHEDULED' : 'ONLINE'}</span>
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

      {/* Native Horizontal Municipality Filter Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-[var(--label-secondary-alpha)] uppercase tracking-wider">
            Filter by Municipality
          </span>
          {selectedCity !== 'all' && (
            <button
              onClick={() => setSelectedCity('all')}
              className="text-[11px] font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {CEBU_MUNICIPALITIES.map(city => {
            const isSelected = selectedCity === city;
            const label = city === 'all' ? 'All Municipalities' : city;
            const stats = city === 'all' 
              ? { ongoing: ongoing.length, total: allActive.length }
              : cityOutageStats[city] || { ongoing: 0, total: 0 };
            const hasOngoing = stats.ongoing > 0;

            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 select-none ${
                  isSelected
                    ? 'bg-[var(--label-primary)] text-[var(--system-bg)] border-transparent font-semibold shadow-xs'
                    : 'bg-[var(--secondary-bg)] border-[var(--hairline)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)] hover:border-[var(--label-tertiary)]'
                }`}
              >
                {hasOngoing && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-red)] animate-pulse-red'}`} />
                )}
                <span>{label}</span>
                {stats.total > 0 && (
                  <span className={`text-[10.5px] font-mono-tabular ${isSelected ? 'opacity-80' : 'text-[var(--label-tertiary)]'}`}>
                    {stats.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Search Bar */}
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

        {/* Search Results */}
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
                    {searchResults.length} match{searchResults.length > 1 ? 'es' : ''} for &ldquo;{searchQuery}&rdquo;:
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
                        Grid is operating normally with no scheduled interruptions.
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
      {/* Clean Tiered Day Streams (Progressively Disclosed)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        {allActive.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--secondary-bg)] border border-[var(--hairline)] text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-[15px] font-bold text-[var(--label-primary)]">
              No Power Outages Detected
            </div>
            <p className="text-xs text-[var(--label-secondary-alpha)] max-w-xs mx-auto">
              {selectedCity === 'all'
                ? 'All Visayan Electric feeders in Metro Cebu are energized and running normally.'
                : `All feeders in ${selectedCity} are energized and running normally.`}
            </p>
          </div>
        ) : (
          <>
            {/* Section 1: Active Interruptions (In Progress) */}
            {ongoing.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                    <Radio className="w-3 h-3 fill-current animate-pulse-red" />
                    <span>Active Today (In Progress)</span>
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold text-[var(--accent-red)]">
                    {ongoing.length} Active
                  </span>
                </div>
                <div className="space-y-2.5">
                  {visibleOngoing.map(renderOutageCard)}
                </div>
                {ongoing.length > CARD_LIMIT && (
                  <button
                    onClick={() => setShowAllOngoing(!showAllOngoing)}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-xs font-semibold text-[var(--accent-blue)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {showAllOngoing ? (
                      <>
                        <span>Show fewer active outages</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show all {ongoing.length} active outages</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Section 2: Scheduled Later Today */}
            {upcomingToday.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)] flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[var(--accent-blue)]" />
                    <span>Scheduled Later Today</span>
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[var(--label-secondary-alpha)]">
                    {upcomingToday.length} Scheduled
                  </span>
                </div>
                <div className="space-y-2.5">
                  {visibleToday.map(renderOutageCard)}
                </div>
                {upcomingToday.length > CARD_LIMIT && (
                  <button
                    onClick={() => setShowAllToday(!showAllToday)}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-xs font-semibold text-[var(--accent-blue)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {showAllToday ? (
                      <>
                        <span>Show fewer scheduled today</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show all {upcomingToday.length} scheduled today</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Section 3: Tomorrow's Schedule */}
            {tomorrow.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)] flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[var(--accent-blue)]" />
                    <span>Tomorrow&apos;s Schedule</span>
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[var(--label-secondary-alpha)]">
                    {tomorrow.length} Scheduled
                  </span>
                </div>
                <div className="space-y-2.5">
                  {visibleTomorrow.map(renderOutageCard)}
                </div>
                {tomorrow.length > CARD_LIMIT && (
                  <button
                    onClick={() => setShowAllTomorrow(!showAllTomorrow)}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-xs font-semibold text-[var(--accent-blue)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {showAllTomorrow ? (
                      <>
                        <span>Show fewer for tomorrow</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show all {tomorrow.length} scheduled for tomorrow</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Section 4: Upcoming Days */}
            {future.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--label-secondary-alpha)]">
                    Upcoming Later
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[var(--label-secondary-alpha)]">
                    {future.length} Total
                  </span>
                </div>
                <div className="space-y-2.5">
                  {visibleFuture.map(renderOutageCard)}
                </div>
                {future.length > CARD_LIMIT && (
                  <button
                    onClick={() => setShowAllFuture(!showAllFuture)}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-xs font-semibold text-[var(--accent-blue)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {showAllFuture ? (
                      <>
                        <span>Show fewer upcoming</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show all {future.length} upcoming days</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

