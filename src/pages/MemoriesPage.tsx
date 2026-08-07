import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { MemoriesHeader } from '@/components/memories/MemoriesHeader';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { MemoriesFilterBar } from '@/components/memories/MemoriesFilterBar';
import { MemoriesGallery } from '@/components/memories/MemoriesGallery';
import { MemoriesTimeline } from '@/components/memories/MemoriesTimeline';
import { AlbumsSection } from '@/components/memories/AlbumsSection';
import { HighlightsCarousel } from '@/components/memories/HighlightsCarousel';
import { LifePhaseView } from '@/components/memories/LifePhaseView';
import { MemoryMapView } from '@/components/memories/MemoryMapView';
import { useMemoriesPageState } from '@/components/memories/useMemoriesPageState';
import { SidebarStoryBar } from '@/components/stories/SidebarStoryBar';
import { StoryBar } from '@/components/stories/StoryBar';
import { useSeenStories } from '@/hooks/useSeenStories';
import { fetchMemories, fetchPersonMemories, batchDeleteMemories, batchTagMemories, fetchTrashedMemories, fetchArchivedMemories, restoreMemory, permanentlyDeleteMemory, archiveMemory, unarchiveMemory, publishMemory, batchArchiveMemories, updateMemoriesStatus, emptyTrash, deleteMemory, removeMemoriesFromAlbum } from '@/services/memoriesApiService';
import { getTreeTempleMemoryCounts, getFestivalCoverage } from '@/services/templeLinkApiService';
import { getFestivalsForTemple } from '@/data/temples/templeFestivals';
import { getTempleById } from '@/data/temples';
import { fetchAlbums, fetchAlbum, deleteAlbum, fetchAlbumMemories } from '@/services/albumApiService';
import { fetchStories } from '@/services/storyApiService';
import type { Memory, Album, Story } from '@/types';
import { X, FolderPlus, Gem, Image, Grid3X3, LayoutGrid, Play, GitBranch, Download, Bell, Landmark, Loader2, Archive, Trash2 } from 'lucide-react';
import { resolveBackendUrl, API_BASE_URL } from '@/config/api';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/components/ui/use-toast';
import { AppTooltip } from '@/components/ui/AppTooltip';

function PersonAvatar({ photoUrl, firstName, lastName, fullName, textClassName }: {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  textClassName?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = photoUrl ? resolveBackendUrl(photoUrl) : null;

  const initials = (() => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      if (parts[0]) {
        return parts[0][0].toUpperCase();
      }
    }
    return '?';
  })();

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={fullName || firstName || ''}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <span className={`w-full h-full flex items-center justify-center font-semibold text-[#8B7355] dark:text-[#a88d6c] ${textClassName || 'text-[10px]'}`}>
      {initials}
    </span>
  );
}
import { ToastAction } from '@/components/ui/toast';
import StorageBreakdownWidget, { type StorageBreakdownData } from '@/components/memories/StorageBreakdownWidget';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';

const QUICK_ACTIONS_CONFIG = [
  { id: 'archived', label: 'Archived', icon: Archive, color: '#C2A46D' },
  // { id: 'trash', label: 'Trash', icon: Trash2, color: '#ef4444', isDanger: true },
  // { id: 'slideshow', label: 'Slideshow', icon: Play, color: '#2F3E8F' },
  // { id: 'timeline', label: 'Parallel Timeline', icon: GitBranch, color: '#4B2C5E' },
  // { id: 'pilgrimage', label: 'Pilgrimage Story', icon: Landmark, color: '#8B5E3C' },
  // { id: 'memorybook', label: 'Export Memory Book', icon: Download, color: '#C2A46D' },
];

interface ForYouItem {
  memoryId: string;
  title: string;
  description?: string;
  memoryType: string;
  mediaUrl?: string;
  dateTaken?: string;
  relevanceScore?: number;
  reason?: string;
}

const FullPageMediaViewer = lazy(() => import('@/components/viewer/FullPageMediaViewer').then(m => ({ default: m.FullPageMediaViewer })));
const CreateMemoryModal = lazy(() => import('@/components/modals/CreateMemoryModal').then(m => ({ default: m.CreateMemoryModal })));
const CreateAlbumModal = lazy(() => import('@/components/modals/CreateAlbumModal').then(m => ({ default: m.CreateAlbumModal })));
const AddToAlbumModal = lazy(() => import('@/components/modals/AddToAlbumModal').then(m => ({ default: m.AddToAlbumModal })));
const StoryEditor = lazy(() => import('@/components/stories/StoryEditor').then(m => ({ default: m.StoryEditor })));
const InterviewCapture = lazy(() => import('@/components/memories/InterviewCapture').then(m => ({ default: m.InterviewCapture })));
const SlideshowMode = lazy(() => import('@/components/memories/SlideshowMode').then(m => ({ default: m.SlideshowMode })));
const ParallelTimeline = lazy(() => import('@/components/memories/ParallelTimeline').then(m => ({ default: m.ParallelTimeline })));
const MemoryBookExport = lazy(() => import('@/components/memories/MemoryBookExport').then(m => ({ default: m.MemoryBookExport })));
const CreatePilgrimageStoryModal = lazy(() => import('@/components/modals/CreatePilgrimageStoryModal').then(m => ({ default: m.CreatePilgrimageStoryModal })));
const InterviewsSection = lazy(() => import('@/components/memories/InterviewsSection').then(m => ({ default: m.InterviewsSection })));
const InterviewDetailView = lazy(() => import('@/components/memories/InterviewDetailView').then(m => ({ default: m.InterviewDetailView })));
const StoriesGrid = lazy(() => import('@/components/stories/StoriesGrid').then(m => ({ default: m.StoriesGrid })));
const StoryViewerLazy = lazy(() => import('@/components/stories/StoryViewer').then(m => ({ default: m.StoryViewer })));

interface MemoriesPageProps {
  treeId: string;
  personId?: string | null;
  personName?: string;
  personDob?: string | null;
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onClose: () => void;
  initialViewMode?: 'grid' | 'list' | 'timeline' | 'albums' | 'stories' | 'interviews';
  initialShowSlideshow?: boolean;
  initialShowMemoryBook?: boolean;
}

const PAGE_SIZE = 10;

