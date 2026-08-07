/**
 * MigrationMapPanel - Interactive migration map with photo markers & hover popups
 *
 * Layout: Left person sidebar | Center map (photo markers + bezier flows)
 * Hover: Floating popup card near marker with photo, name, dates, places
 * Sidebar click: flyTo marker + open its popup
 * Mobile: Horizontal person scroll at bottom
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X, Map as MapIcon, Loader2, ArrowLeft, Filter,
  MapPin, TrendingUp, Users, Search,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import {
  fetchTreePlaces, batchGeocodePlaces, fetchMigrationInsights, fetchMigrationStory,
  type MigrationInsights,
} from '@/services/neo4jDataService';
import {
  buildMapMarkers, buildMigrationFlows, getUniquePersonsFromMarkers,
  type MapMarker, type MigrationFlow, type MarkerPerson,
} from '@/services/migrationDataService';

interface MigrationMapPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  variant?: 'panel' | 'fullpage';
}

// Place type color coding
const PLACE_TYPE_COLORS: Record<string, string> = {
  birth: '#2F3E8F',
  death: '#8B5E3C',
  native: '#4B2C5E',
};

/** Generate initials from a name */
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/** Format a date string to year */
function formatYear(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : '';
}

/** Build quadratic Bezier curve points */
function bezierPoints(
  from: [number, number],
  to: [number, number],
  segments = 20,
): [number, number][] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.0001) return [from, to];
  const midX = (from[0] + to[0]) / 2;
  const midY = (from[1] + to[1]) / 2;
  const offset = dist * 0.15;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = midX + nx * offset;
  const cy = midY + ny * offset;

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * from[0] + 2 * u * t * cx + t * t * to[0];
    const y = u * u * from[1] + 2 * u * t * cy + t * t * to[1];
    points.push([x, y]);
  }
  return points;
}

/** Build a natural-language migration narrative for a person */
function buildPersonNarrative(person: MarkerPerson): string {
  const firstName = person.personName.split(' ')[0];
  const birthYear = formatYear(person.birthDate);
  const deathYear = formatYear(person.deathDate);
  const bp = person.birthPlace;
  const np = person.nativePlace;
  const dp = person.deathPlace;
  const occ = person.occupation;

  // Extract short place name (first part before comma)
  const shortPlace = (place: string) => place.split(',')[0].trim();

  const parts: string[] = [];

  if (bp && np && bp.toLowerCase() !== np.toLowerCase()) {
    // Born in one place, roots in another — classic migration story
    parts.push(
      `${firstName} was born${birthYear ? ` in ${birthYear}` : ''} in ${shortPlace(bp)}, with roots tracing back to ${shortPlace(np)}.`
    );
    if (occ) {
      parts.push(`${person.gender === 'female' ? 'She' : 'He'} built ${person.gender === 'female' ? 'her' : 'his'} life as ${addArticle(occ)}, carrying the family legacy across regions.`);
    } else {
      parts.push(`This journey between ${shortPlace(np)} and ${shortPlace(bp)} reflects the family's migration across generations.`);
    }
  } else if (bp && !np) {
    // Only birthplace known
    parts.push(
      `${firstName} began ${person.gender === 'female' ? 'her' : 'his'} journey${birthYear ? ` in ${birthYear}` : ''} in ${shortPlace(bp)}.`
    );
    if (occ) {
      parts.push(`${person.gender === 'female' ? 'She' : 'He'} went on to become ${addArticle(occ)}.`);
    }
  } else if (!bp && np) {
    // Only native place
    parts.push(`${firstName}'s roots lie in ${shortPlace(np)}, a place that shaped the family's identity.`);
    if (occ) parts.push(`${person.gender === 'female' ? 'She' : 'He'} is known as ${addArticle(occ)}.`);
  } else if (bp && np && bp.toLowerCase() === np.toLowerCase()) {
    // Same place — stayed rooted
    parts.push(`${firstName} was born${birthYear ? ` in ${birthYear}` : ''} and raised in ${shortPlace(bp)}, keeping the family firmly rooted in their homeland.`);
    if (occ) parts.push(`${person.gender === 'female' ? 'She works' : 'He works'} as ${addArticle(occ)}.`);
  }

  if (dp && dp.toLowerCase() !== (bp || '').toLowerCase()) {
    parts.push(`${person.gender === 'female' ? 'Her' : 'His'} final chapter was written in ${shortPlace(dp)}${deathYear ? ` in ${deathYear}` : ''}.`);
  }

  if (person.isLiving && bp && np && bp.toLowerCase() !== np.toLowerCase()) {
    parts.push(`Today, ${firstName} carries the heritage of ${shortPlace(np)} while making a home in ${shortPlace(bp)}.`);
  }

  return parts.join(' ') || `${firstName} is part of this family's geographic story.`;
}

