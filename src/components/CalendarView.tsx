'use client';

import React, { useState, useMemo } from 'react';
import { MapPin, Clock, ChevronRight, Radio, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Interruption } from '@/types';

interface CalendarViewProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
}

interface DayItem {
  day: string;
  dateNum: string;
  fullDate: string;
  label: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ outages, onOpenDetail }) => {
  // Generate 7-day dynamic horizon based on current date
  const days: DayItem[] = useMemo(() => {
    const list: DayItem[] = [];
    const base = new Date();
    // Start from yesterday (-1) to +5 days ahead
    for (let i = -1; i <= 5; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const num = String(d.getDate());
      const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + (i === 0 ? ' (Today)' : '');
      list.push({ day: dayShort, dateNum: num, fullDate: iso, label });
    }
    return list;
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const selectedDay = days.find(d => d.fullDate === selectedDate) || days[1];
  const dayOutages = outages.filter(o => o.date === selectedDate);

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
      case 'restored':
      case 'completed':
        return {
          pill: 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]',
          icon: <CheckCircle2 className="w-3 h-3 text-[var(--accent-green)]" />,
        };
      default:
        return {
          pill: 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]',
          icon: <Clock className="w-3 h-3 text-[var(--accent-blue)]" />,
        };
    }
  }

  return (
    <div className="space-y-5">
      {/* Editorial Header */}
      <section className="space-y-1 pt-1">
        <span className="text-[12px] font-semibold tracking-wider text-[var(--accent-blue)] uppercase">
          7-Day Forecast
        </span>
        <h2 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
          Timeline
        </h2>
        <p className="ios-subheadline text-xs sm:text-[15px] pt-0.5 leading-relaxed">
          Select any day to inspect planned transformer relocations, line upgrades, and scheduled interruptions.
        </p>
      </section>

      {/* Apple Calendar 7-Day Strip */}
      <div className="ios-grouped-card p-2">
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const isSelected = d.fullDate === selectedDate;
            const hasDayOutages = outages.some(o => o.date === d.fullDate);
            const isToday = d.fullDate === todayIso;

            return (
              <button
                key={d.fullDate}
                onClick={() => setSelectedDate(d.fullDate)}
                className={`py-3 px-1 rounded-xl text-center transition-all cursor-pointer ios-press ${
                  isSelected 
                    ? 'bg-[var(--accent-blue)] text-white shadow-sm' 
                    : 'hover:bg-[var(--tertiary-fill)] text-[var(--label-primary)]'
                }`}
              >
                <span className={`text-[11px] font-medium block uppercase ${
                  isSelected ? 'text-white/80' : isToday ? 'text-[var(--accent-blue)] font-bold' : 'text-[var(--label-secondary-alpha)]'
                }`}>
                  {d.day}
                </span>

                <span className={`text-base sm:text-lg font-bold block mt-0.5 ${
                  isSelected ? 'text-white' : isToday ? 'text-[var(--accent-blue)]' : 'text-[var(--label-primary)]'
                }`}>
                  {d.dateNum}
                </span>

                <div className="flex justify-center mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSelected 
                      ? 'bg-white' 
                      : hasDayOutages 
                        ? 'bg-[var(--accent-orange)]' 
                        : 'bg-transparent'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inset Header */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div>
          <span className="text-[17px] font-semibold text-[var(--label-primary)] block">
            {selectedDay.label}
          </span>
          <span className="text-xs text-[var(--label-secondary-alpha)]">
            {dayOutages.length} advisory recorded
          </span>
        </div>

        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] font-medium">
          {dayOutages.length > 0 ? `${dayOutages.length} Scheduled` : 'All Clear'}
        </span>
      </div>

      {/* Outage Cards List */}
      <div className="space-y-3">
        {dayOutages.length === 0 ? (
          <div className="ios-grouped-card p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[var(--accent-green)] mx-auto" />
            <div className="text-[17px] font-semibold text-[var(--label-primary)]">
              No interruptions scheduled
            </div>
            <div className="text-xs text-[var(--label-secondary-alpha)] max-w-xs mx-auto">
              Power grid supply for {selectedDay.day} is nominal across the Visayan Electric network.
            </div>
          </div>
        ) : (
          dayOutages.map(item => {
            const style = getStatusStyle(item.status);

            return (
              <article 
                key={item.id}
                onClick={() => onOpenDetail(item)}
                className="ios-grouped-card p-4 sm:p-5 hover:border-[var(--accent-blue)]/50 transition-all space-y-3 cursor-pointer group ios-press-subtle"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                      <span>{item.city}</span>
                    </div>
                    <h3 className="text-[17px] font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {item.area}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${style.pill} flex-shrink-0`}>
                    {style.icon}
                    <span>{item.statusLabel}</span>
                  </span>
                </div>

                {/* Time & Feeder */}
                <div className="text-xs text-[var(--label-secondary-alpha)] flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--tertiary-fill)] text-[var(--label-primary)] font-medium inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--label-tertiary)]" />
                    <span>{item.time}</span>
                  </span>
                  <span className="truncate text-xs">
                    {item.streets || 'Designated feeder lines'}
                  </span>
                </div>

                <p className="text-xs text-[var(--label-secondary-alpha)] leading-relaxed line-clamp-2">
                  {item.reason}
                </p>

                <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between text-[11px] text-[var(--label-secondary-alpha)]">
                  <span>Dispatch: {item.fbTime}</span>
                  <span className="text-[var(--accent-blue)] font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect feeder & map</span>
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
