'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Clock, Star, X, ExternalLink, FileText, 
  Map, ShieldAlert, CheckCircle2, AlertTriangle, Radio,
  Layers, ChevronRight
} from 'lucide-react';
import { Interruption, AreaCoordinate } from '@/types';

interface DetailModalProps {
  item: Interruption | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (place: string) => void;
}

const AREA_COORDS: Record<string, AreaCoordinate> = {
  // Cebu City
  "Lahug": { lat: "10.3370° N", lng: "123.8998° E", zoomQuery: "Lahug, Cebu City" },
  "Guadalupe": { lat: "10.3275° N", lng: "123.8785° E", zoomQuery: "Guadalupe, Cebu City" },
  "Apas": { lat: "10.3392° N", lng: "123.9090° E", zoomQuery: "Apas, Cebu City" },
  "Mabolo": { lat: "10.3190° N", lng: "123.9160° E", zoomQuery: "Mabolo, Cebu City" },
  "Kasambagan": { lat: "10.3245° N", lng: "123.9125° E", zoomQuery: "Kasambagan, Cebu City" },
  "Capitol Site": { lat: "10.3175° N", lng: "123.8890° E", zoomQuery: "Capitol Site, Cebu City" },
  "Camputhaw": { lat: "10.3188° N", lng: "123.8950° E", zoomQuery: "Camputhaw, Cebu City" },
  "Banilad": { lat: "10.3450° N", lng: "123.9120° E", zoomQuery: "Banilad, Cebu City" },
  "Talamban": { lat: "10.3690° N", lng: "123.9180° E", zoomQuery: "Talamban, Cebu City" },
  "San Roque": { lat: "10.2980° N", lng: "123.9050° E", zoomQuery: "San Roque, Cebu City" },
  "Tejero": { lat: "10.3015° N", lng: "123.9100° E", zoomQuery: "Tejero, Cebu City" },
  "Tinago": { lat: "10.3005° N", lng: "123.9070° E", zoomQuery: "Tinago, Cebu City" },
  "Labangon": { lat: "10.3050° N", lng: "123.8780° E", zoomQuery: "Labangon, Cebu City" },
  "Tisa": { lat: "10.3010° N", lng: "123.8690° E", zoomQuery: "Tisa, Cebu City" },
  "Basak San Nicolas": { lat: "10.2890° N", lng: "123.8760° E", zoomQuery: "Basak San Nicolas, Cebu City" },
  "Punta Princesa": { lat: "10.2970° N", lng: "123.8730° E", zoomQuery: "Punta Princesa, Cebu City" },
  "Mambaling": { lat: "10.2920° N", lng: "123.8830° E", zoomQuery: "Mambaling, Cebu City" },
  "Kalunasan": { lat: "10.3320° N", lng: "123.8670° E", zoomQuery: "Kalunasan, Cebu City" },
  // Mandaue City
  "Maguikay": { lat: "10.3344° N", lng: "123.9350° E", zoomQuery: "Maguikay, Mandaue City" },
  "Tipolo": { lat: "10.3210° N", lng: "123.9310° E", zoomQuery: "Tipolo, Mandaue City" },
  "Subangdaku": { lat: "10.3235° N", lng: "123.9240° E", zoomQuery: "Subangdaku, Mandaue City" },
  "Cabancalan": { lat: "10.3510° N", lng: "123.9330° E", zoomQuery: "Cabancalan, Mandaue City" },
  "Casuntingan": { lat: "10.3440° N", lng: "123.9310° E", zoomQuery: "Casuntingan, Mandaue City" },
  "Bakilid": { lat: "10.3290° N", lng: "123.9390° E", zoomQuery: "Bakilid, Mandaue City" },
  "Canduman": { lat: "10.3600° N", lng: "123.9410° E", zoomQuery: "Canduman, Mandaue City" },
  "Tabok": { lat: "10.3540° N", lng: "123.9490° E", zoomQuery: "Tabok, Mandaue City" },
  "Paknaan": { lat: "10.3460° N", lng: "123.9610° E", zoomQuery: "Paknaan, Mandaue City" },
  "Centro": { lat: "10.3260° N", lng: "123.9440° E", zoomQuery: "Centro, Mandaue City" },
  // Consolacion
  "Consolacion": { lat: "10.3768° N", lng: "123.9575° E", zoomQuery: "Consolacion, Cebu" },
  "Cansaga": { lat: "10.3680° N", lng: "123.9620° E", zoomQuery: "Cansaga, Consolacion" },
  "Jugan": { lat: "10.3810° N", lng: "123.9680° E", zoomQuery: "Jugan, Consolacion" },
  "Pitogo": { lat: "10.3740° N", lng: "123.9520° E", zoomQuery: "Pitogo, Consolacion" },
  "Lamac": { lat: "10.3880° N", lng: "123.9480° E", zoomQuery: "Lamac, Consolacion" },
  "Pulpogan": { lat: "10.3720° N", lng: "123.9540° E", zoomQuery: "Pulpogan, Consolacion" },
  "Tayud": { lat: "10.3720° N", lng: "123.9780° E", zoomQuery: "Tayud, Consolacion" },
  "Nangka": { lat: "10.3850° N", lng: "123.9560° E", zoomQuery: "Nangka, Consolacion" },
  "Tolotolo": { lat: "10.3950° N", lng: "123.9350° E", zoomQuery: "Tolotolo, Consolacion" },
  "Tugbongan": { lat: "10.3640° N", lng: "123.9710° E", zoomQuery: "Tugbongan, Consolacion" },
  // Liloan
  "Liloan": { lat: "10.4000° N", lng: "123.9980° E", zoomQuery: "Liloan, Cebu" },
  "Yati": { lat: "10.4010° N", lng: "123.9980° E", zoomQuery: "Yati, Liloan" },
  "Poblacion": { lat: "10.4025° N", lng: "124.0010° E", zoomQuery: "Poblacion, Liloan" },
  "Cotcot": { lat: "10.4210° N", lng: "124.0150° E", zoomQuery: "Cotcot, Liloan" },
  "Jubay": { lat: "10.4120° N", lng: "124.0080° E", zoomQuery: "Jubay, Liloan" },
  "Catarman": { lat: "10.4050° N", lng: "124.0120° E", zoomQuery: "Catarman, Liloan" },
  "Cabadiangan": { lat: "10.4280° N", lng: "123.9850° E", zoomQuery: "Cabadiangan, Liloan" },
  "Calero": { lat: "10.3980° N", lng: "124.0040° E", zoomQuery: "Calero, Liloan" },
  // Talisay City
  "Talisay City": { lat: "10.2588° N", lng: "123.8440° E", zoomQuery: "Talisay City, Cebu" },
  "Tabunok": { lat: "10.2670° N", lng: "123.8480° E", zoomQuery: "Tabunok, Talisay City" },
  "Cadulawan": { lat: "10.2520° N", lng: "123.8370° E", zoomQuery: "Cadulawan, Talisay City" },
  "Linao": { lat: "10.2550° N", lng: "123.8320° E", zoomQuery: "Linao, Talisay City" },
  "Dumlog": { lat: "10.2460° N", lng: "123.8540° E", zoomQuery: "Dumlog, Talisay City" },
  "Pooc": { lat: "10.2420° N", lng: "123.8480° E", zoomQuery: "Pooc, Talisay City" },
  "Mohon": { lat: "10.2510° N", lng: "123.8420° E", zoomQuery: "Mohon, Talisay City" },
  "San Isidro": { lat: "10.2720° N", lng: "123.8400° E", zoomQuery: "San Isidro, Talisay City" },
  "Bulacao": { lat: "10.2750° N", lng: "123.8550° E", zoomQuery: "Bulacao, Talisay City" },
  // Minglanilla
  "Minglanilla": { lat: "10.2440° N", lng: "123.7970° E", zoomQuery: "Minglanilla, Cebu" },
  "Lipata": { lat: "10.2500° N", lng: "123.8200° E", zoomQuery: "Lipata, Minglanilla" },
  "Pakigne": { lat: "10.2470° N", lng: "123.8120° E", zoomQuery: "Pakigne, Minglanilla" },
  "Tungkil": { lat: "10.2420° N", lng: "123.8050° E", zoomQuery: "Tungkil, Minglanilla" },
  "Tunghaan": { lat: "10.2380° N", lng: "123.7920° E", zoomQuery: "Tunghaan, Minglanilla" },
  "Calajo-an": { lat: "10.2330° N", lng: "123.7850° E", zoomQuery: "Calajo-an, Minglanilla" },
  // City of Naga
  "City of Naga": { lat: "10.2070° N", lng: "123.7580° E", zoomQuery: "City of Naga, Cebu" },
  "Colon": { lat: "10.2050° N", lng: "123.7560° E", zoomQuery: "Colon, City of Naga" },
  "Tangke": { lat: "10.2100° N", lng: "123.7620° E", zoomQuery: "Tangke, City of Naga" },
  "Tinaan": { lat: "10.1980° N", lng: "123.7480° E", zoomQuery: "Tinaan, City of Naga" },
  "Tuyan": { lat: "10.2150° N", lng: "123.7680° E", zoomQuery: "Tuyan, City of Naga" },
  "Inayagan": { lat: "10.2240° N", lng: "123.7780° E", zoomQuery: "Inayagan, City of Naga" },
  // San Fernando
  "San Fernando": { lat: "10.1630° N", lng: "123.7080° E", zoomQuery: "San Fernando, Cebu" },
  "Panadtaran": { lat: "10.1680° N", lng: "123.7150° E", zoomQuery: "Panadtaran, San Fernando" },
  "Pitalo": { lat: "10.1740° N", lng: "123.7220° E", zoomQuery: "Pitalo, San Fernando" },
  "Sangat": { lat: "10.1800° N", lng: "123.7310° E", zoomQuery: "Sangat, San Fernando" },
  "South Poblacion": { lat: "10.1610° N", lng: "123.7050° E", zoomQuery: "South Poblacion, San Fernando" }
};

