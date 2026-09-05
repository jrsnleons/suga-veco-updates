'use client';

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Plus, Clock, ChevronRight, Radio, 
  MapPin, CheckCircle2
} from 'lucide-react';
import { Interruption } from '@/types';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';

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

  // Find advisory for a specific favorite barangay
  const getFavoriteAdvisory = (fav: string) => {
    const term = fav.toLowerCase().trim();
    return activeOutages.find(o => 
      o.area.toLowerCase().includes(term) ||
      o.city.toLowerCase().includes(term) ||
      o.barangays.some(b => b.toLowerCase().includes(term))
    );
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-7"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Editorial Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <motion.section variants={itemVariants} className="pt-2 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
            Watchlist
          </h1>
          <p className="ios-subheadline text-xs sm:text-[14px]">
            Monitored locations and status cards.
          </p>
        </div>

        {/* Tactile Add Button */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Pillar 3 & 4: Monitored Places Cards (Apple Weather Style)         */}
      {/* ------------------------------------------------------------------ */}
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
                Add your home, workplace, or family&apos;s barangay to receive immediate power outage verdicts.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onOpenPinDialog}
              className="px-4 py-2 rounded-xl bg-[var(--accent-blue)] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Location</span>
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {favorites.map(fav => {
                const advisory = getFavoriteAdvisory(fav);
                const hasOngoing = advisory?.status === 'ongoing';
                const hasDelayed = advisory?.status === 'delayed';
                const hasUpcoming = advisory?.status === 'upcoming';

                // Strict 3-color status mapping (Apple HIG)
                let statusLabel = '230V Nominal';
                let statusBadgeClass = 'bg-[var(--accent-green)]/12 text-[var(--accent-green)] border-[var(--accent-green)]/25';
                let dotClass = 'bg-[var(--accent-green)] animate-pulse-green';

                if (hasOngoing) {
                  statusLabel = 'Active Outage';
                  statusBadgeClass = 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30';
                  dotClass = 'bg-[var(--accent-red)] animate-pulse-red';
                } else if (hasDelayed) {
                  statusLabel = 'Delayed Start';
                  statusBadgeClass = 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border-[var(--accent-orange)]/30';
                  dotClass = 'bg-[var(--accent-orange)] animate-pulse-amber';
                } else if (hasUpcoming) {
                  statusLabel = 'Scheduled';
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
                        if (advisory) {
                          onOpenDetail(advisory);
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
                      if (advisory) {
                        onOpenDetail(advisory);
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
                            {advisory?.city || 'Metro Cebu'} • Feeder Network
                          </span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular font-bold border ${statusBadgeClass} flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        <span>{statusLabel}</span>
                      </span>
                    </div>

                    {/* Compact Countdown Bar if Outage Ongoing */}
                    {hasOngoing && advisory && (
                      <div className="pt-1">
                        <OutageCountdownBar
                          timeStart={advisory.timeStart}
                          timeEnd={advisory.timeEnd}
                          time={advisory.time}
                          status={advisory.status}
                          compact={true}
                        />
                      </div>
                    )}

                    {/* Bottom Row: Next scheduled maintenance or all clear */}
                    <div className="pt-2.5 border-t border-[var(--hairline-inset)] flex items-center justify-between text-xs text-[var(--label-secondary-alpha)]">
                      <div className="flex items-center gap-1.5 font-mono-tabular truncate pr-2">
                        {hasOngoing ? (
                          <span className="text-[var(--accent-red)] font-semibold flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 fill-current" />
                            <span>Interruption in progress: {advisory?.time}</span>
                          </span>
                        ) : hasUpcoming ? (
                          <span className="flex items-center gap-1.5 text-[var(--label-primary)]">
                            <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                            <span>{advisory?.dateLabel} • {advisory?.time}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--accent-green)] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>All electrical lines operating normally</span>
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

            {/* Quick Add Another Barangay Button */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={onOpenPinDialog}
              className="w-full py-3 px-4 rounded-2xl border border-dashed border-[var(--hairline)] hover:border-[var(--accent-blue)]/50 text-xs font-semibold text-[var(--label-secondary-alpha)] hover:text-[var(--accent-blue)] transition-colors flex items-center justify-center gap-2 cursor-pointer bg-[var(--secondary-bg)]/50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Track another barangay</span>
            </motion.button>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};
