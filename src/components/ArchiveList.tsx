'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, X, Clock } from 'lucide-react';
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

  function getBadgeClass(status: string) {
    switch (status) {
      case 'restored': return 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40';
      case 'cancelled': return 'bg-zinc-900 text-zinc-400 border border-zinc-800 line-through';
      case 'completed': return 'bg-sky-950/70 text-sky-300 border border-sky-800/40';
      default: return 'bg-zinc-800 text-zinc-300 border border-zinc-700/50';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'restored': return <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />;
      case 'cancelled': return <X className="w-2.5 h-2.5 text-zinc-400" />;
      default: return <Clock className="w-2.5 h-2.5 text-sky-400" />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Outage Archive</h2>
          <p className="text-xs text-zinc-400">Clean summary of historical records. Tap any row for full scope.</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
          {filtered.length} Records
        </span>
      </div>

      {/* Simple Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto text-xs pb-1">
        {(['all', 'restored', 'cancelled', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
              filter === f
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/50'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'restored' ? 'Restored' : f === 'cancelled' ? 'Cancelled' : 'Completed'}
          </button>
        ))}
      </div>

      {/* High-Density Concise Summary List */}
      <div className="divide-y divide-zinc-800/60 rounded-xl bg-zinc-900/50 border border-zinc-800/80 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No archived records found for this filter.
          </div>
        ) : (
          filtered.map(item => (
            <motion.div 
              key={item.id}
              whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.4)' }}
              onClick={() => onOpenDetail(item)}
              className="p-3.5 sm:px-4 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-blue-400 transition-colors">
                    {item.area}
                  </span>
                  <span className="text-[11px] text-zinc-500 hidden sm:inline">• {item.city}</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate max-w-sm">{item.reason}</p>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                <span className="text-[11px] font-mono text-zinc-500">{item.dateLabel}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${getBadgeClass(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span>{item.statusLabel}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
