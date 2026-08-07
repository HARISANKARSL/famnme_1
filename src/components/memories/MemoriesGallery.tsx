import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { MemoryListItem } from './MemoryListItem';
import { Camera, Plus, CheckSquare, Check, FolderPlus, Trash2, Images, Play, Video, Music, FileText, Archive, Tag } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';
import type { Memory } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemoryGridSkeleton } from '../ui/skeleton';
import { useResponsive } from '@/hooks/useResponsive';


interface MemoriesGalleryProps {
  memories: Memory[];
  viewMode: 'grid' | 'list' | 'instagram' | 'masonry';
  loading: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  onMemoryClick: (index: number) => void;
  onToggleSelect: (id: string) => void;
  onAddMemory: () => void;
  onBatchDelete: () => void;
  onBatchTag: () => void;
  onBatchAlbum: () => void;
  onBatchArchive?: () => void;
  onBatchPublish?: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPublish?: (id: string) => void;
  activeAlbumId?: string | null;
  emptyHeading?: string;
  emptySubtext?: string;
  emptyIcon?: any;
}

const BATCH_ACTIONS_CONFIG = [
  // { id: 'tag', label: 'Tag', icon: Tag },
  { id: 'album', label: 'Album', icon: FolderPlus },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'publish', label: 'Publish', icon: Check, variant: 'success' },
  { id: 'delete', label: 'Delete', icon: Trash2, variant: 'danger' },
];

/**
 * Group memories that share the same title and were created within 2 minutes
 * (batch uploads). Returns an array of { representative, groupSize, originalIndex }.
 * Note: Grouping has been disabled per user request to show all items one by one.
 */
function groupBatchMemories(memories: Memory[]): Array<{
  memory: Memory;
  groupSize: number;
  originalIndex: number;
}> {
  return memories.map((memory, originalIndex) => ({
    memory,
    groupSize: 1,
    originalIndex
  }));
}

