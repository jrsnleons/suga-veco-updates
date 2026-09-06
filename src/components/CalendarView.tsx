'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Clock, Radio, AlertTriangle, 
  CheckCircle2, X, Search 
} from 'lucide-react';
import { Interruption } from '@/types';
import { parseTimeToMinutes } from '@/lib/status-utils';

interface CalendarViewProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
}

interface DayItem {
  day: string;
  dateNum: string;
  fullDate: string;
  label: string;
  isToday: boolean;
  isYesterday: boolean;
  isTomorrow: boolean;
}

// Asia/Manila (PHT) date formatter ensuring exact alignment with VECO schedule
function getPHTDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
}

export const CalendarView: React.FC<CalendarViewProps> = ({ outages, onOpenDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const todayIso = useMemo(() => getPHTDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Generate 7-day dynamic horizon: yesterday (-1) to +5 days ahead in Cebu time
  const days: DayItem[] = useMemo(() => {
    const list: DayItem[] = [];
    const base = new Date();
    for (let i = -1; i <= 5; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = getPHTDateString(d);
      const dayShort = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
      const num = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'Asia/Manila' }).format(d);
      const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
      list.push({ 
        day: dayShort, 
        dateNum: num, 
        fullDate: iso, 
        label,
        isToday: i === 0,
        isYesterday: i === -1,
        isTomorrow: i === 1,
      });
    }
    return list;
  }, []);

  const selectedDay = days.find(d => d.fullDate === selectedDate) || days[1];
  const q = searchQuery.toLowerCase().trim();

  // Filter outages strictly for the currently selected day (limited to the selected date)
  const dayOutages = useMemo(() => {
    const list = outages.filter(o => {
      if (o.date !== selectedDate) return false;
      if (q) {
        const hay = [o.area, o.city, ...(o.barangays || []), o.streets, o.reason].join(' ').toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    // Sort chronologically by start time
    return list.sort((a, b) => {
      const startA = parseTimeToMinutes(a.timeStart || a.time) || 0;
      const startB = parseTimeToMinutes(b.timeStart || b.time) || 0;
      return startA - startB;
    });
  }, [outages, selectedDate, q]);

  const isToday = selectedDate === todayIso;

  // Find target card ID:
  // - Today: locates the card matching active clock time (or next upcoming)
  // - Other days: null (always starts from the top)
  const targetPostId = useMemo(() => {
    if (!isToday || q || dayOutages.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Look for outage currently in progress right now
    const activeNow = dayOutages.find(o => {
      const start = parseTimeToMinutes(o.timeStart || o.time);
      const end = parseTimeToMinutes(o.timeEnd);
      if (start !== null && end !== null) {
        return currentMinutes >= start && currentMinutes <= end;
      }
      return false;
    });
    if (activeNow) return activeNow.id;

    // Look for next upcoming outage today
    const upcomingToday = dayOutages.filter(o => {
      const start = parseTimeToMinutes(o.timeStart || o.time);
      return start !== null && start >= currentMinutes;
    });
    if (upcomingToday.length > 0) return upcomingToday[0].id;

    // Otherwise latest today
    return dayOutages[dayOutages.length - 1]?.id || null;
  }, [dayOutages, isToday, q]);

  // Locate and auto-scroll behavior:
  // - Today: centers on the active or upcoming schedule card
  // - Other days: resets viewport scroll to the top of the schedule
  useEffect(() => {
    if (q) return;

    if (isToday && targetPostId) {
      const timer = setTimeout(() => {
        const target = document.getElementById('timeline-now-anchor');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 180);

      return () => clearTimeout(timer);
    } else if (!isToday) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedDate, isToday, q, targetPostId]);

  function getStatusStyle(status: string) {
    switch (status) {
      case 'ongoing':
        return {
          pill: 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30',
          pulseClass: 'bg-[var(--accent-red)] animate-pulse-red',
          icon: <Radio className="w-3 h-3 text-[var(--accent-red)]" />,
        };
      case 'delayed':
        return {
          pill: 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border border-[var(--accent-orange)]/30',
          pulseClass: 'bg-[var(--accent-orange)] animate-pulse-amber',
          icon: <AlertTriangle className="w-3 h-3 text-[var(--accent-orange)]" />,
        };
      case 'cancelled':
        return {
          pill: 'bg-[var(--tertiary-fill)] text-[var(--label-tertiary)] border border-[var(--hairline)] line-through',
          pulseClass: 'bg-[var(--label-tertiary)]',
          icon: <X className="w-3 h-3 text-[var(--label-tertiary)]" />,
        };
      case 'restored':
      case 'completed':
        return {
          pill: 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30',
          pulseClass: 'bg-[var(--accent-green)]',
          icon: <CheckCircle2 className="w-3 h-3 text-[var(--accent-green)]" />,
        };
      default:
        return {
          pill: 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20',
          pulseClass: 'bg-[var(--accent-blue)]',
          icon: <Clock className="w-3 h-3 text-[var(--accent-blue)]" />,
        };
    }
  }

  const hasOngoing = dayOutages.some(o => o.status === 'ongoing');

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Opaque STICKY HEADER (Week Numbers + Search)                       */}
      {/* Solid bg-[var(--system-bg)] so underlying cards never bleed through*/}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-3 bg-[var(--system-bg)] border-b border-[var(--hairline)] space-y-2.5 transition-colors shadow-xs">
        
        {/* Top Row: Clean Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--label-primary)]">
            Timeline
          </h1>
          <span className="text-xs font-mono-tabular text-[var(--label-secondary-alpha)]">
            {q ? `${dayOutages.length} matches` : `${dayOutages.length} for ${selectedDay.day}`}
          </span>
        </div>

        {/* 7-Day Numbers Strip: Selects ONE day at a time */}
        <div className="ios-grouped-card p-1 sm:p-1.5 border border-[var(--hairline)]">
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => {
              const isSelected = d.fullDate === selectedDate && !q;
              const hasOutages = outages.some(o => o.date === d.fullDate);
              const isToday = d.isToday;

              return (
                <motion.button
                  key={d.fullDate}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDate(d.fullDate);
                  }}
                  className={`relative py-1.5 sm:py-2 px-0.5 rounded-xl text-center transition-all cursor-pointer select-none outline-none ${
                    isSelected ? 'text-white' : 'hover:bg-[var(--tertiary-fill)] text-[var(--label-primary)]'
                  } ${
                    isToday && !isSelected ? 'ring-2 ring-[var(--accent-blue)] ring-inset bg-[var(--accent-blue)]/8' : ''
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="calendar-sticky-day-pill"
                      className="absolute inset-0 bg-[var(--accent-blue)] rounded-xl shadow-xs z-0"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <span className={`text-[9px] sm:text-[10px] font-mono-tabular font-bold block uppercase relative z-10 ${
                    isSelected ? 'text-white/80' : isToday ? 'text-[var(--accent-blue)] font-extrabold' : 'text-[var(--label-secondary-alpha)]'
                  }`}>
                    {d.day}
                  </span>

                  <span className={`text-[15px] sm:text-[17px] font-bold font-mono-tabular block relative z-10 ${
                    isSelected ? 'text-white' : isToday ? 'text-[var(--accent-blue)] font-black' : 'text-[var(--label-primary)]'
                  }`}>
                    {d.dateNum}
                  </span>

                  <div className="flex items-center justify-center mt-0.5 relative z-10 min-h-[14px]">
                    {isToday ? (
                      <span className={`text-[7.5px] font-mono-tabular font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-[var(--accent-blue)] text-white shadow-xs'
                      }`}>
                        Today
                      </span>
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isSelected 
                          ? 'bg-white' 
                          : hasOutages 
                            ? 'bg-[var(--accent-orange)]' 
                            : 'bg-transparent'
                      }`} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Apple Native Search Input */}
        <div className="relative">
          <div className="relative flex items-center h-10 rounded-xl bg-[var(--tertiary-fill)] px-3 focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/40 transition-all border border-[var(--hairline)]">
            <Search className="w-3.5 h-3.5 text-[var(--label-tertiary)] flex-shrink-0" />
            <input 
              id="timeline-search-input"
              name="timelineSearch"
              aria-label={`Search barangay, street, or city for ${selectedDay.isToday ? 'Today' : selectedDay.day}`}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search within ${selectedDay.isToday ? 'Today' : selectedDay.day}...`} 
              className="w-full pl-2 pr-7 bg-transparent text-[16px] sm:text-[13px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="w-4 h-4 rounded-full bg-[var(--label-tertiary)]/30 text-[var(--label-primary)] flex items-center justify-center text-xs cursor-pointer hover:bg-[var(--label-tertiary)]/50 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Day Scope Header & Single-Day Outages List                         */}
      {/* Displays ONLY the selected day (e.g. Saturday only)                */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4 pt-1">
        
        {/* Selected Day Inset Header */}
        <div className="flex items-center justify-between px-1 border-b border-[var(--hairline-inset)] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] sm:text-[19px] font-bold text-[var(--label-primary)] tracking-tight">
              {selectedDay.isToday ? 'Today' : selectedDay.isYesterday ? 'Yesterday' : selectedDay.isTomorrow ? 'Tomorrow' : selectedDay.day}
              <span className="text-xs font-normal text-[var(--label-secondary-alpha)] ml-2 font-mono-tabular">
                {selectedDay.label}{q ? ` • matching "${searchQuery}"` : ''}
              </span>
            </h2>

            {!q && selectedDay.isToday && hasOngoing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-red)]/15 text-[var(--accent-red)] text-[10px] font-mono-tabular font-bold border border-[var(--accent-red)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
                <span>IN PROGRESS</span>
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono-tabular font-semibold px-2.5 py-1 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] border border-[var(--hairline)]">
            {dayOutages.length > 0 ? `${dayOutages.length} Scheduled` : 'All Clear'}
          </span>
        </div>

        {/* Animated Single-Day List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={q ? `${selectedDate}-search-${q}` : selectedDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="space-y-3"
          >
            {dayOutages.length === 0 ? (
              <div className="ios-grouped-card p-8 text-center space-y-2 border border-[var(--hairline)]">
                <CheckCircle2 className="w-8 h-8 text-[var(--accent-green)] mx-auto" />
                <div className="text-[17px] font-bold text-[var(--label-primary)]">
                  {q ? 'No matching advisories found' : 'No interruptions scheduled'}
                </div>
                <p className="text-xs text-[var(--label-secondary-alpha)] max-w-xs mx-auto leading-relaxed">
                  {q 
                    ? `No scheduled maintenance on ${selectedDay.day} (${selectedDay.label}) matches "${searchQuery}".`
                    : `Power grid supply for ${selectedDay.day} is 100% nominal across all Visayan Electric feeder lines.`}
                </p>
              </div>
            ) : (
              dayOutages.map(item => {
                const style = getStatusStyle(item.status);
                const hasMultipleAreas = (item.barangays || []).length > 1;
                const isTargetPost = item.id === targetPostId;
                const isCurrentTimeFocus = isToday && isTargetPost;

                return (
                  <motion.article 
                    key={item.id}
                    id={isTargetPost ? 'timeline-now-anchor' : undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.area}, ${item.city}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetail(item);
                      }
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onOpenDetail(item)}
                    className={`ios-grouped-card p-4 sm:p-5 hover:border-[var(--accent-blue)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/50 transition-all space-y-2.5 cursor-pointer group select-none relative overflow-hidden border scroll-mt-64 ${
                      isCurrentTimeFocus
                        ? 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/30 shadow-lg shadow-[var(--accent-blue)]/10 bg-[var(--accent-blue)]/[0.03]'
                        : 'border-[var(--hairline)]'
                    }`}
                  >
                    {/* Left highlight indicator for current time focus */}
                    {isCurrentTimeFocus && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--accent-blue)] rounded-l" aria-hidden="true" />
                    )}

                    {/* Header Row: City + Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1.5 font-mono-tabular">
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                          <span>{item.city}</span>
                          {q && <span>• {item.dateLabel}</span>}
                        </div>
                        <h3 className="text-[16px] sm:text-[17px] font-bold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                          {item.area}
                        </h3>
                        {hasMultipleAreas && (
                          <p className="text-[12px] font-medium text-[var(--label-secondary-alpha)] leading-tight pt-0.5">
                            {item.barangays.length} areas affected
                          </p>
                        )}
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular font-bold ${style.pill} flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.pulseClass}`} />
                        <span>{item.statusLabel}</span>
                      </span>
                    </div>

                    {/* Time & Affected Parts Subtext (Gray) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 pt-0.5">
                      <span className="px-2.5 py-1 rounded-md bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] font-bold inline-flex items-center gap-1.5 border border-[var(--accent-blue)]/25 text-xs font-mono-tabular w-fit shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)] shrink-0" />
                        <span>{item.time}</span>
                      </span>

                      {item.streets && (
                        <p className="text-xs text-[var(--label-secondary-alpha)] line-clamp-1 leading-relaxed truncate">
                          {item.streets}
                        </p>
                      )}
                    </div>
                  </motion.article>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
