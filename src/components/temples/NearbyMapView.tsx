/**
 * NearbyMapView — Interactive Leaflet map showing nearby sacred places.
 * Markers display temple/church/mosque locations with popups.
 * Clicking "View Details" in a popup triggers onPlaceClick.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import { searchNearbyPlaces } from '@/services/googleMapsApiService';
import type { PlaceSuggestion } from '@/types';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { getSacredPlaceNoun } from '@/data/temples/sacredPlaceLabels';

interface NearbyMapViewProps {
  userLat: number;
  userLng: number;
  faithContext: FaithContext;
  selectedFaiths?: FaithContext[];
  onPlaceClick: (place: PlaceSuggestion) => void;
}

function faithToType(faith: FaithContext): string {
  if (faith === 'Christian') return 'church';
  if (faith === 'Islam') return 'mosque';
  return 'temple';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function NearbyMapView({ userLat, userLng, faithContext, selectedFaiths, onPlaceClick }: NearbyMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  // Store onPlaceClick in ref so popup click handlers always use latest
  const onPlaceClickRef = useRef(onPlaceClick);
  onPlaceClickRef.current = onPlaceClick;

  // Fetch nearby places
  useEffect(() => {
    let cancelled = false;
    async function fetchNearby() {
      setLoading(true);
      const types: string[] = [];
      if (selectedFaiths && selectedFaiths.length > 0) {
        for (const f of selectedFaiths) { if (f) types.push(faithToType(f)); }
      } else if (faithContext) {
        types.push(faithToType(faithContext));
      } else {
        types.push('temple', 'church', 'mosque');
      }
      const results = await searchNearbyPlaces(userLat, userLng, [...new Set(types)], 15);
      if (!cancelled) {
        setPlaces(results.sort((a, b) =>
          haversineKm(userLat, userLng, a.lat, a.lng) - haversineKm(userLat, userLng, b.lat, b.lng)
        ));
        setLoading(false);
      }
    }
    fetchNearby();
    return () => { cancelled = true; };
  }, [userLat, userLng, faithContext, selectedFaiths]);

  // Initialize map — depends on loading so it re-runs when container appears
  useEffect(() => {
    if (loading) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLat, userLng], 13);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // User location marker
    const userIcon = L.divIcon({
      className: 'temple-map-marker',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#2F3E8F;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('You are here');

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLat, userLng, loading]);

  // Place markers on map
  const placeMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || places.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [[userLat, userLng]];

    places.forEach((place, idx) => {
      const dist = formatDistance(haversineKm(userLat, userLng, place.lat, place.lng));
      const icon = L.divIcon({
        className: 'temple-map-marker',
        html: `<div style="
          background: linear-gradient(180deg, #C2A46D, #A88B52);
          color: white;
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          cursor: pointer;
        ">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const ratingStr = place.rating ? `<span style="color:#C2A46D;font-size:11px">★ ${place.rating}</span>` : '';
      const popupHtml = `
        <div style="font-family:system-ui;min-width:180px;max-width:240px">
          <p style="font-size:14px;font-weight:700;color:#3D2E1F;margin:0 0 4px">${place.name}</p>
          <p style="font-size:11px;color:#8B7355;margin:0 0 4px">${place.formattedAddress}</p>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <span style="font-size:11px;color:#2F3E8F;font-weight:500">${dist}</span>
            ${ratingStr}
          </div>
          <button data-place-idx="${idx}" style="
            background:linear-gradient(180deg,#2F3E8F,#25327A);
            color:white;border:none;padding:6px 14px;border-radius:8px;
            font-size:11px;font-weight:600;cursor:pointer;width:100%;
          ">View Details</button>
        </div>
      `;

      const marker = L.marker([place.lat, place.lng], { icon })
        .bindPopup(popupHtml, { maxWidth: 260, className: 'temple-map-popup' });

      marker.on('popupopen', () => {
        const popup = marker.getPopup();
        if (popup) {
          const el = popup.getElement();
          el?.querySelectorAll('[data-place-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.getAttribute('data-place-idx') || '0');
              if (places[i]) onPlaceClickRef.current(places[i]);
            });
          });
        }
      });

      marker.addTo(map);
      markersRef.current.push(marker);
      bounds.push([place.lat, place.lng]);
    });

    // Fit bounds
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }, [places, userLat, userLng]);

  useEffect(() => {
    if (!loading) placeMarkers();
  }, [loading, placeMarkers]);

  // Resize fix — Leaflet needs invalidateSize when container becomes visible
  useEffect(() => {
    const timers = [
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 1000),
    ];
    // Also observe container resize
    const container = mapContainerRef.current;
    if (container) {
      const observer = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize());
      observer.observe(container);
      return () => { timers.forEach(clearTimeout); observer.disconnect(); };
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-stone-100 dark:border-[#333] shrink-0 bg-white dark:bg-[#242424] z-10">
        <MapPin className="w-3.5 h-3.5 text-[#2F3E8F]" />
        <span className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">
          {loading ? `Finding ${getSacredPlaceNoun(faithContext).toLowerCase()}s near you...` : `${places.length} ${getSacredPlaceNoun(faithContext).toLowerCase()}s near you`}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F3E8F] ml-auto" />}
      </div>
      {/* Map container — always in DOM so Leaflet can initialize */}
      <div ref={mapContainerRef} className="flex-1 min-h-[300px]" />
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 top-[37px] flex items-center justify-center bg-[#F6F2EA]/80 dark:bg-[#1E1E1E]/80 z-20">
          <div className="flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F] mb-2" />
            <p className="text-[12px] text-[#8B7355]">Searching nearby...</p>
          </div>
        </div>
      )}
      {/* Empty state overlay */}
      {!loading && places.length === 0 && (
        <div className="absolute inset-0 top-[37px] flex items-center justify-center bg-[#F6F2EA] dark:bg-[#1E1E1E] z-20">
          <div className="flex flex-col items-center text-center p-8">
            <MapPin className="w-8 h-8 text-[#8B7355] mb-3" />
            <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] mb-1">No sacred places found nearby</p>
            <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D]">Try expanding your search or check your location settings</p>
          </div>
        </div>
      )}
    </div>
  );
}
