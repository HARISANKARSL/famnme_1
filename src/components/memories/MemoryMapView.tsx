/**
 * MemoryMapView — Place-based memory map using Leaflet
 * Plots memories with placeTaken on a map with cluster markers
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { MapPin, Camera, Loader2 } from 'lucide-react';
import type { Memory } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MemoryMapViewProps {
  memories: Memory[];
  onMemoryClick: (index: number) => void;
  loading: boolean;
}

// Simple geocoding cache (place name → coords)
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

// Known Indian cities/places for fast lookup without API
const KNOWN_PLACES: Record<string, { lat: number; lng: number }> = {
  'mumbai': { lat: 19.076, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.209 },
  'new delhi': { lat: 28.6139, lng: 77.209 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.385, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cochin': { lat: 9.9312, lng: 76.2673 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'goa': { lat: 15.2993, lng: 74.124 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'patna': { lat: 25.6093, lng: 85.1376 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'thrissur': { lat: 10.5276, lng: 76.2144 },
  'kozhikode': { lat: 11.2588, lng: 75.7804 },
  'calicut': { lat: 11.2588, lng: 75.7804 },
  'alappuzha': { lat: 9.4981, lng: 76.3388 },
  'alleppey': { lat: 9.4981, lng: 76.3388 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
};

function lookupPlace(place: string): { lat: number; lng: number } | null {
  const key = place.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key) || null;

  // Check known places
  for (const [name, coords] of Object.entries(KNOWN_PLACES)) {
    if (key.includes(name) || name.includes(key)) {
      geocodeCache.set(key, coords);
      return coords;
    }
  }

  geocodeCache.set(key, null);
  return null;
}

interface MappedMemory {
  memory: Memory;
  index: number;
  lat: number;
  lng: number;
}

export function MemoryMapView({ memories, onMemoryClick, loading }: MemoryMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mappedMemories = useMemo(() => {
    const results: MappedMemory[] = [];
    memories.forEach((m, idx) => {
      if (!m.placeTaken) return;
      const coords = lookupPlace(m.placeTaken);
      if (coords) results.push({ memory: m, index: idx, ...coords });
    });
    return results;
  }, [memories]);

  const unmappedCount = memories.filter(m => m.placeTaken && !lookupPlace(m.placeTaken)).length;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Fix Leaflet default icon
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // India center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    leafletMap.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    setMapReady(true);

    return () => {
      map.remove();
      leafletMap.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapReady || !markersRef.current || !leafletMap.current) return;

    markersRef.current.clearLayers();

    // Group by location
    const byLocation = new Map<string, MappedMemory[]>();
    mappedMemories.forEach(mm => {
      const key = `${mm.lat},${mm.lng}`;
      if (!byLocation.has(key)) byLocation.set(key, []);
      byLocation.get(key)!.push(mm);
    });

    byLocation.forEach((mems, key) => {
      const [lat, lng] = key.split(',').map(Number);
      const count = mems.length;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: linear-gradient(180deg, #2F3E8F, #25327A);
          color: white;
          width: ${count > 1 ? '32px' : '26px'};
          height: ${count > 1 ? '32px' : '26px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${count > 1 ? '12px' : '10px'};
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">${count > 1 ? count : ''}</div>`,
        iconSize: [count > 1 ? 32 : 26, count > 1 ? 32 : 26],
        iconAnchor: [count > 1 ? 16 : 13, count > 1 ? 16 : 13],
      });

      const marker = L.marker([lat, lng], { icon });

      // Popup content
      const popupContent = mems.map(mm => {
        const title = mm.memory.title;
        const date = mm.memory.dateTaken ? (() => {
          try {
            const d = new Date(mm.memory.dateTaken);
            if (isNaN(d.getTime())) return mm.memory.dateTaken;
            const dd = String(d.getDate()).padStart(2, '0');
            const mmVal = String(d.getMonth() + 1).padStart(2, '0');
            const yy = String(d.getFullYear()).slice(-2);
            return `${dd}-${mmVal}-${yy}`;
          } catch {
            return mm.memory.dateTaken;
          }
        })() : '';
        return `<div style="cursor:pointer;padding:4px 0;border-bottom:1px solid #eee" data-idx="${mm.index}">
          <strong style="font-size:13px;color:#3D2E1F">${title}</strong>
          ${date ? `<br/><span style="font-size:11px;color:#888">${date}</span>` : ''}
          ${mm.memory.placeTaken ? `<br/><span style="font-size:11px;color:#2F3E8F">${mm.memory.placeTaken}</span>` : ''}
        </div>`;
      }).join('');

      marker.bindPopup(`<div style="max-height:200px;overflow:auto">${popupContent}</div>`, { maxWidth: 250 });

      marker.on('popupopen', () => {
        const popup = marker.getPopup();
        if (popup) {
          const el = popup.getElement();
          el?.querySelectorAll('[data-idx]').forEach(item => {
            item.addEventListener('click', () => {
              const idx = parseInt(item.getAttribute('data-idx') || '0');
              onMemoryClick(idx);
            });
          });
        }
      });

      markersRef.current!.addLayer(marker);
    });

    // Fit bounds
    if (mappedMemories.length > 0) {
      const bounds = L.latLngBounds(mappedMemories.map(mm => [mm.lat, mm.lng]));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [mappedMemories, mapReady, onMemoryClick]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 className="w-8 h-8 text-[#2F3E8F] animate-spin" />
        <p className="text-[12px] text-[#8B7355] dark:text-[#666]">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[400px]">
      <div ref={mapRef} className="absolute inset-0 rounded-xl overflow-hidden z-0" />

      {/* Info overlay */}
      <div className="absolute top-3 left-3 z-[400] bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#2F3E8F]" strokeWidth={1.5} />
          <span className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">
            {mappedMemories.length} memories mapped
          </span>
        </div>
        {unmappedCount > 0 && (
          <p className="text-[10px] text-[#8B7355] dark:text-[#999] mt-0.5">
            {unmappedCount} places could not be located
          </p>
        )}
      </div>

      {mappedMemories.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[400] pointer-events-none">
          <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg pointer-events-auto">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-[#C4B5A5] dark:text-[#555]" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] text-[#8B7355] dark:text-[#666]">No memories with recognized locations</p>
            <p className="text-[11px] text-[#B8A090] dark:text-[#555] mt-1">Add places to your memories to see them on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
