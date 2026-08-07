/**
 * BookmarksPanel - View and manage bookmarked family members
 *
 * Features:
 * - Rich person cards with photo, name, dates, birthplace
 * - Relative time display (bookmarked "2 hours ago")
 * - Quick actions: navigate to person on canvas, edit, unbookmark
 * - Search/filter within bookmarks
 * - Empty state with guidance
 * - Grouped by recency (Today, This Week, Earlier)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, BookmarkCheck, Loader2, Search, MapPin, Calendar, User, ExternalLink, BookmarkX } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { getBookmarks, removeBookmark } from '@/services/phase1ApiService';
import { resolveBackendUrl } from '@/config/api';

interface BookmarkPerson {
  personId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  isLiving?: boolean;
  profilePhotoUrl?: string;
  birthPlace?: string;
}

interface EnrichedBookmark {
  userId: string;
  personId: string;
  treeId: string;
  createdAt: string;
  person: BookmarkPerson;
}

interface BookmarksPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPerson?: (personId: string) => void;
  onEditPerson?: (personId: string) => void;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  try {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

function getDateGroup(dateStr: string): 'today' | 'week' | 'earlier' {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays < 7) return 'week';
  return 'earlier';
}

const GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  earlier: 'Earlier',
};

function formatLifespan(person: BookmarkPerson): string {
  const parts: string[] = [];
  if (person.birthDate) {
    parts.push(`b. ${person.birthDate.slice(0, 4)}`);
  }
  if (person.deathDate) {
    parts.push(`d. ${person.deathDate.slice(0, 4)}`);
  }
  if (!person.deathDate && person.isLiving === false) {
    parts.push('deceased');
  }
  return parts.join(' · ');
}

export function BookmarksPanel({ treeId, isOpen, onClose, onNavigateToPerson, onEditPerson: _onEditPerson }: BookmarksPanelProps) {
  const { isMobile } = useResponsive();
  const [bookmarks, setBookmarks] = useState<EnrichedBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const results = await getBookmarks(treeId);
      setBookmarks(results as EnrichedBookmark[]);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (isOpen) loadBookmarks();
  }, [isOpen, loadBookmarks]);

  const handleRemoveBookmark = async (personId: string) => {
    setRemovingId(personId);
    try {
      await removeBookmark(personId);
      setBookmarks(prev => prev.filter(b => b.personId !== personId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(b => {
      const name = `${b.person.firstName} ${b.person.lastName}`.toLowerCase();
      return name.includes(q) || (b.person.birthPlace?.toLowerCase().includes(q));
    });
  }, [bookmarks, search]);

  // Group by recency
  const grouped = useMemo(() => {
    const groups: Record<string, EnrichedBookmark[]> = { today: [], week: [], earlier: [] };
    for (const bm of filtered) {
      const group = getDateGroup(bm.createdAt);
      groups[group].push(bm);
    }
    return groups;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className={`fixed ${isMobile ? 'inset-0' : 'inset-y-0 right-0 w-[400px]'} bg-[#FAFAF8] shadow-xl z-50 flex flex-col border-l border-gray-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2F3E8F] flex items-center justify-center">
            <BookmarkCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Bookmarks</h2>
            <p className="text-[11px] text-gray-500">{bookmarks.length} saved {bookmarks.length === 1 ? 'person' : 'people'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-blue-200/50 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      {bookmarks.length > 0 && (
        <div className="px-4 py-2.5 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-16 px-6">
            <BookmarkCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-sm font-medium text-gray-600 mb-2">No bookmarks yet</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Bookmark family members you want quick access to. Right-click any person on the tree canvas and select "Bookmark" to save them here.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No bookmarks match "{search}"
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {(['today', 'week', 'earlier'] as const).map(group => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                    {GROUP_LABELS[group]}
                  </div>
                  <div className="space-y-2">
                    {items.map(bm => (
                      <div
                        key={bm.personId}
                        className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-md hover:border-[#2F3E8F]/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer ${
                              bm.person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-[#2F3E8F]'
                            }`}
                            onClick={() => onNavigateToPerson?.(bm.personId)}
                          >
                            {bm.person.profilePhotoUrl ? (
                              <img
                                src={resolveBackendUrl(bm.person.profilePhotoUrl)}
                                alt=""
                                className="w-11 h-11 rounded-full object-cover"
                              />
                            ) : (
                              (bm.person.firstName?.[0] || '?').toUpperCase()
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-semibold text-sm text-gray-900 truncate cursor-pointer hover:text-[#2F3E8F] transition-colors"
                              onClick={() => onNavigateToPerson?.(bm.personId)}
                            >
                              {bm.person.firstName} {bm.person.lastName}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              {bm.person.gender && (
                                <span className="flex items-center gap-0.5">
                                  <User className="w-3 h-3" />
                                  <span className="capitalize">{bm.person.gender}</span>
                                </span>
                              )}
                              {formatLifespan(bm.person) && (
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {formatLifespan(bm.person)}
                                </span>
                              )}
                            </div>

                            {bm.person.birthPlace && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {bm.person.birthPlace}
                              </div>
                            )}

                            <div className="text-[10px] text-gray-400 mt-1">
                              Bookmarked {timeAgo(bm.createdAt)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onNavigateToPerson && (
                              <button
                                onClick={() => onNavigateToPerson(bm.personId)}
                                className="p-1.5 rounded-lg hover:bg-[#E8EDFF] text-gray-400 hover:text-[#2F3E8F] transition-colors"
                                title="Navigate to person"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveBookmark(bm.personId)}
                              disabled={removingId === bm.personId}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Remove bookmark"
                            >
                              {removingId === bm.personId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <BookmarkX className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
