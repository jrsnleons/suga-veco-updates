'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Check, X, Plus } from 'lucide-react';
import { useScrollLock } from '@/lib/use-scroll-lock';


interface PinAreaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  onToggleFavorite: (placeOrCity: string) => void;
}

export const CEBU_LOCATIONS = [
  {
    city: "Consolacion",
    barangays: [
      "Cabangahan", "Cansaga", "Casili", "Danglag", "Garing", "Jugan", 
      "Lamac", "Nangka", "Panas", "Panoypoy", "Pitogo", "Poblacion Occidental", 
      "Poblacion Oriental", "Polog", "Pugalo", "Pulpogan", "Sacsac", "Tayud", 
      "Tilhaong", "Tolotolo", "Tugbongan"
    ]
  },
  {
    city: "Liloan",
    barangays: [
      "Cabadiangan", "Calero", "Catarman", "Cotcot", "Jubay", "Lataban", 
      "Mulao", "Poblacion", "San Roque", "San Vicente", "Santa Cruz", 
      "Tabla", "Tayud", "Yati"
    ]
  },
  {
    city: "Cebu City",
    barangays: [
      "Adlaon", "Agsungot", "Apas", "Babag", "Bacayan", "Banilad", 
      "Basak Pardo", "Basak San Nicolas", "Binaliw", "Bonbon", "Budlaan", 
      "Buhisan", "Bulacao", "Buot-Taup", "Busay", "Calamba", "Cambinocot", 
      "Camputhaw", "Capitol Site", "Carreta", "Cogon Pardo", "Cogon Ramos", 
      "Day-as", "Duljo Fatima", "Ermita", "Guadalupe", "Guba", "Hipodromo", 
      "Inayawan", "Kalubihan", "Kalunasan", "Kamagayan", "Kasambagan", 
      "Kinasang-an", "Labangon", "Lahug", "Lorega San Miguel", "Lusaran", 
      "Luz", "Mabini", "Mabolo", "Malubog", "Mambaling", "Pahina Central", 
      "Pahina San Nicolas", "Pamutan", "Pardo", "Pari-an", "Paril", "Pasil", 
      "Pit-os", "Poblacion", "Pulangbato", "Pung-ol Sibugay", "Punta Princesa", 
      "Quiot", "Sambag 1", "Sambag 2", "San Antonio", "San Jose", 
      "San Nicolas Proper", "San Roque", "Santa Cruz", "Sapangdaku", 
      "Sawang Calero", "Sinsin", "Sirao", "Suba", "Sudlon 1", "Sudlon 2", 
      "T. Padilla", "Tabunan", "Tagbao", "Talamban", "Taptap", "Tejero", 
      "Tinago", "Tisa", "Toong", "Zapatera"
    ]
  },
  {
    city: "Mandaue City",
    barangays: [
      "Alang-alang", "Bakilid", "Banilad", "Basak", "Cabancalan", "Cambaro", 
      "Canduman", "Casili", "Casuntingan", "Centro", "Cubacub", "Guizo", 
      "Ibabao-Estancia", "Jagobiao", "Labogon", "Looc", "Maguikay", 
      "Mantuyong", "Opao", "Pagsabungan", "Paknaan", "Subangdaku", "Tabok", 
      "Tawason", "Tingub", "Tipolo", "Umapad"
    ]
  },
  {
    city: "Talisay City",
    barangays: [
      "Biasong", "Bulacao", "Cadulawan", "Camp IV", "Cansojong", "Dumlog", 
      "Jaclupan", "Lagtang", "Lawaan I", "Lawaan II", "Lawaan III", "Linao", 
      "Maghaway", "Manipis", "Mohon", "Poblacion", "Pooc", "San Isidro", 
      "San Roque", "Tabunok", "Tangke", "Tapul"
    ]
  },
  {
    city: "Minglanilla",
    barangays: [
      "Cadulawan", "Calajo-an", "Camp 7", "Camp 8", "Cuanos", "Guindaruhan", 
      "Linao", "Manduang", "Pakigne", "Poblacion Ward 1", "Poblacion Ward 2", 
      "Tubod", "Tulay", "Tunghaan", "Tungkil", "Tungkop", "Vito", "Ward 3", "Ward 4"
    ]
  },
  {
    city: "City of Naga",
    barangays: [
      "Alpaco", "Baga", "Balirong", "Cabungahan", "Cantao-an", "Central Poblacion", 
      "Cogon", "Colon", "East Poblacion", "Inayagan", "Inoburan", "Jaguimit", 
      "Lanas", "Langtad", "Lutac", "Mainit", "Mayana", "Naalad", "North Poblacion", 
      "Pangdan", "Patag", "South Poblacion", "Tagjaguimit", "Tangke", "Tinaan", 
      "Tuyan", "Uling", "West Poblacion"
    ]
  },
  {
    city: "San Fernando",
    barangays: [
      "Balungag", "Bato", "Bolinawan", "Bugho", "Cabatbatan", "Greenhills", 
      "Ilaya", "Lantawan", "Liburon", "Magsico", "Panadtaran", "Pitalo", 
      "Poblacion North", "Poblacion South", "San Isidro", "Sangat", 
      "South Poblacion", "Tabionan", "Tananas", "Tinubdan", "Tonggo"
    ]
  }
];