function getPlaceCoords(place: string, city: string): AreaCoordinate {
  if (AREA_COORDS[place]) return AREA_COORDS[place];
  if (AREA_COORDS[city]) return AREA_COORDS[city];
  return {
    lat: "10.3157° N",
    lng: "123.8854° E",
    zoomQuery: `${place}, ${city}, Cebu`
  };
}

function getPlaceMapEmbedUrl(place: string, city: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${place}, ${city}, Cebu`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
}

function getPlaceGoogleMapsUrl(place: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, ${city}, Cebu`)}`;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  const [modalView, setModalView] = useState<'overview' | 'facebook'>('overview');
  const [selectedPlaceIdx, setSelectedPlaceIdx] = useState<number | 'all'>(0);

  useEffect(() => {
    if (isOpen) {
      setModalView('overview');
      setSelectedPlaceIdx(0);
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const places = (item.barangays && item.barangays.length > 0) ? item.barangays : [item.area];
  const hasMultiplePlaces = places.length > 1;
  const activePlace = (typeof selectedPlaceIdx === 'number' && places[selectedPlaceIdx]) ? places[selectedPlaceIdx] : places[0];

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
      case 'ongoing': return <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
      case 'delayed': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'cancelled': return <X className="w-3.5 h-3.5 text-zinc-400" />;
      case 'restored': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-blue-400" />;
    }
  }

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar"
        >
          {/* Top Bar with Pin & Close */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 font-medium">{item.city} • {item.dateLabel}</span>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">{item.area}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onToggleFavorite(activePlace)} 
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isFavorite 
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' 
                    : 'hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                }`}
                title={isFavorite ? "Unpin place" : `Pin ${activePlace}`}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{isFavorite ? 'Pinned' : (hasMultiplePlaces ? `Pin ${activePlace}` : 'Pin Area')}</span>
              </button>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Badge & Time */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${getBadgeClass(item.status)}`}>
              {getStatusIcon(item.status)}
              <span>{item.statusLabel}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{item.time}</span>
            </span>
          </div>

          {/* Modal View Segmented Switcher */}
          <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setModalView('overview')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalView === 'overview'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Area & Maps {hasMultiplePlaces ? `(${places.length})` : ''}</span>
            </button>
            <button
              onClick={() => setModalView('facebook')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalView === 'facebook'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Facebook Post</span>
            </button>
          </div>

          {/* VIEW 1: OVERVIEW & MULTI-LOCATION INTERACTIVE MAPS */}
          {modalView === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Multi-Location Switcher if post covers 2 or more places */}
              {hasMultiplePlaces && (
                <div className="space-y-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{places.length} Affected Areas in This Advisory:</span>
                    </span>
                    <span className="text-[11px] text-zinc-500">Tap place to view map</span>
                  </div>

                  {/* Location Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {places.map((place, idx) => {
                      const isSelected = selectedPlaceIdx === idx;
                      return (
                        <button
                          key={place}
                          onClick={() => setSelectedPlaceIdx(idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-zinc-800 border-amber-500/50 text-amber-300 shadow-xs'
                              : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                            isSelected ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span>{place}</span>
                        </button>
                      );
                    })}

                    {/* Show All Maps Toggle */}
                    <button
                      onClick={() => setSelectedPlaceIdx('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                        selectedPlaceIdx === 'all'
                          ? 'bg-zinc-800 border-amber-500/50 text-amber-300 shadow-xs'
                          : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>Show All Maps ({places.length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MAP DISPLAY: EITHER ALL MAPS OR SELECTED MAP */}
              {selectedPlaceIdx === 'all' && hasMultiplePlaces ? (
                /* Stacked View: Shows maps for all affected places */
                <div className="space-y-3.5">
                  {places.map((place, idx) => {
                    const coords = getPlaceCoords(place, item.city);
                    const embedUrl = getPlaceMapEmbedUrl(place, item.city);
                    const mapsUrl = getPlaceGoogleMapsUrl(place, item.city);

                    return (
                      <div key={place} className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center justify-between text-xs pb-0.5">
                          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-400 text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{place}, {item.city}</span>
                          </span>
                          <a 
                            href={mapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:underline font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <span>Open in Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="w-full h-44 rounded-lg overflow-hidden border border-zinc-800/90 bg-zinc-900 relative">
                          <iframe 
                            title={`Map of ${place}`}
                            src={embedUrl}
                            width="100%" 
                            height="100%" 
                            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] text-zinc-300 font-mono pointer-events-none">
                            {coords.lat}, {coords.lng}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single Map View for the currently active place */
                (() => {
                  const place = activePlace;
                  const coords = getPlaceCoords(place, item.city);
                  const embedUrl = getPlaceMapEmbedUrl(place, item.city);
                  const mapsUrl = getPlaceGoogleMapsUrl(place, item.city);

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {hasMultiplePlaces 
                              ? `Map: ${place} (${(selectedPlaceIdx as number) + 1} of ${places.length})`
                              : `Estimated Affected Zone Map`}
                          </span>
                        </span>
                        <a 
                          href={mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:underline font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="w-full h-52 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">
                        <iframe 
                          title={`Map of ${place}`}
                          src={embedUrl}
                          width="100%" 
                          height="100%" 
                          style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} 
                          loading="lazy" 
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                        <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] text-zinc-300 font-mono pointer-events-none">
                          {coords.lat}, {coords.lng}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Covered Streets */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1 text-xs">
                <span className="font-medium text-zinc-300 block">Designated Streets:</span>
                <p className="text-zinc-400 leading-relaxed">{item.streets || 'Portions of designated feeder lines in affected area.'}</p>
                <span className="text-[11px] text-zinc-500 italic block pt-1">
                  Note: Affects specific line transformers along these roads, not the entire municipality.
                </span>
              </div>

              {/* Engineering Scope */}
              <div className="space-y-1 text-xs">
                <span className="font-medium text-zinc-300 block">Advisory Purpose:</span>
                <p className="text-zinc-400 leading-relaxed">{item.reason}</p>
              </div>

              {/* Actions to view advisory on Facebook */}
              <div className="flex gap-2">
                <button
                  onClick={() => setModalView('facebook')}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>View Post Preview & Graphic</span>
                </button>
                {item.fbPostUrl && (
                  <a
                    href={item.fbPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                    title="Open specific advisory post on Facebook"
                  >
                    <span>Open Post</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 2: ORIGINAL FACEBOOK POST PAGE */}
          {modalView === 'facebook' && (
            <motion.div 
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-3.5"
            >
              {/* Facebook Card Mockup */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                {/* VECO Author Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-sm text-blue-400">
                      V
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-zinc-100">Visayan Electric</span>
                        <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                      </div>
                      <span className="text-[11px] text-zinc-500">{item.fbTime} • Public</span>
                    </div>
                  </div>

                  {item.fbPostUrl && (
                    <a 
                      href={item.fbPostUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Open post on Facebook"
                    >
                      <span>View Post</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Full Caption Text */}
                <div className="text-xs text-zinc-300 leading-relaxed space-y-2 whitespace-pre-wrap">
                  <p className="font-semibold text-zinc-100">
                    ADVISORY: {item.area} ({item.city})
                  </p>
                  <p className="text-zinc-300">
                    {item.fbCaption || item.reason}
                  </p>
                </div>

                {/* Attached Post Graphic / Image */}
                {item.fbImageUrl && !item.fbImageUrl.includes('unsplash.com') ? (
                  <div className="rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.fbImageUrl} 
                      alt="VECO Advisory Graphic" 
                      className="w-full h-auto object-cover hover:scale-101 transition-transform duration-300"
                    />
                    <div className="p-2 bg-zinc-900/90 text-[10px] text-zinc-400 flex items-center justify-between">
                      <span>Official Advisory Infographic</span>
                      <a href={item.fbImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline cursor-pointer">
                        View Full Image ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 shadow-lg">
                    {/* Official Banner Header */}
                    <div className="p-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-xs tracking-wider">
                          VE
                        </div>
                        <div>
                          <div className="text-xs font-black tracking-wider text-zinc-100 uppercase">VISAYAN ELECTRIC</div>
                          <div className="text-[10px] text-zinc-400 font-medium">An AboitizPower Company</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        item.type === 'emergency' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        item.type === 'cancelled' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {item.type === 'emergency' ? 'Emergency Outage' : (item.type === 'cancelled' ? 'Cancellation' : 'Maintenance')}
                      </span>
                    </div>

                    {/* Card Content Spec */}
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider block">Official Advisory Notice</span>
                        <h4 className="text-sm font-bold text-white tracking-tight uppercase mt-0.5">
                          {item.status === 'cancelled' ? 'Notice of Cancellation' : (item.status === 'ongoing' && item.type === 'emergency' ? 'Emergency Power Outage' : 'Scheduled Power Interruption')}
                        </h4>
                        <p className="text-xs text-amber-400/90 font-medium">{item.city} — {item.area}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-zinc-900/80 rounded-lg p-2.5 border border-zinc-800/80 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Date</span>
                          <span className="font-semibold text-zinc-200">{item.dateLabel}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Time Window</span>
                          <span className="font-semibold text-amber-300">{item.time}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-zinc-800/70">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Affected Areas</span>
                          <span className="font-medium text-zinc-300 text-[11px] leading-relaxed block">{item.streets || item.area}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-zinc-800/70">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Reason</span>
                          <span className="text-zinc-400 text-[11px] leading-relaxed block">{item.reason}</span>
                        </div>
                      </div>

                      {/* Hotline footer */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                        <span>Visayan Electric Hotline: <strong className="text-zinc-300">230-8326</strong></span>
                        <span>visayanelectric.com</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Link button */}
              {item.fbPostUrl && (
                <a 
                  href={item.fbPostUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Open Post on Facebook</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </motion.div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
