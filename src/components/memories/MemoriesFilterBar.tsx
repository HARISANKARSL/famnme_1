import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Camera, Video, Music, FileText, X, SlidersHorizontal, CheckSquare, ChevronDown } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { MEMORY_CATEGORIES } from '@/constants/memoryCategories';
import { getTempleById } from '@/data/temples';
import type { MemoriesPageState } from './useMemoriesPageState';
import { fetchCategories } from '@/services/memoriesApiService';
import { DateInput } from '@/components/ui/DateInput';

interface MemoriesFilterBarProps {
  state: MemoriesPageState;
  dispatch: React.Dispatch<any>;
  persons: Array<{ personId: string; firstName: string; lastName: string }>;
  templeMemoryCounts?: Record<string, number>;
  onToggleSelectMode?: () => void;
  selectMode?: boolean;
  categoriesRefreshTrigger?: number;
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types', icon: null },
  { value: 'photo', label: 'Photo', icon: Camera },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'mp3', label: 'Audio', icon: Music },
  { value: 'pdf', label: 'Document', icon: FileText },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'dateTaken', label: 'Date taken' },
  { value: 'mostLiked', label: 'Most liked' },
  { value: 'title-az', label: 'Title A \u2192 Z' },
  { value: 'title-za', label: 'Title Z \u2192 A' },
];

type ViewMode = MemoriesPageState['viewMode'];

const DESKTOP_TABS: Array<{ value: ViewMode; label: string }> = [
  { value: 'grid', label: 'Posts' },
  { value: 'albums', label: 'Albums' },
  { value: 'stories', label: 'Stories' },
];

const selectInputClass = 'w-full h-8 text-[11px] font-medium border border-[#E2DBCE]/60 dark:border-[#2a2a2a] rounded-md px-2.5 text-[#3D2E1F] dark:text-[#f5f5f5] bg-white dark:bg-[#1a1a1a] cursor-pointer hover:border-[#C2A46D]/40 transition-all duration-150 focus:border-[#C2A46D] focus:outline-none';

