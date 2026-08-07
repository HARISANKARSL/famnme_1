import { useEffect, useRef } from 'react';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { FolderOpen, Plus, ChevronLeft, Loader2 } from 'lucide-react';
import type { Album } from '@/types';

interface AlbumsSectionProps {
  albums: Album[];
  loading: boolean;
  isAppending?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  activeAlbumId: string | null;
  activeAlbumName: string;
  onAlbumClick: (album: Album) => void;
  onBack: () => void;
  onCreateAlbum: () => void;
  onAddMemory: () => void;
  onDeleteAlbum?: (albumId: string) => void;
}

export function AlbumsSection({
  albums,
  loading,
  isAppending,
  hasMore,
  onLoadMore,
  activeAlbumId,
  activeAlbumName,
  onAlbumClick,
  onBack,
  onCreateAlbum,
  onAddMemory,
  onDeleteAlbum
}: AlbumsSectionProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading || isAppending) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, isAppending, onLoadMore]);

  if (loading && albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C2A46D]" strokeWidth={1.5} />
        <p className="text-[12px] text-[#8B7355] dark:text-[#666] font-medium">Fetching your albums...</p>
      </div>
    );
  }

  if (activeAlbumId) {
    return (
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack}
            className="p-1.5 rounded-lg text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all duration-150 shrink-0">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] break-words break-all flex-1">{activeAlbumName}</h3>
        </div>
        <button onClick={onAddMemory}
          className="flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97] shrink-0"
          style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)', boxShadow: '0 2px 10px rgba(47,62,143,0.15)' }}>
          <Plus className="w-4 h-4" strokeWidth={2} />Add Memory
        </button>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex flex-col">
          <h3 className="text-[11px] font-bold text-[#8B7355] dark:text-[#666] uppercase tracking-widest">Your Collection</h3>
          <p className="text-[18px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] mt-0.5">Albums</p>
        </div>
        <button onClick={onCreateAlbum}
          className="flex items-center gap-2 h-9 px-4 rounded-2xl text-[12px] font-semibold text-white transition-all duration-200 hover:brightness-110 shadow-sm"
          style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)' }}>
          <Plus className="w-4 h-4" strokeWidth={2} />Create New
        </button>
      </div>

      {albums.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6 bg-white/40 dark:bg-black/20 rounded-[32px] border border-stone-100 dark:border-white/5 mx-1">
          <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-stone-900 shadow-xl flex items-center justify-center ring-1 ring-stone-100 dark:ring-white/10">
            <FolderOpen className="w-8 h-8 text-[#C2A46D]" strokeWidth={1} />
          </div>
          <div className="text-center max-w-[240px]">
            <p className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5]">Start organizing memories</p>
            <p className="text-[12px] text-[#8B7355] dark:text-[#666] mt-2 leading-relaxed">Group your favorite moments into curated albums for easy access.</p>
          </div>
          <button onClick={onCreateAlbum}
            className="flex items-center gap-2 h-10 px-6 rounded-3xl text-[13px] font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)', boxShadow: '0 8px 20px rgba(194,164,109,0.25)' }}>
            <Plus className="w-4 h-4" strokeWidth={2.5} />Create First Album
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map(album => (
              <AlbumCard
                key={album.albumId || (album as any)._id}
                album={album}
                onClick={() => onAlbumClick(album)}
                onDelete={() => {
                  const id = (album as any)._id || album.albumId;
                  onDeleteAlbum?.(id);
                }}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} className="h-20 flex items-center justify-center mt-6">
            {(isAppending || loading) && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#C2A46D] uppercase tracking-widest">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading More
              </div>
            )}
            {/* {!hasMore && albums.length > 0 && (
              <div className="w-full flex items-center gap-4 py-4">
                <div className="h-px flex-1 bg-stone-100 dark:bg-white/5" />
                <span className="text-[10px] font-bold text-[#8B7355] dark:text-[#666] uppercase tracking-widest whitespace-nowrap">End of Collection</span>
                <div className="h-px flex-1 bg-stone-100 dark:bg-white/5" />
              </div>
            )} */}
          </div>
        </>
      )}
    </div>
  );
}
