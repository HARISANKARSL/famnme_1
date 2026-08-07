import { useState, useEffect, useRef, useCallback } from 'react';
import { createStandardizedPlace, autocompletePlaces } from '@/services/placeApiService';
import { searchIndianPlaces, formatPlaceDisplay } from '@/data/places';
import type { IndianPlace } from '@/data/places';
import type { Place } from '@/types';

interface Suggestion {
  key: string;
  displayName: string;       // "Thiruvananthapuram, Thiruvananthapuram, Kerala"
  alternateNames: string[];  // ["Trivandrum"]
  source: 'local' | 'api' | 'recent';
  localPlace?: IndianPlace;  // present when source === 'local'
  apiPlace?: Place;          // present when source === 'api'
}

// E3 — recent places cache (last 50, per user, persisted via localStorage)
const RECENT_PLACES_KEY = 'fc_recent_places';
const RECENT_LIMIT = 50;

function loadRecentPlaces(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch { return []; }
}

function pushRecentPlace(name: string) {
  if (!name.trim()) return;
  try {
    const list = loadRecentPlaces().filter(p => p !== name);
    list.unshift(name);
    localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  } catch { /* ignore quota errors */ }
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  onPlaceSelected?: (place: IndianPlace) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  error?: string;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Enter place name...',
  className = '',
  id,
  disabled = false,
  error,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildLocalSuggestions = useCallback((q: string): Suggestion[] => {
    if (q.trim().length < 2) return [];
    const localResults = searchIndianPlaces(q, 8);
    return localResults.map(place => ({
      key: `local-${place.name}-${place.state}`,
      displayName: formatPlaceDisplay(place),
      alternateNames: place.alternateNames,
      source: 'local' as const,
      localPlace: place,
    }));
  }, []);

  const fetchApiSuggestions = useCallback(async (q: string, existingNames: Set<string>) => {
    try {
      const results = await autocompletePlaces(q, 10);
      const apiSuggestions: Suggestion[] = results
        .filter(name => !existingNames.has(name.toLowerCase()))
        .slice(0, 5)
        .map(name => ({
          key: `api-${name}`,
          displayName: name,
          alternateNames: [],
          source: 'api' as const,
        }));
      return apiSuggestions;
    } catch {
      return [];
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    // Instant local search
    const localSugs = buildLocalSuggestions(val);
    setSuggestions(localSugs);
    setIsOpen(localSugs.length > 0);
    setHighlightIndex(-1);

    // Debounced API search if local results are sparse
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        if (localSugs.length < 5) {
          setLoading(true);
          const existingNames = new Set(localSugs.map(s => s.localPlace!.name.toLowerCase()));
          const apiSugs = await fetchApiSuggestions(val, existingNames);
          if (apiSugs.length > 0) {
            setSuggestions(prev => {
              const merged = [...prev, ...apiSugs];
              setIsOpen(merged.length > 0);
              return merged;
            });
          }
          setLoading(false);
        }
      }, 400);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    let chosenName = '';
    if (suggestion.source === 'local' && suggestion.localPlace) {
      const place = suggestion.localPlace;
      chosenName = suggestion.displayName;
      setQuery(chosenName);
      onChange(chosenName);
      onPlaceSelected?.(place);
      // Fire-and-forget: ensure Place node exists in Neo4j with coordinates
      createStandardizedPlace(place).catch(() => { });
    } else if (suggestion.source === 'api') {
      chosenName = suggestion.displayName;
      setQuery(chosenName);
      onChange(chosenName);
    } else if (suggestion.source === 'recent') {
      chosenName = suggestion.displayName;
      setQuery(chosenName);
      onChange(chosenName);
    }
    if (chosenName) pushRecentPlace(chosenName);
    setIsOpen(false);
    setSuggestions([]);
  };

  // E3 — show recent places when input is empty/focused
  const handleFocus = () => {
    if (query.trim().length === 0) {
      const recents = loadRecentPlaces().slice(0, 6);
      if (recents.length > 0) {
        setSuggestions(recents.map(name => ({
          key: `recent-${name}`,
          displayName: name,
          alternateNames: [],
          source: 'recent' as const,
        })));
        setIsOpen(true);
        return;
      }
    }
    if (suggestions.length > 0) setIsOpen(true);
  };

  // E3 — "use current location" via Geolocation + reverse-geocode
  const [geoLoading, setGeoLoading] = useState(false);
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Use OpenStreetMap Nominatim reverse geocoding (no API key required)
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`,
            { headers: { 'User-Agent': 'FamilyAConnect/1.0' } }
          );
          if (r.ok) {
            const data = await r.json();
            const a = data.address || {};
            const parts = [
              a.city || a.town || a.village || a.suburb,
              a.state_district || a.county,
              a.state,
              a.country,
            ].filter(Boolean);
            const name = parts.join(', ') || data.display_name || '';
            if (name) {
              setQuery(name);
              onChange(name);
              pushRecentPlace(name);
            }
          }
        } catch { /* silent */ }
        finally { setGeoLoading(false); setIsOpen(false); }
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">
      <input
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-blue-500 ${
          error
            ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
            : 'border-gray-300 focus:ring-[#2F3E8F]'
        } ${className} ${disabled ? 'bg-gray-100 dark:bg-zinc-750 cursor-not-allowed opacity-50' : ''}`}
        autoComplete="off"
      />
      {error && (
        <span className="text-[11px] text-red-500 font-medium px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {error}
        </span>
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#2F3E8F] rounded-full animate-spin dark:border-zinc-600 dark:border-t-blue-500" />
        </div>
      )}

      {isOpen && (suggestions.length > 0 || 'geolocation' in navigator) && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* "Use current location" — always at top when geolocation is available */}
          {/* {'geolocation' in navigator && (
            <li
              className="px-3 py-2 cursor-pointer text-sm border-b border-stone-100 dark:border-zinc-800 hover:bg-[#F8F6F1] dark:hover:bg-zinc-800/80 flex items-center gap-2 text-[#2F3E8F] dark:text-blue-400 font-medium"
              onMouseDown={handleUseCurrentLocation}
            >
              <span aria-hidden>📍</span>
              {geoLoading ? 'Detecting your location…' : 'Use current location'}
            </li>
          )} */}
          {suggestions.length === 0 && !geoLoading && (
            <li className="px-3 py-2 text-xs text-stone-400 dark:text-zinc-500">Start typing to see suggestions</li>
          )}
          {suggestions.map((sug, idx) => {
            // Split "Place, District, State" so state+country render in muted gray
            const parts = sug.displayName.split(',').map(s => s.trim()).filter(Boolean);
            const head = parts[0] || sug.displayName;
            const tail = parts.slice(1).join(', ');
            return (
              <li
                key={sug.key}
                className={`px-3 py-2 cursor-pointer text-sm ${idx === highlightIndex ? 'bg-[#E8EDFF] dark:bg-zinc-800 text-[#3D2E1F] dark:text-zinc-100' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-stone-850 dark:text-zinc-200'
                  }`}
                onMouseDown={() => handleSelect(sug)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {head}
                    {tail && <span className="text-stone-400 dark:text-zinc-500 font-normal">, {tail}</span>}
                  </span>
                  {/* {sug.source === 'recent' ? (
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 ml-2 uppercase tracking-wide">recent</span>
                  ) : sug.source === 'local' && sug.localPlace ? (
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-2 uppercase tracking-wide">
                      {sug.localPlace.type === 'state' || sug.localPlace.type === 'union_territory'
                        ? sug.localPlace.type.replace('_', ' ')
                        : sug.localPlace.type}
                    </span>
                  ) : null} */}
                </div>
                {/* {sug.alternateNames.length > 0 && (
                  <div className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">
                    Also: {sug.alternateNames.join(', ')}
                  </div>
                )} */}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
