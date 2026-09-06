'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Clock, MapPin, Layers, Navigation2, 
  ChevronRight, Check, Eye, EyeOff, X 
} from 'lucide-react';
import type { 
  Map as LeafletMap, LayerGroup as LeafletLayerGroup, TileLayer as LeafletTileLayer, 
  Circle as LeafletCircle, Marker as LeafletMarker 
} from 'leaflet';
import { Interruption } from '@/types';
import { 
  METRO_CEBU_CENTER, CEBU_MUNICIPALITIES, 
  resolveCoordinates, GeoPoint 
} from '@/lib/geo-data';
import { 
  BasemapStyle, BASEMAP_STYLES, getBasemapTileUrl 
} from '@/lib/basemap';
import 'leaflet/dist/leaflet.css';

interface RadarMapProps {
  outages: Interruption[];
  onOpenDetail: (item: Interruption) => void;
}

interface HotspotItem {
  id: string;
  barangay: string;
  city: string;
  coords: GeoPoint;
  outage: Interruption;
  isOngoing: boolean;
  isDelayed: boolean;
}

export const RadarMap: React.FC<RadarMapProps> = ({ outages, onOpenDetail }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersGroupRef = useRef<LeafletLayerGroup | null>(null);
  const zonesGroupRef = useRef<LeafletLayerGroup | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming'>('all');
  const [selectedOutage, setSelectedOutage] = useState<Interruption | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>('dark');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [isMapVisible, setIsMapVisible] = useState<boolean>(true);

  // Close basemap style menu when clicking outside
  useEffect(() => {
    if (!isStyleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStyleMenuOpen]);

  // Update Tile Layer URL when basemapStyle changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const isGoogle = basemapStyle === 'google' || basemapStyle === 'hybrid';
    tileLayerRef.current.options.subdomains = isGoogle ? '0123' : 'abcd';
    const nextTileUrl = getBasemapTileUrl(basemapStyle);
    tileLayerRef.current.setUrl(nextTileUrl);
  }, [basemapStyle]);

  // Invalidate Leaflet size when map visibility toggles to true
  useEffect(() => {
    if (isMapVisible && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isMapVisible]);

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

  // Expand each advisory into individual high-precision geographic hotspot locations
  const hotspots: HotspotItem[] = useMemo(() => {
    const list: HotspotItem[] = [];

    filteredOutages.forEach(item => {
      const isOngoing = item.status === 'ongoing';
      const isDelayed = item.status === 'delayed';

      // Check if multiple barangays are affected by this advisory
      const brgyList = item.barangays && item.barangays.length > 0
        ? item.barangays
        : item.area.split(/[,&/]| and /i).map(s => s.trim()).filter(Boolean);

      if (brgyList.length > 1) {
        // Multi-barangay outage: generate precision hotspot for each barangay
        brgyList.forEach(bName => {
          const coords = resolveCoordinates(bName, item.city);
          list.push({
            id: `${item.id}-${bName}`,
            barangay: bName,
            city: item.city,
            coords,
            outage: item,
            isOngoing,
            isDelayed,
          });
        });
      } else {
        // Single area outage
        const coords = resolveCoordinates(item.area, item.city);
        list.push({
          id: String(item.id),
          barangay: item.area,
          city: item.city,
          coords,
          outage: item,
          isOngoing,
          isDelayed,
        });
      }
    });

    return list;
  }, [filteredOutages]);

  const ongoingCount = outages.filter(o => !o.isPast && o.status === 'ongoing').length;
  const upcomingCount = outages.filter(o => !o.isPast && (o.status === 'upcoming' || o.status === 'delayed')).length;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      const tileUrl = getBasemapTileUrl('dark');

      const map = L.map(mapContainerRef.current, {
        center: [METRO_CEBU_CENTER.lat, METRO_CEBU_CENTER.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Position zoom controls at top-left so they never collide with bottom cards
      L.control.zoom({ position: 'topleft' }).addTo(map);

      const zonesGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      zonesGroupRef.current = zonesGroup;
      markersGroupRef.current = markersGroup;

      setIsMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        zonesGroupRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Update Precision Hotspots & Feeder Radius Zones
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersGroupRef.current || !zonesGroupRef.current) return;

    let isMounted = true;

    async function updateHotspots() {
      const L = await import('leaflet');
      if (!isMounted) return;

      const markersGroup = markersGroupRef.current;
      const zonesGroup = zonesGroupRef.current;
      if (!markersGroup || !zonesGroup) return;

      markersGroup.clearLayers();
      zonesGroup.clearLayers();

      hotspots.forEach(spot => {
        const isSelected = selectedOutage && selectedOutage.id === spot.outage.id;
        const hasSelection = Boolean(selectedOutage);
        const { isOngoing, isDelayed, coords, outage } = spot;

        // Color palette: Google Red (#EA4335) for active, Google/Apple Blue (#0A84FF) for scheduled, Amber for delayed
        const accentColor = isOngoing ? '#EA4335' : isDelayed ? '#FF9F0A' : '#0A84FF';
        const badgeText = isOngoing ? 'Active Outage' : isDelayed ? 'Delayed' : 'Scheduled';
        const streetInfo = outage.streets ? outage.streets.trim() : '';

        // 1. Feeder Coverage Radius Zone
        if (showZones) {
          const zoneRadius = isOngoing ? 650 : 500;
          const zoneFillOpacity = isSelected 
            ? (isOngoing ? 0.38 : 0.28) 
            : hasSelection 
              ? 0.03 
              : (isOngoing ? 0.20 : 0.09);

          const zoneStrokeWeight = isSelected ? 2.5 : (isOngoing ? 1.8 : 1.2);
          const zoneStrokeOpacity = isSelected ? 1.0 : hasSelection ? 0.25 : (isOngoing ? 0.9 : 0.6);

          const circle: LeafletCircle = L.circle([coords.lat, coords.lng], {
            color: accentColor,
            fillColor: accentColor,
            fillOpacity: zoneFillOpacity,
            weight: zoneStrokeWeight,
            opacity: zoneStrokeOpacity,
            radius: zoneRadius,
          });

          // Circle Click & Hover
          circle.on('click', () => {
            setSelectedOutage(outage);
            mapInstanceRef.current?.flyTo([coords.lat, coords.lng], 14, { duration: 0.7 });
          });

          circle.addTo(zonesGroup);
        }

        // 2. High-Precision Pin / Hotspot Beacon Marker
        const pulseEffect = isOngoing ? `
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: ${accentColor}; opacity: 0.5; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        ` : '';

        const pinSize = isSelected ? '14px' : '11px';
        const outerHalo = isSelected 
          ? `box-shadow: 0 0 16px ${accentColor}, 0 0 0 4px ${accentColor}44;` 
          : `box-shadow: 0 0 10px ${accentColor}88;`;

        const customIcon = L.divIcon({
          className: 'custom-google-hotspot-pin',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; items-center; justify-content: center; align-items: center; cursor: pointer; user-select: none;">
              ${pulseEffect}
              <div style="position: relative; width: ${pinSize}; height: ${pinSize}; border-radius: 50%; background-color: ${accentColor}; border: 2px solid #ffffff; ${outerHalo} transition: all 0.2s ease;"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker: LeafletMarker = L.marker([coords.lat, coords.lng], { icon: customIcon });

        // Tooltip
        marker.bindTooltip(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.35; padding: 4px 6px; min-width: 150px; max-width: 240px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
              <span style="font-weight: 700; color: ${accentColor}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;">
                ● ${badgeText}
              </span>
              <span style="opacity: 0.6; font-size: 10px;">${spot.city}</span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #ffffff;">${spot.barangay}</div>
            <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 10.5px; opacity: 0.85;">
              ⏱ ${outage.time}
            </div>
            ${streetInfo ? `
              <div style="margin-top: 3px; font-size: 10px; opacity: 0.7; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${streetInfo}
              </div>
            ` : ''}
          </div>
        `, {
          sticky: true,
          direction: 'top',
          className: 'custom-barangay-tooltip',
          opacity: 0.98,
        });

        marker.on('click', () => {
          setSelectedOutage(outage);
          mapInstanceRef.current?.flyTo([coords.lat, coords.lng], 14, { duration: 0.7 });
        });

        marker.addTo(markersGroup);
      });
    }

    updateHotspots();

    return () => {
      isMounted = false;
    };
  }, [hotspots, isMapReady, showZones, selectedOutage]);

  // Handle City Change
  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedOutage(null);

    if (!mapInstanceRef.current) return;

    if (cityName === 'all') {
      mapInstanceRef.current.flyTo([METRO_CEBU_CENTER.lat, METRO_CEBU_CENTER.lng], 12, { duration: 0.8 });
    } else if (CEBU_MUNICIPALITIES[cityName]) {
      const target = CEBU_MUNICIPALITIES[cityName];
      mapInstanceRef.current.flyTo([target.center.lat, target.center.lng], target.zoom, { duration: 0.8 });
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Editorial Header */}
      <div className="pt-1 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="ios-large-title text-[26px] sm:text-[32px] tracking-tight font-bold">
              Grid Radar
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--tertiary-fill)] border border-[var(--hairline)] text-[11px] font-mono-tabular font-bold text-[var(--label-primary)]">
              <Radio className="w-3 h-3 text-[var(--accent-red)] animate-pulse" />
              <span>Live Telemetry</span>
            </span>
          </div>
          <p className="ios-subheadline text-xs sm:text-[13.5px] text-[var(--label-secondary-alpha)]">
            Accurate feeder zones and scheduled outage coordinates across Metro Cebu.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hide / Show Map Toggle Button */}
          <button
            onClick={() => setIsMapVisible(!isMapVisible)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--secondary-bg)] border border-[var(--hairline)] text-xs font-mono-tabular text-[var(--label-primary)] transition-all cursor-pointer shadow-xs active:scale-95"
            title={isMapVisible ? "Hide Radar Map Canvas" : "Show Radar Map Canvas"}
          >
            {isMapVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[var(--label-secondary-alpha)]" />
                <span className="hidden sm:inline">Hide Map</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                <span className="text-[var(--accent-blue)] font-semibold">Show Map</span>
              </>
            )}
          </button>

          {/* Total stats counters */}
          <div className="hidden sm:flex items-center gap-2 bg-[var(--tertiary-fill)] border border-[var(--hairline)] rounded-xl px-2.5 py-1 text-xs font-mono-tabular">
            <span className="text-[var(--accent-red)] font-bold">{ongoingCount} Active</span>
            <span className="text-[var(--hairline)]">•</span>
            <span className="text-[var(--label-secondary-alpha)] font-medium">{upcomingCount} Sched</span>
          </div>
        </div>
      </div>

      {/* Streamlined Single Unified Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        {/* Status Segmented Pills */}
        <div className="inline-flex p-0.5 rounded-xl bg-[var(--tertiary-fill)] border border-[var(--hairline)] shrink-0">
          <button
            onClick={() => { setStatusFilter('all'); setSelectedOutage(null); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[var(--accent-blue)] text-white shadow-xs font-semibold'
                : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            All ({outages.filter(o => !o.isPast).length})
          </button>

          <button
            onClick={() => { setStatusFilter('ongoing'); setSelectedOutage(null); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'ongoing'
                ? 'bg-[var(--accent-red)] text-white shadow-xs font-semibold'
                : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>Active ({ongoingCount})</span>
          </button>

          <button
            onClick={() => { setStatusFilter('upcoming'); setSelectedOutage(null); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'upcoming'
                ? 'bg-[var(--accent-blue)] text-white shadow-xs font-semibold'
                : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Sched ({upcomingCount})</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-5 bg-[var(--hairline)] shrink-0 mx-0.5" />

        {/* Municipality Chips */}
        <button
          onClick={() => handleCitySelect('all')}
          className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
            selectedCity === 'all'
              ? 'bg-[var(--label-primary)] text-[var(--system-bg)] border-transparent font-semibold shadow-xs'
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
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                selectedCity === city
                  ? 'bg-[var(--label-primary)] text-[var(--system-bg)] border-transparent font-semibold shadow-xs'
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

      {/* Collapsed Placeholder when Map is Hidden */}
      {!isMapVisible && (
        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--tertiary-fill)] p-6 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] flex items-center justify-center mx-auto text-[var(--label-secondary-alpha)]">
            <EyeOff className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-[16px] text-[var(--label-primary)]">Radar Map is Hidden</h4>
            <p className="text-xs text-[var(--label-secondary-alpha)] max-w-sm mx-auto">
              Map telemetry canvas is hidden. Tap below to re-open the interactive feeder grid.
            </p>
          </div>
          <button
            onClick={() => setIsMapVisible(true)}
            className="px-4 py-2 rounded-xl bg-[var(--accent-blue)] text-white text-xs font-semibold shadow-md hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Show Radar Map</span>
          </button>
        </div>
      )}

      {/* Main Map Canvas with Unified HUD Dock */}
      <div className={`relative w-full h-[440px] sm:h-[500px] rounded-3xl overflow-hidden border border-[var(--hairline)] bg-[var(--tertiary-fill)] shadow-xl ${!isMapVisible ? 'hidden' : ''}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Unified Top-Right Floating HUD Dock */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {/* Glass Dock */}
          <div className="flex items-center bg-[var(--secondary-bg)]/85 backdrop-blur-md border border-[var(--hairline)] rounded-2xl p-1 shadow-lg text-[11px] font-mono-tabular">
            {/* Zones Toggle */}
            <button
              onClick={() => setShowZones(!showZones)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1 ${
                showZones
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                  : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
              }`}
              title={showZones ? "Hide Feeder Zone Radius" : "Show Feeder Zone Radius"}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{showZones ? 'Zones' : 'Pins Only'}</span>
            </button>

            {/* Separator */}
            <div className="w-px h-3.5 bg-[var(--hairline)] mx-0.5" />

            {/* Basemap Style Menu Trigger */}
            <div ref={styleMenuRef} className="relative">
              <button
                onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                className="px-2 py-1 rounded-xl text-[var(--label-primary)] hover:text-[var(--accent-blue)] transition-colors cursor-pointer flex items-center gap-1"
                title="Basemap Layer Options"
                aria-label="Basemap Layer Options"
                aria-expanded={isStyleMenuOpen}
              >
                <Layers className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                <span className="hidden md:inline capitalize">{BASEMAP_STYLES[basemapStyle].name.split(' ')[0]}</span>
              </button>

              {isStyleMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[var(--elevated-surface)]/95 backdrop-blur-xl border border-[var(--hairline)] shadow-2xl p-1.5 z-30 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider">
                    Basemap Layer
                  </div>
                  {(Object.keys(BASEMAP_STYLES) as BasemapStyle[]).map((styleKey) => {
                    const styleInfo = BASEMAP_STYLES[styleKey];
                    const isSelected = basemapStyle === styleKey;
                    return (
                      <button
                        key={styleKey}
                        onClick={() => {
                          setBasemapStyle(styleKey);
                          setIsStyleMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-blue)] text-white font-medium shadow-xs'
                            : 'text-[var(--label-primary)] hover:bg-[var(--tertiary-fill)]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold leading-tight">{styleInfo.name}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[var(--label-secondary-alpha)]'}`}>
                            {styleInfo.description}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recenter Button */}
            <button
              onClick={() => handleCitySelect('all')}
              className="p-1 rounded-xl text-[var(--label-secondary-alpha)] hover:text-[var(--accent-blue)] transition-colors cursor-pointer"
              title="Reset to Metro Cebu Center"
              aria-label="Reset to Metro Cebu Center"
            >
              <Navigation2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Advisory Dynamic Bottom Sheet Card */}
        <AnimatePresence>
          {selectedOutage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20"
            >
              <div
                className="ios-grouped-card p-3.5 sm:p-4 border border-[var(--hairline)] bg-[var(--elevated-surface)]/95 backdrop-blur-xl shadow-2xl space-y-2.5 relative group"
              >
                {/* Card Header with City & Dismiss Button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-medium text-[var(--label-secondary-alpha)] flex items-center gap-1.5 font-mono-tabular">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                      <span>{selectedOutage.city} • {selectedOutage.dateLabel}</span>
                    </div>
                    <h4 
                      onClick={() => onOpenDetail(selectedOutage)}
                      className="text-[15px] sm:text-[16px] font-bold text-[var(--label-primary)] hover:text-[var(--accent-blue)] transition-colors cursor-pointer leading-snug"
                    >
                      {selectedOutage.area}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono-tabular font-bold border ${
                      selectedOutage.status === 'ongoing'
                        ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30'
                        : 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border-[var(--accent-blue)]/25'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedOutage.status === 'ongoing' ? 'bg-[var(--accent-red)] animate-pulse-red' : 'bg-[var(--accent-blue)]'
                      }`} />
                      <span>{selectedOutage.statusLabel}</span>
                    </span>

                    {/* Explicit Dismiss Button */}
                    <button
                      onClick={() => setSelectedOutage(null)}
                      className="p-1 rounded-full text-[var(--label-tertiary)] hover:text-[var(--label-primary)] hover:bg-[var(--tertiary-fill)] transition-colors cursor-pointer"
                      aria-label="Dismiss Advisory Details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Action Row */}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--hairline-inset)] font-mono-tabular text-[var(--label-secondary-alpha)]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                    <span>{selectedOutage.time}</span>
                  </span>

                  <button
                    onClick={() => onOpenDetail(selectedOutage)}
                    className="text-[var(--accent-blue)] font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <span>Inspect Full Scope</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sleek Footnote with Inline Micro Legend */}
      <div className="px-1 text-xs text-[var(--label-secondary-alpha)] flex flex-wrap items-center justify-between gap-2.5 font-mono-tabular">
        {/* Micro Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-pulse-red" />
            <span className="text-[11px]">Active Outage</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF] opacity-80" />
            <span className="text-[11px]">Scheduled Maintenance</span>
          </span>
          <span className="text-[var(--hairline)]">•</span>
          <span className="text-[11px]">{hotspots.length} hotspots in {selectedCity === 'all' ? 'Metro Cebu' : selectedCity}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="opacity-75 hidden sm:inline">
            Tiles © <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Google</a> / <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="hover:underline">CARTO</a>
          </span>
          {(selectedCity !== 'all' || statusFilter !== 'all' || selectedOutage !== null) && (
            <button
              onClick={() => {
                setSelectedCity('all');
                setStatusFilter('all');
                setSelectedOutage(null);
                mapInstanceRef.current?.flyTo([METRO_CEBU_CENTER.lat, METRO_CEBU_CENTER.lng], 12, { duration: 0.6 });
              }}
              className="text-[var(--accent-blue)] font-medium hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
