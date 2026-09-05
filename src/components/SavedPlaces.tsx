'use client';

import React from 'react';
import { MapPin, Plus, Trash2, Radio, CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
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
    <section className="space-y-1.5">
      {/* iOS Grouped Section Header */}
      <div className="flex items-center justify-between px-3">
        <span className="text-[12px] font-medium text-[var(--label-secondary-alpha)] uppercase tracking-wider">
          PINNED LOCATIONS
        </span>
        <button 
          onClick={onOpenPinDialog} 
          className="text-[13px] font-medium text-[var(--accent-blue)] hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer ios-press"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Location</span>
        </button>
      </div>

      {/* Inset Grouped Container */}
      <div className="ios-grouped-card">
        {favorites.length === 0 ? (
          <button 
            onClick={onOpenPinDialog}
            className="w-full p-4 text-center text-xs sm:text-sm text-[var(--label-secondary-alpha)] hover:bg-[var(--tertiary-fill)] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-[var(--accent-blue)]" />
            <span>No pinned locations. Tap to monitor your barangay.</span>
          </button>
        ) : (
          favorites.map((fav, index) => {
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
            let badgeBg = 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]';
            let StatusIcon = CheckCircle2;

            if (hasOngoing) {
              statusText = activeAlert!.statusLabel || 'In Progress';
              badgeBg = 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]';
              StatusIcon = Radio;
            } else if (hasDelayed) {
              statusText = 'Delayed Start';
              badgeBg = 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]';
              StatusIcon = AlertTriangle;
            } else if (hasUpcoming) {
              statusText = `Sched ${activeAlert!.timeStart || ''}`;
              badgeBg = 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]';
              StatusIcon = Clock;
            } else if (isCancelled) {
              statusText = 'Cancelled';
              badgeBg = 'bg-[var(--tertiary-fill)] text-[var(--label-secondary)]';
            }

            return (
              <React.Fragment key={fav}>
                {index > 0 && <div className="ios-inset-divider" style={{ marginLeft: '52px' }} />}
                
                <div 
                  onClick={() => onSelect(fav)}
                  className="px-4 py-3 min-h-[52px] flex items-center justify-between gap-3 hover:bg-[var(--tertiary-fill)] transition-colors cursor-pointer group ios-press-subtle"
                >
                  {/* Left: Location Glyph & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 fill-current text-[var(--accent-blue)]" />
                    </div>

                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[16px] font-semibold text-[var(--label-primary)] block truncate">
                        {fav}
                      </span>
                      <span className="text-[12px] text-[var(--label-secondary-alpha)] block truncate">
                        {hasOngoing || hasDelayed || hasUpcoming 
                          ? activeAlert?.area || activeAlert?.city 
                          : 'Grid power nominal'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Pill & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${badgeBg}`}>
                      <StatusIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[110px]">{statusText}</span>
                    </span>

                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onRemove(fav); 
                      }} 
                      className="w-7 h-7 rounded-full text-[var(--label-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--tertiary-fill)] flex items-center justify-center transition-colors cursor-pointer" 
                      title="Unpin location"
                      aria-label={`Unpin ${fav}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)]" />
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </section>
  );
};
