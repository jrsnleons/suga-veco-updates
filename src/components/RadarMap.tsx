'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, Clock, MapPin, Layers, Navigation2, 
  ChevronRight 
} from 'lucide-react';
import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from 'leaflet';
import { Interruption } from '@/types';
import { 
  METRO_CEBU_CENTER, CEBU_MUNICIPALITIES, 
  resolveCoordinates 
} from '@/lib/geo-data';
import 'leaflet/dist/leaflet.css';

interface RadarMapProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
}

export const RadarMap: React.FC<RadarMapProps> = ({ outages, onOpenDetail }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersGroupRef = useRef<LeafletLayerGroup | null>(null);
  const circlesGroupRef = useRef<LeafletLayerGroup | null>(null);

  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming'>('all');
  const [selectedOutage, setSelectedOutage] = useState<Interruption | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Filter outages
  const filteredOutages = useMemo(() => {
    return outages.filter(o => {
      if (o.isPast) return false;
      if (selectedCity !== 'all' && o.city !== selectedCity) return false;
      if (statusFilter === 'ongoing' && o.status !== 'ongoing') return false;
      if (statusFilter === 'upcoming' && o.status !== 'upcoming' && o.status !== 'delayed') return false;
      return true;
    });
  }, [outages, selectedCity, statusFilter]);

  const ongoingCount = outages.filter(o => !o.isPast && o.status === 'ongoing').length;
  const upcomingCount = outages.filter(o => !o.isPast && (o.status === 'upcoming' || o.status === 'delayed')).length;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      const isDark = document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';

      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const map = L.map(mapContainerRef.current, {
        center: [METRO_CEBU_CENTER.lat, METRO_CEBU_CENTER.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add zoom control in bottom-right corner
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const circlesGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;
      circlesGroupRef.current = circlesGroup;

      setIsMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when filteredOutages or isMapReady changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersGroupRef.current || !circlesGroupRef.current) return;

    let isMounted = true;

    async function updateMarkers() {
      const L = await import('leaflet');
      if (!isMounted) return;

      const markersGroup = markersGroupRef.current;
      const circlesGroup = circlesGroupRef.current;
      if (!markersGroup || !circlesGroup) return;

      markersGroup.clearLayers();
      circlesGroup.clearLayers();

      filteredOutages.forEach(item => {
        const coords = resolveCoordinates(item.area, item.city);
        const isOngoing = item.status === 'ongoing';
        const isDelayed = item.status === 'delayed';

        // Color tokens
        const ringColor = isOngoing ? '#FF3B30' : isDelayed ? '#FF9500' : '#007AFF';
        const pulseAnim = isOngoing ? 'animate-ping' : '';

        // Custom HTML Icon
        const customIcon = L.divIcon({
          className: 'custom-radar-pin',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${isOngoing ? `<div class="${pulseAnim}" style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: ${ringColor}; opacity: 0.45;"></div>` : ''}
              <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: ${ringColor}; border: 2.5px solid #ffffff; box-shadow: 0 0 10px ${ringColor}88;"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Add Radar Circle Coverage Radius (~650m)
        L.circle([coords.lat, coords.lng], {
          color: ringColor,
          fillColor: ringColor,
          fillOpacity: isOngoing ? 0.22 : 0.08,
          weight: isOngoing ? 1.5 : 1,
          radius: 650,
          dashArray: isOngoing ? undefined : '4 6',
        }).addTo(circlesGroup);

        // Add Marker
        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

        marker.on('click', () => {
          setSelectedOutage(item);
          mapInstanceRef.current?.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
        });

        marker.addTo(markersGroup);
      });
    }

    updateMarkers();

    return () => {
      isMounted = false;
    };
  }, [filteredOutages, isMapReady]);

  // Handle City Change
  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedOutage(null);

    if (!mapInstanceRef.current) return;

    if (cityName === 'all') {
      mapInstanceRef.current.flyTo([METRO_CEBU_CENTER.lat, METRO_CEBU_CENTER.lng], 12, { duration: 1 });
    } else if (CEBU_MUNICIPALITIES[cityName]) {
      const target = CEBU_MUNICIPALITIES[cityName];
      mapInstanceRef.current.flyTo([target.center.lat, target.center.lng], target.zoom, { duration: 1 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Editorial Header */}
      <div className="pt-2 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="ios-large-title text-[28px] sm:text-[34px] tracking-tight">
              Grid Radar
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--tertiary-fill)] border border-[var(--hairline)] text-[11px] font-mono-tabular font-bold text-[var(--label-primary)]">
              <Radio className="w-3 h-3 text-[var(--accent-red)] animate-pulse" />
              <span>Live Map</span>
            </span>
          </div>
          <p className="ios-subheadline text-xs sm:text-[14px]">
            Interactive feeder zones and interruption coverage across Metro Cebu.
          </p>
        </div>

        {/* Total stats pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[var(--tertiary-fill)] border border-[var(--hairline)] rounded-2xl px-3 py-2 text-xs font-mono-tabular text-right">
          <div>
            <span className="text-[var(--accent-red)] font-bold block">{ongoingCount} Active</span>
            <span className="text-[var(--label-secondary-alpha)] block">{upcomingCount} Sched</span>
          </div>
        </div>
      </div>

      {/* Filter Bar: Status Segmented Control & City Carousel */}
      <div className="space-y-2.5">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            All Advisories ({outages.filter(o => !o.isPast).length})
          </button>

          <button
            onClick={() => setStatusFilter('ongoing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ongoing'
                ? 'bg-[var(--accent-red)] text-white shadow-xs'
                : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>Active Outages ({ongoingCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'upcoming'
                ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                : 'bg-[var(--tertiary-fill)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Scheduled ({upcomingCount})</span>
          </button>
        </div>

        {/* Municipality Quick Navigation Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => handleCitySelect('all')}
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer border ${
              selectedCity === 'all'
                ? 'bg-[var(--label-primary)] text-[var(--system-bg)] border-transparent'
                : 'bg-[var(--secondary-bg)] border-[var(--hairline)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            All Metro Cebu
          </button>

          {Object.keys(CEBU_MUNICIPALITIES).map(city => {
            const countForCity = outages.filter(o => !o.isPast && o.city === city).length;
            const hasOngoingInCity = outages.some(o => !o.isPast && o.city === city && o.status === 'ongoing');

            return (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedCity === city
                    ? 'bg-[var(--label-primary)] text-[var(--system-bg)] border-transparent font-semibold'
                    : 'bg-[var(--secondary-bg)] border-[var(--hairline)] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
                }`}
              >
                {hasOngoingInCity && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
                )}
                <span>{city}</span>
                {countForCity > 0 && (
                  <span className="opacity-70 font-mono-tabular text-[10px]">({countForCity})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative w-full h-[420px] sm:h-[480px] rounded-3xl overflow-hidden border border-[var(--hairline)] bg-[var(--tertiary-fill)] shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] rounded-2xl p-2.5 text-[11px] font-mono-tabular space-y-1.5 shadow-md pointer-events-none">
          <div className="flex items-center gap-2 text-[var(--label-primary)] font-semibold">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span>Feeder Coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] animate-pulse-red" />
            <span className="text-[var(--label-secondary-alpha)]">Active De-energized</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)]" />
            <span className="text-[var(--label-secondary-alpha)]">Scheduled Window</span>
          </div>
        </div>

        {/* Quick Reset Center Button */}
        <button
          onClick={() => handleCitySelect('all')}
          className="absolute top-3 right-3 z-10 p-2.5 rounded-2xl bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] text-[var(--label-primary)] hover:text-[var(--accent-blue)] transition-colors shadow-md cursor-pointer"
          title="Reset to Metro Cebu Center"
          aria-label="Reset to Metro Cebu Center"
        >
          <Navigation2 className="w-4 h-4" />
        </button>

        {/* Selected Pin Bottom Preview Card */}
        {selectedOutage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-4 inset-x-4 sm:inset-x-8 z-10"
          >
            <div
              onClick={() => onOpenDetail(selectedOutage)}
              className="ios-grouped-card p-4 border border-[var(--hairline)] bg-[var(--elevated-surface)]/95 backdrop-blur-xl shadow-2xl space-y-2 cursor-pointer hover:border-[var(--accent-blue)]/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1 font-mono-tabular">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                    <span>{selectedOutage.city} • {selectedOutage.dateLabel}</span>
                  </div>
                  <h4 className="text-[16px] font-bold text-[var(--label-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug">
                    {selectedOutage.area}
                  </h4>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono-tabular font-bold border ${
                  selectedOutage.status === 'ongoing'
                    ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30'
                    : 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border-[var(--accent-blue)]/25'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedOutage.status === 'ongoing' ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-blue)]'
                  }`} />
                  <span>{selectedOutage.statusLabel}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--hairline-inset)] font-mono-tabular text-[var(--label-secondary-alpha)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                  <span>{selectedOutage.time}</span>
                </span>
                <span className="text-[var(--accent-blue)] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Inspect Full Scope</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Selected Scope Footnote */}
      <div className="px-1 text-xs text-[var(--label-secondary-alpha)] flex items-center justify-between font-mono-tabular">
        <span>Showing {filteredOutages.length} zones across {selectedCity === 'all' ? 'Metro Cebu' : selectedCity}</span>
        <button
          onClick={() => {
            setSelectedCity('all');
            setStatusFilter('all');
          }}
          className="text-[var(--accent-blue)] hover:underline cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
