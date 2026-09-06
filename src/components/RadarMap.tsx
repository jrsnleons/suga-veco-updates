'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, Clock, MapPin, Layers, Navigation2, 
  ChevronRight, Check, Eye, EyeOff 
} from 'lucide-react';
import type { 
  Map as LeafletMap, LayerGroup as LeafletLayerGroup, TileLayer as LeafletTileLayer, 
  GeoJSON as LeafletGeoJSON, Layer as LeafletLayer, LeafletMouseEvent, 
  Path as LeafletPath, LatLngBounds 
} from 'leaflet';
import { Interruption } from '@/types';
import { 
  METRO_CEBU_CENTER, CEBU_MUNICIPALITIES, 
  resolveCoordinates 
} from '@/lib/geo-data';
import { 
  BasemapStyle, BASEMAP_STYLES, getBasemapTileUrl 
} from '@/lib/basemap';
import {
  BarangayFeature,
  BarangayGeoJSON,
  createBarangayLookupIndex,
  buildActiveOutageBarangayMap,
} from '@/lib/barangay-matcher';
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
  const polygonsGroupRef = useRef<LeafletLayerGroup | null>(null);
  const geoJsonLayerRef = useRef<LeafletGeoJSON | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming'>('all');
  const [selectedOutage, setSelectedOutage] = useState<Interruption | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>('dark');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [showPins, setShowPins] = useState<boolean>(false);
  const [isMapVisible, setIsMapVisible] = useState<boolean>(true);
  const [geoData, setGeoData] = useState<BarangayGeoJSON | null>(null);

  // Load official GeoJSON boundaries
  useEffect(() => {
    let isMounted = true;
    fetch('/data/veco-barangays.json')
      .then(res => res.json())
      .then((data: BarangayGeoJSON) => {
        if (isMounted) setGeoData(data);
      })
      .catch(err => console.error('Failed to load barangay boundaries:', err));
    return () => { isMounted = false; };
  }, []);

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

  // Build index and active outage map for polygons
  const lookupIndex = useMemo(() => {
    if (!geoData) return null;
    return createBarangayLookupIndex(geoData.features);
  }, [geoData]);

  const activeOutageMap = useMemo(() => {
    if (!lookupIndex) return new Map();
    return buildActiveOutageBarangayMap(filteredOutages, lookupIndex);
  }, [filteredOutages, lookupIndex]);

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

      // Add zoom control in bottom-right corner
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const polygonsGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);
      const circlesGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      polygonsGroupRef.current = polygonsGroup;
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
        tileLayerRef.current = null;
        polygonsGroupRef.current = null;
        markersGroupRef.current = null;
        circlesGroupRef.current = null;
        geoJsonLayerRef.current = null;
      }
    };
  }, []);

  // Update Polygon Boundaries when activeOutageMap, geoData, showBorders, or city changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !polygonsGroupRef.current || !geoData) return;

    let isMounted = true;

    async function updatePolygons() {
      const L = await import('leaflet');
      if (!isMounted) return;

      const polygonsGroup = polygonsGroupRef.current;
      if (!polygonsGroup) return;

      polygonsGroup.clearLayers();

      if (!showBorders) return;

      const currentGeoData = geoData;
      if (!currentGeoData) return;

      const targetFeatures = selectedCity === 'all'
        ? currentGeoData.features
        : currentGeoData.features.filter(f => f.properties.city === selectedCity);

      const geoJsonData = { type: 'FeatureCollection', features: targetFeatures } as unknown as Parameters<typeof L.geoJSON>[0];

      const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: (feature) => {
          const bFeature = feature as unknown as BarangayFeature;
          const key = bFeature?.id || `${bFeature?.properties?.city}::${bFeature?.properties?.barangay}`;
          const outageInfo = activeOutageMap.get(key);

          if (outageInfo) {
            const isOngoing = outageInfo.status === 'ongoing';
            const isDelayed = outageInfo.status === 'delayed';
            // Dark Voyager high contrast palette: Apple Neon Red (#FF453A), Neon Amber (#FF9F0A), Electric Blue (#0A84FF)
            const color = isOngoing ? '#FF453A' : isDelayed ? '#FF9F0A' : '#0A84FF';

            return {
              color: color,
              weight: isOngoing ? 2.5 : 2,
              fillColor: color,
              fillOpacity: isOngoing ? 0.28 : 0.18,
              dashArray: isOngoing ? undefined : '5 4',
            };
          }

          // Unaffected barangays: keep transparent so Dark Voyager streets stay clean and sleek
          return {
            color: 'transparent',
            weight: 0,
            fillColor: 'transparent',
            fillOpacity: 0,
          };
        },
        onEachFeature: (feature, layer: LeafletLayer) => {
          const bFeature = feature as unknown as BarangayFeature;
          const key = bFeature?.id || `${bFeature?.properties?.city}::${bFeature?.properties?.barangay}`;
          const outageInfo = activeOutageMap.get(key);

          if (outageInfo) {
            const isOngoing = outageInfo.status === 'ongoing';
            const isDelayed = outageInfo.status === 'delayed';
            const badgeColor = isOngoing ? '#FF453A' : isDelayed ? '#FF9F0A' : '#0A84FF';
            const badgeText = isOngoing ? 'Active Outage' : isDelayed ? 'Delayed Start' : 'Scheduled';
            const streetInfo = outageInfo.outage.streets ? outageInfo.outage.streets.trim() : '';

            layer.bindTooltip(`
              <div style="font-family: inherit; font-size: 11px; line-height: 1.35; padding: 2px 4px; min-width: 140px; max-width: 220px;">
                <div style="display: flex; align-items: center; gap: 5px; font-weight: 700; color: ${badgeColor}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em;">
                  <span style="width: 7px; height: 7px; border-radius: 50%; background: ${badgeColor}; display: inline-block;"></span>
                  <span>${badgeText}</span>
                </div>
                <div style="font-weight: 700; font-size: 13px; margin-top: 2px;">${bFeature.properties.barangay}</div>
                <div style="opacity: 0.75; font-size: 10px;">${bFeature.properties.city}</div>
                <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(150,150,150,0.2); font-size: 10px; font-family: monospace;">
                  ${outageInfo.outage.time}
                </div>
                ${streetInfo ? `
                  <div style="margin-top: 3px; font-size: 10px; opacity: 0.85; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    <span style="font-weight: 600;">Feeders:</span> ${streetInfo}
                  </div>
                ` : ''}
              </div>
            `, {
              sticky: true,
              direction: 'top',
              className: 'custom-barangay-tooltip',
              opacity: 0.98,
            });
          } else {
            layer.bindTooltip(`
              <div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
                <div style="font-weight: 600;">${bFeature.properties.barangay}</div>
                <div style="opacity: 0.65; font-size: 10px;">${bFeature.properties.city}</div>
                <div style="color: #30D158; font-size: 10px; font-weight: 600; margin-top: 2px;">✓ Grid Stable • Energized</div>
              </div>
            `, {
              sticky: true,
              direction: 'top',
              className: 'custom-barangay-tooltip',
              opacity: 0.92,
            });
          }

          layer.on({
            mouseover: (e: LeafletMouseEvent) => {
              const l = e.target as LeafletPath;
              if (l.setStyle) {
                if (outageInfo) {
                  const isOngoing = outageInfo.status === 'ongoing';
                  const strokeColor = isOngoing ? '#FF453A' : '#0A84FF';
                  l.setStyle({
                    weight: 3.5,
                    color: strokeColor,
                    fillOpacity: isOngoing ? 0.45 : 0.32,
                    dashArray: '', // solid boundary line on hover
                  });
                } else {
                  l.setStyle({
                    weight: 1.5,
                    color: 'rgba(255, 255, 255, 0.45)',
                    fillColor: 'rgba(255, 255, 255, 0.08)',
                    fillOpacity: 0.12,
                    dashArray: '2 2',
                  });
                }
              }
              if (l.bringToFront) {
                l.bringToFront();
              }
            },
            mouseout: (e: LeafletMouseEvent) => {
              geoJsonLayer.resetStyle(e.target as LeafletLayer);
            },
            click: (e: LeafletMouseEvent) => {
              if (outageInfo) {
                setSelectedOutage(outageInfo.outage);
                const target = e.target as { getBounds?: () => LatLngBounds };
                if (mapInstanceRef.current && target.getBounds) {
                  mapInstanceRef.current.fitBounds(target.getBounds(), { maxZoom: 15, padding: [40, 40] });
                }
              }
            }
          });
        }
      });

      polygonsGroup.addLayer(geoJsonLayer);
      geoJsonLayerRef.current = geoJsonLayer;
    }

    updatePolygons();

    return () => { isMounted = false; };
  }, [isMapReady, geoData, activeOutageMap, showBorders, selectedCity]);

  // Update Markers when filteredOutages, isMapReady, or showPins changes
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

      if (!showPins) return;

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
  }, [filteredOutages, isMapReady, showPins]);

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

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          {/* Hide / Show Map Toggle Button */}
          <button
            onClick={() => setIsMapVisible(!isMapVisible)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[var(--tertiary-fill)] hover:bg-[var(--secondary-bg)] border border-[var(--hairline)] text-xs font-mono-tabular text-[var(--label-primary)] transition-all cursor-pointer shadow-xs active:scale-95"
            title={isMapVisible ? "Hide Radar Map Canvas" : "Show Radar Map Canvas"}
          >
            {isMapVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[var(--label-secondary-alpha)]" />
                <span>Hide Map</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                <span className="text-[var(--accent-blue)] font-semibold">Show Map</span>
              </>
            )}
          </button>

          {/* Total stats pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[var(--tertiary-fill)] border border-[var(--hairline)] rounded-2xl px-3 py-2 text-xs font-mono-tabular text-right">
            <div>
              <span className="text-[var(--accent-red)] font-bold block">{ongoingCount} Active</span>
              <span className="text-[var(--label-secondary-alpha)] block">{upcomingCount} Sched</span>
            </div>
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

      {/* Collapsed Placeholder when Map is Hidden */}
      {!isMapVisible && (
        <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--tertiary-fill)] p-6 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] flex items-center justify-center mx-auto text-[var(--label-secondary-alpha)]">
            <EyeOff className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-[16px] text-[var(--label-primary)]">Radar Map is Hidden</h4>
            <p className="text-xs text-[var(--label-secondary-alpha)] max-w-sm mx-auto">
              Interactive map canvas is hidden. Tap below to re-open the Dark Voyager live feeder radar.
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

      {/* Main Map Canvas */}
      <div className={`relative w-full h-[420px] sm:h-[480px] rounded-3xl overflow-hidden border border-[var(--hairline)] bg-[var(--tertiary-fill)] shadow-2xl ${!isMapVisible ? 'hidden' : ''}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] rounded-2xl p-2.5 text-[11px] font-mono-tabular space-y-1.5 shadow-md pointer-events-none">
          <div className="flex items-center gap-2 text-[var(--label-primary)] font-semibold">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span>Barangay Zones</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[var(--accent-red)] animate-pulse-red" />
            <span className="text-[var(--label-secondary-alpha)]">Active Interruption</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[var(--accent-blue)]" />
            <span className="text-[var(--label-secondary-alpha)]">Scheduled Window</span>
          </div>
        </div>

        {/* Top-Right Action Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 sm:gap-2">
          {/* Hide / Show Overlay Toggles */}
          <div className="flex items-center bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] rounded-2xl p-0.5 shadow-md text-[11px] font-mono-tabular">
            <button
              onClick={() => setShowBorders(!showBorders)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showBorders
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                  : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
              }`}
              title={showBorders ? "Hide Barangay Outage Borders" : "Show Barangay Outage Borders"}
            >
              {showBorders ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showBorders ? 'Borders' : 'Hidden'}</span>
            </button>
            <button
              onClick={() => setShowPins(!showPins)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1 ${
                showPins
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                  : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
              }`}
              title={showPins ? "Hide Location Pins" : "Show Location Pins"}
            >
              <MapPin className="w-3 h-3" />
              <span className="hidden sm:inline">Pins</span>
            </button>
          </div>

          {/* Basemap Style Selector Dropdown */}
          <div ref={styleMenuRef} className="relative">
            <button
              onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] text-[var(--label-primary)] hover:text-[var(--accent-blue)] transition-colors shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-mono-tabular"
              title="Basemap Layer Options"
              aria-label="Basemap Layer Options"
              aria-expanded={isStyleMenuOpen}
            >
              <Layers className="w-4 h-4 text-[var(--accent-blue)]" />
              <span className="hidden sm:inline font-medium capitalize">{BASEMAP_STYLES[basemapStyle].name}</span>
            </button>

            {isStyleMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[var(--elevated-surface)]/95 backdrop-blur-xl border border-[var(--hairline)] shadow-2xl p-1.5 z-20 space-y-1">
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

          {/* Quick Reset Center Button */}
          <button
            onClick={() => handleCitySelect('all')}
            className="p-2 sm:p-2.5 rounded-2xl bg-[var(--secondary-bg)]/90 backdrop-blur-md border border-[var(--hairline)] text-[var(--label-primary)] hover:text-[var(--accent-blue)] transition-colors shadow-md cursor-pointer"
            title="Reset to Metro Cebu Center"
            aria-label="Reset to Metro Cebu Center"
          >
            <Navigation2 className="w-4 h-4" />
          </button>
        </div>

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
      <div className="px-1 text-xs text-[var(--label-secondary-alpha)] flex flex-wrap items-center justify-between gap-2 font-mono-tabular">
        <span>Showing {filteredOutages.length} zones across {selectedCity === 'all' ? 'Metro Cebu' : selectedCity}</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="opacity-75">
            Tiles © <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Google</a> / <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="hover:underline">CARTO</a> • Boundaries © NAMRIA / PSGC
          </span>
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
    </div>
  );
};