export const PinAreaDialog: React.FC<PinAreaDialogProps> = ({
  isOpen,
  onClose,
  favorites,
  onToggleFavorite,
}) => {
  const [search, setSearch] = useState('');

  // Lock background page scroll while dialog is active
  useScrollLock(isOpen);

  // Handle escape key to dismiss dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const q = search.toLowerCase().trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[var(--sheet-scrim)] backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-dialog-title"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--elevated-surface)] border border-[var(--hairline)] rounded-t-[32px] sm:rounded-[24px] max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[85vh] flex flex-col overscroll-contain touch-pan-y overflow-hidden"
          >
            {/* iOS Sheet Grabber Bar */}
            <div className="w-12 h-1.5 rounded-full bg-[var(--label-tertiary)]/70 dark:bg-white/35 mx-auto -mt-1 mb-1 shadow-xs" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] flex items-center justify-center font-semibold">
              <MapPin className="w-4 h-4 fill-current text-[var(--accent-blue)]" />
            </div>
            <div>
              <h3 id="pin-dialog-title" className="text-[17px] font-semibold text-[var(--label-primary)]">Pin Location</h3>
              <p className="text-[12px] text-[var(--label-secondary-alpha)]">Select your city or barangay to monitor.</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] flex items-center justify-center cursor-pointer ios-press"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="flex items-center h-10 rounded-xl bg-[var(--tertiary-fill)] px-3 focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/40 transition-all">
            <Search className="w-4 h-4 text-[var(--label-tertiary)] flex-shrink-0" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Cebu City, Lahug, Mandaue..." 
              aria-label="Search city or barangay"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full pl-2.5 pr-6 bg-transparent text-[16px] sm:text-[14px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] focus:outline-none"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="w-4 h-4 rounded-full bg-[var(--label-tertiary)]/30 hover:bg-[var(--label-tertiary)]/50 text-[var(--label-primary)] flex items-center justify-center text-xs cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Locations List */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1 max-h-72 overscroll-contain touch-pan-y no-scrollbar sm:ios-drawer-scroll">
          {CEBU_LOCATIONS.map(group => {
            const cityMatches = !q || group.city.toLowerCase().includes(q);
            const matchingBrgys = group.barangays.filter(b => 
              !q || b.toLowerCase().includes(q) || group.city.toLowerCase().includes(q)
            );

            if (!cityMatches && matchingBrgys.length === 0) return null;

            const isCityPinned = favorites.includes(group.city);

            return (
              <div key={group.city} className="space-y-1.5">
                {/* City Header with Pin City Button */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-semibold text-[var(--label-primary)] uppercase tracking-wider">
                    {group.city}
                  </span>
                  <button
                    onClick={() => onToggleFavorite(group.city)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ios-press ${
                      isCityPinned
                        ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                        : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)]'
                    }`}
                  >
                    {isCityPinned ? (
                      <>
                        <Check className="w-3 h-3 text-white stroke-[2.5]" />
                        <span>Pinned City</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Pin Whole City</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Barangays Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {matchingBrgys.map(brgy => {
                    const isPinned = favorites.includes(brgy);
                    return (
                      <button
                        key={brgy}
                        onClick={() => onToggleFavorite(brgy)}
                        className={`p-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ios-press ${
                          isPinned
                            ? 'bg-[var(--accent-blue)]/12 border-[var(--accent-blue)]/30 text-[var(--accent-blue)]'
                            : 'bg-[var(--secondary-bg)] border-[var(--hairline)] text-[var(--label-primary)] hover:border-[var(--label-tertiary)]'
                        }`}
                      >
                        <span className="truncate">{brgy}</span>
                        {isPinned ? (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-blue)] stroke-[2.5] flex-shrink-0" />
                        ) : (
                          <span className="text-[12px] text-[var(--label-tertiary)]">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between text-xs text-[var(--label-secondary-alpha)]">
          <span className="font-mono-tabular">{favorites.length} places pinned</span>
          <motion.button 
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--accent-blue)] text-white font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer select-none"
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};