export function MemoriesPage({
  treeId,
  personId,
  personName,
  personDob,
  persons,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onClose,
  initialViewMode,
  initialShowSlideshow,
  initialShowMemoryBook,
}: MemoriesPageProps) {
  const [state, dispatch] = useMemoriesPageState(initialViewMode);
  const { toast } = useToast();
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [albumCount, setAlbumCount] = useState(0);
  const [storyCount, setStoryCount] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [sidebarViewingStory, setSidebarViewingStory] = useState<Story | null>(null);
  const [categoriesRefreshTrigger, setCategoriesRefreshTrigger] = useState(0);
  const { seenIds, markSeen } = useSeenStories(treeId, currentUserId);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isAppending, setIsAppending] = useState(false);

  const [storiesPage, setStoriesPage] = useState(1);
  const storiesPageRef = useRef(1);
  const [storiesHasMore, setStoriesHasMore] = useState(true);
  const [isAppendingStories, setIsAppendingStories] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Modal states
  const [showCreateMemory, setShowCreateMemory] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showBatchAlbum, setShowBatchAlbum] = useState(false);
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [batchTagPersonId, setBatchTagPersonId] = useState('');
  const [showStoryEditor, setShowStoryEditor] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(initialShowSlideshow ?? false);
  const [showParallelTimeline, setShowParallelTimeline] = useState(false);
  const [showMemoryBook, setShowMemoryBook] = useState(initialShowMemoryBook ?? false);

  // Interviews
  const [interviews, setInterviews] = useState<import('@/types').Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);

  // Temple memory counts for filter
  const [templeMemoryCounts, setTempleMemoryCounts] = useState<Record<string, number>>({});
  const [showPilgrimageModal, setShowPilgrimageModal] = useState(false);
  const [festivalNudges, setFestivalNudges] = useState<Array<{ templeId: string; templeName: string; festival: string }>>([]);

  // Storage usage
  const [storageUsed, _setStorageUsed] = useState(0);
  const [storageFileCount, _setStorageFileCount] = useState(0);
  const [storageBreakdown, _setStorageBreakdown] = useState<StorageBreakdownData | null>(null);
  const storageMaxBytes = 10 * 1024 * 1024 * 1024; // 10 GB

  // For You feed
  const [forYouItems, setForYouItems] = useState<ForYouItem[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouPage, setForYouPage] = useState(1);
  const [forYouHasMore, setForYouHasMore] = useState(false);

  // Albums pagination
  const [albumHasMore, setAlbumHasMore] = useState(true);
  const albumPageRef = useRef(1);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [isAppendingAlbums, setIsAppendingAlbums] = useState(false);

  // Prompt-driven memory creation
  const [promptTitle, setPromptTitle] = useState('');
  const [promptTextContent, setPromptTextContent] = useState('');
  const [promptCategory, setPromptCategory] = useState('');
  const [promptDateTaken, setPromptDateTaken] = useState('');

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    loading: boolean;
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => { },
    loading: false
  });

  const triggerConfirm = useCallback((config: {
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void>;
  }) => {
    setConfirmConfig({
      open: true,
      title: config.title,
      description: config.description,
      confirmText: config.confirmText,
      variant: config.variant,
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, loading: true }));
          await config.onConfirm();
          setConfirmConfig(prev => ({ ...prev, open: false, loading: false }));
        } catch (e) {
          console.error('Confirmation action failed:', e);
          setConfirmConfig(prev => ({ ...prev, loading: false }));
        }
      }
    });
  }, []);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { photo: 0, video: 0, audio: 0, text: 0 };
    for (const m of allMemories) {
      if (c[m.memoryType] !== undefined) c[m.memoryType]++;
    }
    return c;
  }, [allMemories]);

  const activeRequestRef = useRef(0);

  // Fetch memories with pagination supports
  const loadMemories = useCallback(async (append = false) => {
    const requestId = ++activeRequestRef.current;

    if (append) {
      setIsAppending(true);
    } else {
      setLoading(true);
      pageRef.current = 1;
      setCurrentPage(1);
    }

    try {
      const pageToFetch = pageRef.current;
      let result: Memory[];

      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      let startDateStr = '';
      let endDateStr = '';

      const isFutureFrom = state.dateFrom && state.dateFrom > todayStr;
      const isFutureTo = state.dateTo && state.dateTo > todayStr;
      const isFromAfterTo = state.dateFrom && state.dateTo && state.dateFrom > state.dateTo;

      if (!isFutureFrom && !isFutureTo && !isFromAfterTo) {
        if (state.dateFrom && state.dateTo) {
          startDateStr = state.dateFrom;
          endDateStr = state.dateTo;
        }
      }

      if (state.activeAlbumId) {
        try {
          const memoriesList = await fetchAlbumMemories(state.activeAlbumId);
          if (memoriesList && Array.isArray(memoriesList) && memoriesList.length > 0) {
            result = memoriesList;
          } else {
            const albumData = await fetchAlbum(state.activeAlbumId);
            result = (albumData as any).memories || albumData.memoryIds || [];
          }
        } catch (err) {
          console.error('Failed to fetch album memories, trying fallback:', err);
          const albumData = await fetchAlbum(state.activeAlbumId);
          result = (albumData as any).memories || albumData.memoryIds || [];
        }
      } else if (personId) {
        const response = await fetchPersonMemories(treeId, personId);
        result = response.memories || [];
      } else if (state.viewMode === 'archived') {
        const response = await fetchArchivedMemories(treeId, {
          page: pageToFetch,
          limit: PAGE_SIZE,
          category: state.categoryFilter,
          startDate: startDateStr,
          endDate: endDateStr,
          search: state.searchQuery.trim(),
          mediaType: state.typeFilter,
          sortBy: state.sortBy
        });
        result = response.memories || [];
        if (requestId !== activeRequestRef.current) return;
        if (response.pagination) {
          setTotalCount(response?.memories?.length || 0);
          setHasMore(response.pagination.page < response.pagination.totalPages);
        } else {
          setHasMore(result.length === PAGE_SIZE);
        }
      } else if (state.viewMode === 'trash') {
        const response = await fetchTrashedMemories(treeId, {
          page: pageToFetch,
          limit: PAGE_SIZE,
          search: state.searchQuery.trim(),
          mediaType: state.typeFilter,
          sortBy: state.sortBy
        });
        result = response.memories || [];
        if (requestId !== activeRequestRef.current) return;
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setHasMore(response.pagination.page < response.pagination.totalPages);
        } else {
          setHasMore(result.length === PAGE_SIZE);
        }
      } else {
        const response = await fetchMemories(treeId, {
          page: pageToFetch,
          limit: PAGE_SIZE,
          category: state.categoryFilter,
          startDate: startDateStr,
          endDate: endDateStr,
          search: state.searchQuery.trim(),
          personId: state.taggedPersonId,
          type: state.viewMode === 'stories' ? 'story' : 'all',
          mediaType: state.typeFilter,
          status: state.statusFilter === 'all' ? '' : state.statusFilter,
          sortBy: state.sortBy
        });
        result = response.memories || [];
        if (requestId !== activeRequestRef.current) return;
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setHasMore(response.pagination.page < response.pagination.totalPages);
        } else {
          setHasMore(result.length === PAGE_SIZE);
        }
      }

      if (requestId !== activeRequestRef.current) return;

      if (append) {
        setAllMemories(prev => [...prev, ...result]);
      } else {
        setAllMemories(result);
      }

      setCategoriesRefreshTrigger(prev => prev + 1);

      setCurrentPage(pageToFetch);

      if (!!state.activeAlbumId || (!!personId && state.viewMode !== 'archived' && state.viewMode !== 'trash')) {
        setHasMore(false);
        setTotalCount(result.length);
      }

    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
        setIsAppending(false);
      }
    }
  }, [treeId, personId, state.categoryFilter, state.dateFrom, state.dateTo, state.searchQuery, state.taggedPersonId, state.typeFilter, state.statusFilter, state.sortBy, state.activeAlbumId, state.viewMode]);

  const handleLoadMore = () => {
    if (!loading && !isAppending && hasMore) {
      pageRef.current += 1;
      loadMemories(true);
    }
  };

  // Client-side processing (mostly sorting fallback if needed, but backend is preferred)
  const filteredByType = useMemo(() => {
    // We trust the backend for type and status filtering since we use server-side pagination.
    // Frontend sorting is kept as a fallback or for instant updates if allMemories changes.
    let result = [...allMemories];

    // Sort - keep frontend sort as fallback/instant check
    switch (state.sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        break;
      case 'dateTaken':
        result.sort((a, b) => new Date(b.dateTaken || 0).getTime() - new Date(a.dateTaken || 0).getTime());
        break;
      case 'mostLiked':
        result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        break;
      case 'title-az':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-za':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      default: // 'newest'
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [allMemories, state.sortBy]);

  const loadAlbums = useCallback(async (append = false) => {
    if (append) {
      setIsAppendingAlbums(true);
    } else {
      setLoadingAlbums(true);
      albumPageRef.current = 1;
    }
    try {
      const response = await fetchAlbums(treeId, {
        search: state.searchQuery.trim() || undefined,
        page: albumPageRef.current,
        limit: 10,
        sortBy: state.sortBy
      });

      const newAlbums = response.albums || [];
      if (append) {
        setAlbums(prev => [...prev, ...newAlbums]);
      } else {
        setAlbums(newAlbums);
      }

      if (response.pagination) {
        setAlbumHasMore(response.pagination.page < response.pagination.totalPages);
      } else {
        setAlbumHasMore(newAlbums.length >= 10);
      }
    } catch { /* noop */ }
    finally {
      setLoadingAlbums(false);
      setIsAppendingAlbums(false);
    }
  }, [treeId, state.searchQuery, state.sortBy]);

  const handleLoadMoreAlbums = () => {
    if (!loadingAlbums && !isAppendingAlbums && albumHasMore) {
      albumPageRef.current += 1;
      loadAlbums(true);
    }
  };

  const loadStories = useCallback(async (append = false) => {
    if (append) {
      setIsAppendingStories(true);
    } else {
      setStoriesLoading(true);
      storiesPageRef.current = 1;
      setStoriesPage(1);
    }
    try {
      const response = await fetchStories(treeId, {
        page: storiesPageRef.current,
        limit: 10
      });
      const newStories = response.stories || [];
      if (append) {
        setStories(prev => [...prev, ...newStories]);
      } else {
        setStories(newStories);
      }
      if (response.pagination) {
        setStoriesHasMore(response.pagination.page < response.pagination.totalPages);
      } else {
        setStoriesHasMore(newStories.length >= 10);
      }
    } catch { /* noop */ }
    finally {
      setStoriesLoading(false);
      setIsAppendingStories(false);
    }
  }, [treeId]);

  const handleLoadMoreStories = () => {
    if (!storiesLoading && !isAppendingStories && storiesHasMore) {
      storiesPageRef.current += 1;
      setStoriesPage(storiesPageRef.current);
      loadStories(true);
    }
  };

  const loadStoryCount = loadStories; // Keep alias for compatibility if needed

  const loadInterviews = useCallback(async () => {
    setInterviewsLoading(true);
    try {
      const { fetchInterviews } = await import('@/services/interviewApiService');
      setInterviews(await fetchInterviews(treeId));
    } catch { /* noop */ }
    finally { setInterviewsLoading(false); }
  }, [treeId]);

  const loadStats = useCallback(async () => {
    try {
      const { fetchStats } = await import('@/services/memoriesApiService');
      const stats = await fetchStats(treeId);
      setMemoryCount(stats.memoryCount);
      setAlbumCount(stats.albumCount);
      setStoryCount(stats.storyCount);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [treeId]);

  const loadTrash = useCallback(() => {
    loadMemories(false);
  }, [loadMemories]);

  // Fetch memories only when in a supported memory view (excluding albums/stories root)
  useEffect(() => {
    const isMemoryView = ['grid', 'list', 'timeline', 'map', 'lifePhase', 'archived', 'trash'].includes(state.viewMode);
    if (isMemoryView || state.activeAlbumId) {
      const hasOneDateOnly = (state.dateFrom && !state.dateTo) || (!state.dateFrom && state.dateTo);
      if (!hasOneDateOnly) {
        loadMemories(false);
      }
    }
  }, [
    treeId, personId, state.categoryFilter, state.dateFrom, state.dateTo,
    state.searchQuery, state.taggedPersonId, state.typeFilter, state.statusFilter,
    state.sortBy, state.activeAlbumId, state.viewMode, loadMemories
  ]);

  // Fetch albums only when in Albums view
  useEffect(() => {
    if (state.viewMode === 'albums') {
      loadAlbums(false);
    }
  }, [loadAlbums, state.viewMode]);

  // DEFERRED: Load secondary data (story counts, etc.)
  useEffect(() => {
    loadStats(); // Load initial stats

    // Refresh count and list specifically when user switches to stories tab
    loadStoryCount();
  }, [loadStats, loadStoryCount, state.viewMode]);

  // DEFERRED: Temple counts + festival nudges — only if the main memory gallery is active
  useEffect(() => {
    if (state.viewMode !== 'grid') return;

    const timer = setTimeout(() => {
      getTreeTempleMemoryCounts(treeId).then(counts => {
        setTempleMemoryCounts(counts);
        const templeIdsWithMemories = Object.entries(counts)
          .filter(([, count]) => count > 0)
          .map(([id]) => id);
        const nudgesPromises = templeIdsWithMemories.flatMap(templeId => {
          const festivals = getFestivalsForTemple(templeId);
          if (festivals.length === 0) return [];
          return getFestivalCoverage(treeId, templeId, festivals)
            .then(coverage => {
              const temple = getTempleById(templeId);
              if (!temple) return [];
              return festivals
                .filter(f => (coverage[f] ?? 0) === 0)
                .map(festival => ({ templeId, templeName: temple.name, festival }));
            })
            .catch(() => []);
        });
        Promise.all(nudgesPromises).then(results => {
          const all = results.flat();
          setFestivalNudges(all.slice(0, 3));
        });
      }).catch(() => { });
    }, 2000);
    return () => clearTimeout(timer);
  }, [treeId, state.viewMode]);

  // Load For You feed
  useEffect(() => {
    if (state.viewMode !== 'for-you') return;
    let cancelled = false;
    setForYouLoading(true);
    const token = localStorage.getItem('auth_token');
    const base = resolveBackendUrl('');
    fetch(`${base}/api/tree/${treeId}/for-you?page=${forYouPage}&limit=20`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        if (forYouPage === 1) {
          setForYouItems(data.memories || []);
        } else {
          setForYouItems(prev => [...prev, ...(data.memories || [])]);
        }
        setForYouHasMore((data.memories || []).length >= 20);
      })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) setForYouLoading(false); });
    return () => { cancelled = true; };
  }, [state.viewMode, treeId, forYouPage]);

  const filteredMemories = useMemo(() => {
    // If no search query, return the pre-sorted list
    if (!state.searchQuery.trim()) return filteredByType;

    // Although backend filters by search, we keep this for instant feel while typing 
    // or filtering the current page.
    const q = state.searchQuery.toLowerCase();
    return filteredByType.filter(m => {
      return m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.textContent?.toLowerCase().includes(q) ||
        m.files?.[0]?.textContent?.toLowerCase().includes(q);
    });
  }, [filteredByType, state.searchQuery]);

  const displayedMemories = filteredMemories;

  // Reset selectedIndex when viewMode or activeAlbumId changes to prevent the modal from automatically opening with new items on another tab
  useEffect(() => {
    setSelectedIndex(null);
  }, [state.viewMode, state.activeAlbumId]);

  // Sync selectedIndex when displayedMemories change (e.g. after archive, delete, or tab switch)
  useEffect(() => {
    if (selectedIndex !== null) {
      const currentSelectedMemory = displayedMemories[selectedIndex];
      if (!currentSelectedMemory) {
        // The memory at the selected index no longer exists (e.g. list shrank)
        setSelectedIndex(null);
      }
    }
  }, [displayedMemories, selectedIndex]);

  const getSelectedRealMemoryIds = () => {
    return Array.from(state.selectedIds);
  };

  const handleBatchDelete = async () => {
    if (state.selectedIds.size === 0) return;
    triggerConfirm({
      title: `Delete ${state.selectedIds.size} memories`,
      description: `Are you sure you want to delete these ${state.selectedIds.size} memories?`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await batchDeleteMemories(treeId, getSelectedRealMemoryIds());
        dispatch({ type: 'EXIT_SELECT_MODE' });
        loadMemories();
      }
    });
  };

  const handleBatchArchive = async () => {
    if (state.selectedIds.size === 0) return;
    triggerConfirm({
      title: `Archive ${state.selectedIds.size} memories`,
      description: `Are you sure you want to archive these ${state.selectedIds.size} memories?`,
      confirmText: 'Archive',
      variant: 'info',
      onConfirm: async () => {
        await batchArchiveMemories(treeId, getSelectedRealMemoryIds());
        dispatch({ type: 'EXIT_SELECT_MODE' });
        loadMemories();
        loadStats();
      }
    });
  };

  const handleBatchTag = async () => {
    if (state.selectedIds.size === 0 || !batchTagPersonId) return;
    try {
      await batchTagMemories(treeId, getSelectedRealMemoryIds(), batchTagPersonId);
      toast({ title: 'Memories tagged successfully' });
      dispatch({ type: 'EXIT_SELECT_MODE' });
      setShowBatchTag(false);
      setBatchTagPersonId('');
      loadMemories();
    } catch (e) {
      console.error('Batch tag failed:', e);
    }
  };


  const handleArchiveMemory = async (memoryId: string) => {
    triggerConfirm({
      title: 'Archive Memory',
      description: 'Are you sure you want to archive this memory? It will be moved to your archive.',
      confirmText: 'Archive',
      variant: 'info',
      onConfirm: async () => {
        await archiveMemory(memoryId);
        toast({ title: 'Memory archived', description: 'It has been moved to your archive.' });
        loadMemories();
        loadStats();
      }
    });
  };

  const handlePublishMemory = async (memoryId: string) => {
    triggerConfirm({
      title: 'Publish Memory',
      description: 'Are you sure you want to publish this memory? It will become visible to your family.',
      confirmText: 'Publish',
      variant: 'primary',
      onConfirm: async () => {
        await updateMemoriesStatus([memoryId], 'publish');
        toast({ title: 'Memory published' });
        loadMemories();
      }
    });
  };

  const handleBatchPublish = async () => {
    if (state.selectedIds.size === 0) return;
    triggerConfirm({
      title: `Publish ${state.selectedIds.size} memories`,
      description: `Are you sure you want to publish these ${state.selectedIds.size} draft memories?`,
      confirmText: 'Publish All',
      variant: 'primary',
      onConfirm: async () => {
        await updateMemoriesStatus(getSelectedRealMemoryIds(), 'publish');
        dispatch({ type: 'EXIT_SELECT_MODE' });
        loadMemories();
      }
    });
  };

  const handleEmptyTrash = async () => {
    triggerConfirm({
      title: 'Empty Trash',
      description: 'Are you sure you want to empty the trash? All items will be permanently deleted.',
      confirmText: 'Empty Trash',
      variant: 'danger',
      onConfirm: async () => {
        await emptyTrash(treeId);
        toast({ title: 'Trash emptied', description: 'All items have been removed.' });
        loadTrash();
      }
    });
  };

  const handleUnarchiveMemory = async (memoryId: string) => {
    try { await unarchiveMemory(memoryId); loadMemories(); loadAlbums(); loadStats(); } catch (e) { console.error('Unarchive failed:', e); }
  };

  const handleTrashMemory = async (memoryId: string) => {
    const isFromAlbum = !!state.activeAlbumId;
    const memory = displayedMemories.find(m => m.memoryId === memoryId || m._id === memoryId);
    const isTextMemory = memory && (memory.memoryType === 'text' || (!memory.files || memory.files.length === 0));

    triggerConfirm({
      title: isFromAlbum ? 'Remove from Album' : (isTextMemory ? 'Delete Text Memory' : 'Delete Memory'),
      description: isFromAlbum
        ? 'Are you sure you want to remove this item from the album?'
        : (isTextMemory
          ? 'Are you sure you want to permanently delete this text memory? This action cannot be undone.'
          : 'Are you sure you want to permanently delete this memory? This action cannot be undone.'),
      confirmText: isFromAlbum ? 'Remove' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        if (isFromAlbum) {
          await removeMemoriesFromAlbum(state.activeAlbumId!, [memoryId]);
          toast({
            title: 'Memory Removed!',
            description: 'The memory has been removed from this album.'
          });
        } else {
          const targetId = (isTextMemory && memory._id) ? memory._id : memoryId;
          await deleteMemory(targetId);
          toast({
            title: isTextMemory ? 'Text Memory Deleted Successfully!' : 'Memory Deleted Successfully!',
            description: 'It will be deleted permanently.'
          });
        }
        loadMemories();
        loadStats();
      }
    });
  };


  const handleRestoreMemory = async (memoryId: string) => {
    try { await restoreMemory(memoryId); loadMemories(); } catch (e) { console.error('Restore failed:', e); }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    triggerConfirm({
      title: 'Delete Album',
      description: 'Are you sure you want to delete this album? The memories inside will not be deleted.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteAlbum(albumId);
        toast({ title: 'Album deleted', description: 'The album has been removed.' });
        loadAlbums();
        loadStats();
      }
    });
  };

  const handlePermanentDelete = async (memoryId: string) => {
    const memory = displayedMemories.find(m => m.memoryId === memoryId || m._id === memoryId);
    const isTextMemory = memory && (memory.memoryType === 'text' || (!memory.files || memory.files.length === 0));

    triggerConfirm({
      title: isTextMemory ? 'Permanently Delete Text Memory' : 'Permanent Delete',
      description: isTextMemory
        ? 'Are you sure? This will permanently delete this text memory. This action cannot be undone.'
        : 'Are you sure? This will permanently delete the memory. This action cannot be undone.',
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        const targetId = (isTextMemory && memory._id) ? memory._id : memoryId;
        await permanentlyDeleteMemory(targetId);
        toast({ title: isTextMemory ? 'Text memory deleted' : 'Memory deleted', description: 'It has been permanently removed.' });
        loadTrash();
      }
    });
  };


  const handleMemoryClick = (index: number) => {
    const memory = displayedMemories[index];
    const firstFile = memory.files?.[0] || {};
    const id = firstFile._id || memory._id || memory.memoryId || firstFile.key;
    if (state.selectMode) {
      dispatch({ type: 'TOGGLE_SELECT', payload: id });
    } else {
      setSelectedIndex(index);
    }
  };

  const handleSidebarViewStory = (story: Story) => {
    markSeen(story.storyId);
    setSidebarViewingStory(story); // Open instantly — StoryViewer fetches slides internally
  };

  const handleAlbumBack = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id: null, name: '' } });
    loadAlbums(false);
    loadStats();
  }, [dispatch, loadAlbums, loadStats]);

  const handleCloseCreateMemory = () => {
    setShowCreateMemory(false);
    setPromptTitle('');
    setPromptTextContent('');
    setPromptCategory('');
    setPromptDateTaken('');
  };

  const { isMobile } = useResponsive();
  const selectedMemory = selectedIndex !== null ? displayedMemories[selectedIndex] : null;
  const showTopWidgets = !personId && !state.activeAlbumId;
  const showInlineWidgets = showTopWidgets && isMobile;
  const elderMode = state.elderMode;

  return (
    <div className={`absolute inset-0 z-[45] bg-[#F2EFE9] dark:bg-[#121212] flex flex-col ${elderMode ? 'text-[18px]' : ''}`}>
      <MemoriesHeader
        counts={{ ...typeCounts, total: memoryCount }}
        albumCount={albumCount}
        storyCount={storyCount}
        personName={personName}
        elderMode={elderMode}
        typeFilter={state.typeFilter}
        onSetTypeFilter={(type) => dispatch({ type: 'SET_TYPE_FILTER', payload: type })}
        onBack={onClose}
        onAddMemory={() => setShowCreateMemory(true)}
        onCreateStory={() => setShowStoryEditor(true)}
        onCreateAlbum={() => setShowCreateAlbum(true)}
        onInterview={() => setShowInterview(true)}
        onSlideshow={() => setShowSlideshow(true)}
        onToggleElderMode={() => dispatch({ type: 'TOGGLE_ELDER_MODE' })}
        onParallelTimeline={() => setShowParallelTimeline(true)}
        onExportBook={() => setShowMemoryBook(true)}
        onPilgrimageStory={() => setShowPilgrimageModal(true)}
        viewMode={state.viewMode}
        onSetViewMode={(mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode })}
      />

      {/* Filter bar — mobile only here; desktop filter is inside two-column layout */}
      {!elderMode && isMobile && (
        <div className="sticky top-0 z-20 bg-white dark:bg-[#121212]">
          <MemoriesFilterBar state={state} dispatch={dispatch} persons={persons} templeMemoryCounts={templeMemoryCounts} categoriesRefreshTrigger={categoriesRefreshTrigger} />
        </div>
      )}

      {/* Festival nudge cards */}
      {festivalNudges.length > 0 && (
        <div className="px-3 pt-2 flex flex-col gap-1.5 md:max-w-[1400px] md:mx-auto md:w-full md:px-6">
          {festivalNudges.map(nudge => (
            <div key={`${nudge.templeId}-${nudge.festival}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#C2A46D]/10 border border-[#C2A46D]/20">
              <Bell className="w-3.5 h-3.5 text-[#C2A46D] shrink-0" />
              <span className="text-[12px] text-[#8B7355] dark:text-[#999] flex-1">
                <strong>{nudge.festival}</strong> at {nudge.templeName} — no memories yet.
              </span>
              <button
                onClick={() => setShowCreateMemory(true)}
                className="text-[11px] font-semibold text-[#C2A46D] hover:underline shrink-0"
              >
                Add one →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* ===== MOBILE LAYOUT ===== */}
        {isMobile && (
          <div className="h-full overflow-y-auto pb-16">
            <>
              {/* Albums section — compact on mobile */}
              {showTopWidgets && albums.length > 0 && (
                <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="rounded-lg flex items-center justify-center bg-[#C2A46D]/10 w-5 h-5">
                          <FolderPlus className="text-[#C2A46D] w-3 h-3" strokeWidth={1.5} />
                        </div>
                        <span className="font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] text-[12px]">Albums</span>
                        <span className="text-[10px] text-[#8B7355] dark:text-[#999]">({albums.length})</span>
                      </div>
                      <button onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'albums' })} className="text-[10px] font-medium text-[#C2A46D] hover:underline">View all</button>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                      {albums.slice(0, 6).map(album => (
                        <button key={album._id || album.albumId} onClick={() => dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id: (album as any)._id || album.albumId, name: album.name } })} className="shrink-0 text-center group w-16">
                          <div className="rounded-xl bg-[#F4F6FA] dark:bg-[#1a1a1a] overflow-hidden border border-[#E2E8F0]/50 group-hover:border-[#C2A46D]/30 transition-colors w-16 h-16">
                            {album.coverImageUrl ? (
                              <img src={resolveBackendUrl(album.coverImageUrl)} alt={album.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#B8A090]"><FolderPlus className="w-4 h-4" strokeWidth={1} /></div>
                            )}
                          </div>
                           <AppTooltip content={album.name}>
                            <p className="font-medium text-[#3D2E1F] dark:text-[#f5f5f5] mt-1 truncate text-[10px] cursor-help">{album.name}</p>
                          </AppTooltip>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showTopWidgets && (
                <StoryBar treeId={treeId} currentUserId={currentUserId} currentUserName={currentUserName} currentUserAvatar={currentUserAvatar} />
              )}

              {/* Storage — mobile */}
              <StorageBreakdownWidget
                totalBytes={storageUsed}
                maxBytes={storageMaxBytes}
                fileCount={storageFileCount}
                breakdown={storageBreakdown}
                compact
              />

              {/* Gallery / Main content — mobile */}
              <div className="px-4 py-4">
                {state.viewMode === 'albums' && !state.activeAlbumId && (
                  <AlbumsSection albums={albums} loading={loading} activeAlbumId={state.activeAlbumId} activeAlbumName={state.activeAlbumName}
                    onAlbumClick={(album) => {
                      console.log("album", album)
                      const id = album.albumId || (album as any)._id;
                      dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id, name: album.name } });
                    }}
                    onBack={handleAlbumBack}
                    onCreateAlbum={() => setShowCreateAlbum(true)}
                    onAddMemory={() => setShowCreateMemory(true)}
                    onDeleteAlbum={handleDeleteAlbum} />
                )}
                {state.activeAlbumId && (
                  <AlbumsSection albums={albums} loading={false} activeAlbumId={state.activeAlbumId} activeAlbumName={state.activeAlbumName}
                    onAlbumClick={() => { }} onBack={handleAlbumBack}
                    onCreateAlbum={() => setShowCreateAlbum(true)}
                    onAddMemory={() => setShowCreateMemory(true)}
                    onDeleteAlbum={handleDeleteAlbum} />
                )}
                {state.viewMode === 'interviews' && (
                  activeInterviewId ? (
                    <Suspense fallback={null}>
                      <InterviewDetailView interviewId={activeInterviewId} onBack={() => setActiveInterviewId(null)} onDeleted={() => { setActiveInterviewId(null); loadInterviews(); }} />
                    </Suspense>
                  ) : (
                    <Suspense fallback={null}>
                      <InterviewsSection interviews={interviews} loading={interviewsLoading} onInterviewClick={(i) => setActiveInterviewId(i.interviewId)} />
                    </Suspense>
                  )
                )}
                {state.viewMode === 'stories' && (
                  <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C2A46D]" /></div>}>
                    <StoriesGrid
                      stories={stories}
                      loading={storiesLoading}
                      seenIds={seenIds}
                      onMarkSeen={markSeen}
                      onStoriesChanged={loadStoryCount}
                      treeId={treeId}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      currentUserAvatar={currentUserAvatar}
                    />
                  </Suspense>
                )}
                {state.viewMode === 'for-you' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3"><Gem className="w-4 h-4 text-[#C2A46D]" /><h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Recommended For You</h3></div>
                    {forYouLoading && forYouItems.length === 0 ? <div className="text-center py-12 text-sm text-[#8B7355] dark:text-[#999]">Loading personalized feed...</div>
                      : forYouItems.length === 0 ? <div className="text-center py-12 text-sm text-[#8B7355] dark:text-[#999]">No recommendations yet.</div>
                        : (<>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {forYouItems.map((item) => (
                              <div key={item.memoryId} className="group cursor-pointer" onClick={() => { const idx = displayedMemories.findIndex(m => m.memoryId === item.memoryId); if (idx >= 0) setSelectedIndex(idx); }}>
                                <div className="aspect-square rounded-xl bg-[#F4F6FA] dark:bg-[#1a1a1a] overflow-hidden border border-[#E2E8F0]/50 group-hover:border-[#C2A46D]/40 transition-colors">
                                  {item.mediaUrl ? <img src={resolveBackendUrl(item.mediaUrl)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                                    : <div className="w-full h-full flex items-center justify-center text-[#B8A090]"><Gem className="w-6 h-6" /></div>}
                                </div>
                                <p className="text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] mt-1.5 line-clamp-2">{item.title}</p>
                              </div>
                            ))}
                          </div>
                          {forYouHasMore && <div className="text-center py-4"><button onClick={() => setForYouPage(p => p + 1)} disabled={forYouLoading} className="text-xs font-medium text-[#C2A46D] hover:underline disabled:opacity-50">{forYouLoading ? 'Loading...' : 'Load more'}</button></div>}
                        </>)}
                  </div>
                )}
                {state.viewMode === 'lifePhase' && personId && <LifePhaseView memories={filteredMemories} personDob={personDob || null} onMemoryClick={handleMemoryClick} />}
                {state.viewMode === 'timeline' && <MemoriesTimeline memories={filteredMemories} onMemoryClick={handleMemoryClick} loading={loading} />}
                {state.viewMode === 'map' && <MemoryMapView memories={filteredMemories} onMemoryClick={handleMemoryClick} loading={loading} />}
                {(state.viewMode === 'grid' || state.viewMode === 'list' || state.activeAlbumId) && state.viewMode !== 'timeline' && state.viewMode !== 'lifePhase' && state.viewMode !== 'map' && (state.viewMode !== 'albums' || state.activeAlbumId) && (
                  <MemoriesGallery memories={displayedMemories}
                    viewMode={state.activeAlbumId ? 'grid' : state.viewMode === 'albums' ? 'grid' : state.viewMode as 'grid' | 'list'}
                    loading={loading} selectMode={state.selectMode} selectedIds={state.selectedIds}
                    onMemoryClick={handleMemoryClick} onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', payload: id })}
                    onAddMemory={() => setShowCreateMemory(true)} onBatchDelete={handleBatchDelete}
                    onBatchTag={() => setShowBatchTag(true)} onBatchAlbum={() => setShowBatchAlbum(true)}
                    onBatchArchive={handleBatchArchive} onBatchPublish={handleBatchPublish}
                    onSelectAll={() => dispatch({ type: 'SELECT_ALL', payload: displayedMemories.map(m => { const firstFile = m.files?.[0] || {}; return firstFile._id || m.memoryId || (m as any)._id || firstFile.key; }) })}
                    onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })} hasMore={hasMore} onLoadMore={handleLoadMore}
                    onPublish={handlePublishMemory} onArchive={handleArchiveMemory} onUnarchive={handleUnarchiveMemory} onTrash={handleTrashMemory} onRestore={handleRestoreMemory}
                    activeAlbumId={state.activeAlbumId} />
                )}

                {showInlineWidgets && (state.viewMode === 'grid' || state.viewMode === 'list' || state.viewMode === 'timeline') && (
                  <div className="px-3 py-2 space-y-3">
                    <HighlightsCarousel memories={allMemories} onMemoryClick={(id) => { const idx = displayedMemories.findIndex(m => m.memoryId === id); if (idx >= 0) setSelectedIndex(idx); }} inline />
                  </div>
                )}
              </div>
            </>
          </div>
        )}

        {/* ===== DESKTOP LAYOUT — Content LEFT, Sidebar RIGHT ===== */}
        {!isMobile && (
          <div className="flex flex-col h-full w-full">
            {/* Filter bar row */}
            {!elderMode && (
              <div className="flex border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] shrink-0 relative z-[40] overflow-visible">
                {/* Filter bar — content area */}
                <div className="flex-1 min-w-0 overflow-visible">
                  <MemoriesFilterBar
                    state={state} dispatch={dispatch} persons={persons} templeMemoryCounts={templeMemoryCounts}
                    selectMode={state.selectMode}
                    onToggleSelectMode={() => dispatch({ type: state.selectMode ? 'EXIT_SELECT_MODE' : 'TOGGLE_SELECT_MODE' })}
                    categoriesRefreshTrigger={categoriesRefreshTrigger}
                  />
                </div>
                {/* Stats boxes — sidebar area */}
                <div className="w-[280px] shrink-0 border-l border-[#E2DBCE]/40 dark:border-[#2a2a2a] flex items-center px-4 relative z-10">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="text-center py-1 rounded-lg bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] relative z-10">
                      <p className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] leading-tight">{memoryCount}</p>
                      <p className="text-[7px] text-[#8B7355] dark:text-[#666] uppercase tracking-wider font-semibold">Memories</p>
                    </div>
                    <div className="text-center py-1 rounded-lg bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
                      <p className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] leading-tight">{albumCount}</p>
                      <p className="text-[7px] text-[#8B7355] dark:text-[#666] uppercase tracking-wider font-semibold">Albums</p>
                    </div>
                    <div className="text-center py-1 rounded-lg bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
                      <p className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] leading-tight">{storyCount}</p>
                      <p className="text-[7px] text-[#8B7355] dark:text-[#666] uppercase tracking-wider font-semibold">Stories</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Two-column scrollable area */}
            <div className="flex flex-1 min-h-0">
              {/* LEFT: Main Content Area */}
              <div className="flex-1 min-w-0 h-full overflow-y-auto">
                {/* Content */}
                <div className="px-5 py-4">
                  {state.viewMode === 'albums' && !state.activeAlbumId && (
                    <AlbumsSection
                      albums={albums}
                      loading={loadingAlbums}
                      isAppending={isAppendingAlbums}
                      hasMore={albumHasMore}
                      onLoadMore={handleLoadMoreAlbums}
                      activeAlbumId={state.activeAlbumId}
                      activeAlbumName={state.activeAlbumName}
                      onAlbumClick={(album) => {
                        const id = (album as any)._id || album.albumId;
                        dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id, name: album.name } });
                      }}
                      onBack={handleAlbumBack}
                      onCreateAlbum={() => setShowCreateAlbum(true)}
                      onAddMemory={() => setShowCreateMemory(true)}
                      onDeleteAlbum={handleDeleteAlbum} />
                  )}
                  {state.activeAlbumId && (
                    <AlbumsSection albums={albums} loading={false} activeAlbumId={state.activeAlbumId} activeAlbumName={state.activeAlbumName}
                      onAlbumClick={() => { }} onBack={handleAlbumBack}
                      onCreateAlbum={() => setShowCreateAlbum(true)}
                      onAddMemory={() => setShowCreateMemory(true)}
                      onDeleteAlbum={handleDeleteAlbum} />
                  )}
                  {state.viewMode === 'interviews' && (
                    <div>
                      {activeInterviewId ? (
                        <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C2A46D]" /></div>}>
                          <InterviewDetailView
                            interviewId={activeInterviewId}
                            onBack={() => setActiveInterviewId(null)}
                            onDeleted={() => { setActiveInterviewId(null); loadInterviews(); }}
                          />
                        </Suspense>
                      ) : (
                        <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C2A46D]" /></div>}>
                          <InterviewsSection
                            interviews={interviews}
                            loading={interviewsLoading}
                            onInterviewClick={(interview) => setActiveInterviewId(interview.interviewId)}
                          />
                        </Suspense>
                      )}
                    </div>
                  )}
                  {/* Stories tab */}
                  {state.viewMode === 'stories' && (
                    <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C2A46D]" /></div>}>
                      <StoriesGrid
                        stories={stories}
                        loading={storiesLoading}
                        isAppending={isAppendingStories}
                        hasMore={storiesHasMore}
                        onLoadMore={handleLoadMoreStories}
                        seenIds={seenIds}
                        onMarkSeen={markSeen}
                        onStoriesChanged={() => { loadStories(); loadStats(); }}
                        treeId={treeId}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        currentUserAvatar={currentUserAvatar}
                      />
                    </Suspense>
                  )}
                  {state.viewMode === 'for-you' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3"><Gem className="w-4 h-4 text-[#C2A46D]" /><h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Recommended For You</h3></div>
                      {forYouLoading && forYouItems.length === 0 ? <div className="text-center py-12 text-sm text-[#8B7355] dark:text-[#999]">Loading...</div>
                        : forYouItems.length === 0 ? <div className="text-center py-12 text-sm text-[#8B7355] dark:text-[#999]">No recommendations yet.</div>
                          : (<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                            {forYouItems.map((item) => {
                              // Find the actual memory in allMemories if possible to get full metadata
                              const fullMem = allMemories.find(m => (m._id || m.memoryId) === item.memoryId) || {
                                ...item,
                                _id: item.memoryId,
                                files: item.mediaUrl ? [{ fileUrl: item.mediaUrl, thumbnailSignedUrl: item.mediaUrl }] : []
                              } as any;

                              return (
                                <div key={item.memoryId} className="h-full">
                                  <MemoryCard memory={fullMem} onClick={() => { const idx = displayedMemories.findIndex(m => (m._id || m.memoryId) === item.memoryId); if (idx >= 0) setSelectedIndex(idx); }} />
                                </div>
                              );
                            })}
                          </div>)}
                    </div>
                  )}
                  {/* Archived view — now uses unified gallery */}
                  {state.viewMode === 'archived' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Archive className="w-4 h-4 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
                        <h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Archived Memories</h3>
                        <span className="text-[11px] text-[#8B7355] dark:text-[#666]">({totalCount})</span>
                      </div>
                      <MemoriesGallery memories={displayedMemories}
                        viewMode="grid"
                        loading={loading} selectMode={state.selectMode} selectedIds={state.selectedIds}
                        onMemoryClick={handleMemoryClick} onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', payload: id })}
                        onAddMemory={() => setShowCreateMemory(true)} onBatchDelete={handleBatchDelete}
                        onBatchTag={() => setShowBatchTag(true)} onBatchAlbum={() => setShowBatchAlbum(true)} onBatchArchive={handleBatchArchive}
                        onSelectAll={() => dispatch({ type: 'SELECT_ALL', payload: displayedMemories.map(m => { const firstFile = m.files?.[0] || {}; return firstFile._id || m.memoryId || m._id || firstFile.key; }) })}
                        onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })} hasMore={hasMore} onLoadMore={handleLoadMore}
                        onArchive={handleArchiveMemory} onUnarchive={handleUnarchiveMemory}
                        onTrash={handleTrashMemory} onRestore={handleRestoreMemory}
                        onPublish={handlePublishMemory}
                        emptyHeading="No archived memories yet"
                        emptySubtext="When you archive memories, they'll show up here to keep your main workspace clean."
                        emptyIcon={Archive}
                      />
                    </div>
                  )}

                  {/* Trash view — now uses unified gallery */}
                  {state.viewMode === 'trash' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Trash2 className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.5} />
                        <h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Recently Deleted</h3>
                        <span className="text-[11px] text-[#8B7355] dark:text-[#666]">({totalCount})</span>
                      </div>
                      <p className="text-[11px] text-[#8B7355] dark:text-[#666] mb-4">Memories are permanently deleted after 30 days.</p>
                      <MemoriesGallery memories={displayedMemories}
                        viewMode="grid"
                        loading={loading} selectMode={state.selectMode} selectedIds={state.selectedIds}
                        onMemoryClick={handleMemoryClick} onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', payload: id })}
                        onAddMemory={() => setShowCreateMemory(true)} onBatchDelete={handleBatchDelete}
                        onBatchTag={() => setShowBatchTag(true)} onBatchAlbum={() => setShowBatchAlbum(true)} onBatchArchive={handleBatchArchive}
                        onSelectAll={() => dispatch({ type: 'SELECT_ALL', payload: displayedMemories.map(m => { const firstFile = m.files?.[0] || {}; return firstFile._id || m.memoryId || m._id || firstFile.key; }) })}
                        onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })} hasMore={hasMore} onLoadMore={handleLoadMore}
                        onArchive={handleArchiveMemory} onUnarchive={handleUnarchiveMemory}
                        onTrash={handleTrashMemory} onRestore={handleRestoreMemory}
                        onPublish={handlePublishMemory}
                        emptyHeading="Trash is empty"
                        emptySubtext="Items deleted from your memories will appear here. They are temporarily stored before permanent deletion."
                        emptyIcon={Trash2}
                      />
                    </div>
                  )}

                  {/* Posts view — with Grid/List/Timeline toggle */}
                  {(state.viewMode === 'grid' || state.viewMode === 'list' || state.viewMode === 'timeline' || state.activeAlbumId) && (state.viewMode !== 'albums' || state.activeAlbumId) && state.viewMode !== 'stories' && state.viewMode !== 'for-you' && state.viewMode !== 'archived' && state.viewMode !== 'trash' && state.viewMode !== 'interviews' && (
                    <>
                      {/* View toggle row — Grid / List / Timeline */}
                      {!state.activeAlbumId && (
                        <div className="flex items-center gap-1 mb-3">
                          {([
                            { value: 'grid' as const, icon: Grid3X3, label: 'Grid' },
                            { value: 'list' as const, icon: LayoutGrid, label: 'List' },
                            { value: 'timeline' as const, icon: Image, label: 'Timeline' },
                          ]).map(({ value, icon: Icon, label }) => (
                            <button key={value}
                              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: value })}
                              className={`flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded transition-all ${state.viewMode === value
                                ? 'bg-[#C2A46D]/10 text-[#C2A46D]'
                                : 'text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03]'
                                }`}>
                              <Icon className="w-3 h-3" strokeWidth={1.5} />{label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Grid (masonry) */}
                      {(state.viewMode === 'grid' || state.activeAlbumId) && (
                        <MemoriesGallery memories={displayedMemories}
                          viewMode="grid"
                          loading={loading} selectMode={state.selectMode} selectedIds={state.selectedIds}
                          onMemoryClick={handleMemoryClick} onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', payload: id })}
                          onAddMemory={() => setShowCreateMemory(true)} onBatchDelete={handleBatchDelete}
                          onBatchTag={() => setShowBatchTag(true)} onBatchAlbum={() => setShowBatchAlbum(true)} onBatchArchive={handleBatchArchive}
                          onSelectAll={() => dispatch({ type: 'SELECT_ALL', payload: displayedMemories.map(m => { const firstFile = m.files?.[0] || {}; return firstFile._id || m.memoryId || (m as any)._id || firstFile.key; }) })}
                          onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })} hasMore={hasMore} onLoadMore={handleLoadMore}
                          onArchive={handleArchiveMemory} onUnarchive={handleUnarchiveMemory} onTrash={handleTrashMemory} onRestore={handleRestoreMemory} onPublish={handlePublishMemory}
                          activeAlbumId={state.activeAlbumId} />
                      )}

                      {/* List */}
                      {state.viewMode === 'list' && !state.activeAlbumId && (
                        <MemoriesGallery memories={displayedMemories}
                          viewMode="list"
                          loading={loading} selectMode={state.selectMode} selectedIds={state.selectedIds}
                          onMemoryClick={handleMemoryClick} onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', payload: id })}
                          onAddMemory={() => setShowCreateMemory(true)} onBatchDelete={handleBatchDelete}
                          onBatchTag={() => setShowBatchTag(true)} onBatchAlbum={() => setShowBatchAlbum(true)} onBatchArchive={handleBatchArchive} onBatchPublish={handleBatchPublish}
                          onSelectAll={() => dispatch({ type: 'SELECT_ALL', payload: displayedMemories.map(m => { const firstFile = m.files?.[0] || {}; return firstFile._id || m.memoryId || (m as any)._id || firstFile.key; }) })}
                          onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })} hasMore={hasMore} onLoadMore={handleLoadMore}
                          onArchive={handleArchiveMemory} onUnarchive={handleUnarchiveMemory} onTrash={handleTrashMemory} onRestore={handleRestoreMemory} onPublish={handlePublishMemory}
                          activeAlbumId={state.activeAlbumId} />
                      )}

                      {/* Timeline */}
                      {state.viewMode === 'timeline' && (
                        <MemoriesTimeline memories={filteredMemories} onMemoryClick={handleMemoryClick} loading={loading} />
                      )}
                    </>
                  )}

                  {state.viewMode === 'lifePhase' && personId && <LifePhaseView memories={filteredMemories} personDob={personDob || null} onMemoryClick={handleMemoryClick} />}
                  {state.viewMode === 'map' && <MemoryMapView memories={filteredMemories} onMemoryClick={handleMemoryClick} loading={loading} />}
                </div>
              </div>

              {/* RIGHT: Sidebar — px-4 aligned with header */}
              <div className="w-[280px] shrink-0 h-full overflow-y-auto border-l border-[#E2DBCE]/40 dark:border-[#2a2a2a] bg-[#F8F6F1]/50 dark:bg-[#121212]">
                <div className="px-3 py-4">
                  {/* Story circles — 2-row grid with seen/unseen */}
                  {showTopWidgets && (
                    <div className="mb-4">
                      <SidebarStoryBar
                        stories={stories}
                        seenIds={seenIds}
                        onCreateStory={() => setShowStoryEditor(true)}
                        onViewStory={handleSidebarViewStory}
                        onViewMore={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'stories' })}
                      />
                    </div>
                  )}

                  {/* Quick Actions — Mapping from top-level config */}
                  <div className="mb-4">
                    <span className="text-[10px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] uppercase tracking-[0.08em] mb-2 block">Quick Actions</span>
                    <div className="space-y-1.5">
                      {QUICK_ACTIONS_CONFIG.map((config) => {
                        let onClick = () => { };
                        let isActive = false;

                        // Tie the static config to dynamic component state/dispatch
                        switch (config.id) {
                          case 'archived':
                            onClick = () => dispatch({ type: 'SET_VIEW_MODE', payload: 'archived' });
                            isActive = state.viewMode === 'archived';
                            break;
                          case 'trash':
                            onClick = () => dispatch({ type: 'SET_VIEW_MODE', payload: 'trash' });
                            isActive = state.viewMode === 'trash';
                            break;
                          case 'slideshow': onClick = () => setShowSlideshow(true); break;
                          case 'timeline': onClick = () => setShowParallelTimeline(true); break;
                          case 'pilgrimage': onClick = () => setShowPilgrimageModal(true); break;
                          case 'memorybook': onClick = () => setShowMemoryBook(true); break;
                        }

                        const Icon = config.icon;
                        const isTrash = config.isDanger;

                        return (
                          <button
                            key={config.id}
                            onClick={onClick}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-[12px] transition-all duration-200 group ${isActive
                              ? isTrash ? 'bg-red-500/[0.05] ring-1 ring-red-200/30 dark:ring-red-900/30' : 'bg-[#C2A46D]/[0.06] ring-1 ring-black/[0.03] dark:ring-white/[0.06]'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                              }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${isActive
                                ? isTrash ? 'bg-red-500/[0.1] shadow-sm' : 'bg-[#C2A46D]/[0.12] shadow-sm'
                                : 'bg-black/[0.04] dark:bg-white/[0.04] group-hover:scale-105'
                                }`}
                              style={!isActive ? { backgroundColor: `${config.color}10` } : {}}
                            >
                              <Icon
                                className="w-[15px] h-[15px]"
                                style={{ color: config.color }}
                                strokeWidth={1.7}
                              />
                            </div>
                            <span className={`transition-colors ${isActive
                              ? isTrash ? 'font-semibold text-red-600 dark:text-red-400' : 'font-bold text-[#3D2E1F] dark:text-[#F3F2F1]'
                              : 'text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 font-medium group-hover:text-[#3D2E1F] dark:group-hover:text-[#F3F2F1]'
                              }`}>
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Select mode toggle removed — now integrated into filter bar */}

      {/* Full-page media viewer */}
      <Suspense fallback={null}>
        {selectedMemory && selectedIndex !== null && (
          <FullPageMediaViewer
            memories={displayedMemories}
            currentIndex={selectedIndex}
            onNavigate={setSelectedIndex}
            onClose={() => setSelectedIndex(null)}
            onUpdate={(albumId, albumName) => {
              if (albumId) {
                setSelectedIndex(null);
                dispatch({ type: 'SET_VIEW_MODE', payload: 'albums' });
                dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id: albumId, name: albumName || '' } });
              } else {
                loadMemories();
              }
              loadAlbums();
              loadStats();
            }}
            onDelete={() => { setSelectedIndex(null); loadMemories(); loadAlbums(); loadStats(); }}
            treeId={treeId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            persons={persons}
            albumId={state.activeAlbumId || undefined}
          />
        )}

        {/* Create Memory Modal */}
        {showCreateMemory && (
          <CreateMemoryModal
            open={showCreateMemory}
            onClose={handleCloseCreateMemory}
            treeId={treeId}
            preSelectedPersonId={personId || undefined}
            persons={persons}
            onCreated={(createdAlbumId) => {
              handleCloseCreateMemory();
              if (createdAlbumId) {
                dispatch({ type: 'SET_VIEW_MODE', payload: 'albums' });
                const album = albums.find(a => (a.albumId || (a as any)._id) === createdAlbumId);
                const name = album ? album.name : '';
                dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id: createdAlbumId, name } });
                if (state.activeAlbumId === createdAlbumId) {
                  loadMemories();
                }
              } else {
                loadMemories();
              }
              loadAlbums();
              loadStats();
            }}
            initialTitle={promptTitle || undefined}
            initialTextContent={promptTextContent || undefined}
            initialCategory={promptCategory || undefined}
            initialDateTaken={promptDateTaken || undefined}
            albumId={state.activeAlbumId || undefined}
          />
        )}

        {/* Create Album Modal */}
        {showCreateAlbum && (
          <CreateAlbumModal
            open={showCreateAlbum}
            onClose={() => setShowCreateAlbum(false)}
            treeId={treeId}
            onCreated={() => { setShowCreateAlbum(false); loadAlbums(); loadStats(); }}
          />
        )}

        {/* Batch Add to Album Modal */}
        {showBatchAlbum && (
          <AddToAlbumModal
            open={showBatchAlbum}
            onClose={() => setShowBatchAlbum(false)}
            treeId={treeId}
            memoryIds={getSelectedRealMemoryIds()}
            onDone={(albumId, albumName) => {
              dispatch({ type: 'EXIT_SELECT_MODE' });
              if (albumId) {
                dispatch({ type: 'SET_VIEW_MODE', payload: 'albums' });
                dispatch({ type: 'SET_ACTIVE_ALBUM', payload: { id: albumId, name: albumName } });
                if (state.activeAlbumId === albumId) {
                  loadMemories();
                }
              } else {
                loadMemories();
              }
              loadAlbums();
              loadStats();
            }}
          />
        )}

        {/* Story Editor */}
        {showStoryEditor && (
          <StoryEditor
            treeId={treeId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onClose={() => setShowStoryEditor(false)}
            onCreated={() => { setShowStoryEditor(false); loadStoryCount(); loadStats(); }}
          />
        )}

        {/* Interview Capture */}
        {showInterview && (
          <InterviewCapture
            treeId={treeId}
            persons={persons}
            onClose={() => setShowInterview(false)}
            onComplete={() => { setShowInterview(false); loadInterviews(); }}
          />
        )}

        {/* Slideshow Mode */}
        {showSlideshow && (
          <SlideshowMode
            memories={filteredMemories}
            onClose={() => setShowSlideshow(false)}
          />
        )}

        {/* Parallel Timeline */}
        {showParallelTimeline && (
          <ParallelTimeline
            allMemories={allMemories}
            persons={persons}
            onMemoryClick={(id) => {
              const idx = displayedMemories.findIndex(m => m.memoryId === id);
              if (idx >= 0) setSelectedIndex(idx);
            }}
            onClose={() => setShowParallelTimeline(false)}
          />
        )}

        {/* Memory Book Export */}
        {showMemoryBook && (
          <MemoryBookExport
            memories={filteredMemories}
            treeName="Family Memory Book"
            onClose={() => setShowMemoryBook(false)}
          />
        )}

        {/* Pilgrimage Story Modal */}
        {showPilgrimageModal && (
          <CreatePilgrimageStoryModal
            open={showPilgrimageModal}
            onClose={() => setShowPilgrimageModal(false)}
            onCreated={() => { setShowPilgrimageModal(false); loadStoryCount(); }}
            treeId={treeId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
          />
        )}
      </Suspense>

      {/* Sidebar Story Viewer */}
      <Suspense fallback={null}>
        {sidebarViewingStory && (
          <StoryViewerLazy
            story={sidebarViewingStory}
            onClose={() => setSidebarViewingStory(null)}
            onDeleted={() => { setSidebarViewingStory(null); loadStoryCount(); loadStats(); }}
            onEdit={() => { setSidebarViewingStory(null); setShowStoryEditor(true); }}
          />
        )}
      </Suspense>

      {/* Batch Tag Modal */}
      {showBatchTag && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowBatchTag(false)} />
          <div className="relative w-full max-w-sm mx-3 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
              <h2 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Tag {state.selectedIds.size} memories</h2>
              <button onClick={() => setShowBatchTag(false)} className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-150">
                <X className="w-4 h-4 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {persons.map(p => (
                <button
                  key={p.personId}
                  onClick={() => setBatchTagPersonId(p.personId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 ${batchTagPersonId === p.personId ? 'bg-[#C2A46D]/[0.08] border border-[#C2A46D]/20' : 'border border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                    }`}
                >
                  <div className="w-7 h-7 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden flex-shrink-0">
                    <PersonAvatar
                      photoUrl={p.profilePhotoUrl}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      fullName={`${p.firstName || ''} ${p.lastName || ''}`.trim()}
                      textClassName="text-[10px]"
                    />
                  </div>
                  <span className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5]">{p.firstName} {p.lastName}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
              <button onClick={() => setShowBatchTag(false)}
                className="h-8 px-4 rounded-lg text-[12px] font-medium text-[#8B7355] dark:text-[#999] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:bg-black/[0.02] transition-all duration-150">
                Cancel
              </button>
              <button onClick={handleBatchTag} disabled={!batchTagPersonId}
                className="h-8 px-4 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40 transition-all duration-150 hover:brightness-110"
                style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)' }}>
                Tag Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={confirmConfig.open}
        onClose={() => setConfirmConfig(prev => ({ ...prev, open: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        loading={confirmConfig.loading}
      />
    </div>
  );
}

export default MemoriesPage;
