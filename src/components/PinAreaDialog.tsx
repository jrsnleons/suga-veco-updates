'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Check, X, Plus } from 'lucide-react';

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

  if (!isOpen) return null;

  const q = search.toLowerCase().trim();

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Pin a Favorite Place</h3>
                <p className="text-[11px] text-zinc-400">Pin entire cities or individual barangays to monitor.</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Liloan, Consolacion, barangay..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Locations List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-1 max-h-72">
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
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {group.city}
                    </span>
                    <button
                      onClick={() => onToggleFavorite(group.city)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                        isCityPinned
                          ? 'bg-amber-950/60 border-amber-800/80 text-amber-300 shadow-xs'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {isCityPinned ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-amber-400" />
                          <span>Pinned</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-2.5 h-2.5 text-zinc-500" />
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
                          className={`p-2 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                            isPinned
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                              : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                          }`}
                        >
                          <span className="truncate">{brgy}</span>
                          {isPinned ? (
                            <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          ) : (
                            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">+</span>
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
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{favorites.length} places pinned</span>
            <button 
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-900 font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
