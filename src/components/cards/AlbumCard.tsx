import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Image, MoreVertical, Trash2, Music, FileText } from 'lucide-react';
import type { Album } from '@/types';
import { resolveBackendUrl } from '@/config/api';
import { AppTooltip } from '@/components/ui/AppTooltip';

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function AlbumCard({ album, onClick, onDelete }: AlbumCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [derivedCoverUrl, setDerivedCoverUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = album.fileIds?.length ?? (album as any).itemCount ?? (album as any).memoryCount ?? (album as any).memories?.length ?? (album.memoryIds?.length || 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (album.coverImageUrl) {
      setDerivedCoverUrl(album.coverImageUrl.startsWith('http') ? album.coverImageUrl : resolveBackendUrl(album.coverImageUrl));
      return;
    }
    if (count === 0) {
      setDerivedCoverUrl(null);
      return;
    }

    let active = true;
    import('@/services/albumApiService').then(({ fetchAlbum, fetchAlbumMemories }) => {
      const albumId = album.albumId || (album as any)._id;

      const processMemoriesList = (memoriesList: any[]) => {
        if (!active) return;
        if (!memoriesList || memoriesList.length === 0) {
          setDerivedCoverUrl(null);
          return;
        }

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

        // Helper to infer the memory type
        const getInferredType = (m: any): 'photo' | 'video' | 'audio' | 'text' | 'document' => {
          if (!m) return 'photo';
          if (typeof m === 'string') return 'photo'; // Resilience if raw string leaked
          const file = m.files?.[0];
          const url = file?.fileUrl || file?.signedUrl || m.mediaUrl;
          if (m.memoryType === 'audio' || m.memoryType === 'video' || m.memoryType === 'text' || m.memoryType === 'document') {
            return m.memoryType;
          }
          if (file?.fileType?.startsWith('video/') || isVideoFile(url)) {
            return 'video';
          }
          if (file?.fileType?.startsWith('audio/') || isAudioFile(url)) {
            return 'audio';
          }
          const mime = file?.fileType || '';
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
          return (m.memoryType ||
            ((m.textdata || m.textContent || m.files?.[0]?.textContent) ? 'text' : 'photo')
          ) as any;
        };

        // 1. First check if there's any photo/image memory
        const firstImage = memoriesList.find((m: any) => {
          if (!m) return false;
          const type = getInferredType(m);
          return type === 'photo';
        });

        if (firstImage && typeof firstImage === 'object') {
          const rawUrl = firstImage.thumbnailUrl || firstImage.mediaUrl || (firstImage.files && firstImage.files[0]?.thumbnailSignedUrl) || (firstImage.files && firstImage.files[0]?.signedUrl) || (firstImage.files && firstImage.files[0]?.fileUrl);
          if (rawUrl) {
            setDerivedCoverUrl(rawUrl.startsWith('http') ? rawUrl : resolveBackendUrl(rawUrl));
            return;
          }
        }

        // 2. If no photo/image, find first video memory (for video thumbnail)
        const firstVideo = memoriesList.find((m: any) => {
          if (!m) return false;
          const type = getInferredType(m);
          return type === 'video';
        });

        if (firstVideo && typeof firstVideo === 'object') {
          const rawUrl = firstVideo.thumbnailUrl || firstVideo.mediaUrl || (firstVideo.files && firstVideo.files[0]?.thumbnailSignedUrl) || (firstVideo.files && firstVideo.files[0]?.signedUrl) || (firstVideo.files && firstVideo.files[0]?.fileUrl);
          if (rawUrl) {
            setDerivedCoverUrl(rawUrl.startsWith('http') ? rawUrl : resolveBackendUrl(rawUrl));
            return;
          }
        }

        // 3. If no photo and no video, check if there is an audio memory (for audio cover icon)
        const hasAudio = memoriesList.some((m: any) => {
          if (!m) return false;
          const type = getInferredType(m);
          return type === 'audio';
        });

        if (hasAudio) {
          setDerivedCoverUrl('AUDIO_PLACEHOLDER');
          return;
        }

        // 4. If no photo, video, or audio, check if there is a document memory (for document cover icon)
        const hasDocument = memoriesList.some((m: any) => {
          if (!m) return false;
          const type = getInferredType(m);
          return type === 'document';
        });

        if (hasDocument) {
          setDerivedCoverUrl('DOCUMENT_PLACEHOLDER');
          return;
        }

        // Fallback
        setDerivedCoverUrl(null);
      };

      // Try fetching populated memories first
      fetchAlbumMemories(albumId)
        .then((memoriesList) => {
          if (!active) return;
          if (memoriesList && Array.isArray(memoriesList) && memoriesList.length > 0) {
            processMemoriesList(memoriesList);
          } else {
            // Fallback to fetchAlbum details
            fetchAlbum(albumId)
              .then((fullAlbum) => {
                if (!active) return;
                const fallbackList = (fullAlbum as any).memories || fullAlbum.memoryIds || [];
                processMemoriesList(fallbackList);
              })
              .catch(() => {
                setDerivedCoverUrl(null);
              });
          }
        })
        .catch(() => {
          if (!active) return;
          // Fallback to fetchAlbum details
          fetchAlbum(albumId)
            .then((fullAlbum) => {
              if (!active) return;
              const fallbackList = (fullAlbum as any).memories || fullAlbum.memoryIds || [];
              processMemoriesList(fallbackList);
            })
            .catch((err) => {
              console.error('Failed to fetch album cover memory:', err);
              setDerivedCoverUrl(null);
            });
        });
    });

    return () => {
      active = false;
    };
  }, [album.albumId, (album as any)._id, album.coverImageUrl, count]);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-[#E2E8F0]/50 dark:border-[#2a2a2a] bg-white dark:bg-[#1f1f1f] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
    >
      {/* Menu Trigger */}
      {onDelete && (
        <div className="absolute top-2 right-2 z-10" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-black/40 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5 text-[#3D2E1F] dark:text-white" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl border border-stone-100 dark:border-stone-800 py-1.5 overflow-hidden animate-in fade-in zoom-in duration-150">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(e);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Album
              </button>
            </div>
          )}
        </div>
      )}

      <div className="aspect-[3/2] bg-[#f5f2ed] dark:bg-[#1a1a1a] flex items-center justify-center overflow-hidden rounded-t-xl">
        {derivedCoverUrl === 'AUDIO_PLACEHOLDER' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D]">
              <Music className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-[#8B7355] dark:text-[#666] font-medium">Audio Album</span>
          </div>
        ) : derivedCoverUrl === 'DOCUMENT_PLACEHOLDER' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D]">
              <FileText className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-[#8B7355] dark:text-[#666] font-medium">Document Album</span>
          </div>
        ) : derivedCoverUrl ? (
          <img src={derivedCoverUrl} alt={album.name}
            loading="lazy" decoding="async"
            className="w-full h-full object-fill group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[#C4B5A5] dark:text-[#555]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-[#B8A090] dark:text-[#666] font-medium">{count} items</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <AppTooltip content={album.name}>
          <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate cursor-help">{album.name}</p>
        </AppTooltip>
        <p className="text-[10px] text-[#8B7355] dark:text-[#666] mt-0.5 flex items-center gap-1">
          <Image className="w-3 h-3" strokeWidth={1.5} />{count} items
        </p>
      </div>
    </div>
  );
}
