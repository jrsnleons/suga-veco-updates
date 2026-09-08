'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  MapPin, Clock, Star, X, ExternalLink, FileText, 
  Map, CheckCircle2, AlertTriangle, Radio
} from 'lucide-react';
import { Interruption, AreaCoordinate } from '@/types';
import { useScrollLock } from '@/lib/use-scroll-lock';
import { OutageCountdownBar } from '@/components/OutageCountdownBar';


interface DetailModalProps {
  item: Interruption | null;
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
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

interface DetailModalContentProps {
  item: Interruption;
  onClose: () => void;
  favorites: string[];
  onToggleFavorite: (place: string) => void;
}

const DetailModalContent: React.FC<DetailModalContentProps> = ({
  item,
  onClose,
  favorites,
  onToggleFavorite,
}) => {
  const [modalView, setModalView] = useState<'overview' | 'facebook'>('overview');
  const [direction, setDirection] = useState<number>(0);
  const [selectedPlaceIdx, setSelectedPlaceIdx] = useState<number | 'all'>(0);

  const places = (item.barangays && item.barangays.length > 0) ? item.barangays : [item.area];
  const hasMultiplePlaces = places.length > 1;
  const activePlace = (typeof selectedPlaceIdx === 'number' && places[selectedPlaceIdx]) ? places[selectedPlaceIdx] : places[0];
  const isFavorite = favorites.includes(activePlace);

  const handleViewChange = (newView: 'overview' | 'facebook') => {
    if (newView === modalView) return;
    setDirection(newView === 'facebook' ? 1 : -1);
    setModalView(newView);
  };

  const tabVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 14 : -14,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -14 : 14,
      opacity: 0,
    }),
  };

  function getStatusStyle(status: string) {
    switch (status) {
      case 'ongoing':
        return {
          pill: 'bg-[var(--accent-red)]/12 text-[var(--accent-red)]',
          icon: <Radio className="w-3.5 h-3.5 text-[var(--accent-red)] animate-pulse" />,
        };
      case 'delayed':
        return {
          pill: 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-orange)]" />,
        };
      case 'cancelled':
        return {
          pill: 'bg-[var(--tertiary-fill)] text-[var(--label-tertiary)] line-through',
          icon: <X className="w-3.5 h-3.5 text-[var(--label-tertiary)]" />,
        };
      case 'restored':
      case 'completed':
        return {
          pill: 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-green)]" />,
        };
      default:
        return {
          pill: 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]',
          icon: <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />,
        };
    }
  }

  const statusStyle = getStatusStyle(item.status);

  return (
    <div className="space-y-4">
      {/* Navigation Bar / Title Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[12px] font-medium text-[var(--label-secondary-alpha)]">
            {item.city} • {item.dateLabel}
          </span>
          <h2 id="detail-modal-title" className="text-[20px] sm:text-[22px] font-bold text-[var(--label-primary)] tracking-tight leading-snug">
            {item.area}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button 
            onClick={() => onToggleFavorite(activePlace)} 
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ios-press ${
              isFavorite 
                ? 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]' 
                : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--accent-blue)]'
            }`}
            title={isFavorite ? "Unpin place" : `Pin ${activePlace}`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[var(--accent-orange)] text-[var(--accent-orange)]' : ''}`} />
            <span>{isFavorite ? 'Pinned' : (hasMultiplePlaces ? `Pin ${activePlace}` : 'Pin')}</span>
          </button>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] flex items-center justify-center cursor-pointer ios-press"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status & Time Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusStyle.pill}`}>
          {statusStyle.icon}
          <span>{item.statusLabel}</span>
        </span>

        <span className="px-3 py-1 rounded-full bg-[var(--tertiary-fill)] text-xs font-medium text-[var(--label-primary)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[var(--label-tertiary)]" />
          <span>{item.time}</span>
        </span>
      </div>

      {/* Live In-Progress Countdown Bar */}
      {item.status === 'ongoing' && (
        <OutageCountdownBar
          timeStart={item.timeStart}
          timeEnd={item.timeEnd}
          time={item.time}
          status={item.status}
        />
      )}

      {/* Apple Native Segmented Control with layoutId */}
      <div className="p-1 rounded-xl bg-[var(--tertiary-fill)] border border-[var(--hairline)] grid grid-cols-2 text-xs font-medium relative select-none">
        <button
          type="button"
          onClick={() => handleViewChange('overview')}
          className={`relative h-9 sm:h-8.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer z-10 select-none touch-manipulation px-2 ${
            modalView === 'overview'
              ? 'text-[var(--label-primary)] font-semibold'
              : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
          }`}
        >
          {modalView === 'overview' && (
            <motion.div
              layoutId="modal-view-tab-pill"
              className="absolute inset-0 bg-[var(--secondary-bg)] rounded-lg shadow-xs border border-[var(--hairline)]"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <Map className="w-3.5 h-3.5 relative z-10 shrink-0" />
          <span className="relative z-10 truncate">
            Location & Map{hasMultiplePlaces ? ` (${places.length})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleViewChange('facebook')}
          className={`relative h-9 sm:h-8.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer z-10 select-none touch-manipulation px-2 ${
            modalView === 'facebook'
              ? 'text-[var(--label-primary)] font-semibold'
              : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
          }`}
        >
          {modalView === 'facebook' && (
            <motion.div
              layoutId="modal-view-tab-pill"
              className="absolute inset-0 bg-[var(--secondary-bg)] rounded-lg shadow-xs border border-[var(--hairline)]"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <FileText className="w-3.5 h-3.5 text-[var(--accent-blue)] relative z-10 shrink-0" />
          <span className="relative z-10 truncate">Official Bulletin</span>
        </button>
      </div>

      {/* Animated Tab Content Container */}
      <div className="overflow-x-hidden min-h-[300px]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {modalView === 'overview' ? (
            <motion.div
              key="overview"
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Multi-Location Switcher if multiple barangays */}
              {hasMultiplePlaces && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[12px] font-medium text-[var(--label-secondary-alpha)] uppercase tracking-wider">
                      Affected Barangays
                    </span>
                    <span className="text-[11px] text-[var(--label-tertiary)]">
                      {places.length} areas
                    </span>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {places.map((place, idx) => (
                      <button
                        key={place}
                        onClick={() => setSelectedPlaceIdx(idx)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ios-press ${
                          selectedPlaceIdx === idx
                            ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                            : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)]'
                        }`}
                      >
                        {place}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Google Map Embed */}
              {(() => {
                const place = activePlace;
                const coords = getPlaceCoords(place, item.city);
                const embedUrl = getPlaceMapEmbedUrl(place, item.city);
                const mapsUrl = getPlaceGoogleMapsUrl(place, item.city);

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-semibold text-[var(--label-primary)] flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)] shrink-0" />
                        <span className="truncate">{place}, {item.city}</span>
                      </span>

                      <a 
                        href={mapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[var(--accent-blue)] hover:underline font-medium flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
                        title="Open in Google Maps"
                      >
                        <span>Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="w-full h-56 rounded-2xl overflow-hidden border border-[var(--hairline)] bg-[var(--tertiary-fill)] relative shadow-inner">
                      <iframe 
                        title={`Map of ${place}, ${item.city}`}
                        src={embedUrl}
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <div className="absolute bottom-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] text-[11px] text-[var(--label-primary)] font-mono-tabular pointer-events-none shadow-xs">
                        {coords.lat}, {coords.lng}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Inset Grouped Section: Covered Streets */}
              <div className="ios-grouped-card p-4 space-y-1.5">
                <span className="text-[12px] font-semibold text-[var(--label-primary)] uppercase tracking-wider block">
                  Designated Feeder Streets
                </span>
                <p className="text-xs sm:text-[14px] text-[var(--label-secondary-alpha)] leading-relaxed">
                  {item.streets || 'Portions of designated feeder lines in affected area.'}
                </p>
                <span className="text-[11px] text-[var(--label-tertiary)] block pt-1">
                  Affects specific line transformers along these roads, not necessarily the entire municipality.
                </span>
              </div>

              {/* Inset Grouped Section: Engineering Scope */}
              <div className="ios-grouped-card p-4 space-y-1.5">
                <span className="text-[12px] font-semibold text-[var(--label-primary)] uppercase tracking-wider block">
                  Engineering & Maintenance Scope
                </span>
                <p className="text-xs sm:text-[14px] text-[var(--label-secondary-alpha)] leading-relaxed">
                  {item.reason}
                </p>
              </div>

              {/* Action CTAs */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleViewChange('facebook')}
                  className="flex-1 py-3 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--label-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ios-press"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                  <span>Official Bulletin & Graphic</span>
                </button>

                {item.fbPostUrl && (
                  <a
                    href={item.fbPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl bg-[var(--accent-blue)] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity cursor-pointer ios-press flex-shrink-0"
                    title="Open post on Facebook"
                  >
                    <span>View Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="facebook"
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="ios-grouped-card p-4 space-y-3">
                {/* Header Author */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center font-bold text-sm">
                      VE
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--label-primary)]">
                          Visayan Electric
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-blue)] fill-current" />
                      </div>
                      <span className="text-[11px] text-[var(--label-secondary-alpha)]">
                        {item.fbTime} • Public Notice
                      </span>
                    </div>
                  </div>

                  {item.fbPostUrl && (
                    <a 
                      href={item.fbPostUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-full bg-[var(--tertiary-fill)] text-[11px] font-medium text-[var(--accent-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Open post on Facebook"
                    >
                      <span>Source ↗</span>
                    </a>
                  )}
                </div>

                {/* Caption Text */}
                <div className="text-xs sm:text-[13px] text-[var(--label-secondary-alpha)] leading-relaxed space-y-2 whitespace-pre-wrap">
                  <p className="font-semibold text-[var(--label-primary)]">
                    ADVISORY: {item.area} ({item.city})
                  </p>
                  <p>
                    {item.fbCaption || item.reason}
                  </p>
                </div>

                {/* Infographic Image / Card */}
                {item.fbImageUrl && !item.fbImageUrl.includes('unsplash.com') ? (
                  <div className="rounded-xl overflow-hidden border border-[var(--hairline)] bg-[var(--tertiary-fill)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.fbImageUrl} 
                      alt="VECO Advisory Graphic" 
                      className="w-full h-auto object-cover"
                    />
                    <div className="p-2.5 text-[11px] text-[var(--label-secondary-alpha)] flex items-center justify-between">
                      <span>Official Advisory Infographic</span>
                      <a href={item.fbImageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline cursor-pointer font-medium">
                        View Full Image ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-4 bg-[var(--tertiary-fill)] border border-[var(--hairline)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--label-primary)] uppercase tracking-wider">
                        VISAYAN ELECTRIC ADVISORY
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--accent-orange)]">
                        {item.statusLabel}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[var(--label-secondary-alpha)]">Schedule:</span>
                        <span className="font-medium text-[var(--label-primary)]">{item.dateLabel} ({item.time})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--label-secondary-alpha)]">Location:</span>
                        <span className="font-medium text-[var(--label-primary)]">{item.area} ({item.city})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sibling Barangays Reference Note */}
                {item.otherAffectedBarangays && item.otherAffectedBarangays.length > 0 && (
                  <div className="text-[11.5px] text-[var(--label-secondary-alpha)] pt-2 border-t border-[var(--hairline-inset)]">
                    <span className="font-semibold text-[var(--label-primary)]">Also affected in this advisory: </span>
                    <span>{item.otherAffectedBarangays.join(', ')}</span>
                  </div>
                )}

                {/* Operational Update History Stepper if Available */}
                {item.updateHistory && item.updateHistory.length > 0 && (
                  <div className="pt-2 border-t border-[var(--hairline-inset)] space-y-2">
                    <span className="text-[11px] font-bold text-[var(--label-secondary-alpha)] uppercase tracking-wider block">
                      Advisory Update History
                    </span>
                    <div className="space-y-1.5">
                      {item.updateHistory.map((upd, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-[var(--tertiary-fill)] border border-[var(--hairline)] flex items-start justify-between gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-[var(--label-primary)] block">
                              {upd.statusLabel}
                            </span>
                            {upd.note && (
                              <p className="text-[11px] text-[var(--label-secondary-alpha)] line-clamp-2">
                                {upd.note}
                              </p>
                            )}
                          </div>
                          {upd.timestamp && (
                            <span className="text-[10.5px] font-mono-tabular text-[var(--label-tertiary)] shrink-0">
                              {upd.timestamp}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {item.fbPostUrl && (
                <a 
                  href={item.fbPostUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-3 rounded-xl bg-[var(--accent-blue)] hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-opacity shadow-xs cursor-pointer ios-press"
                >
                  <span>Open Post on Facebook</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  isOpen,
  onClose,
  favorites,
  onToggleFavorite,
}) => {
  // Lock background page scroll while modal is active
  useScrollLock(isOpen && !!item);
  const dragControls = useDragControls();

  // Handle escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[var(--sheet-scrim)] backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-modal-title"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--elevated-surface)] border border-[var(--hairline)] rounded-t-[32px] sm:rounded-[24px] max-w-lg w-full shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* iOS Sheet Grabber Bar - Fixed Non-Scrolling Drag Handle */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0 z-20 bg-[var(--elevated-surface)]"
              aria-label="Drag handle to dismiss sheet"
            >
              <div className="w-12 h-1.5 rounded-full bg-[var(--label-tertiary)]/70 dark:bg-white/35 hover:bg-[var(--label-secondary)] transition-colors shadow-xs" />
            </div>

            {/* Scrollable Content Container (Contained strictly inside rounded frame) */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-12 sm:px-6 sm:pb-8 space-y-4 no-scrollbar sm:ios-drawer-scroll"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <DetailModalContent 
                key={item.id}
                item={item}
                onClose={onClose}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

