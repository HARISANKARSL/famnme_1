import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { Person } from '@/types';

export interface AdvancedSearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  persons: Person[];
  onSearchResults: (personIds: string[] | null) => void;
}

export function AdvancedSearchSidebar({ isOpen, onClose, persons, onSearchResults }: AdvancedSearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filters State
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [resultCount, setResultCount] = useState<number | null>(null);

  // Suggestions from existing persons in the tree
  const suggestionsData = useMemo(() => {
    const occupations = new Map<string, string>();
    const educations = new Map<string, string>();
    const birthPlaces = new Map<string, string>();
    const nativePlaces = new Map<string, string>();
    const castes = new Map<string, string>();
    const gotras = new Map<string, string>();
    const religions = new Map<string, string>();

    persons.forEach(p => {
      if (p.occupation) {
        const val = p.occupation.trim();
        if (val) occupations.set(val.toLowerCase(), val);
      }
      if (p.education) {
        const val = p.education.trim();
        if (val) educations.set(val.toLowerCase(), val);
      }
      if (p.birthPlace) {
        const val = p.birthPlace.trim();
        if (val) birthPlaces.set(val.toLowerCase(), val);
      }
      if (p.nativePlace) {
        const val = p.nativePlace.trim();
        if (val) nativePlaces.set(val.toLowerCase(), val);
      }
      if (p.caste) {
        const val = p.caste.trim();
        if (val) castes.set(val.toLowerCase(), val);
      }
      if (p.gotra) {
        const val = p.gotra.trim();
        if (val) gotras.set(val.toLowerCase(), val);
      }
      if (p.religion) {
        const val = p.religion.trim();
        if (val) religions.set(val.toLowerCase(), val);
      }
    });

    return {
      occupation: Array.from(occupations.values()).sort(),
      education: Array.from(educations.values()).sort(),
      birthPlace: Array.from(birthPlaces.values()).sort(),
      nativePlace: Array.from(nativePlaces.values()).sort(),
      caste: Array.from(castes.values()).sort(),
      gotra: Array.from(gotras.values()).sort(),
      religion: Array.from(religions.values()).sort(),
    };
  }, [persons]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (!value) delete newFilters[key];
      else newFilters[key] = value;
      return newFilters;
    });
  };

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setFilters(prev => Object.keys(prev).length === 0 ? prev : {});
    setResultCount(null);
    onSearchResults(null);
  }, [onSearchResults]);

  const applyFilters = useCallback(() => {
    // If no query and no filters, just reset.
    if (!searchQuery && Object.keys(filters).length === 0) {
      setResultCount(null);
      onSearchResults(null);
      return;
    }

    let filtered = persons;

    // Search query (global text search)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.firstName?.toLowerCase().includes(q)) ||
        (p.lastName?.toLowerCase().includes(q)) ||
        (p.birthPlace?.toLowerCase().includes(q)) ||
        (p.nativePlace?.toLowerCase().includes(q)) ||
        (p.occupation?.toLowerCase().includes(q)) ||
        (p.biography?.toLowerCase().includes(q))
      );
    }

    // Apply specific filters
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      const v = value.toLowerCase();

      filtered = filtered.filter(p => {
        if (key === 'isLiving') {
          return p.isLiving === (value === 'true');
        }

        // Dynamic string matching for other keys
        const pValue = p[key as keyof Person];
        if (typeof pValue === 'string') {
          if (key === 'gender') {
            return pValue.toLowerCase() === v;
          }
          return pValue.toLowerCase() === v || pValue.toLowerCase().includes(v);
        }
        return false;
      });
    });

    setResultCount(filtered.length);
    onSearchResults(filtered.map(p => p.personId));
  }, [searchQuery, filters, persons, onSearchResults]);

  // Debounced search trigger
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    // Only fetch if there's actually something to search
    if (!searchQuery && Object.keys(filters).length === 0) {
      setResultCount(null);
      onSearchResults(null);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      applyFilters();
    }, 150); // Lower timeout for local filtering

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, filters, applyFilters, onSearchResults]);

  // Accordion Sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[360px] bg-white dark:bg-zinc-950 border-l dark:border-zinc-850 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-850">
          <div className="flex items-center gap-2 text-[#2F3E8F] dark:text-[#93C5FD] font-semibold">
            <Search className="w-5 h-5" />
            <span>Advanced Search</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 font-medium px-2 py-1 transition-colors"
            >
              Clear
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Text Search & Meta */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-850 bg-gray-50/50 dark:bg-zinc-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search any field — name, place, biography..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg outline-none text-gray-900 dark:text-zinc-100 focus:border-[#2F3E8F] dark:focus:border-[#93C5FD] focus:ring-1 focus:ring-[#2F3E8F] dark:focus:ring-[#93C5FD] placeholder:text-gray-400 dark:placeholder:text-zinc-550 transition-all"
            />
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-zinc-300 font-medium">
                {resultCount !== null
                  ? resultCount === 0
                    ? 'No members found for the selected criteria'
                    : `${resultCount} matches`
                  : 'Set filters to find people'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Filters */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">

          {/* Section: Identity */}
          <FilterSection title="Identity" id="identity" expanded={expandedSections['identity']} onToggle={() => toggleSection('identity')}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-2">Living status</label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Any" active={!filters.isLiving} onClick={() => updateFilter('isLiving', '')} />
                  <FilterChip label="Living" active={filters.isLiving === 'true'} onClick={() => updateFilter('isLiving', 'true')} />
                  <FilterChip label="Deceased" active={filters.isLiving === 'false'} onClick={() => updateFilter('isLiving', 'false')} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-2">Gender</label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Any" active={!filters.gender} onClick={() => updateFilter('gender', '')} />
                  <FilterChip label="Male" active={filters.gender === 'male'} onClick={() => updateFilter('gender', 'male')} />
                  <FilterChip label="Female" active={filters.gender === 'female'} onClick={() => updateFilter('gender', 'female')} />
                  <FilterChip label="Other" active={filters.gender === 'other'} onClick={() => updateFilter('gender', 'other')} />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Section: Profession & Education */}
          <FilterSection title="Profession & Education" id="profession" expanded={expandedSections['profession']} onToggle={() => toggleSection('profession')}>
            <div className="space-y-3">
              <FilterInput
                label="Occupation"
                placeholder="e.g. Doctor, Teacher"
                value={filters.occupation || ''}
                onChange={(v) => updateFilter('occupation', v)}
                suggestions={suggestionsData.occupation}
                suggestionsId="adv-search-occupation-suggestions"
              />
              <FilterInput
                label="Education"
                placeholder="e.g. University of Delhi"
                value={filters.education || ''}
                onChange={(v) => updateFilter('education', v)}
                suggestions={suggestionsData.education}
                suggestionsId="adv-search-education-suggestions"
              />
            </div>
          </FilterSection>

          {/* Section: Place */}
          <FilterSection title="Place" id="place" expanded={expandedSections['place']} onToggle={() => toggleSection('place')}>
            <div className="space-y-3">
              <FilterInput
                label="Birth Place"
                placeholder="e.g. Mumbai"
                value={filters.birthPlace || ''}
                onChange={(v) => updateFilter('birthPlace', v)}
                suggestions={suggestionsData.birthPlace}
                suggestionsId="adv-search-birthPlace-suggestions"
              />
              <FilterInput
                label="Native Place"
                placeholder="e.g. Kerala"
                value={filters.nativePlace || ''}
                onChange={(v) => updateFilter('nativePlace', v)}
                suggestions={suggestionsData.nativePlace}
                suggestionsId="adv-search-nativePlace-suggestions"
              />
            </div>
          </FilterSection>

          {/* Section: Cultural */}
          <FilterSection title="Cultural" id="cultural" expanded={expandedSections['cultural']} onToggle={() => toggleSection('cultural')}>
            <div className="space-y-3">
              <FilterInput
                label="Caste"
                placeholder="e.g. Brahmin"
                value={filters.caste || ''}
                onChange={(v) => updateFilter('caste', v)}
                suggestions={suggestionsData.caste}
                suggestionsId="adv-search-caste-suggestions"
              />
              <FilterInput
                label="Gotra"
                placeholder="e.g. Bharadwaj"
                value={filters.gotra || ''}
                onChange={(v) => updateFilter('gotra', v)}
                suggestions={suggestionsData.gotra}
                suggestionsId="adv-search-gotra-suggestions"
              />
              <FilterInput
                label="Religion"
                placeholder="e.g. Hindu"
                value={filters.religion || ''}
                onChange={(v) => updateFilter('religion', v)}
                suggestions={suggestionsData.religion}
                suggestionsId="adv-search-religion-suggestions"
              />
            </div>
          </FilterSection>

        </div>
      </div>
    </>
  );
}

// Helpers

function FilterSection({ title, id, expanded, onToggle, children }: any) {
  return (
    <div className="border-b border-gray-100 dark:border-zinc-850">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span className="font-medium text-sm text-gray-800 dark:text-zinc-200">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${active
        ? 'bg-[#2F3E8F] dark:bg-[#3B4DA6] border-[#2F3E8F] dark:border-[#3B4DA6] text-white shadow-sm font-medium'
        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700'
        }`}
    >
      {label}
    </button>
  );
}

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
  suggestionsId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!suggestions) return [];
    if (!value) return suggestions;
    const q = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q));
  }, [suggestions, value]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg outline-none text-gray-900 dark:text-zinc-100 focus:border-[#2F3E8F] dark:focus:border-[#93C5FD] placeholder:text-gray-400 dark:placeholder:text-zinc-550 transition-colors"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800 scrollbar-thin">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-[#F4F6F9] dark:hover:bg-zinc-900 hover:text-[#2F3E8F] dark:hover:text-[#93C5FD] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
