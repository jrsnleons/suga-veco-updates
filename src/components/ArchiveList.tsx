'use client';

import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, X, Clock, Archive } from 'lucide-react';
import { Interruption } from '@/types';

interface ArchiveListProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
}

export const ArchiveList: React.FC<ArchiveListProps> = ({ outages, onOpenDetail }) => {
  const [filter, setFilter] = useState<'all' | 'restored' | 'cancelled' | 'completed'>('all');

  const pastOutages = outages.filter(o => o.isPast);

  const filtered = pastOutages.filter(o => {
    if (filter === 'all') return true;
    return o.outcome === filter;
  });

  function getStatusStyle(status: string) {
    switch (status) {
      case 'restored':
      case 'completed':
        return {
          pill: 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]',
          icon: <CheckCircle2 className="w-3 h-3 text-[var(--accent-green)]" />,
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
    <div className="space-y-5">
      {/* Editorial Header */}
      <section className="space-y-1 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[var(--accent-blue)] uppercase">
              Perpetual Log
            </span>
            <h2 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
              History
            </h2>
          </div>

          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] font-medium">
            {filtered.length} Recorded
          </span>
        </div>
        <p className="ios-subheadline text-xs sm:text-[15px] pt-0.5 leading-relaxed">
          Historical record of resolved maintenance, restored feeders, and past outages across Metro Cebu.
        </p>
      </section>

      {/* Apple Native Segmented Control */}
      <div className="inline-flex p-0.5 rounded-lg bg-[var(--tertiary-fill)] text-xs font-medium w-full sm:w-auto">
        {(['all', 'restored', 'completed', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filter === f
                ? 'bg-[var(--secondary-bg)] text-[var(--label-primary)] shadow-xs font-semibold'
                : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Inset Grouped Table Container */}
      <div className="ios-grouped-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Archive className="w-8 h-8 text-[var(--label-tertiary)] mx-auto opacity-50" />
            <div className="text-[16px] font-semibold text-[var(--label-primary)]">
              No historical records
            </div>
            <div className="text-xs text-[var(--label-secondary-alpha)]">
              No archives found matching the current filter.
            </div>
          </div>
        ) : (
          filtered.map((item, index) => {
            const style = getStatusStyle(item.status);

            return (
              <React.Fragment key={item.id}>
                {index > 0 && <div className="ios-inset-divider" style={{ marginLeft: '16px' }} />}

                <div 
                  onClick={() => onOpenDetail(item)}
                  className="px-4 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-[var(--tertiary-fill)] transition-colors cursor-pointer group ios-press-subtle"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors truncate">
                        {item.area}
                      </span>
                      <span className="text-[12px] text-[var(--label-secondary-alpha)] hidden sm:inline">
                        • {item.city}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--label-secondary-alpha)] truncate max-w-sm sm:max-w-md">
                      {item.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                    <span className="text-[12px] text-[var(--label-secondary-alpha)] hidden xs:inline">
                      {item.dateLabel}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${style.pill}`}>
                      {style.icon}
                      <span className="capitalize">{item.statusLabel}</span>
                    </span>

                    <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