export function MemoriesGallery({
  memories, viewMode, loading, selectMode, selectedIds,
  onMemoryClick, onToggleSelect, onAddMemory,
  onBatchDelete, onBatchTag, onBatchAlbum, onBatchArchive, onBatchPublish, onSelectAll, onDeselectAll,
  hasMore, onLoadMore, onArchive, onUnarchive, onTrash, onRestore, onPublish, activeAlbumId,
  emptyHeading, emptySubtext, emptyIcon
}: MemoriesGalleryProps) {
  const isAudioFile = (url?: string | null): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.wav') || cleanUrl.endsWith('.m4a') || cleanUrl.endsWith('.aac') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.wma');
  };

  const isVideoFile = (url?: string | null): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.avi') || cleanUrl.endsWith('.mkv') || cleanUrl.endsWith('.flv');
  };

  const isDocumentFile = (url?: string | null): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    const docExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.csv', '.txt', '.rtf', '.odt', '.ods', '.odp'
    ];
    return docExtensions.some(ext => cleanUrl.endsWith(ext));
  };

  const detectMemoryType = (m: Memory): Memory['memoryType'] | 'document' => {
    if (m.memoryType === 'audio' || m.memoryType === 'video' || m.memoryType === 'text' || (m.memoryType as string) === 'document') {
      return m.memoryType as any;
    }
    const firstFile = m.files?.[0];
    const url = firstFile?.fileUrl || firstFile?.signedUrl || m.mediaUrl;
    if (firstFile?.fileType?.startsWith('video/') || isVideoFile(url)) {
      return 'video';
    }
    if (firstFile?.fileType?.startsWith('audio/') || isAudioFile(url)) {
      return 'audio';
    }
    const mime = firstFile?.fileType || '';
    if (
      mime.startsWith('application/pdf') ||
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('presentation') ||
      mime.includes('powerpoint') ||
      mime.startsWith('text/') ||
      isDocumentFile(url)
    ) {
      return 'document';
    }
    if (m.textdata || m.textContent || m.files?.[0]?.textContent) {
      return 'text';
    }
    return (m.memoryType || 'photo') as Memory['memoryType'];
  };

  const getThumbnailInfo = (m: Memory) => {
    const inferredType = detectMemoryType(m);
    const firstFile = m.files?.[0] || {};
    const thumbnailUrl =
      firstFile?.thumbnailSignedUrl ||
      firstFile?.thumbnailUrl ||
      m.thumbnailUrl ||
      (inferredType !== 'audio' && inferredType !== 'document' ? (firstFile?.signedUrl || firstFile?.fileUrl || m.mediaUrl) : '') ||
      '';
    const hasThumbnail = !!thumbnailUrl && inferredType !== 'text' && inferredType !== 'audio' && inferredType !== 'document';
    return { inferredType, thumbnailUrl, hasThumbnail };
  };

  const groupedMemories = useMemo(
    () => (selectMode || viewMode === 'instagram' || viewMode === 'masonry') ? null : groupBatchMemories(memories),
    [memories, selectMode, viewMode]
  );

  const observerTarget = useRef<HTMLDivElement>(null);

  const { viewportWidth } = useResponsive();

  // Track aspect ratios of images once they load to balance the columns perfectly
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const handleImageLoad = useCallback((id: string, aspect: number) => {
    setAspectRatios(prev => {
      if (prev[id] === aspect) return prev;
      return { ...prev, [id]: aspect };
    });
  }, []);

  const columnCount = useMemo(() => {
    const maxCols = viewportWidth < 640 ? 2 : 3;
    if (memories.length === 0) return 1;
    if (memories.length <= 2) return memories.length;
    if (memories.length === 4 || memories.length === 5) return 2; // balance perfectly for small sets
    return maxCols;
  }, [viewportWidth, memories.length]);

  // Distribute items into columns using a stable modulo distribution to prevent layout jerking/blinking
  const masonryColumns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [] as Array<{
      item: any;
      index: number;
      isGrouped: boolean;
      groupSize?: number;
    }>);

    const list = selectMode
      ? memories.map((m, idx) => ({ item: m, index: idx, isGrouped: false }))
      : (groupedMemories || groupBatchMemories(memories)).map((entry) => ({
        item: entry.memory,
        index: entry.originalIndex,
        isGrouped: entry.groupSize > 1,
        groupSize: entry.groupSize
      }));

    list.forEach((entry, idx) => {
      const colIdx = idx % columnCount;
      cols[colIdx].push(entry);
    });

    return cols;
  }, [memories, groupedMemories, selectMode, columnCount]);

  const masonryRawColumns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [] as Array<{
      item: Memory;
      index: number;
    }>);

    memories.forEach((m, idx) => {
      const colIdx = idx % columnCount;
      cols[colIdx].push({ item: m, index: idx });
    });

    return cols;
  }, [memories, columnCount]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (loading) {
    return <MemoryGridSkeleton count={12} />;
  }

  if (memories.length === 0) {
    if (activeAlbumId) {
      return (
        <EmptyState
          icon={FolderPlus}
          heading="This album is a blank canvas"
          subtext="Start gathering your family's precious moments here. Every photo added is a piece of your legacy preserved."
          primaryAction={{ label: 'Add first memory', onClick: onAddMemory, icon: Plus }}
          accent="#C2A46D"
          size="large"
        />
      );
    }
    return (
      <EmptyState
        icon={emptyIcon || Camera}
        heading={emptyHeading || "Your first memory starts here"}
        subtext={emptySubtext || "Preserve photos, videos, voice recordings and stories — everything that makes your family yours."}
        primaryAction={emptyHeading ? undefined : { label: 'Add a memory', onClick: onAddMemory, icon: Plus }}
        accent="#C2A46D"
        size="large"
      />
    );
  }

  return (
    <div>
      {/* Batch action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-[#C2A46D]/20 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <CheckSquare className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.5} />
          <span className="text-[12px] text-[#C2A46D] font-semibold flex-1">{selectedIds.size} selected</span>
          <button onClick={onSelectAll} className="text-[11px] font-medium text-[#C2A46D] hover:underline">Select All</button>
          <button onClick={onDeselectAll} className="text-[11px] font-medium text-[#8B7355] dark:text-[#999] hover:underline">Deselect</button>
          <div className="w-px h-4 bg-[#E2E8F0]/60 dark:bg-[#2a2a2a]" />
          {[
            { id: 'tag', onClick: onBatchTag, show: true },
            { id: 'album', onClick: onBatchAlbum, show: true },
            { id: 'archive', onClick: onBatchArchive, show: !!onBatchArchive },
            { id: 'publish', onClick: onBatchPublish, show: !!onBatchPublish },
            { id: 'delete', onClick: onBatchDelete, show: true },
          ].filter(a => a.show && BATCH_ACTIONS_CONFIG.find(c => c.id === a.id)).map((action) => {
            const config = BATCH_ACTIONS_CONFIG.find(c => c.id === action.id)!;
            const Icon = config.icon;
            return (
              <button
                key={config.id}
                onClick={action.onClick}
                className={`flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium rounded-md border transition-all duration-150 ${config.variant === 'success'
                  ? 'border-green-100/60 dark:border-green-900/30 text-green-600 hover:bg-green-500/5'
                  : config.variant === 'danger'
                    ? 'border-red-200/60 dark:border-red-900/30 text-red-500 hover:bg-red-500/5'
                    : 'border-[#E2E8F0]/60 dark:border-[#2a2a2a] text-[#8B7355] dark:text-[#999] hover:border-[#C2A46D]/30 hover:text-[#C2A46D]'
                  }`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.5} />
                {config.label}
              </button>
            );
          })}
        </div>
      )}
      {/* Masonry / Pinterest layout — reference design */}
      {viewMode === 'masonry' && (
        <div className={`flex gap-3 sm:gap-4 ${memories.length === 1 ? 'justify-center' : ''}`}>
          {masonryRawColumns.map((col, colIdx) => (
            <div key={colIdx} className={`flex flex-col gap-3 sm:gap-4 ${memories.length === 1 ? 'max-w-[450px] w-full flex-none' : 'flex-1'}`}>
              {col.map(({ item: m, index: i }) => {
                const files = m.files || [];
                const firstFile = files[0] || {};
                const uniqueId = firstFile._id || m._id || m.memoryId || firstFile.key;
                const { inferredType, thumbnailUrl, hasThumbnail } = getThumbnailInfo(m);
                const isSelected = selectedIds.has(uniqueId);

                return selectMode ? (
                  <div
                    key={uniqueId}
                    onClick={() => onToggleSelect(uniqueId)}
                    className={`relative cursor-pointer group rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900 shadow-sm border border-stone-100 dark:border-stone-800 ${isSelected ? 'ring-2 ring-inset ring-[#C2A46D]' : 'hover:shadow-md'
                      }`}
                  >
                    {hasThumbnail ? (
                      <img
                        src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
                        alt={m.title}
                        className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                        onLoad={(e) => {
                          const { naturalWidth, naturalHeight } = e.currentTarget;
                          if (naturalWidth && naturalHeight) {
                            handleImageLoad(m._id || m.memoryId, naturalHeight / naturalWidth);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-square bg-stone-50 dark:bg-stone-900 flex items-center justify-center opacity-30">
                        {inferredType === 'video' ? <Video /> : inferredType === 'audio' ? <Music /> : inferredType === 'text' ? <FileText /> : <Camera />}
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#C2A46D] border-[#C2A46D]' : 'bg-white/80 border-white/60 backdrop-blur-sm'
                      }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                ) : (
                  <div
                    key={m._id || m.memoryId}
                    onClick={() => onMemoryClick(i)}
                    className="relative cursor-pointer group rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900 shadow-sm border border-stone-100 dark:border-stone-800 hover:shadow-md transition-shadow"
                  >
                    {hasThumbnail ? (
                      <img
                        src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
                        alt={m.title}
                        className="w-full h-auto object-cover group-hover:brightness-95 transition-all duration-300"
                        loading="lazy"
                        onLoad={(e) => {
                          const { naturalWidth, naturalHeight } = e.currentTarget;
                          if (naturalWidth && naturalHeight) {
                            handleImageLoad(m._id || m.memoryId, naturalHeight / naturalWidth);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-square bg-stone-50 dark:bg-stone-900 flex items-center justify-center opacity-30">
                        {inferredType === 'video' ? <Video /> : inferredType === 'audio' ? <Music /> : inferredType === 'text' ? <FileText /> : <Camera />}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end">
                      <p className="text-white text-[11px] font-bold px-3 pb-3 line-clamp-1 drop-shadow-md w-full">{m.title}</p>
                    </div>
                    {inferredType === 'video' && hasThumbnail && (
                      <div className="absolute top-3 right-3 z-10">
                        <Play className="w-5 h-5 text-white drop-shadow-md fill-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Grid view — Unsplash-style Masonry Grid */}
      {viewMode === 'grid' && (
        <div className={`flex gap-3 sm:gap-4 ${memories.length <= 3 ? 'justify-center' : ''}`}>
          {masonryColumns.map((col, colIdx) => (
            <div key={colIdx} className={`flex flex-col gap-3 sm:gap-4 ${memories.length === 1 ? 'max-w-[450px] w-full flex-none' : memories.length <= 3 ? 'max-w-[380px] w-full flex-1' : 'flex-1'}`}>
              {col.map(({ item, index, isGrouped, groupSize }) => {
                const mid = item._id || item.memoryId;
                const firstFile = item.files?.[0] || {};
                const uniqueId = firstFile._id || mid || firstFile.key;
                return (
                  <div key={uniqueId} className="relative">
                    {selectMode ? (
                      <MemoryCard
                        memory={item}
                        onClick={() => onMemoryClick(index)}
                        selectable
                        selected={selectedIds.has(uniqueId)}
                        onSelect={() => onToggleSelect(uniqueId)}
                        variant="masonry"
                        onImageLoad={handleImageLoad}
                        isSmallSet={memories.length <= 5}
                      />
                    ) : (
                      <>
                        <MemoryCard
                          memory={item}
                          onClick={() => onMemoryClick(index)}
                          showActions
                          onArchive={onArchive}
                          onUnarchive={onUnarchive}
                          onTrash={onTrash}
                          onRestore={onRestore}
                          onPublish={onPublish}
                          variant="masonry"
                          onImageLoad={handleImageLoad}
                          isSmallSet={memories.length <= 5}
                        />
                        {isGrouped && (
                          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-full pointer-events-none shadow-sm border border-white/10">
                            <Images className="w-3 h-3" />
                            {groupSize}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Instagram-style 3-column square grid */}
      {viewMode === 'instagram' && (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {selectMode ? (
            memories.map((m) => {
              const mid = m._id || m.memoryId;
              const files = m.files || [];
              const firstFile = files[0] || {};
              const uniqueId = firstFile._id || mid || firstFile.key;
              const { inferredType, thumbnailUrl, hasThumbnail } = getThumbnailInfo(m);

              return (
                <div
                  key={uniqueId}
                  onClick={() => onToggleSelect(uniqueId)}
                  className={`relative aspect-square cursor-pointer overflow-hidden bg-stone-50 dark:bg-stone-900 group ${selectedIds.has(uniqueId) ? 'ring-2 ring-inset ring-teal-500' : ''
                    }`}
                >
                  {hasThumbnail ? (
                    <img
                      src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      {inferredType === 'video' ? <Video /> : inferredType === 'audio' ? <Music /> : inferredType === 'text' ? <FileText /> : <Camera />}
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(uniqueId) ? 'bg-teal-500 border-teal-500' : 'bg-white/70 border-white/80 backdrop-blur-sm'
                    }`}>
                    {selectedIds.has(uniqueId) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          ) : (
            memories.map((m, i) => {
              const mid = m._id || m.memoryId;
              const files = m.files || [];
              const firstFile = files[0];
              const { inferredType, thumbnailUrl, hasThumbnail } = getThumbnailInfo(m);

              return (
                <div
                  key={mid}
                  onClick={() => onMemoryClick(i)}
                  className="relative aspect-square cursor-pointer overflow-hidden bg-stone-50 dark:bg-stone-900 group"
                >
                  {hasThumbnail ? (
                    <img
                      src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      {inferredType === 'video' ? <Video /> : inferredType === 'audio' ? <Music /> : inferredType === 'text' ? <FileText /> : <Camera />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <p className="text-white text-[12px] font-bold text-center px-4 line-clamp-2 drop-shadow-md">{m.title}</p>
                  </div>
                  {inferredType === 'video' && hasThumbnail && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <Play className="w-5 h-5 text-white drop-shadow-md fill-white" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-1.5 ">
          {selectMode ? (
            memories.map((m, i) => {
              const mid = m._id || m.memoryId;
              const firstFile = m.files?.[0] || {};
              const uniqueId = firstFile._id || firstFile.key || mid;
              return (
                <MemoryListItem key={uniqueId} memory={m} onClick={() => onMemoryClick(i)}
                  selectable selected={selectedIds.has(uniqueId)}
                  onSelect={() => onToggleSelect(uniqueId)} />
              );
            })
          ) : (
            groupedMemories!.map(({ memory, groupSize, originalIndex }) => {
              const mid = memory._id || memory.memoryId;
              return (
                <div key={mid} className="relative">
                  <MemoryListItem memory={memory} onClick={() => onMemoryClick(originalIndex)} />
                  {groupSize > 1 && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 bg-[#C2A46D]/10 text-[#C2A46D] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Images className="w-3 h-3" />
                      {groupSize} photos
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sentinel for Infinite Scroll */}
      <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
        {hasMore && (
          <div className="flex flex-col items-center gap-2 opacity-50">
            <div className="w-5 h-5 border-2 border-[#C2A46D]/30 border-t-[#C2A46D] rounded-full animate-spin" />
            <span className="text-[10px] text-[#8B7355] uppercase tracking-widest font-medium">Gathering more moments...</span>
          </div>
        )}
      </div>
    </div>
  );
}
