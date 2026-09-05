'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, ArrowRight, Radio, AlertTriangle, CheckCircle2, X } from 'lucide-react';
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
  const [selectedDate, setSelectedDate] = useState('2026-09-05');

  const days: DayItem[] = [
    { day: "Wed", dateNum: "2", fullDate: "2026-09-02", label: "Wednesday, Sep 2" },
    { day: "Thu", dateNum: "3", fullDate: "2026-09-03", label: "Thursday, Sep 3" },
    { day: "Fri", dateNum: "4", fullDate: "2026-09-04", label: "Friday, Sep 4" },
    { day: "Sat", dateNum: "5", fullDate: "2026-09-05", label: "Saturday, Sep 5 (Today)" },
    { day: "Sun", dateNum: "6", fullDate: "2026-09-06", label: "Sunday, Sep 6" },
    { day: "Mon", dateNum: "7", fullDate: "2026-09-07", label: "Monday, Sep 7" },
    { day: "Tue", dateNum: "8", fullDate: "2026-09-08", label: "Tuesday, Sep 8" },
  ];

  const selectedDay = days.find(d => d.fullDate === selectedDate) || days[3];
  const dayOutages = outages.filter(o => o.date === selectedDate);

  function getBadgeClass(status: string) {
    switch (status) {
      case 'ongoing': return 'bg-rose-950/70 text-rose-300 border border-rose-800/40';
      case 'delayed': return 'bg-amber-950/70 text-amber-300 border border-amber-800/40';
      case 'cancelled': return 'bg-zinc-900 text-zinc-400 border border-zinc-800 line-through';
      case 'restored': return 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40';
      case 'completed': return 'bg-sky-950/70 text-sky-300 border border-sky-800/40';
      default: return 'bg-blue-950/70 text-blue-300 border border-blue-800/40';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'ongoing': return <Radio className="w-3 h-3 text-rose-400 animate-pulse" />;
      case 'delayed': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'cancelled': return <X className="w-3 h-3 text-zinc-400" />;
      case 'restored': return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      default: return <Clock className="w-3 h-3 text-blue-400" />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Week View</h2>
        <p className="text-xs text-zinc-400">Select any day to inspect planned interruptions across Metro Cebu.</p>
      </div>

      {/* 7-Day Strip */}
      <div className="grid grid-cols-7 gap-1.5 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xs">
        {days.map(d => {
          const isSelected = d.fullDate === selectedDate;
          const hasDayOutages = outages.some(o => o.date === d.fullDate);

          return (
            <button
              key={d.fullDate}
              onClick={() => setSelectedDate(d.fullDate)}
              className={`py-2.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs' 
                  : 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className={`text-[10px] uppercase font-mono block ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {d.day}
              </span>
              <span className="text-sm font-semibold block mt-0.5">{d.dateNum}</span>
              <div className="flex justify-center mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-amber-400' : (hasDayOutages ? 'bg-amber-500' : 'bg-zinc-700')
                }`}></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Header */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
        <div>
          <span className="text-sm font-semibold text-zinc-100 block">{selectedDay.label}</span>
          <span className="text-xs text-zinc-400">{dayOutages.length} interruption{dayOutages.length === 1 ? '' : 's'} recorded</span>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
          Week 36
        </span>
      </div>

      {/* Day's Outages */}
      <div className="space-y-3">
        {dayOutages.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-500">
            <span>No interruptions scheduled on this date.</span>
          </div>
        ) : (
          dayOutages.map(item => (
            <motion.article 
              key={item.id}
              whileHover={{ y: -1 }}
              onClick={() => onOpenDetail(item)}
              className="glass-card rounded-xl p-4 space-y-2.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  <span>{item.city}</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${getBadgeClass(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span>{item.statusLabel}</span>
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">{item.area}</h3>
                <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{item.time}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2">{item.reason}</p>
              <div className="pt-1 text-[11px] text-blue-400 group-hover:underline flex items-center gap-1 font-medium">
                <span>View estimated zone map</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.article>
          ))
        )}
      </div>
    </div>
  );
};
