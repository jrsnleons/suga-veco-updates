'use client';

import React, { useState } from 'react';
import { 
  Search, X, Clock, ChevronRight, Radio, 
  AlertTriangle, CheckCircle2, MapPin, ShieldCheck
} from 'lucide-react';
import { Interruption } from '@/types';

interface StatusFeedProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
  favorites: string[];
  onToggleFavorite: (brgy: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const StatusFeed: React.FC<StatusFeedProps> = ({
  outages,
  onOpenDetail,
  favorites,
  onToggleFavorite,
  searchQuery,
  setSearchQuery,
}) => {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'delayed' | 'upcoming'>('all');

  const activeOutages = outages.filter(o => !o.isPast);
  const q = searchQuery.toLowerCase().trim();

  function getStatusPriority(status: string): number {
    switch (status) {
      case 'ongoing': return 1;    // In Progress first!
      case 'delayed': return 2;    // Delayed start
      case 'upcoming': return 3;   // Scheduled / upcoming
      case 'cancelled': return 4;  // Cancelled
      case 'restored': return 5;
      default: return 3;
    }
  }

  const filtered = activeOutages.filter(item => {
    const matchesFilter = (filter === 'all') || (item.status === filter);
    if (!q) return matchesFilter;

    const hay = [item.area, item.city, ...(item.barangays || []), item.streets, item.reason].join(' ').toLowerCase();
    return matchesFilter && hay.includes(q);
  });

  // Sort: In-Progress first -> Chronological by Date -> Chronological by Time Start
  filtered.sort((a, b) => {
    const pA = getStatusPriority(a.status);
    const pB = getStatusPriority(b.status);
    if (pA !== pB) return pA - pB;

    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    const timeA = a.timeStart || '';
    const timeB = b.timeStart || '';
    return timeA.localeCompare(timeB);
  });

  const hit = q && filtered.length > 0 ? filtered[0] : null;

  // Counts for Apple Health style metric summary cards
  const ongoingCount = activeOutages.filter(o => o.status === 'ongoing').length;
  const delayedCount = activeOutages.filter(o => o.status === 'delayed').length;
  const upcomingCount = activeOutages.filter(o => o.status === 'upcoming').length;

  function getStatusStyle(status: string) {
    switch (status) {
      case 'ongoing':
        return {
          pill: 'bg-[var(--accent-red)]/12 text-[var(--accent-red)]',
          icon: <Radio className="w-3 h-3 text-[var(--accent-red)] animate-pulse" />,
        };
      case 'delayed':
        return {
          pill: 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]',
          icon: <AlertTriangle className="w-3 h-3 text-[var(--accent-orange)]" />,
        };
      case 'cancelled':
        return {
          pill: 'bg-[var(--tertiary-fill)] text-[var(--label-tertiary)] line-through',
          icon: <X className="w-3 h-3 text-[var(--label-tertiary)]" />,
        };
      default:
        return {
          pill: 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]',
          icon: <Clock className="w-3 h-3 text-[var(--accent-blue)]" />,
        };
    }
  }

  return (
    <div className="space-y-6">
      {/* iOS Large Title Hero */}
      <section className="space-y-3 pt-1">
        <div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--accent-blue)] uppercase">
            Visayan Electric Grid
          </span>
          <h1 className="ios-large-title text-[30px] sm:text-[34px] tracking-tight">
            Grid Radar
          </h1>
          <p className="ios-subheadline text-xs sm:text-[15px] pt-1 leading-relaxed">
            Instant outage monitoring, live scheduled feeder maintenance, and restoration tracking across Metro Cebu.
          </p>
        </div>

        {/* Apple Native UISearchBar */}
        <div className="relative pt-1">
          <div className="relative flex items-center h-11 rounded-xl bg-[var(--tertiary-fill)] px-3 focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/40 transition-all">
            <Search className="w-4 h-4 text-[var(--label-tertiary)] flex-shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your barangay (e.g. Lahug, Guadalupe, Maguikay)..." 
              className="w-full pl-2.5 pr-8 bg-transparent text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-[var(--label-tertiary)]/30 hover:bg-[var(--label-tertiary)]/50 text-[var(--label-primary)] flex items-center justify-center text-xs cursor-pointer transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Filter Barangay Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 px-1">
            <span className="text-[11px] font-medium text-[var(--label-secondary-alpha)]">Popular:</span>
            {['Lahug', 'Guadalupe', 'Mabolo', 'Maguikay', 'Apas'].map(brgy => (
              <button 
                key={brgy}
                onClick={() => setSearchQuery(brgy)}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--secondary-bg)] border border-[var(--hairline)] hover:border-[var(--accent-blue)] text-[var(--label-secondary)] hover:text-[var(--accent-blue)] transition-colors cursor-pointer ios-press"
              >
                {brgy}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Apple Health-Style Summary Metric Cards */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="ios-grouped-card p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--label-secondary-alpha)] uppercase">In Progress</span>
            <Radio className={`w-3.5 h-3.5 ${ongoingCount > 0 ? 'text-[var(--accent-red)] animate-pulse' : 'text-[var(--accent-green)]'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${ongoingCount > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}>
            {ongoingCount}
          </div>
          <span className="text-[10px] text-[var(--label-secondary-alpha)] block truncate">
            {ongoingCount > 0 ? 'Active interrupts' : 'All lines nominal'}
          </span>
        </div>

        <div className="ios-grouped-card p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--label-secondary-alpha)] uppercase">Delayed</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-orange)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--accent-orange)]">
            {delayedCount}
          </div>
          <span className="text-[10px] text-[var(--label-secondary-alpha)] block truncate">
            Pending start
          </span>
        </div>

        <div className="ios-grouped-card p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--label-secondary-alpha)] uppercase">Upcoming</span>
            <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--accent-blue)]">
            {upcomingCount}
          </div>
          <span className="text-[10px] text-[var(--label-secondary-alpha)] block truncate">
            7-day schedule
          </span>
        </div>
      </section>

      {/* Direct Search Diagnostic Callout */}
      {q && (
        <div className="ios-grouped-card p-4 transition-all">
          {hit ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(hit.status).pill}`}>
                  {getStatusStyle(hit.status).icon}
                  <span>Advisory Active for &quot;{searchQuery}&quot;</span>
                </div>

                <button 
                  onClick={() => onToggleFavorite(searchQuery)}
                  className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer ios-press"
                >
                  <MapPin className="w-3.5 h-3.5 fill-current" />
                  <span>{favorites.includes(searchQuery) ? 'Pinned' : '+ Pin Location'}</span>
                </button>
              </div>

              <div className="text-[16px] font-semibold text-[var(--label-primary)]">
                {hit.statusLabel}: {hit.area} ({hit.city})
              </div>

              <div className="text-xs text-[var(--label-secondary-alpha)] flex items-center gap-2">
                <span>{hit.dateLabel}</span>
                <span>•</span>
                <span className="font-medium text-[var(--label-primary)]">{hit.time}</span>
              </div>

              <button 
                onClick={() => onOpenDetail(hit)} 
                className="text-xs font-medium text-[var(--accent-blue)] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Inspect designated feeder streets & zone map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-green)]/12 text-[var(--accent-green)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                  <span>All Clear for &quot;{searchQuery}&quot;</span>
                </div>

                <button 
                  onClick={() => onToggleFavorite(searchQuery)}
                  className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer ios-press"
                >
                  <MapPin className="w-3.5 h-3.5 fill-current" />
                  <span>{favorites.includes(searchQuery) ? 'Pinned' : '+ Pin Location'}</span>
                </button>
              </div>

              <div className="text-[16px] font-semibold text-[var(--label-primary)]">
                No active interruptions recorded.
              </div>
              <div className="text-xs text-[var(--label-secondary-alpha)]">
                Normal power supply verified with the latest Visayan Electric dispatch.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Filter & Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--label-secondary-alpha)] uppercase tracking-wider">
            FEED ADVISORIES ({filtered.length})
          </span>
          {activeOutages.some(o => o.status === 'ongoing') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-red)]/12 text-[10px] text-[var(--accent-red)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
              <span>In Progress Now</span>
            </span>
          )}
        </div>

        {/* Apple Native Segmented Control */}
        <div className="inline-flex p-0.5 rounded-lg bg-[var(--tertiary-fill)] text-xs font-medium">
          {(['all', 'ongoing', 'delayed', 'upcoming'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filter === f 
                  ? 'bg-[var(--secondary-bg)] text-[var(--label-primary)] shadow-xs font-semibold' 
                  : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'ongoing' ? 'In Progress' : f === 'delayed' ? 'Delayed' : 'Upcoming'}
            </button>
          ))}
        </div>
      </div>

      {/* Inset Grouped / Elevated Outage Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="ios-grouped-card p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-[var(--accent-green)] mx-auto" />
            <div className="text-[17px] font-semibold text-[var(--label-primary)]">
              No matching advisories
            </div>
            <div className="text-xs text-[var(--label-secondary-alpha)] max-w-xs mx-auto">
              All electrical feeder lines are operating normally for this selection.
            </div>
          </div>
        ) : (
          filtered.map(item => {
            const style = getStatusStyle(item.status);

            return (
              <article 
                key={item.id}
                onClick={() => onOpenDetail(item)}
                className="ios-grouped-card p-4 sm:p-5 hover:border-[var(--accent-blue)]/50 transition-all space-y-3 cursor-pointer group ios-press-subtle"
              >
                {/* Top Row: City/Date + Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-medium text-[var(--label-secondary-alpha)]">
                      {item.city} • {item.dateLabel}
                    </div>
                    <h3 className="text-[17px] font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                      {item.area}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${style.pill} flex-shrink-0`}>
                    {style.icon}
                    <span>{item.statusLabel}</span>
                  </span>
                </div>

                {/* Time & Streets */}
                <div className="text-xs text-[var(--label-secondary-alpha)] flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--tertiary-fill)] text-[var(--label-primary)] font-medium inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--label-tertiary)]" />
                    <span>{item.time}</span>
                  </span>
                  <span className="truncate text-xs">
                    {item.streets || 'Portions of affected feeder lines'}
                  </span>
                </div>

                {/* Scope & Reason */}
                <p className="text-xs text-[var(--label-secondary-alpha)] leading-relaxed line-clamp-2">
                  {item.reason}
                </p>

                {/* Footer disclosure */}
                <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between text-[11px] text-[var(--label-secondary-alpha)]">
                  <span>VECO Dispatch {item.fbTime}</span>
                  <span className="text-[var(--accent-blue)] font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect scope & map</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