/** Add "a" or "an" article before a word */
function addArticle(word: string): string {
  const lower = word.toLowerCase().trim();
  return /^[aeiou]/.test(lower) ? `an ${lower}` : `a ${lower}`;
}

/** Build rich HTML for person hover popup (shown on map near marker) */
function buildPersonPopupHtml(person: MarkerPerson, placeHighlight?: string): string {
  const photo = person.profilePhotoUrl;
  const initials = getInitials(person.personName);
  const birthYear = formatYear(person.birthDate);
  const deathYear = formatYear(person.deathDate);
  const lifespan = birthYear
    ? deathYear ? `${birthYear} – ${deathYear}` : person.isLiving ? `b. ${birthYear}` : birthYear
    : '';

  const photoHtml = photo
    ? `<img src="${photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15)" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <div style="display:none;width:56px;height:56px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`
    : `<div style="width:56px;height:56px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`;

  // Migration narrative
  const narrative = buildPersonNarrative(person);
  const narrativeHtml = narrative
    ? `<div style="margin-top:8px;padding:8px 10px;background:linear-gradient(135deg,#F6F2EA,#E8EDFF);border-radius:8px;font-size:11px;color:#3D2E1F;line-height:1.5;font-style:italic">${narrative}</div>`
    : '';

  // AI highlight (from insights API)
  const aiHtml = placeHighlight
    ? `<div style="margin-top:6px;background:#E8EDFF;border-radius:6px;padding:5px 8px;font-size:10px;color:#2F3E8F"><b>AI:</b> ${placeHighlight}</div>`
    : '';

  return `<div style="font-family:Inter,system-ui,sans-serif;width:260px;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="flex-shrink:0">${photoHtml}</div>
      <div style="flex:1;min-width:0;overflow:hidden">
        <div style="font-size:14px;font-weight:700;color:#3D2E1F;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${person.personName}</div>
        ${lifespan ? `<div style="font-size:11px;color:#8B7355;margin-top:2px">${lifespan}</div>` : ''}
        ${person.occupation ? `<div style="font-size:11px;color:#5D4E3C;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${person.occupation}</div>` : ''}
      </div>
    </div>
    ${narrativeHtml}
    ${aiHtml}
  </div>`;
}

/** Build popup HTML for a cluster of multiple persons at one place */
function buildClusterPopupHtml(placeName: string, persons: MarkerPerson[], placeHighlight?: string): string {
  let listHtml = '';
  // Show up to 8 persons
  const shown = persons.slice(0, 8);
  for (const p of shown) {
    const photo = p.profilePhotoUrl;
    const initials = getInitials(p.personName);
    const birthYear = formatYear(p.birthDate);
    const photoEl = photo
      ? `<img src="${photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.12)" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <div style="display:none;width:28px;height:28px;border-radius:50%;border:1.5px solid #fff;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`
      : `<div style="width:28px;height:28px;border-radius:50%;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`;

    listHtml += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">
      <div style="flex-shrink:0">${photoEl}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;color:#3D2E1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.personName}</div>
        ${birthYear ? `<div style="font-size:10px;color:#8B7355">${birthYear}</div>` : ''}
      </div>
    </div>`;
  }
  if (persons.length > 8) {
    listHtml += `<div style="font-size:10px;color:#8B7355;padding:3px 0">+${persons.length - 8} more</div>`;
  }

  const aiHtml = placeHighlight
    ? `<div style="margin-top:6px;background:#E8EDFF;border-radius:6px;padding:5px 8px;font-size:10px;color:#2F3E8F"><b>AI:</b> ${placeHighlight}</div>`
    : '';

  return `<div style="font-family:Inter,system-ui,sans-serif;width:240px;box-sizing:border-box">
    <div style="font-size:14px;font-weight:700;color:#3D2E1F;margin-bottom:2px;word-break:break-word">${placeName}</div>
    <div style="font-size:11px;color:#8B7355;margin-bottom:6px">${persons.length} family member${persons.length !== 1 ? 's' : ''}</div>
    <div style="border-top:1px solid #E2DBCE;padding-top:4px">${listHtml}</div>
    ${aiHtml}
  </div>`;
}

/** Photo avatar component for person sidebar list */
function PersonAvatar({ person, size = 36, selected = false }: {
  person: MarkerPerson;
  size?: number;
  selected?: boolean;
}) {
  const photo = person.profilePhotoUrl;
  const initials = getInitials(person.personName);

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden ${selected ? 'ring-2 ring-[#C2A46D] migration-marker-selected' : ''}`}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <img
          src={photo}
          alt={person.personName}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="w-full h-full flex items-center justify-center text-white font-bold"
        style={{
          display: photo ? 'none' : 'flex',
          fontSize: size * 0.35,
          background: 'linear-gradient(135deg, #2F3E8F, #4B2C5E)',
        }}
      >
        {initials}
      </div>
    </div>
  );
}

