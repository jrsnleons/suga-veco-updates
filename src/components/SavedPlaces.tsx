'use client';

import React from 'react';
import { Star, Plus, X, Radio, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Interruption } from '@/types';

interface SavedPlacesProps {
  favorites: string[];
  outages: Interruption[];
  onSelect: (brgy: string) => void;
  onOpenPinDialog: () => void;
  onRemove: (brgy: string) => void;
}

export const SavedPlaces: React.FC<SavedPlacesProps> = ({
  favorites,
  outages,
  onSelect,
  onOpenPinDialog,
  onRemove,
}) => {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">My Saved Places</span>
        </div>
        <button 
          onClick={onOpenPinDialog} 
          className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pin Place</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {favorites.length === 0 ? (
          <div 
            onClick={onOpenPinDialog}
            className="col-span-2 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-500 text-center hover:border-zinc-700 cursor-pointer transition-colors"
          >
            No pinned places. Tap &quot;Pin Place&quot; to monitor your home or work.
          </div>
        ) : (
          favorites.map(fav => {
            const activeAlert = outages.find(o => !o.isPast && (
              o.area.toLowerCase().includes(fav.toLowerCase()) || 
              o.city.toLowerCase().includes(fav.toLowerCase()) ||
              o.barangays.some(b => b.toLowerCase().includes(fav.toLowerCase()))
            ));

            const hasOngoing = Boolean(activeAlert && activeAlert.status === 'ongoing');
            const hasDelayed = Boolean(activeAlert && activeAlert.status === 'delayed');
            const hasUpcoming = Boolean(activeAlert && activeAlert.status === 'upcoming');
            const isCancelled = Boolean(activeAlert && activeAlert.status === 'cancelled');

            let statusText = 'Normal';
            let badgeColor = 'text-emerald-400';

            if (hasOngoing) {
              statusText = activeAlert!.statusLabel || 'In Progress';
              badgeColor = 'text-rose-400';
            } else if (hasDelayed) {
              statusText = 'Delayed Start';
              badgeColor = 'text-amber-400';
            } else if (hasUpcoming) {
              statusText = `Sched ${activeAlert!.timeStart || ''}`;
              badgeColor = 'text-blue-400';
            } else if (isCancelled) {
              statusText = 'Cancelled';
              badgeColor = 'text-zinc-400';
            }

            return (
              <div 
                key={fav}
                onClick={() => onSelect(fav)}
                className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-xs font-semibold text-zinc-200 block truncate">{fav}</span>
                  <span className={`text-[11px] ${badgeColor} flex items-center gap-1.5`}>
                    {hasOngoing ? (
                      <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse flex-shrink-0" />
                    ) : hasDelayed ? (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                    ) : hasUpcoming ? (
                      <Clock className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                    ) : isCancelled ? (
                      <X className="w-2.5 h-2.5 text-zinc-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{statusText}</span>
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(fav); }} 
                  className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1 transition-opacity cursor-pointer flex-shrink-0" 
                  title="Unpin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