export function MemoriesFilterBar({ state, dispatch, persons, templeMemoryCounts, onToggleSelectMode, selectMode, categoriesRefreshTrigger }: MemoriesFilterBarProps) {
  const { isMobile } = useResponsive();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Debounced search logic
  const [localSearch, setLocalSearch] = useState(state.searchQuery);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [personSearch, setPersonSearch] = useState('');

  const todayStr = useMemo(() => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const dateError = useMemo(() => {
    if (!state.dateFrom && !state.dateTo) return null;

    if (state.dateFrom && state.dateFrom > todayStr) {
      return 'From Date cannot be in the future';
    }
    if (state.dateTo && state.dateTo > todayStr) {
      return 'To Date cannot be in the future';
    }

    if (state.dateFrom && state.dateTo) {
      if (state.dateFrom > state.dateTo) {
        return 'From Date cannot be greater than To Date';
      }
    } else if (state.dateFrom) {
      return 'Please select To Date to complete the range';
    } else if (state.dateTo) {
      return 'Please select From Date to complete the range';
    }

    return null;
  }, [state.dateFrom, state.dateTo, todayStr]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetchCategories();
        let list: string[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response && Array.isArray(response.data)) {
          list = response.data;
        } else if (response && Array.isArray(response.categories)) {
          list = response.categories;
        } else if (response && typeof response === 'object') {
          const foundArray = Object.values(response).find(val => Array.isArray(val));
          if (foundArray) {
            list = foundArray as string[];
          }
        }
        if (list && list.length > 0) {
          setCategories(list);
        }
      } catch (err) {
        console.error('Failed to fetch categories, using static fallback:', err);
      }
    }
    loadCategories();
  }, [categoriesRefreshTrigger]);

  useEffect(() => {
    setLocalSearch(state.searchQuery);
  }, [state.searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== state.searchQuery) {
        dispatch({ type: 'SET_SEARCH_QUERY', payload: localSearch });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, dispatch, state.searchQuery]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilterPanel) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node) &&
        filterButtonRef.current && !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // Clear search on tab change
  useEffect(() => {
    setLocalSearch('');
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
  }, [state.viewMode, dispatch]);

  useEffect(() => {
    if (!showFilterPanel) {
      setShowCategoryDropdown(false);
      setCategorySearch('');
      setShowPersonDropdown(false);
      setPersonSearch('');
    }
  }, [showFilterPanel]);

  const getSearchPlaceholder = () => {
    if (state.viewMode === 'albums') {
      return 'Search Albums...';
    }
    return 'Search Posts...';
  };

  const filteredCategories = categories.filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const formatPersonName = (firstName?: string, lastName?: string) => {
    const f = firstName && firstName !== 'undefined' && firstName !== 'null' ? firstName : '';
    const l = lastName && lastName !== 'undefined' && lastName !== 'null' ? lastName : '';
    return `${f} ${l}`.trim();
  };

  const filteredPersons = persons.filter(p => {
    const fullName = formatPersonName(p.firstName, p.lastName).toLowerCase();
    return fullName.includes(personSearch.toLowerCase());
  });

  const selectedPerson = persons.find(p => p.personId === state.taggedPersonId);
  const selectedPersonName = selectedPerson ? (formatPersonName(selectedPerson.firstName, selectedPerson.lastName) || 'Unknown') : 'All People';

  const templeOptions = Object.entries(templeMemoryCounts || {}).filter(([, c]) => c > 0);
  const activeFilterCount = [
    state.typeFilter !== 'all' ? state.typeFilter : '',
    state.categoryFilter,
    state.dateFrom,
    state.dateTo,
    state.taggedPersonId,
    state.templeFilterId,
    state.statusFilter !== 'all' ? state.statusFilter : '',
    state.sortBy !== 'newest' ? state.sortBy : '',
  ].filter(Boolean).length;


  return (
    <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm">
      {isMobile ? (
        /* Mobile: Stacked layout */
        <div className="px-3 py-2 space-y-1.5 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
          {state.viewMode !== 'stories' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
              <input type="text" placeholder={getSearchPlaceholder()} value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[14px] rounded-lg border border-[#E2DBCE]/60 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[#3D2E1F] dark:text-[#f5f5f5] focus:border-[#C2A46D] focus:outline-none transition-all placeholder:text-[#C4B5A5]" />
              {localSearch && (
                <button onClick={() => { setLocalSearch(''); dispatch({ type: 'SET_SEARCH_QUERY', payload: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B8A090]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {state.viewMode !== 'stories' && state.viewMode !== 'albums' && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 w-max">
                  {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => dispatch({ type: 'SET_TYPE_FILTER', payload: value })}
                      className={`flex items-center gap-1 px-2.5 py-[5px] text-[11px] font-medium rounded-md whitespace-nowrap transition-all duration-150 ${state.typeFilter === value ? 'bg-[#C2A46D] text-white' : 'text-[#8B7355] dark:text-[#777] bg-[#f0ebe4] dark:bg-[#1f1f1f]'
                        }`}>
                      {Icon && <Icon className="w-3 h-3" strokeWidth={1.5} />}{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Desktop: Clean top bar — Posts / Albums / Stories / Search / Filter / Select */
        <div className="w-full">
          <div className="flex items-center gap-2.5 pl-4 pr-4 h-[44px]">
            {/* Tabs — only Posts, Albums, Stories */}
            {DESKTOP_TABS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: value })}
                className={`h-8 px-3.5 text-[11px] font-semibold rounded-xl shrink-0 transition-all duration-200 ${(state.viewMode === value || (value === 'grid' && (state.viewMode === 'list' || state.viewMode === 'timeline')))
                  ? 'bg-[#2F3E8F] text-white shadow-sm'
                  : 'text-[#8B7355] dark:text-[#999] bg-white dark:bg-[#242424] ring-1 ring-stone-100 dark:ring-[#333] hover:ring-[#C2A46D]/40 hover:text-[#3D2E1F]'
                  }`}
              >
                {label}
              </button>
            ))}

            {/* Search bar — fills space */}
            {state.viewMode !== 'stories' && (
              <div className="relative flex-1 min-w-[100px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
                <input type="text" placeholder={getSearchPlaceholder()}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full h-8 pl-7 pr-2 text-[11px] rounded-xl bg-white dark:bg-[#242424] ring-1 ring-stone-100 dark:ring-[#333] text-[#3D2E1F] dark:text-[#f5f5f5] focus:ring-[#C2A46D] focus:outline-none transition-all placeholder:text-[#C4B5A5]" />
                {localSearch && (
                  <button onClick={() => { setLocalSearch(''); dispatch({ type: 'SET_SEARCH_QUERY', payload: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#B8A090] hover:text-[#8B7355]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Filter button & Panel group */}
            {state.viewMode !== 'stories' && state.viewMode !== 'albums' && (
              <div className="relative shrink-0">
                <button
                  ref={filterButtonRef}
                  onClick={() => setShowFilterPanel(v => !v)}
                  className={`flex items-center gap-1 h-8 px-3 rounded-xl text-[11px] font-medium transition-all duration-200 ${showFilterPanel || activeFilterCount > 0
                    ? 'bg-[#C2A46D]/10 ring-1 ring-[#C2A46D]/30 text-[#C2A46D]'
                    : 'bg-white dark:bg-[#242424] ring-1 ring-stone-100 dark:ring-[#333] text-[#8B7355] dark:text-[#999] hover:ring-[#C2A46D]/40'
                    }`}
                >
                  <SlidersHorizontal className="w-3 h-3" strokeWidth={1.5} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center leading-none text-white bg-[#C2A46D]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter panel — absolute positioning relative to this container */}
                {showFilterPanel && (
                  <div
                    ref={filterPanelRef}
                    className="absolute top-full right-0 mt-1.5 w-[300px] bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[#E2DBCE]/60 dark:border-[#3a3a3a] p-5 z-[1000] space-y-4 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 cursor-default"
                  >
                    {/* Type filter */}
                    <div>
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Type</label>
                      <div className="flex flex-wrap gap-1">
                        {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                          <button key={value} onClick={() => dispatch({ type: 'SET_TYPE_FILTER', payload: value })}
                            className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium rounded-md border transition-all ${state.typeFilter === value
                              ? 'bg-[#C2A46D] border-[#C2A46D] text-white'
                              : 'border-[#E2DBCE]/60 dark:border-[#3a3a3a] text-[#8B7355] dark:text-[#999] hover:border-[#C2A46D]/50'
                              }`}>
                            {Icon && <Icon className="w-3 h-3" strokeWidth={1.5} />}{label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Sort</label>
                      <select value={state.sortBy} onChange={(e) => dispatch({ type: 'SET_SORT_BY', payload: e.target.value })} className={selectInputClass}>
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Status</label>
                      <select value={state.statusFilter} onChange={(e) => dispatch({ type: 'SET_STATUS_FILTER', payload: e.target.value as MemoriesPageState['statusFilter'] })} className={selectInputClass}>
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Drafts</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div className="relative">
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Category</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryDropdown(!showCategoryDropdown);
                          setShowPersonDropdown(false);
                          setCategorySearch('');
                        }}
                        className={`${selectInputClass} flex items-center justify-between text-left`}
                      >
                        <span className="truncate">{state.categoryFilter || 'All Categories'}</span>
                        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCategoryDropdown && (
                        <div className="mt-1 border border-[#E2DBCE]/60 dark:border-[#3a3a3a] rounded-lg bg-stone-50 dark:bg-[#1f1f1f] p-2 space-y-1.5 max-h-[200px] flex flex-col z-10 relative">
                          <input
                            type="text"
                            placeholder="Type to search..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full h-7 text-[11px] px-2 border border-[#E2DBCE]/60 dark:border-[#2a2a2a] rounded-md bg-white dark:bg-[#151515] text-[#3D2E1F] dark:text-[#f5f5f5] focus:outline-none focus:border-[#C2A46D] placeholder:text-stone-400"
                            autoFocus
                          />
                          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-[140px] scrollbar-thin">
                            {filteredCategories.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  const nextValue = state.categoryFilter === c ? '' : c;
                                  dispatch({ type: 'SET_CATEGORY_FILTER', payload: nextValue });
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors truncate ${state.categoryFilter === c ? 'bg-[#C2A46D] text-white' : 'text-[#3D2E1F] dark:text-[#ccc] hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                              >
                                {c}
                              </button>
                            ))}
                            {filteredCategories.length === 0 && (
                              <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center py-2">No categories found</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Date range */}
                    <div>
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Date Range</label>
                      <div className="flex gap-2">
                        <DateInput
                          value={state.dateFrom}
                          onChange={(e) => dispatch({ type: 'SET_DATE_FROM', payload: e.target.value })}
                          className={`${selectInputClass} flex-1`}
                          max={todayStr}
                          placeholder="From Date"
                        />
                        <DateInput
                          value={state.dateTo}
                          onChange={(e) => dispatch({ type: 'SET_DATE_TO', payload: e.target.value })}
                          className={`${selectInputClass} flex-1`}
                          min={state.dateFrom || undefined}
                          max={todayStr}
                          placeholder="To Date"
                        />
                      </div>
                      {dateError && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-medium">
                          {dateError}
                        </p>
                      )}
                    </div>

                    {/* Person */}
                    <div className="relative">
                      <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Person</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPersonDropdown(!showPersonDropdown);
                          setShowCategoryDropdown(false);
                          setPersonSearch('');
                        }}
                        className={`${selectInputClass} flex items-center justify-between text-left`}
                      >
                        <span className="truncate">{selectedPersonName}</span>
                        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showPersonDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showPersonDropdown && (
                        <div className="mt-1 border border-[#E2DBCE]/60 dark:border-[#3a3a3a] rounded-lg bg-stone-50 dark:bg-[#1f1f1f] p-2 space-y-1.5 max-h-[200px] flex flex-col z-10 relative">
                          <input
                            type="text"
                            placeholder="Type to search..."
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                            className="w-full h-7 text-[11px] px-2 border border-[#E2DBCE]/60 dark:border-[#2a2a2a] rounded-md bg-white dark:bg-[#151515] text-[#3D2E1F] dark:text-[#f5f5f5] focus:outline-none focus:border-[#C2A46D] placeholder:text-stone-400"
                            autoFocus
                          />
                          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-[140px] scrollbar-thin">
                            {filteredPersons.map(p => (
                              <button
                                key={p.personId}
                                type="button"
                                onClick={() => {
                                  const nextValue = state.taggedPersonId === p.personId ? '' : p.personId;
                                  dispatch({ type: 'SET_TAGGED_PERSON', payload: nextValue });
                                  setShowPersonDropdown(false);
                                }}
                                className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors truncate ${state.taggedPersonId === p.personId ? 'bg-[#C2A46D] text-white' : 'text-[#3D2E1F] dark:text-[#ccc] hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                              >
                                {formatPersonName(p.firstName, p.lastName)}
                              </button>
                            ))}
                            {filteredPersons.length === 0 && (
                              <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center py-2">No people found</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Temple filter */}
                    {templeOptions.length > 0 && (
                      <div>
                        <label className="text-[10px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider mb-1.5 block">Temple</label>
                        <select value={state.templeFilterId} onChange={(e) => dispatch({ type: 'SET_TEMPLE_FILTER', payload: e.target.value })} className={selectInputClass}>
                          <option value="">All Temples</option>
                          {templeOptions.map(([templeId]) => {
                            const temple = getTempleById(templeId);
                            return <option key={templeId} value={templeId}>{temple?.name ?? templeId}</option>;
                          })}
                        </select>
                      </div>
                    )}

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                      <button onClick={() => { dispatch({ type: 'CLEAR_FILTERS' }); setShowFilterPanel(false); }}
                        className="w-full flex items-center justify-center gap-1 h-8 text-[11px] font-medium text-[#C2A46D] hover:bg-[#C2A46D]/8 rounded-md border border-[#C2A46D]/20 transition-all">
                        <X className="w-3 h-3" strokeWidth={2} />Clear All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Select button — only on grid/list views */}
            {onToggleSelectMode && (state.viewMode === 'grid' || state.viewMode === 'list') && (
              <button onClick={onToggleSelectMode}
                className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium rounded-md border shrink-0 transition-all duration-150 ${selectMode
                  ? 'bg-[#C2A46D]/10 border-[#C2A46D]/30 text-[#C2A46D]'
                  : 'border-[#E2DBCE]/60 dark:border-[#2a2a2a] text-[#8B7355] dark:text-[#999] hover:border-[#C2A46D]/40 hover:text-[#C2A46D]'
                  }`}>
                <CheckSquare className="w-3 h-3" strokeWidth={1.5} />
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
