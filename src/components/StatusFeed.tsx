'use client';

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Plus, Clock, ChevronRight, Radio, 
  MapPin, CheckCircle2, AlertTriangle, Calendar
} from 'lucide-react';
import { Interruption } from '@/types';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';
import { formatDateYMD } from '@/lib/status-utils';
import { getCanonicalCityForBarangay } from '@/lib/geo-data';
import { isOutageAffectingFavorites } from '@/lib/notification-manager';

interface StatusFeedProps {
  outages: Interruption[];
  favorites: string[];
  onOpenDetail: (item: Interruption) => void;
  onOpenPinDialog: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 32 },
  },
};

export const StatusFeed: React.FC<StatusFeedProps> = ({
  outages,
  favorites,
  onOpenDetail,
  onOpenPinDialog,
}) => {
  const activeOutages = outages.filter(o => !o.isPast);
  const now = new Date();
  const todayStr = formatDateYMD(now);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDateYMD(tomorrowDate);

  // Find advisory for a specific favorite barangay
  const getFavoriteAdvisories = (fav: string) => {
    const matching = activeOutages.filter(o => isOutageAffectingFavorites(o, [fav]));

    const todayOngoing = matching.find(o => o.date === todayStr && o.status === 'ongoing');
    const todayUpcoming = matching.find(o => o.date === todayStr && (o.status === 'upcoming' || o.status === 'delayed'));
    const todayAdvisory = todayOngoing || todayUpcoming || matching.find(o => o.date === todayStr);
    const tomorrowAdvisory = matching.find(o => o.date === tomorrowStr);
    const futureAdvisory = matching.find(o => o.date > tomorrowStr);

    const canonicalCity = getCanonicalCityForBarangay(fav);
    const primaryAdvisory: Interruption = todayAdvisory || tomorrowAdvisory || futureAdvisory || {
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
      streets: 'All feeders and distribution lines energizing this area are operating normally.',
      reason: 'Grid stability is nominal with no ongoing or scheduled power interruptions recorded for this area.',
      fbCaption: `Status for ${fav}, ${canonicalCity}: All Visayan Electric power lines are energized with 230V nominal supply.`,
      fbTime: todayStr,
      isPast: false,
    };

    return {
      activeToday: todayAdvisory || null,
      tomorrow: tomorrowAdvisory || null,
      future: futureAdvisory || null,
      primaryAdvisory,
    };
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Editorial Header */}
      <motion.section variants={itemVariants} className="pt-2 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
            Watchlist
          </h1>
          <p className="ios-subheadline text-xs sm:text-[14px]">
            Real-time power status for your pinned locations
          </p>
        </div>

        {/* Add Location Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={onOpenPinDialog}
          className="w-10 h-10 rounded-2xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] border border-[var(--hairline)] flex items-center justify-center cursor-pointer shadow-xs transition-colors flex-shrink-0 mt-1"
          title="Add location to watchlist"
          aria-label="Add location to watchlist"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </motion.button>
      </motion.section>

      {/* Monitored Places Cards */}
      <motion.section variants={itemVariants} className="space-y-3">
        {favorites.length === 0 ? (
          <div className="ios-grouped-card p-8 text-center space-y-3 border border-[var(--hairline)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--tertiary-fill)] flex items-center justify-center mx-auto text-[var(--accent-blue)]">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h3 className="text-[17px] font-bold text-[var(--label-primary)]">
                Track your neighborhood
              </h3>
              <p className="text-xs text-[var(--label-secondary-alpha)] leading-relaxed">
                Add your home or workplace barangay to monitor live power stability and schedules.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onOpenPinDialog}
              className="px-4 py-2 rounded-xl bg-[var(--accent-blue)] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location</span>
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {favorites.map(fav => {
                const { activeToday, tomorrow, future, primaryAdvisory } = getFavoriteAdvisories(fav);
                
                const hasOngoingToday = activeToday?.status === 'ongoing';
                const hasDelayedToday = activeToday?.status === 'delayed';
                const hasUpcomingToday = activeToday?.status === 'upcoming';
                const hasTomorrow = Boolean(tomorrow);

                // Precise status mapping:
                // If today has an active interruption -> Red (Active Outage)
                // If today has a delayed start -> Amber (Delayed Start)
                // If today has scheduled outage later -> Blue (Scheduled Today)
                // If today is clear but tomorrow has maintenance -> Green (230V Nominal / Online) + subtext for tomorrow
                // If all clear -> Green (230V Nominal)
                let statusLabel = '230V Nominal';
                let statusBadgeClass = 'bg-[var(--accent-green)]/12 text-[var(--accent-green)] border-[var(--accent-green)]/25';
                let dotClass = 'bg-[var(--accent-green)] animate-pulse-green';

                if (hasOngoingToday) {
                  statusLabel = 'Active Outage';
                  statusBadgeClass = 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30';
                  dotClass = 'bg-[var(--accent-red)] animate-pulse-red';
                } else if (hasDelayedToday) {
                  statusLabel = 'Delayed Start';
                  statusBadgeClass = 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border-[var(--accent-orange)]/30';
                  dotClass = 'bg-[var(--accent-orange)] animate-pulse-amber';
                } else if (hasUpcomingToday) {
                  statusLabel = 'Scheduled Today';
                  statusBadgeClass = 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border-[var(--accent-blue)]/25';
                  dotClass = 'bg-[var(--accent-blue)]';
                }

                const monogram = fav.trim().slice(0, 2).toUpperCase();

                return (
                  <motion.article
                    key={fav}
                    layout
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${fav}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (primaryAdvisory) {
                          onOpenDetail(primaryAdvisory);
                        } else {
                          onOpenPinDialog();
                        }
                      }
                    }}
                    initial={{ opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      if (primaryAdvisory) {
                        onOpenDetail(primaryAdvisory);
                      } else {
                        onOpenPinDialog();
                      }
                    }}
                    className="ios-grouped-card p-4 sm:p-5 border border-[var(--hairline)] hover:border-[var(--accent-blue)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/50 transition-all cursor-pointer group select-none relative space-y-3"
                  >
                    {/* Top Row: Monogram, Name & Status Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--tertiary-fill)] border border-[var(--hairline)] flex items-center justify-center font-bold text-xs font-mono-tabular text-[var(--label-primary)] group-hover:bg-[var(--accent-blue)]/12 group-hover:text-[var(--accent-blue)] transition-colors flex-shrink-0">
                          {monogram}
                        </div>
                        <div>
                          <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--label-primary)] tracking-tight group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                            {fav}
                          </h2>
                          <span className="text-xs text-[var(--label-secondary-alpha)] font-mono-tabular">
                            {getCanonicalCityForBarangay(fav, primaryAdvisory?.city || 'Metro Cebu')}
                          </span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular font-bold border ${statusBadgeClass} flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        <span>{statusLabel}</span>
                      </span>
                    </div>

                    {/* Compact Countdown Bar if Outage Ongoing Today */}
                    {hasOngoingToday && activeToday && (
                      <div className="pt-1">
                        <OutageCountdownBar
                          timeStart={activeToday.timeStart}
                          timeEnd={activeToday.timeEnd}
                          time={activeToday.time}
                          status={activeToday.status}
                          compact={true}
                        />
                      </div>
                    )}

                    {/* Bottom Row: Next scheduled maintenance or all clear */}
                    <div className="pt-2.5 border-t border-[var(--hairline-inset)] flex items-center justify-between text-xs text-[var(--label-secondary-alpha)]">
                      <div className="flex items-center gap-1.5 font-mono-tabular truncate pr-2">
                        {hasOngoingToday ? (
                          <span className="text-[var(--accent-red)] font-semibold flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 fill-current" />
                            <span>Outage active: {activeToday?.time}</span>
                          </span>
                        ) : hasDelayedToday ? (
                          <span className="text-[var(--accent-orange)] font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Delayed start: {activeToday?.time}</span>
                          </span>
                        ) : hasUpcomingToday ? (
                          <span className="flex items-center gap-1.5 text-[var(--label-primary)]">
                            <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                            <span>Scheduled today: {activeToday?.time}</span>
                          </span>
                        ) : hasTomorrow ? (
                          <span className="flex items-center gap-1.5 text-[var(--label-primary)]">
                            <Calendar className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                            <span>Tomorrow: {tomorrow?.time}</span>
                          </span>
                        ) : future ? (
                          <span className="flex items-center gap-1.5 text-[var(--label-secondary-alpha)]">
                            <Calendar className="w-3.5 h-3.5 text-[var(--label-tertiary)]" />
                            <span>{future.dateLabel}: {future.time}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--accent-green)] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Normal power supply</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[var(--accent-blue)] text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {/* Quick Add Another Location */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={onOpenPinDialog}
              className="w-full py-3 px-4 rounded-2xl border border-dashed border-[var(--hairline)] hover:border-[var(--accent-blue)]/50 text-xs font-semibold text-[var(--label-secondary-alpha)] hover:text-[var(--accent-blue)] transition-colors flex items-center justify-center gap-2 cursor-pointer bg-[var(--secondary-bg)]/50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Track another location</span>
            </motion.button>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};

