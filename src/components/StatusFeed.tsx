'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, X, Clock, ArrowRight, Radio, 
  AlertTriangle, CheckCircle2, Star, LightbulbOff
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
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'delayed' | 'cancelled'>('all');

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

  function getBadgeClass(status: string) {
    switch (status) {
      case 'ongoing': return 'bg-rose-950/70 text-rose-300 border border-rose-800/40';
      case 'delayed': return 'bg-amber-950/70 text-amber-300 border border-amber-800/40';
      case 'cancelled': return 'bg-zinc-900 text-zinc-400 border border-zinc-800 line-through';
      default: return 'bg-blue-950/70 text-blue-300 border border-blue-800/40';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'ongoing': return <Radio className="w-3 h-3 text-rose-400 animate-pulse" />;
      case 'delayed': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'cancelled': return <X className="w-3 h-3 text-zinc-400" />;
      default: return <Clock className="w-3 h-3 text-blue-400" />;
    }
  }

  return (
    <div className="space-y-5">
      {/* Search Hero */}
      <div className="text-center space-y-2.5 pt-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
          Is your power affected?
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
          Type your barangay to instantly look up scheduled maintenance, delays, or outages.
        </p>

        <div className="relative max-w-md mx-auto pt-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your barangay (e.g. Lahug, Guadalupe, Maguikay)..." 
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-zinc-100 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs text-zinc-500 pt-0.5">
          <span>Quick:</span>
          {['Lahug', 'Guadalupe', 'Maguikay', 'Cadulawan'].map(brgy => (
            <button 
              key={brgy}
              onClick={() => setSearchQuery(brgy)}
              className="px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {brgy}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Answer Box */}
      {q && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border transition-all ${
            hit 
              ? (hit.status === 'cancelled' 
                  ? 'bg-zinc-900 border-zinc-800' 
                  : hit.status === 'ongoing' 
                    ? 'bg-rose-950/30 border-rose-800/40' 
                    : hit.status === 'delayed'
                      ? 'bg-amber-950/30 border-amber-800/40'
                      : 'bg-blue-950/20 border-blue-800/30') 
              : 'bg-emerald-950/20 border-emerald-800/30'
          }`}
        >
          {hit ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  hit.status === 'cancelled' 
                    ? 'text-zinc-400' 
                    : hit.status === 'ongoing' 
                      ? 'text-rose-400' 
                      : hit.status === 'delayed'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                }`}>
                  {getStatusIcon(hit.status)}
                  <span>Advisory for &quot;{searchQuery}&quot;</span>
                </div>
                <button 
                  onClick={() => onToggleFavorite(searchQuery)}
                  className="text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Star className={`w-3.5 h-3.5 ${favorites.includes(searchQuery) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{favorites.includes(searchQuery) ? 'Pinned' : '+ Pin'}</span>
                </button>
              </div>
              <div className="text-sm font-semibold text-zinc-100">
                {hit.statusLabel} in {hit.area} ({hit.dateLabel})
              </div>
              <div className="text-xs text-zinc-400">
                {hit.time} • {hit.reason}
              </div>
              <button 
                onClick={() => onOpenDetail(hit)} 
                className="text-xs text-blue-400 hover:underline font-medium inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>View full streets & zone map</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>All Clear in &quot;{searchQuery}&quot;</span>
                </div>
                <button 
                  onClick={() => onToggleFavorite(searchQuery)}
                  className="text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Star className={`w-3.5 h-3.5 ${favorites.includes(searchQuery) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{favorites.includes(searchQuery) ? 'Pinned' : '+ Pin'}</span>
                </button>
              </div>
              <div className="text-sm font-semibold text-zinc-100">No power interruptions scheduled.</div>
              <div className="text-xs text-zinc-400">Power is normal according to latest VECO feed.</div>
            </div>
          )}
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">Active Advisories</span>
          {activeOutages.some(o => o.status === 'ongoing') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/60 text-[10px] text-rose-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              <span>In Progress Now</span>
            </span>
          )}
        </div>
        <div className="inline-flex p-1 rounded-lg bg-zinc-900 border border-zinc-800/80 text-[11px]">
          {(['all', 'ongoing', 'delayed', 'cancelled'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filter === f 
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'ongoing' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Outage Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1.5">
            <LightbulbOff className="w-6 h-6 text-zinc-500 mx-auto" />
            <div className="text-sm font-medium text-zinc-300">No matching advisories</div>
            <div className="text-xs text-zinc-500">All clear for this filter selection.</div>
          </div>
        ) : (
          filtered.map(item => (
            <motion.article 
              key={item.id}
              whileHover={{ y: -1 }}
              onClick={() => onOpenDetail(item)}
              className="glass-card rounded-xl p-4 sm:p-5 transition-all space-y-3 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-zinc-400 font-medium">{item.city} • {item.dateLabel}</div>
                  <h3 className="text-base font-semibold text-zinc-100 tracking-tight mt-0.5 group-hover:text-blue-400 transition-colors">
                    {item.area}
                  </h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${getBadgeClass(item.status)} flex-shrink-0`}>
                  {getStatusIcon(item.status)}
                  <span>{item.statusLabel}</span>
                </span>
              </div>

              <div className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{item.time}</span>
                </span>
                <span className="text-zinc-500 truncate text-[11px]">
                  {item.streets}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {item.reason}
              </p>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Posted {item.fbTime}</span>
                <span className="text-blue-400 group-hover:underline font-medium inline-flex items-center gap-1">
                  <span>View map & details</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.article>
          ))
        )}
      </div>
    </div>
  );
};
