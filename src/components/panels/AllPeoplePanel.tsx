import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, ChevronUp, ChevronDown, Download, X, Users, Loader2,
  LayoutGrid, List, SlidersHorizontal, Calendar, MapPin, Heart, Briefcase,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';
import { treeApi } from '@/api/endpoints';
import { useTheme } from '@/contexts/ThemeContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PersonRow {
  personId: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  isLiving: boolean;
  occupation?: string | null;
  tags?: string[];
  profilePhotoUrl?: string | null;
}

interface PeopleListResponse {
  people: PersonRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StatsData {
  total: number;
  living: number;
  deceased: number;
  male: number;
  female: number;
}

type SortField = 'firstName' | 'lastName' | 'birthDate' | 'birthPlace' | 'deathDate' | 'deathPlace' | 'gender' | 'occupation';
type SortOrder = 'asc' | 'desc';
type ColumnKey = 'name' | 'birthDate' | 'birthPlace' | 'deathDate' | 'deathPlace' | 'gender' | 'occupation';

/* ------------------------------------------------------------------ */
/*  Tag configuration                                                  */
/* ------------------------------------------------------------------ */

const TAG_CONFIG: Record<string, { color: string; category: string }> = {
  Verified: { color: 'bg-green-500', category: 'Research Status' },
  'To Do': { color: 'bg-yellow-500', category: 'Research Status' },
  'Brick Wall': { color: 'bg-red-500', category: 'Research Status' },
  Complete: { color: 'bg-[#2F3E8F]', category: 'Research Status' },
  Hypothesis: { color: 'bg-purple-500', category: 'Research Status' },
  Adopted: { color: 'bg-[#8B7355]', category: 'Relationship' },
  'Direct Ancestor': { color: 'bg-[#2F3E8F]', category: 'Relationship' },
  'Died Young': { color: 'bg-gray-500', category: 'Relationship' },
  'Multiple Spouses': { color: 'bg-pink-500', category: 'Relationship' },
  'No Children': { color: 'bg-blue-400', category: 'Relationship' },
  Immigrant: { color: 'bg-cyan-500', category: 'Life Experience' },
  'Military Service': { color: 'bg-[#2F3E8F]', category: 'Life Experience' },
  'Freedom Fighter': { color: 'bg-[#2F3E8F]', category: 'Life Experience' },
  'Religious Leader': { color: 'bg-violet-600', category: 'Life Experience' },
};

const ALL_TAGS = Object.keys(TAG_CONFIG);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const COLUMN_DEFS: { key: ColumnKey; label: string; sortField?: SortField }[] = [
  { key: 'name', label: 'Name', sortField: 'firstName' },
  { key: 'birthDate', label: 'Birth Date', sortField: 'birthDate' },
  { key: 'birthPlace', label: 'Birth Place', sortField: 'birthPlace' },
  { key: 'deathDate', label: 'Status', sortField: 'deathDate' },
  { key: 'deathPlace', label: 'Death Place', sortField: 'deathPlace' },
  { key: 'gender', label: 'Gender', sortField: 'gender' },
  { key: 'occupation', label: 'Occupation', sortField: 'occupation' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function formatDate(d?: string | null): string {
  if (!d) return '--';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return d;
  }
}

function tagDot(tag: string): string {
  return TAG_CONFIG[tag]?.color ?? 'bg-gray-400';
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function exportPeopleToCsv(people: PersonRow[], treeName: string) {
  const headers = ['First Name', 'Last Name', 'Gender', 'Birth Date', 'Birth Place', 'Death Date', 'Death Place', 'Living', 'Occupation'];
  const rows = people.map((p) =>
    [p.firstName, p.lastName, p.gender, p.birthDate ?? '', p.birthPlace ?? '', p.deathDate ?? '', p.deathPlace ?? '', p.isLiving ? 'Yes' : 'No', p.occupation ?? '', (p.tags ?? []).join('; ')].map(escapeCsvCell)
  );
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${treeName.replace(/\s+/g, '_')}_people.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PersonAvatar({ person, size = 28 }: { person: PersonRow; size?: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const initials = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`;
  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#7B8FD4]/15' : 'bg-[#2F3E8F]/10'
        }`}
      style={{ width: size, height: size }}
    >
      {person.profilePhotoUrl ? (
        <img src={person.profilePhotoUrl} className="w-full h-full object-cover" loading="lazy" alt="" />
      ) : (
        <span className={`font-medium ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} style={{ fontSize: size * 0.38 }}>{initials}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function SkeletonRows() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-[#E2E8F0]/60 dark:bg-[#2A2A30]/60" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#E2E8F0]/60 dark:bg-[#2A2A30]/60 rounded w-1/3" />
            <div className="h-3 bg-[#E2E8F0]/40 dark:bg-[#2A2A30]/40 rounded w-1/2" />
          </div>
          <div className="h-3 bg-[#E2E8F0]/40 dark:bg-[#2A2A30]/40 rounded w-20 hidden md:block" />
          <div className="h-3 bg-[#E2E8F0]/40 dark:bg-[#2A2A30]/40 rounded w-24 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AllPeoplePanel({
  treeId, treeName, onClose, onPersonClick,
  initialLivingFilter, initialGenderFilter, initialSortField, initialSortOrder,
}: {
  treeId: string;
  treeName: string;
  onClose: () => void;
  onPersonClick: (personId: string) => void;
  initialLivingFilter?: string;
  initialGenderFilter?: string;
  initialSortField?: SortField;
  initialSortOrder?: SortOrder;
}) {
  const { isMobile } = useResponsive();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /* ---------------- state ---------------- */
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(initialSortField || 'firstName');
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder || 'asc');
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [genderFilter, setGenderFilter] = useState(initialGenderFilter || '');
  const [livingFilter, setLivingFilter] = useState(initialLivingFilter || '');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(['name', 'birthDate', 'birthPlace', 'deathDate', 'gender', 'occupation'])
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [activeLetterJump, setActiveLetterJump] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [stats, setStats] = useState<StatsData | null>(null);

  const LIMIT = 50;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /* ---------- debounced search ----------- */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  /* ------------- fetch data -------------- */
  const fetchPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort: sortField, order: sortOrder, page: String(page), limit: String(LIMIT), search: debouncedSearch,
      });
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (genderFilter) params.set('gender', genderFilter);
      if (livingFilter) params.set('isLiving', livingFilter);

      const res = await apiFetch(`${API_BASE_URL}${treeApi.userList(treeId)}?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: PeopleListResponse = await res.json();
      setPeople(data.people ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setHighlightedIndex(-1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, [treeId, sortField, sortOrder, page, debouncedSearch, selectedTags, genderFilter, livingFilter]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  /* ------------- fetch stats ------------- */
  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const base = `${API_BASE_URL}${treeApi.userList(treeId)}?limit=1`;
        const [allRes, livingRes, maleRes, femaleRes] = await Promise.all([
          apiFetch(base), apiFetch(`${base}&isLiving=true`),
          apiFetch(`${base}&gender=male`), apiFetch(`${base}&gender=female`),
        ]);
        if (cancelled) return;
        const [all, liv, mal, fem] = await Promise.all([allRes.json(), livingRes.json(), maleRes.json(), femaleRes.json()]);
        if (cancelled) return;
        setStats({
          total: all.total ?? 0, living: liv.total ?? 0,
          deceased: (all.total ?? 0) - (liv.total ?? 0),
          male: mal.total ?? 0, female: fem.total ?? 0,
        });
      } catch { /* stats are non-critical */ }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [treeId]);

  /* ------------ sort handler ------------- */
  const handleSort = (field: SortField) => {
    if (field === sortField) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    setPage(1);
  };

  const toggleColumn = (col: ColumnKey) => {
    if (col === 'name') return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  };

  /* ---------- column picker outside click --- */
  useEffect(() => {
    if (!showColumnPicker) return;
    const handler = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) setShowColumnPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColumnPicker]);

  /* ---------- keyboard navigation --------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, people.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && highlightedIndex >= 0 && people[highlightedIndex]) {
        onPersonClick(people[highlightedIndex].personId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [people, highlightedIndex, onClose, onPersonClick]);

  /* ---------- sort icon helper ----------- */
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-[#B8A090] opacity-0 group-hover:opacity-50" />;
    return sortOrder === 'asc'
      ? <ChevronUp className={`w-3 h-3 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
      : <ChevronDown className={`w-3 h-3 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />;
  };

  /* ------------- pagination -------------- */
  const pageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const tagsByCategory = ALL_TAGS.reduce<Record<string, string[]>>((acc, tag) => {
    const cat = TAG_CONFIG[tag].category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  const clearAllFilters = () => {
    setSearch(''); setSelectedTags([]); setGenderFilter(''); setLivingFilter(''); setActiveLetterJump(null); setPage(1);
  };

  const hasActiveFilters = debouncedSearch || selectedTags.length > 0 || genderFilter || livingFilter;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className={`shell-overlay z-40 flex flex-col overflow-hidden ${isDark ? 'bg-[#121214] text-[#F3F2F1]' : 'bg-[#F9FAFB] text-[#3D2E1F]'}`}>
      {/* ===== Top bar ===== */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shadow-[0_2px_4px_rgba(0,0,0,0.06)] ${isDark ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-white border-[#E2E8F0]'}`}>
        <Users className={`w-5 h-5 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
        <h2 className="text-lg font-semibold truncate font-['Playfair_Display']">
          All People &mdash; <span className={isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}>{treeName}</span>
        </h2>
        <span className={`ml-auto text-sm ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{total} {total === 1 ? 'person' : 'people'}</span>
      </div>

      {/* ===== Stats bar ===== */}
      {stats && (
        <div className={`flex items-center gap-3 px-4 py-2.5 border-b overflow-x-auto ${isDark ? 'bg-[#1A1A1E]/80 border-[#2A2A30]' : 'border-[#E2E8F0]/60 bg-white/60'}`}>
          {[
            { label: 'Total', value: stats.total, color: isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]' },
            { label: 'Living', value: stats.living, color: isDark ? 'text-green-400' : 'text-green-600' },
            { label: 'Deceased', value: stats.deceased, color: isDark ? 'text-[#C2A46D]' : 'text-[#8B7355]' },
            { label: 'Male', value: stats.male, color: isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]' },
            { label: 'Female', value: stats.female, color: isDark ? 'text-pink-400' : 'text-pink-600' },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm min-w-fit ${isDark ? 'bg-[#1C1C22] border-[#2A2A30]' : 'bg-white border-[#E2E8F0]'}`}>
              <span className={`text-base font-semibold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-[#B8A090]">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== Toolbar ===== */}
      <div className={`border-b ${isDark ? 'border-[#2A2A30] bg-[#121214]' : 'border-[#E2E8F0]/60 bg-[#F9FAFB]'} ${isMobile ? 'px-3 py-2 space-y-1.5' : 'flex flex-wrap items-center gap-2 px-4 py-2.5'}`}>
        {/* Search */}
        <div className={`relative ${isMobile ? 'w-full' : 'flex-1 min-w-[200px] max-w-md'}`}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#666666]' : 'text-[#B8A090]'}`} />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveLetterJump(null); }}
            placeholder="Search by name, place..."
            className={`w-full pl-9 pr-8 rounded-lg border focus:outline-none focus:ring-1 transition-colors ${isDark
              ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F2F1] placeholder:text-[#666666] focus:ring-[#7B8FD4]/60'
              : 'bg-white border-[#E2E8F0] text-[#3D2E1F] placeholder:text-[#B8A090] focus:ring-[#2F3E8F]/60'
              } ${isMobile ? 'py-2 text-[14px]' : 'py-1.5 text-sm'}`}
          />
          {search && (
            <button onClick={() => { setSearch(''); setActiveLetterJump(null); }} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${isDark ? 'text-[#666666] hover:text-[#B8A090]' : 'text-[#B8A090] hover:text-[#8B7355]'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter chips — scrollable on mobile */}
        <div className={`flex items-center gap-1.5 ${isMobile ? 'overflow-x-auto scrollbar-hide' : ''}`}>
          {/* Gender */}
          {[{ label: 'All', value: '' }, { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }].map((g) => (
            <button key={g.value} onClick={() => { setGenderFilter(g.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap shrink-0 ${genderFilter === g.value
                ? (isDark ? 'bg-[#7B8FD4]/15 border-[#7B8FD4]/60 text-[#7B8FD4] font-medium' : 'bg-[#2F3E8F]/10 border-[#2F3E8F]/60 text-[#2F3E8F] font-medium')
                : (isDark ? 'border-[#2A2A30] text-[#B8A090] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:border-[#2F3E8F]/30')
                }`}
            >{g.label}</button>
          ))}

          <div className={`w-px h-4 shrink-0 ${isDark ? 'bg-[#2A2A30]' : 'bg-[#E2E8F0]'}`} />

          {/* Living */}
          {[{ label: 'Living', value: 'true' }, { label: 'Deceased', value: 'false' }].map((l) => (
            <button key={l.value} onClick={() => { setLivingFilter(l.value === livingFilter ? '' : l.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap shrink-0 ${livingFilter === l.value
                ? (isDark ? 'bg-[#7B8FD4]/15 border-[#7B8FD4]/60 text-[#7B8FD4] font-medium' : 'bg-[#2F3E8F]/10 border-[#2F3E8F]/60 text-[#2F3E8F] font-medium')
                : (isDark ? 'border-[#2A2A30] text-[#B8A090] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:border-[#2F3E8F]/30')
                }`}
            >{l.label}</button>
          ))}
        </div>

        {/* View toggle — desktop only */}
        <div className={`hidden md:flex items-center border rounded-lg overflow-hidden ${isDark ? 'border-[#2A2A30]' : 'border-[#E2E8F0]'}`}>
          <button onClick={() => setViewMode('table')}
            className={`p-1.5 transition-colors ${viewMode === 'table'
              ? (isDark ? 'bg-[#7B8FD4]/15 text-[#7B8FD4]' : 'bg-[#2F3E8F]/10 text-[#2F3E8F]')
              : (isDark ? 'text-[#B8A090] hover:bg-[#1A1A1E]' : 'text-[#8B7355] hover:bg-black/[0.03]')
              }`}
            title="Table view"><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid'
              ? (isDark ? 'bg-[#7B8FD4]/15 text-[#7B8FD4]' : 'bg-[#2F3E8F]/10 text-[#2F3E8F]')
              : (isDark ? 'text-[#B8A090] hover:bg-[#1A1A1E]' : 'text-[#8B7355] hover:bg-black/[0.03]')
              }`}
            title="Grid view"><LayoutGrid className="w-4 h-4" /></button>
        </div>

        {/* Column picker (desktop only) */}
        <div className="relative hidden md:block" ref={columnPickerRef}>
          <button onClick={() => setShowColumnPicker((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${showColumnPicker
              ? (isDark ? 'border-[#7B8FD4]/60 bg-[#7B8FD4]/15 text-[#7B8FD4]' : 'border-[#2F3E8F]/60 bg-[#2F3E8F]/10 text-[#2F3E8F]')
              : (isDark ? 'border-[#2A2A30] text-[#B8A090] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:border-[#2F3E8F]/30')
              }`}
            title="Toggle columns"><SlidersHorizontal className="w-4 h-4" /></button>
          {showColumnPicker && (
            <div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-lg p-3 z-20 min-w-[180px] ${isDark ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-white border-[#E2E8F0]'}`}>
              <p className="text-xs font-medium text-[#B8A090] mb-2">Visible Columns</p>
              {COLUMN_DEFS.map((col) => (
                <label key={col.key} className={`flex items-center gap-2 py-1 cursor-pointer text-sm ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`}>
                  <input type="checkbox" checked={visibleColumns.has(col.key)} disabled={col.key === 'name'}
                    onChange={() => toggleColumn(col.key)}
                    className={`rounded focus:ring-1 ${isDark ? 'border-[#2A2A30] text-[#7B8FD4] focus:ring-[#7B8FD4]/40 bg-[#121214]' : 'border-[#E2E8F0] text-[#2F3E8F] focus:ring-[#2F3E8F]/40'}`} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button onClick={() => exportPeopleToCsv(people, treeName)} disabled={people.length === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isDark
            ? 'border-[#2A2A30] text-[#B8A090] hover:border-[#7B8FD4]/30 hover:text-[#7B8FD4]'
            : 'border-[#E2E8F0] text-[#8B7355] hover:border-[#2F3E8F]/30 hover:text-[#2F3E8F]'
            }`}
        ><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span></button>
      </div>

      {/* ===== Tag filter chips ===== */}
      {showTagFilter && (
        <div className={`px-4 py-3 border-b space-y-2 max-h-48 overflow-y-auto ${isDark ? 'border-[#2A2A30] bg-[#1A1A1E]/50' : 'border-[#E2E8F0]/60 bg-white/50'}`}>
          {Object.entries(tagsByCategory).map(([category, tags]) => (
            <div key={category}>
              <p className="text-xs text-[#B8A090] uppercase tracking-wider mb-1">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${active
                        ? (isDark ? 'border-[#7B8FD4]/60 bg-[#7B8FD4]/15 text-[#7B8FD4]' : 'border-[#2F3E8F]/60 bg-[#2F3E8F]/10 text-[#2F3E8F]')
                        : (isDark ? 'border-[#2A2A30] text-[#B8A090] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:border-[#2F3E8F]/30')
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${tagDot(tag)}`} />
                      {tag}
                      {active && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {selectedTags.length > 0 && (
            <button onClick={() => { setSelectedTags([]); setPage(1); }} className={`text-xs hover:underline mt-1 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`}>Clear all tags</button>
          )}
        </div>
      )}

      {/* ===== CONTENT AREA PLACEHOLDER ===== */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`} ref={contentRef}>
          {loading && people.length === 0 ? (
            <SkeletonRows />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <p className="text-red-500 text-sm">{error}</p>
              <button onClick={fetchPeople} className={`px-4 py-1.5 text-sm rounded-lg text-white transition-colors ${isDark ? 'bg-[#7B8FD4] hover:bg-[#7B8FD4]/90' : 'bg-[#2F3E8F] hover:bg-[#2F3E8F]/90'}`}>Retry</button>
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#B8A090]">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium text-[#8B7355]">{hasActiveFilters ? 'No members found matching your search' : 'No family members yet'}</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className={`mt-2 text-sm hover:underline ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`}>Clear all filters</button>
              )}
            </div>
          ) : (
            <>
              {/* ------ Desktop table ------ */}
              {viewMode === 'table' && (
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-10 border-b shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${isDark ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-white border-[#E2E8F0]'}`}>
                      <tr>
                        {COLUMN_DEFS.filter((c) => visibleColumns.has(c.key)).map((col) => (
                          <th key={col.key} onClick={() => col.sortField && handleSort(col.sortField)}
                            className={`group px-4 py-2.5 text-left font-medium cursor-pointer select-none transition-colors whitespace-nowrap text-xs uppercase tracking-wider ${isDark ? 'text-[#B8A090] hover:text-[#F3F2F1]' : 'text-[#8B7355] hover:text-[#3D2E1F]'
                              }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {col.sortField && <SortIcon field={col.sortField} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((person, idx) => (
                        <tr key={person.personId} onClick={() => onPersonClick(person.personId)}
                          className={`cursor-pointer border-b transition-colors ${isDark
                            ? `border-[#2A2A30]/40 hover:bg-[#7B8FD4]/[0.06] ${idx % 2 === 1 ? 'bg-[#7B8FD4]/[0.02]' : ''} ${highlightedIndex === idx ? 'ring-2 ring-inset ring-[#7B8FD4]/40 bg-[#7B8FD4]/[0.08]' : ''}`
                            : `border-[#E2E8F0]/40 hover:bg-[#2F3E8F]/[0.04] ${idx % 2 === 1 ? 'bg-[#2F3E8F]/[0.02]' : ''} ${highlightedIndex === idx ? 'ring-2 ring-inset ring-[#2F3E8F]/40 bg-[#2F3E8F]/[0.06]' : ''}`
                            }`}
                        >
                          {visibleColumns.has('name') && (
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <PersonAvatar person={person} size={28} />
                                <span className={`font-medium ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`}>{person.firstName} {person.lastName}</span>
                                {person.tags && person.tags.length > 0 && person.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} title={tag} className={`w-2 h-2 rounded-full flex-shrink-0 ${tagDot(tag)}`} />
                                ))}
                                {person.tags && person.tags.length > 3 && <span className="text-xs text-[#B8A090]">+{person.tags.length - 3}</span>}
                              </div>
                            </td>
                          )}
                          {visibleColumns.has('birthDate') && (
                            <td className={`px-4 py-2.5 whitespace-nowrap ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{formatDate(person.birthDate)}</td>
                          )}
                          {visibleColumns.has('birthPlace') && (
                            <td className={`px-4 py-2.5 truncate max-w-[180px] ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{person.birthPlace || '--'}</td>
                          )}
                          {visibleColumns.has('deathDate') && (
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {person.isLiving ? (
                                <span className="text-green-500 text-xs font-medium">Living</span>
                              ) : (
                                <span className={`text-xs  font-medium ${isDark ? 'text-[#C2A46D]' : 'text-orange-500'}`}>Deceased</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.has('deathPlace') && (
                            <td className={`px-4 py-2.5 truncate max-w-[180px] ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{person.isLiving ? '--' : person.deathPlace || '--'}</td>
                          )}
                          {visibleColumns.has('gender') && (
                            <td className={`px-4 py-2.5 capitalize whitespace-nowrap ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{person.gender}</td>
                          )}
                          {visibleColumns.has('occupation') && (
                            <td className={`px-4 py-2.5 truncate max-w-[160px] ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{person.occupation || '--'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ------ Grid / Card view ------ */}
              {viewMode === 'grid' && (
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
                  {people.map((person, idx) => {
                    const hasDetails = !!(
                      (visibleColumns.has('birthDate') && person.birthDate) ||
                      (visibleColumns.has('birthPlace') && person.birthPlace) ||
                      visibleColumns.has('deathDate') ||
                      (visibleColumns.has('deathPlace') && !person.isLiving && person.deathPlace) ||
                      (visibleColumns.has('occupation') && person.occupation)
                    );
                    return (
                      <button key={person.personId} onClick={() => onPersonClick(person.personId)}
                        className={`flex flex-col justify-start text-left rounded-xl border p-4 shadow-sm hover:shadow-md cursor-pointer transition-all ${isDark
                          ? `bg-[#1A1A1E] border-[#2A2A30] hover:border-[#7B8FD4]/30 ${highlightedIndex === idx ? 'ring-2 ring-[#7B8FD4]/40 border-[#7B8FD4]/40' : ''}`
                          : `bg-white border-[#E2E8F0] hover:border-[#2F3E8F]/30 ${highlightedIndex === idx ? 'ring-2 ring-[#2F3E8F]/40 border-[#2F3E8F]/40' : ''}`
                          }`}
                      >
                        <div className={`flex items-center gap-3 ${hasDetails ? 'mb-3' : ''}`}>
                          <PersonAvatar person={person} size={48} />
                          <div className="min-w-0">
                            <p className={`font-semibold truncate ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`}>{person.firstName} {person.lastName}</p>
                            {visibleColumns.has('gender') && (
                              <p className={`text-xs capitalize ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>{person.gender}</p>
                            )}
                          </div>
                        </div>
                        {hasDetails && (
                          <div className={`mt-3 pt-3 border-t space-y-2 text-xs ${isDark ? 'border-[#2A2A30]/50' : 'border-[#E2E8F0]/60'}`}>
                            {visibleColumns.has('birthDate') && person.birthDate && (
                              <div className="flex items-start gap-2">
                                <Calendar className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
                                <div className="min-w-0">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider block opacity-50">Birth Date</span>
                                  <span className={`font-medium ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`}>{formatDate(person.birthDate)}</span>
                                </div>
                              </div>
                            )}
                            {visibleColumns.has('birthPlace') && person.birthPlace && (
                              <div className="flex items-start gap-2">
                                <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider block opacity-50">Birth Place</span>
                                  <span className={`font-medium block truncate ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`} title={person.birthPlace}>
                                    {person.birthPlace}
                                  </span>
                                </div>
                              </div>
                            )}
                            {visibleColumns.has('deathDate') && (
                              <div className="flex items-start gap-2">
                                <Heart className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70 ${person.isLiving ? 'text-green-500' : 'text-orange-500'}`} />
                                <div className="min-w-0">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider block opacity-50">Status</span>
                                  {person.isLiving ? (
                                    <span className="inline-flex items-center gap-1 text-green-500 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      Living
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-semibold text-orange-500">
                                      Deceased {person.deathDate ? `(${formatDate(person.deathDate)})` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {visibleColumns.has('deathPlace') && !person.isLiving && person.deathPlace && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70 text-red-500" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider block opacity-50">Death Place</span>
                                  <span className={`font-medium block truncate ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`} title={person.deathPlace}>
                                    {person.deathPlace}
                                  </span>
                                </div>
                              </div>
                            )}
                            {visibleColumns.has('occupation') && person.occupation && (
                              <div className="flex items-start gap-2">
                                <Briefcase className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70 ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider block opacity-50">Occupation</span>
                                  <span className={`font-medium block truncate ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`} title={person.occupation}>
                                    {person.occupation}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {person.tags && person.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {person.tags.slice(0, 3).map((tag) => (
                              <span key={tag} title={tag} className={`w-2 h-2 rounded-full ${tagDot(tag)}`} />
                            ))}
                            {person.tags.length > 3 && <span className="text-[10px] text-[#B8A090]">+{person.tags.length - 3}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------ Mobile contact list (native contacts-app style) ------ */}
              <div className="md:hidden">
                {people.map((person, idx) => (
                  <button key={person.personId} onClick={() => onPersonClick(person.personId)}
                    className={`w-full text-left px-3 py-3 transition-colors border-b ${isDark
                      ? `active:bg-[#7B8FD4]/[0.08] border-[#2A2A30]/40 ${highlightedIndex === idx ? 'bg-[#7B8FD4]/[0.08]' : ''}`
                      : `active:bg-[#2F3E8F]/[0.06] border-b border-[#E2E8F0]/40 ${highlightedIndex === idx ? 'bg-[#2F3E8F]/[0.06]' : ''}`
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <PersonAvatar person={person} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[15px] font-semibold truncate ${isDark ? 'text-[#F3F2F1]' : 'text-[#3D2E1F]'}`}>{person.firstName} {person.lastName}</span>
                          {person.isLiving && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Living" />}
                          {person.tags && person.tags.slice(0, 2).map((tag) => (
                            <span key={tag} title={tag} className={`w-2 h-2 rounded-full flex-shrink-0 ${tagDot(tag)}`} />
                          ))}
                        </div>
                        <div className={`flex items-center gap-2 mt-0.5 text-[12px] ${isDark ? 'text-[#B8A090]' : 'text-[#8B7355]'}`}>
                          {person.gender && <span className="capitalize">{person.gender}</span>}
                          {person.birthDate && <span>· b. {person.birthDate.slice(0, 4)}</span>}
                          {!person.isLiving && person.deathDate && <span>· d. {person.deathDate.slice(0, 4)}</span>}
                        </div>
                        {(person.birthPlace || person.occupation) && (
                          <p className="text-[11px] text-[#B8A090] truncate mt-0.5">
                            {person.birthPlace}{person.birthPlace && person.occupation ? ' · ' : ''}{person.occupation}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== Alphabet jump bar (desktop) ===== */}
        <div className={`hidden md:flex flex-col items-center justify-center py-2 px-1 border-l ${isDark ? 'border-[#2A2A30]/60' : 'border-[#E2E8F0]/60'}`}>
          {ALPHABET.map((letter) => (
            <button key={letter} onClick={() => { setSearch(letter); setActiveLetterJump(letter); setPage(1); }}
              className={`w-5 h-5 text-[10px] rounded-full flex items-center justify-center transition-colors ${activeLetterJump === letter
                ? (isDark ? 'bg-[#7B8FD4] text-[#121214] font-bold' : 'bg-[#2F3E8F] text-white font-bold')
                : (isDark ? 'text-[#666666] hover:text-[#7B8FD4] hover:bg-[#7B8FD4]/10' : 'text-[#B8A090] hover:text-[#2F3E8F] hover:bg-[#2F3E8F]/10')
                }`}
            >{letter}</button>
          ))}
        </div>
      </div>

      {/* ===== Pagination ===== */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-4 py-2.5 border-t text-sm shadow-[0_-1px_3px_rgba(0,0,0,0.04)] ${isDark ? 'border-[#2A2A30] bg-[#1A1A1E]' : 'border-[#E2E8F0] bg-white'}`}>
          <span className="text-[#B8A090]">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className={`px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isDark ? 'border-[#2A2A30] text-[#B8A090] hover:text-[#7B8FD4] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:text-[#2F3E8F] hover:border-[#2F3E8F]/30'
                }`}>Prev</button>
            {pageNumbers().map((n, i) =>
              n === '...' ? (
                <span key={`dots-${i}`} className="px-1.5 text-[#B8A090]">...</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 rounded-md border transition-colors ${n === page
                    ? (isDark ? 'border-[#7B8FD4]/60 bg-[#7B8FD4]/15 text-[#7B8FD4] font-medium' : 'border-[#2F3E8F]/60 bg-[#2F3E8F]/10 text-[#2F3E8F] font-medium')
                    : (isDark ? 'border-[#2A2A30] text-[#B8A090] hover:text-[#7B8FD4] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:text-[#2F3E8F] hover:border-[#2F3E8F]/30')
                    }`}
                >{n}</button>
              ),
            )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className={`px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isDark ? 'border-[#2A2A30] text-[#B8A090] hover:text-[#7B8FD4] hover:border-[#7B8FD4]/30' : 'border-[#E2E8F0] text-[#8B7355] hover:text-[#2F3E8F] hover:border-[#2F3E8F]/30'
                }`}>Next</button>
          </div>
        </div>
      )}

      {/* Loading overlay for subsequent fetches */}
      {loading && people.length > 0 && (
        <div className="absolute top-14 right-4">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`} />
        </div>
      )}
    </div>
  );
}
