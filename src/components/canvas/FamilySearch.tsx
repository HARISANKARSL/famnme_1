/**
 * FamilySearch Component
 *
 * Smart search for finding family members by name.
 * Collapsed to a search icon by default; expands on tap/click.
 * Focuses and zooms to the selected person's node.
 */

import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react';
import type { Person } from '@/types';
import { searchPersons } from '@/services/phase1ApiService';

export interface FamilySearchProps {
  persons: Person[];
  onPersonFound: (personId: string) => void;
  treeId?: string;
  onAdvancedSearchClick?: () => void;
}

function FamilySearchInner({ persons, onPersonFound, treeId, onAdvancedSearchClick }: FamilySearchProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isServerSearching, setIsServerSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverResultsRef = useRef<Person[]>([]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const mergeResults = useCallback((localResults: Person[], serverResults: Person[]): Person[] => {
    const seen = new Set(localResults.map(p => p.personId));
    const merged = [...localResults];
    for (const person of serverResults) {
      if (!seen.has(person.personId)) {
        seen.add(person.personId);
        merged.push(person);
      }
    }
    return merged;
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setIsServerSearching(false);
      serverResultsRef.current = [];
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    // Immediate client-side search
    const lowerQuery = query.toLowerCase();
    const localResults = persons.filter(person => {
      const fullName = [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' ').toLowerCase();
      return (
        fullName.includes(lowerQuery) ||
        (person.firstName && person.firstName.toLowerCase().includes(lowerQuery)) ||
        (person.lastName && person.lastName.toLowerCase().includes(lowerQuery))
      );
    });

    // Merge with any existing server results
    const merged = mergeResults(localResults, serverResultsRef.current);
    setSearchResults(merged);
    setShowResults(true);

    // Debounced server-side search when treeId is provided and query is 2+ chars
    if (treeId && query.trim().length >= 2) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setIsServerSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const serverResults = await searchPersons(treeId, query.trim());
          serverResultsRef.current = serverResults;
          // Re-run local search with current query to get fresh merge
          const freshLocal = persons.filter(person => {
            const fullName = [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' ').toLowerCase();
            const q = query.toLowerCase();
            return (
              fullName.includes(q) ||
              (person.firstName && person.firstName.toLowerCase().includes(q)) ||
              (person.lastName && person.lastName.toLowerCase().includes(q))
            );
          });
          const freshMerged = mergeResults(freshLocal, serverResults);
          setSearchResults(freshMerged);
          setShowResults(true);
        } catch (err) {
          // Server search failed silently; local results remain
          console.warn('Server search failed:', err);
        } finally {
          setIsServerSearching(false);
        }
      }, 300);
    } else {
      setIsServerSearching(false);
      serverResultsRef.current = [];
    }
  };

  const handleSelectPerson = (personId: string) => {
    onPersonFound(personId);
    setShowResults(false);
    const person = persons.find(p => p.personId === personId);
    if (person) {
      const name = [person.firstName, person.lastName].filter(n => n && n !== 'undefined').join(' ');
      setSearchQuery(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleSelectPerson(searchResults[0].personId);
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setIsServerSearching(false);
    serverResultsRef.current = [];
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  const handleBlur = () => {
    // Short delay so dropdown clicks register before collapsing
    setTimeout(() => {
      if (!searchQuery) setIsExpanded(false);
      setShowResults(false);
    }, 150);
  };

  // Programmatic focus (from searchFocusTrigger) also expands the bar
  const handleFocus = () => {
    setIsExpanded(true);
    if (searchQuery.trim()) setShowResults(true);
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      {/* Single container that morphs between icon and input */}
      <div
        className={`flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 shadow-md transition-all duration-200 ${
          isExpanded
            ? 'w-full rounded-full px-3 py-2 gap-2'
            : 'w-10 h-10 rounded-full justify-center cursor-pointer hover:bg-white dark:hover:bg-zinc-800'
        }`}
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
            // Focus the input after expanding
            setTimeout(() => {
              if (ref && typeof ref !== 'function') ref.current?.focus();
            }, 10);
          }
        }}
      >
        <Search className="w-4 h-4 text-gray-400 dark:text-zinc-550 shrink-0" />

        {/* Input — always in DOM so ref stays valid; visually hidden when collapsed */}
        <input
          ref={ref}
          type="text"
          placeholder="Search family members…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`outline-none text-sm text-gray-900 dark:text-zinc-100 bg-transparent min-w-0 transition-all duration-200 ${
            isExpanded ? 'flex-1' : 'w-0 opacity-0 pointer-events-none'
          }`}
        />

        {isExpanded && isServerSearching && (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />
        )}

        {isExpanded && searchQuery && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {isExpanded && onAdvancedSearchClick && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onAdvancedSearchClick();
            }}
            className="text-gray-400 hover:text-[#2F3E8F] dark:hover:text-[#93C5FD] shrink-0 ml-1 border-l pl-2 border-gray-200 dark:border-zinc-800"
            title="Advanced Search"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchQuery.trim() !== '' && (
        <div className="absolute top-full mt-1 w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-[280px] overflow-y-auto z-20 animate-in fade-in slide-in-from-top-1 duration-150">
          {searchResults.length > 0 ? (
            searchResults.map(person => (
              <button
                key={person.personId}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectPerson(person.personId)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center gap-3 border-b border-gray-100 dark:border-zinc-800 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-zinc-100">
                    {[person.firstName, person.lastName].filter(n => n && n !== 'undefined').join(' ')}
                  </div>
                  {(person.birthDate || person.occupation) && (
                    <div className="text-xs text-gray-500 dark:text-zinc-400">
                      {person.birthDate && new Date(person.birthDate).getFullYear()}
                      {person.birthDate && person.occupation && ' • '}
                      {person.occupation}
                    </div>
                  )}
                </div>
                {person.isHomePerson && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-950 text-[#2F3E8F] dark:text-[#93C5FD] px-2 py-0.5 rounded-full">
                    Primary
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-4 text-sm text-gray-500 dark:text-zinc-400 text-center select-none">
              No members found matching your search
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const FamilySearch = forwardRef<HTMLInputElement, FamilySearchProps>(FamilySearchInner);