export function MigrationMapPanel({ treeId, isOpen, onClose, variant = 'panel' }: MigrationMapPanelProps) {
  const { isMobile } = useResponsive();
  const isFullpage = variant === 'fullpage';

  // Map state
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [flows, setFlows] = useState<MigrationFlow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [leafletAvailable, setLeafletAvailable] = useState<boolean | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  // Map: personId → leaflet marker (for individual markers), place key → marker (for clusters)
  const leafletMarkersRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  // Animated migration path layer for selected person
  const migrationPathLayerRef = useRef<import('leaflet').LayerGroup | null>(null);

  // AI insights state
  const [insights, setInsights] = useState<MigrationInsights | null>(null);
  const [, setStory] = useState<string | null>(null);
  const [, setInsightsLoading] = useState(false);

  // UI state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Derived: unique persons from markers
  const uniquePersons = useMemo(() => getUniquePersonsFromMarkers(markers), [markers]);

  // Filtered persons for sidebar
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return uniquePersons;
    const q = searchQuery.toLowerCase();
    return uniquePersons.filter(p => p.personName.toLowerCase().includes(q));
  }, [uniquePersons, searchQuery]);

  // Load Leaflet CSS
  useEffect(() => {
    const LEAFLET_CSS_ID = 'leaflet-css';
    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement('link');
      link.id = LEAFLET_CSS_ID;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Check Leaflet availability
  useEffect(() => {
    import('leaflet')
      .then(() => setLeafletAvailable(true))
      .catch(() => setLeafletAvailable(false));
  }, []);

  // ── Load map data using batch geocoding ──
  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStatus('Loading family places...');
    try {
      const { places, relationships, persons: personData } = await fetchTreePlaces(treeId);

      if (places.length === 0) {
        setMarkers([]);
        setFlows([]);
        return;
      }

      const seen = new Set<string>();
      const uniquePlaces: string[] = [];
      for (const p of places) {
        const key = p.place.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          uniquePlaces.push(p.place);
        }
      }

      setLoadingStatus(`Geocoding ${uniquePlaces.length} locations...`);
      const geocodedObj = await batchGeocodePlaces(uniquePlaces);
      const geocoded = new Map<string, { lat: number; lon: number }>();
      for (const [key, coords] of Object.entries(geocodedObj)) {
        geocoded.set(key, coords);
      }

      setLoadingStatus('Building map...');
      const mapMarkers = buildMapMarkers(places, geocoded, personData);
      const migrationFlows = buildMigrationFlows(places, relationships, geocoded);

      setMarkers(mapMarkers);
      setFlows(migrationFlows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load map data');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  }, [treeId]);

  // ── Load AI insights (non-blocking) ──
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const [insightsData, storyData] = await Promise.all([
        fetchMigrationInsights(treeId),
        fetchMigrationStory(treeId),
      ]);
      setInsights(insightsData);
      setStory(storyData);
    } catch {
      // Non-critical
    } finally {
      setInsightsLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (isOpen && leafletAvailable) {
      loadMapData();
      loadInsights();
    }
  }, [isOpen, leafletAvailable, loadMapData, loadInsights]);

  // ── Select person handler (sidebar click → flyTo + open popup + animated path) ──
  const handleSelectPerson = useCallback(async (personId: string | null) => {
    setSelectedPersonId(personId);
    const map = mapInstanceRef.current;

    // Clear previous migration path
    if (migrationPathLayerRef.current && map) {
      migrationPathLayerRef.current.clearLayers();
    }

    if (personId && map) {
      const L = await import('leaflet');

      // Find the selected person's data
      let selectedPerson: MarkerPerson | null = null;
      for (const m of markers) {
        const p = m.persons.find(p => p.personId === personId);
        if (p) { selectedPerson = p; break; }
      }

      if (selectedPerson) {
        // Gather all places for this person with coordinates
        const personPlaces: Array<{ place: string; type: string; lat: number; lon: number }> = [];
        for (const m of markers) {
          for (const p of m.persons) {
            if (p.personId === personId) {
              personPlaces.push({ place: m.place, type: p.placeType, lat: m.lat, lon: m.lon });
            }
          }
        }

        // Build migration path: native → birth → death (chronological journey)
        const orderedPlaces: typeof personPlaces = [];
        const native = personPlaces.find(p => p.type === 'native');
        const birth = personPlaces.find(p => p.type === 'birth');
        const death = personPlaces.find(p => p.type === 'death');
        if (native) orderedPlaces.push(native);
        if (birth && (!native || birth.place.toLowerCase() !== native.place.toLowerCase())) orderedPlaces.push(birth);
        if (death && (!birth || death.place.toLowerCase() !== birth.place.toLowerCase())) orderedPlaces.push(death);

        // Create animated path layer
        if (!migrationPathLayerRef.current) {
          migrationPathLayerRef.current = L.layerGroup().addTo(map);
        }

        // Draw animated bezier curves between consecutive places
        if (orderedPlaces.length >= 2) {
          // Fit map to show all person's places
          const pathBounds = orderedPlaces.map(p => [p.lat, p.lon] as [number, number]);
          map.flyToBounds(pathBounds, { padding: [80, 80], duration: 0.8, maxZoom: 10 });

          // Draw each segment with staggered animation delay
          for (let i = 0; i < orderedPlaces.length - 1; i++) {
            const from: [number, number] = [orderedPlaces[i].lat, orderedPlaces[i].lon];
            const to: [number, number] = [orderedPlaces[i + 1].lat, orderedPlaces[i + 1].lon];
            const curvePoints = bezierPoints(from, to, 30);

            // Animated polyline
            const polyline = L.polyline(curvePoints, {
              color: '#C2A46D',
              weight: 3.5,
              opacity: 0.9,
              className: `migration-animated-path migration-path-delay-${i}`,
            });
            migrationPathLayerRef.current!.addLayer(polyline);

            // Animated arrow at endpoint
            const endPoint = orderedPlaces[i + 1];
            const arrowIcon = L.divIcon({
              className: 'migration-photo-marker',
              html: `<div class="migration-arrow-pulse" style="width:12px;height:12px;border-radius:50%;background:#C2A46D;border:2px solid #fff;box-shadow:0 0 8px rgba(194,164,109,0.6)"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            });
            const arrowMarker = L.marker([endPoint.lat, endPoint.lon], { icon: arrowIcon, interactive: false });
            migrationPathLayerRef.current!.addLayer(arrowMarker);
          }

          // Place labels along the path
          for (const p of orderedPlaces) {
            const labelType = p.type === 'native' ? 'Origin' : p.type === 'birth' ? 'Born' : 'Settled';
            const labelIcon = L.divIcon({
              className: '',
              html: `<div style="background:#fff;border:1px solid #C2A46D;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:600;color:#C2A46D;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.1)">${labelType}</div>`,
              iconSize: [60, 20],
              iconAnchor: [30, -8],
            });
            const labelMarker = L.marker([p.lat, p.lon], { icon: labelIcon, interactive: false });
            migrationPathLayerRef.current!.addLayer(labelMarker);
          }
        } else if (orderedPlaces.length === 1) {
          // Single place — just fly to it
          map.flyTo([orderedPlaces[0].lat, orderedPlaces[0].lon], 10, { duration: 0.8 });
        }

        // Open popup after fly animation completes
        setTimeout(() => {
          const lMarker = leafletMarkersRef.current.get(personId)
            || leafletMarkersRef.current.get(
              (birth || native || personPlaces[0])?.place.toLowerCase().trim() || ''
            );
          if (lMarker) lMarker.openPopup();
        }, 1000);
      }
    }

    // Update marker highlight styling
    leafletMarkersRef.current.forEach((marker, key) => {
      const el = marker.getElement();
      if (!el) return;
      const isSelected = key === personId;
      const photoEl = el.querySelector('.photo-ring') as HTMLElement;
      if (photoEl) {
        photoEl.style.boxShadow = isSelected ? '0 0 0 3px #C2A46D' : '0 1px 4px rgba(0,0,0,0.3)';
      }
    });
  }, [markers]);

  // ── Initialize Leaflet map with photo markers + hover popups ──
  useEffect(() => {
    if (!isOpen || !leafletAvailable || !mapContainerRef.current || markers.length === 0) return;

    const initMap = async () => {
      const L = await import('leaflet');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      leafletMarkersRef.current.clear();

      const map = L.map(mapContainerRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView([20.5937, 78.9629], 5);
      mapInstanceRef.current = map;

      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // Map tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      // ── Photo markers with hover popups ──
      for (const marker of markers) {
        const markerPersons = marker.persons;
        const uniqueById = new Map<string, typeof markerPersons[0]>();
        for (const p of markerPersons) uniqueById.set(p.personId, p);
        const dedupedPersons = Array.from(uniqueById.values());
        const count = dedupedPersons.length;

        // Find AI highlight for this place
        const placeHighlight = insights?.placeHighlights?.find(
          h => h.place.toLowerCase() === marker.place.toLowerCase()
        )?.highlight;

        if (count <= 3) {
          // Individual photo markers with fan offset
          const offsets = count === 1
            ? [[0, 0]]
            : count === 2
              ? [[-10, 0], [10, 0]]
              : [[-14, 0], [0, -12], [14, 0]];

          for (let i = 0; i < dedupedPersons.length; i++) {
            const p = dedupedPersons[i];
            const photo = p.profilePhotoUrl;
            const initials = getInitials(p.personName);
            const ox = offsets[i]?.[0] ?? 0;
            const oy = offsets[i]?.[1] ?? 0;

            const html = photo
              ? `<div class="photo-ring" style="width:40px;height:40px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);overflow:hidden;background:#E8EDFF">
                   <img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                   <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>
                 </div>`
              : `<div class="photo-ring" style="width:40px;height:40px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`;

            const icon = L.divIcon({
              className: 'migration-photo-marker',
              html,
              iconSize: [40, 40],
              iconAnchor: [20 - ox, 20 - oy],
            });

            const leafletMarker = L.marker([marker.lat, marker.lon], { icon }).addTo(map);

            // Hover popup with person details
            const popupHtml = buildPersonPopupHtml(p, placeHighlight);
            leafletMarker.bindPopup(popupHtml, {
              maxWidth: 300,
              className: 'migration-person-popup',
              closeButton: true,
            });

            // Open popup on hover, keep open on click
            leafletMarker.on('mouseover', function (this: import('leaflet').Marker) { this.openPopup(); });

            leafletMarkersRef.current.set(p.personId, leafletMarker);
          }
        } else {
          // Cluster: 3 overlapping small photos + "+N" badge
          const top3 = dedupedPersons.slice(0, 3);
          let clusterHtml = `<div class="photo-ring" style="position:relative;width:56px;height:44px">`;
          top3.forEach((p, i) => {
            const photo = p.profilePhotoUrl;
            const initials = getInitials(p.personName);
            const left = i * 14;
            const zIndex = 3 - i;
            if (photo) {
              clusterHtml += `<div style="position:absolute;left:${left}px;top:2px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);overflow:hidden;z-index:${zIndex};background:#E8EDFF">
                <img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>
              </div>`;
            } else {
              clusterHtml += `<div style="position:absolute;left:${left}px;top:2px;width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);overflow:hidden;z-index:${zIndex};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2F3E8F,#4B2C5E)">${initials}</div>`;
            }
          });
          const remaining = count - 3;
          clusterHtml += `<div style="position:absolute;right:0;top:0;background:#C2A46D;color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 5px;z-index:5;border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.15)">+${remaining}</div>`;
          clusterHtml += `</div>`;

          const icon = L.divIcon({
            className: 'migration-cluster-marker',
            html: clusterHtml,
            iconSize: [56, 44],
            iconAnchor: [28, 22],
          });

          const leafletMarker = L.marker([marker.lat, marker.lon], { icon }).addTo(map);

          // Cluster hover popup: shows place name + list of persons with photos
          const popupHtml = buildClusterPopupHtml(marker.place, dedupedPersons, placeHighlight);
          leafletMarker.bindPopup(popupHtml, {
            maxWidth: 300,
            className: 'migration-person-popup',
            closeButton: true,
          });

          leafletMarker.on('mouseover', function (this: import('leaflet').Marker) { this.openPopup(); });

          // Store by place key so sidebar click can open it
          leafletMarkersRef.current.set(marker.place.toLowerCase().trim(), leafletMarker);

          // Place name label below cluster
          L.marker([marker.lat, marker.lon], {
            icon: L.divIcon({
              className: '',
              html: `<div style="text-align:center;font-size:10px;font-weight:600;color:#3D2E1F;text-shadow:0 0 3px #fff,0 0 3px #fff;white-space:nowrap;pointer-events:none">${marker.place}</div>`,
              iconSize: [120, 16],
              iconAnchor: [60, -22],
            }),
            interactive: false,
          }).addTo(map);
        }

        bounds.push([marker.lat, marker.lon]);
      }

      // ── Curved flow lines (Bezier) ──
      for (const flow of flows) {
        const from: [number, number] = [flow.from.lat, flow.from.lon];
        const to: [number, number] = [flow.to.lat, flow.to.lon];
        const curvePoints = bezierPoints(from, to);

        const polyline = L.polyline(curvePoints, {
          color: '#C2A46D',
          weight: 2,
          opacity: 0.45,
          dashArray: '8,6',
          lineCap: 'round',
        }).addTo(map);

        polyline.bindPopup(
          `<div style="font-family:Inter,system-ui,sans-serif;font-size:12px">` +
          `<b style="color:#3D2E1F">${flow.parentName}</b> <span style="color:#C2A46D">→</span> <b style="color:#3D2E1F">${flow.personName}</b>` +
          `<div style="color:#8B7355;font-size:11px;margin-top:2px">${flow.from.place} → ${flow.to.place}</div></div>`,
          { maxWidth: 260 }
        );
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }

      setTimeout(() => {
        map.invalidateSize();
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [60, 60] });
        }
      }, 300);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      leafletMarkersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leafletAvailable, markers, flows, insights]);

  if (!isOpen) return null;

  // ─── RENDER ───────────────────────────────────────────

  return (
    <div className={isFullpage
      ? 'shell-overlay z-40 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col'
      : `fixed ${isMobile ? 'inset-0' : 'inset-y-0 right-0 w-[600px] max-w-[90vw]'} bg-white shadow-xl z-50 flex flex-col border-l`
    }>
      {/* ── Header ── */}
      <div className={isFullpage
        ? 'shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm'
        : 'flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-[#E8EDFF] to-[#F3E8DE]'
      }>
        {isFullpage ? (
          <>
            <button onClick={onClose} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
            </button>
            <MapIcon className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
            <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1] flex-1">Geographic Journey</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F]' : 'hover:bg-[#2F3E8F]/[0.06] text-[#8B7355]'}`}
                title="Legend"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#2F3E8F]" />
              <h2 className="font-semibold text-gray-900">Geographic Journey</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`p-1 rounded transition-colors ${showFilters ? 'bg-[#E8D5C4] text-[#25327A]' : 'hover:bg-[#E8D5C4] text-gray-600'}`}
                title="Legend"
              >
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-[#E8D5C4] rounded transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter / Legend bar */}
      {showFilters && (
        <div className="px-4 py-2.5 border-b border-[#E2DBCE]/40 bg-white/60 dark:bg-[#1E1E1E]/60">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLACE_TYPE_COLORS.birth }} />
              <span className="text-[#5D4E3C]">Birthplace</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLACE_TYPE_COLORS.death }} />
              <span className="text-[#5D4E3C]">Death place</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLACE_TYPE_COLORS.native }} />
              <span className="text-[#5D4E3C]">Native place</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0 border-t-2 border-dashed" style={{ borderColor: '#C2A46D' }} />
              <span className="text-[#5D4E3C]">Migration flow</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 relative min-h-0 flex overflow-hidden">

        {/* ═══ LEFT: Person sidebar (desktop fullpage only) ═══ */}
        {!isMobile && isFullpage && markers.length > 0 && (
          <div className="w-[260px] shrink-0 border-r border-[#E2DBCE]/40 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-sm flex flex-col">
            {/* Search */}
            <div className="px-3 py-2.5 border-b border-[#E2DBCE]/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B7355]" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-[#F6F2EA] dark:bg-[#252525] rounded-lg border border-[#E2DBCE]/60 dark:border-[#333] focus:outline-none focus:ring-1 focus:ring-[#C2A46D]/40 text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#B0A494]"
                />
              </div>
            </div>

            {/* Person list */}
            <div className="flex-1 overflow-y-auto migration-person-list">
              {filteredPersons.map(person => {
                const isSelected = person.personId === selectedPersonId;
                const primaryPlace = person.birthPlace || person.nativePlace || person.deathPlace || '';
                const placeType = person.birthPlace ? 'birth' : person.nativePlace ? 'native' : 'death';

                return (
                  <button
                    key={person.personId}
                    onClick={() => handleSelectPerson(isSelected ? null : person.personId)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F6F2EA] dark:hover:bg-[#252525] ${
                      isSelected ? 'bg-[#E8EDFF]/60 dark:bg-[#2A2544]/40' : ''
                    }`}
                  >
                    <PersonAvatar person={person} size={36} selected={isSelected} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                        {person.personName}
                      </div>
                      {primaryPlace && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: PLACE_TYPE_COLORS[placeType] || '#2F3E8F' }}
                          />
                          <span className="text-[10px] text-[#8B7355] dark:text-[#999] truncate">
                            {primaryPlace}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredPersons.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-[#8B7355]">
                  No people found
                </div>
              )}
            </div>

            {/* Sidebar footer count */}
            <div className="px-3 py-2 border-t border-[#E2DBCE]/30 text-[10px] text-[#8B7355]">
              {uniquePersons.length} people with places
            </div>
          </div>
        )}

        {/* ═══ CENTER: Map ═══ */}
        <div className="flex-1 relative min-w-0">
          {leafletAvailable === false ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm p-8 text-center">
              <div>
                <MapIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium mb-2">Leaflet not installed</p>
                <p>Run <code className="bg-gray-100 px-2 py-1 rounded">npm install leaflet @types/leaflet</code></p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F3E8F]" />
              <p className="text-sm text-[#8B7355]">{loadingStatus || 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500 text-sm p-8">{error}</div>
          ) : markers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm p-8 text-center">
              <div>
                <MapIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No geographic data found.</p>
                <p className="text-xs mt-1">Add birth places, death places, or native places to family members.</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} className="absolute inset-0" style={{ zIndex: 1 }} />
          )}
        </div>

        {/* ═══ MOBILE: Horizontal person scroll at bottom ═══ */}
        {isMobile && markers.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="flex gap-2 px-3 py-2.5 overflow-x-auto bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-md border-t border-[#E2DBCE]/40"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {uniquePersons.map(person => {
                const isSelected = person.personId === selectedPersonId;
                return (
                  <button
                    key={person.personId}
                    onClick={() => handleSelectPerson(isSelected ? null : person.personId)}
                    className={`shrink-0 flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors ${
                      isSelected ? 'bg-[#E8EDFF]' : ''
                    }`}
                    style={{ minWidth: 56 }}
                  >
                    <PersonAvatar person={person} size={40} selected={isSelected} />
                    <span className="text-[9px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate max-w-[52px]">
                      {person.personName.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      {markers.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E2DBCE]/40 bg-white/60 dark:bg-[#1E1E1E]/60 text-xs text-[#8B7355] flex items-center gap-4">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {markers.length} locations</span>
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {flows.length} flows</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {uniquePersons.length} people</span>
        </div>
      )}
    </div>
  );
}
