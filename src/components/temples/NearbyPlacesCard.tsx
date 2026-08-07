/**
 * NearbyPlacesCard — Horizontal scrolling strip of nearby sacred places
 * based on user's current location and faith context.
 */

import { useState, useEffect } from 'react';
import { MapPin, Star, Navigation, Loader2 } from 'lucide-react';
import { searchNearbyPlaces } from '@/services/googleMapsApiService';
import type { PlaceSuggestion } from '@/types';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { getSacredPlaceNoun } from '@/data/temples/sacredPlaceLabels';

interface NearbyPlacesCardProps {
  userLat: number;
  userLng: number;
  faithContext: FaithContext;
  /** For multi-faith users, all selected faiths */
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

export function NearbyPlacesCard({ userLat, userLng, faithContext, selectedFaiths, onPlaceClick }: NearbyPlacesCardProps) {
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNearby() {
      setLoading(true);
      setError(false);

      // Determine which types to search
      const types: string[] = [];
      if (selectedFaiths && selectedFaiths.length > 0) {
        for (const f of selectedFaiths) {
          if (f) types.push(faithToType(f));
        }
      } else if (faithContext) {
        types.push(faithToType(faithContext));
      } else {
        // Unknown / no faith — search all
        types.push('temple', 'church', 'mosque');
      }

      const results = await searchNearbyPlaces(userLat, userLng, [...new Set(types)], 15);

      if (cancelled) return;

      if (results.length === 0) {
        setError(true);
      }

      // Sort by distance
      const sorted = results
        .map(p => ({ ...p, distance: haversineKm(userLat, userLng, p.lat, p.lng) }))
        .sort((a, b) => a.distance - b.distance);

      setPlaces(sorted);
      setLoading(false);
    }

    fetchNearby();
    return () => { cancelled = true; };
  }, [userLat, userLng, faithContext, selectedFaiths]);

  if (loading) {
    return (
      <div className="mx-4 md:mx-6 mt-4 rounded-2xl bg-[#FBF7EF] dark:bg-[#1a1a1a] border border-[#E2DBCE]/80 dark:border-[#2a2a2a] p-4">
        <div className="flex items-center gap-2 text-[12px] text-[#8B7355] dark:text-[#A19F9D]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Finding {getSacredPlaceNoun(faithContext).toLowerCase()}s near you...
        </div>
      </div>
    );
  }

  if (error || places.length === 0) return null;

  return (
    <div className="mx-4 md:mx-6 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <Navigation className="w-3.5 h-3.5 text-[#2F3E8F]" />
        <p className="text-[12px] font-semibold text-[#3A342B] dark:text-[#f5f5f5] uppercase tracking-wider">
          Near You
        </p>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-[#E2DBCE] dark:scrollbar-thumb-[#2a2a2a]">
        {places.map(place => {
          const dist = haversineKm(userLat, userLng, place.lat, place.lng);
          return (
            <button
              key={place.placeId}
              onClick={() => onPlaceClick(place)}
              className="shrink-0 w-[160px] md:w-[200px] rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-[#2F3E8F]/40 hover:shadow-sm transition-all text-left overflow-hidden group"
            >
              <div className="px-3 py-3">
                <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate leading-tight group-hover:text-[#2F3E8F]">
                  {place.name}
                </p>
                <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate mt-0.5">
                  {place.formattedAddress}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
                    <MapPin className="w-3 h-3" />
                    {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                  </span>
                  {place.rating && (
                    <span className="flex items-center gap-0.5 text-[11px] text-[#C2A46D]">
                      <Star className="w-3 h-3 fill-current" />
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
