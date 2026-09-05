'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Zap, CheckCircle2 } from 'lucide-react';
import { parseTimeToMinutes } from '@/lib/status-utils';

interface OutageCountdownBarProps {
  timeStart?: string;
  timeEnd?: string;
  time?: string;
  status?: string;
  compact?: boolean;
}

function formatMinutesToHours(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const OutageCountdownBar: React.FC<OutageCountdownBarProps> = ({
  timeStart,
  timeEnd,
  time,
  status = 'ongoing',
  compact = false,
}) => {
  const [, setTick] = useState(0);

  // Re-evaluate every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Parse start and end times
  let startMinutes = parseTimeToMinutes(timeStart);
  let endMinutes = parseTimeToMinutes(timeEnd);

  if ((startMinutes === null || endMinutes === null) && time) {
    const parts = time.split(/[–-]/);
    if (parts.length >= 2) {
      if (startMinutes === null) startMinutes = parseTimeToMinutes(parts[0]);
      if (endMinutes === null) endMinutes = parseTimeToMinutes(parts[1]);
    }
  }

  if (startMinutes === null) startMinutes = 8 * 60;
  if (endMinutes === null) endMinutes = 17 * 60;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Overnight check
  const isOvernight = endMinutes < startMinutes;
  const totalDuration = isOvernight
    ? 1440 - startMinutes + endMinutes
    : Math.max(1, endMinutes - startMinutes);

  let elapsedMinutes = 0;
  let remainingMinutes = 0;

  if (isOvernight) {
    if (currentMinutes >= startMinutes) {
      elapsedMinutes = currentMinutes - startMinutes;
    } else if (currentMinutes <= endMinutes) {
      elapsedMinutes = 1440 - startMinutes + currentMinutes;
    } else {
      elapsedMinutes = totalDuration;
    }
  } else {
    elapsedMinutes = Math.min(totalDuration, Math.max(0, currentMinutes - startMinutes));
  }

  remainingMinutes = Math.max(0, totalDuration - elapsedMinutes);
  const percent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / totalDuration) * 100)));

  // Format restoration time in 12h format
  const restHour24 = Math.floor(endMinutes / 60) % 24;
  const restMin = String(endMinutes % 60).padStart(2, '0');
  const restAmpm = restHour24 >= 12 ? 'PM' : 'AM';
  const restHour12 = restHour24 % 12 === 0 ? 12 : restHour24 % 12;
  const restorationLabel = `${restHour12}:${restMin} ${restAmpm}`;

  if (status === 'restored' || status === 'completed') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--accent-green)] font-medium font-mono-tabular">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Power Restored</span>
      </div>
    );
  }

  if (status !== 'ongoing') {
    // Upcoming schedule
    const minsUntilStart = Math.max(0, startMinutes - currentMinutes);
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular text-[var(--label-secondary-alpha)]">
        <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)] flex-shrink-0" />
        <span>
          {minsUntilStart > 0 && minsUntilStart <= 240
            ? `Begins in ${formatMinutesToHours(minsUntilStart)}`
            : `Scheduled window: ${time || `${timeStart} – ${timeEnd}`}`}
        </span>
      </div>
    );
  }

  // Active Outage (In Progress)
  if (compact) {
    return (
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular font-semibold">
          <span className="text-[var(--accent-red)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
            <span>{percent}% elapsed ({formatMinutesToHours(elapsedMinutes)})</span>
          </span>
          <span className="text-[var(--label-secondary-alpha)]">
            ~{formatMinutesToHours(remainingMinutes)} left
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--tertiary-fill)] overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-red)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ios-grouped-card p-3.5 sm:p-4 border border-[var(--accent-red)]/25 bg-[var(--accent-red)]/[0.04] space-y-3">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-red)]/15 text-[var(--accent-red)] flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 fill-current text-[var(--accent-red)]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--label-primary)] uppercase tracking-wider block">
              Outage Progress
            </span>
            <span className="text-[11px] text-[var(--label-secondary-alpha)] font-mono-tabular">
              Active Feeder De-energization
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular font-bold bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
          <span>IN PROGRESS</span>
        </span>
      </div>

      {/* Progress Bar with Glow Head */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 rounded-full bg-[var(--tertiary-fill)] overflow-hidden relative border border-[var(--hairline)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-orange)] via-[var(--accent-red)] to-[var(--accent-red)] transition-all duration-500 ease-out relative"
            style={{ width: `${percent}%` }}
          >
            {/* Glowing marker head */}
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full opacity-80 blur-[1px]" />
          </div>
        </div>

        {/* Tabular Telemetry Stats */}
        <div className="flex items-center justify-between text-xs font-mono-tabular text-[var(--label-secondary-alpha)] pt-0.5">
          <span>Elapsed: <strong className="text-[var(--label-primary)]">{formatMinutesToHours(elapsedMinutes)}</strong> ({percent}%)</span>
          <span>Remaining: <strong className="text-[var(--accent-red)]">{formatMinutesToHours(remainingMinutes)}</strong></span>
        </div>
      </div>

      {/* Target Restoration Notice */}
      <div className="pt-2 border-t border-[var(--hairline-inset)] flex items-center justify-between text-xs font-mono-tabular">
        <span className="text-[var(--label-secondary-alpha)]">Est. Power Restoration:</span>
        <span className="font-bold text-[var(--label-primary)] flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
          <span>{restorationLabel} PHT</span>
        </span>
      </div>
    </div>
  );
};
