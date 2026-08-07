import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Map } from 'lucide-react';
import type { Temple } from '@/data/temples/types';
import { searchTemples } from '@/data/temples';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import type { PlaceSuggestion, SacredPlaceResult } from '@/types';
import { searchGoogleMapsPlaces } from '@/services/googleMapsApiService';

interface TempleSearchBarProps {
  onSelect: (result: SacredPlaceResult) => void;
  placeholder?: string;
  faithContext?: FaithContext;
}

export function TempleSearchBar({ onSelect, placeholder, faithContext }: TempleSearchBarProps) {
  const resolvedPlaceholder = placeholder || (faithContext === 'Christian' ? 'Search churches by name or location...' : faithContext === 'Islam' ? 'Search mosques by name or location...' : 'Search temples by name, deity, or location...');
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<Temple[]>([]);
  const [mapsResults, setMapsResults] = useState<PlaceSuggestion[]>([]);
  const [isMapsLoading, setIsMapsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Total results count for keyboard nav
  const totalResults = localResults.length + mapsResults.length;

  const getMapsType = useCallback((): 'temple' | 'church' | 'mosque' | undefined => {
    if (faithContext === 'Christian') return 'church';
    if (faithContext === 'Islam') return 'mosque';
    return 'temple';
  }, [faithContext]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setLocalResults([]);
      setMapsResults([]);
      setIsOpen(false);
      if (mapsDebounceRef.current) clearTimeout(mapsDebounceRef.current);
      return;
    }

    // Always run local search first (instant)
    const matches = searchTemples(value.trim(), 8);
    setLocalResults(matches);

    // Clear any previous debounce
    if (mapsDebounceRef.current) clearTimeout(mapsDebounceRef.current);

    const shouldAlwaysSearchMaps = faithContext === 'Christian' || faithContext === 'Islam';

    // Search Google Maps if:
    // 1. Local results are empty AND query is long enough, OR
    // 2. Faith context is Christian/Islam (always use Maps for those)
    if ((matches.length === 0 && value.trim().length >= 3) || (shouldAlwaysSearchMaps && value.trim().length >= 3)) {
      mapsDebounceRef.current = setTimeout(async () => {
        setIsMapsLoading(true);
        try {
          const mapsType = getMapsType();
          const results = await searchGoogleMapsPlaces(value.trim(), mapsType);
          // Deduplicate: filter out Maps results whose name closely matches a local result
          const localNames = matches.map(m => m.name.toLowerCase());
          const filtered = results.filter(r => !localNames.some(n => n.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(n)));
          setMapsResults(filtered);
          setIsOpen(matches.length > 0 || filtered.length > 0);
        } catch {
          setMapsResults([]);
        } finally {
          setIsMapsLoading(false);
        }
      }, 500);
    } else {
      setMapsResults([]);
      setIsOpen(matches.length > 0);
    }

    setHighlightIndex(-1);
  }, [faithContext, getMapsType]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (mapsDebounceRef.current) clearTimeout(mapsDebounceRef.current);
    };
  }, []);

  const selectResult = useCallback((result: SacredPlaceResult) => {
    onSelect(result);
    setQuery('');
    setLocalResults([]);
    setMapsResults([]);
    setIsOpen(false);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalResults === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      if (highlightIndex < localResults.length) {
        selectResult({ source: 'local', temple: localResults[highlightIndex] });
      } else {
        const mapsIdx = highlightIndex - localResults.length;
        selectResult({ source: 'maps', place: mapsResults[mapsIdx] });
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasAnyResults = localResults.length > 0 || mapsResults.length > 0 || isMapsLoading;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355] dark:text-[#A19F9D]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (hasAnyResults) setIsOpen(true); }}
          placeholder={resolvedPlaceholder}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-[#F6F2EA] dark:bg-[#1a1a1a] text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 focus:border-[#2F3E8F]/50 transition-all h-11 md:h-9 text-base md:text-[13px]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setLocalResults([]);
              setMapsResults([]);
              setIsOpen(false);
              if (mapsDebounceRef.current) clearTimeout(mapsDebounceRef.current);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#8B7355] dark:text-[#A19F9D]" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && hasAnyResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#E2DBCE]/80 dark:border-[#2a2a2a] rounded-xl shadow-lg z-50 max-h-[320px] overflow-y-auto">
          {/* Local DB results */}
          {localResults.map((temple, idx) => (
            <button
              key={temple.templeId}
              onClick={() => selectResult({ source: 'local', temple })}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
                idx === highlightIndex
                  ? 'bg-[#2F3E8F]/10 dark:bg-[#2F3E8F]/15'
                  : 'hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E]'
              } ${idx === 0 ? 'rounded-t-xl' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">
                  {temple.name}
                </p>
                <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">
                  {temple.deity} &middot; {temple.state}
                </p>
              </div>
              {temple.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] shrink-0">
                  {temple.category}
                </span>
              )}
            </button>
          ))}

          {/* Divider if both sections have results */}
          {localResults.length > 0 && (mapsResults.length > 0 || isMapsLoading) && (
            <div className="px-3 py-1.5 flex items-center gap-2">
              <div className="flex-1 h-px bg-[#E2DBCE]/60 dark:bg-[#2a2a2a]" />
              <span className="text-[10px] text-[#B8A090] dark:text-[#666] flex items-center gap-1">
                <Map className="w-3 h-3" />
                From Google Maps
              </span>
              <div className="flex-1 h-px bg-[#E2DBCE]/60 dark:bg-[#2a2a2a]" />
            </div>
          )}

          {/* Google Maps loading indicator */}
          {isMapsLoading && mapsResults.length === 0 && localResults.length === 0 && (
            <div className="px-3 py-3 flex items-center gap-2 text-[12px] text-[#8B7355] dark:text-[#A19F9D]">
              <div className="w-3 h-3 rounded-full border-2 border-[#2F3E8F]/40 border-t-[#2F3E8F] animate-spin shrink-0" />
              Searching maps...
            </div>
          )}

          {/* Google Maps results */}
          {mapsResults.map((place, idx) => {
            const overallIdx = localResults.length + idx;
            return (
              <button
                key={place.placeId}
                onClick={() => selectResult({ source: 'maps', place })}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
                  overallIdx === highlightIndex
                    ? 'bg-[#2F3E8F]/10 dark:bg-[#2F3E8F]/15'
                    : 'hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E]'
                } ${localResults.length === 0 && idx === 0 ? 'rounded-t-xl' : ''} ${idx === mapsResults.length - 1 ? 'rounded-b-xl' : ''}`}
              >
                <Map className="w-3.5 h-3.5 text-[#8B7355] dark:text-[#A19F9D] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">
                    {place.name}
                  </p>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">
                    {place.formattedAddress}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] shrink-0">
                  Maps
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
