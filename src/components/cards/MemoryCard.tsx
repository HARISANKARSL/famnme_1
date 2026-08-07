import { Camera, Video, Music, FileText, BookOpen, Tag, Check, Play, MoreHorizontal, Archive, Trash2, Send, ArchiveRestore, RotateCcw, Share2, Calendar, User, LayoutGrid, Image as ImageIcon, Images, Landmark } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Memory } from '@/types';
import { resolveBackendUrl } from '@/config/api';

interface MemoryCardProps {
  memory: Memory;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onArchive?: (memoryId: string) => void;
  onUnarchive?: (memoryId: string) => void;
  onTrash?: (memoryId: string) => void;
  onPublish?: (memoryId: string) => void;
  onRestore?: (memoryId: string) => void;
  showActions?: boolean;
  variant?: 'default' | 'masonry';
  onImageLoad?: (memoryId: string, aspect: number) => void;
  useNaturalAspect?: boolean;
  objectFit?: 'cover' | 'contain';
  isSmallSet?: boolean;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch { return dateStr || ''; }
}

export function MemoryCard({
  memory, onClick, selectable, selected, onSelect,
  onArchive, onUnarchive, onTrash, onPublish, onRestore,
  showActions, variant = 'default', onImageLoad, useNaturalAspect, objectFit = 'cover', isSmallSet
}: MemoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [localAspect, setLocalAspect] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const files = memory.files || [];
  const firstFile = files.length > 0 ? files[0] : null;

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

  const getDetectedType = (): Memory['memoryType'] | 'document' => {
    if (memory.memoryType === 'audio' || memory.memoryType === 'video' || memory.memoryType === 'text' || (memory.memoryType as string) === 'document') {
      return memory.memoryType as any;
    }
    const file = firstFile;
    const url = file?.fileUrl || file?.signedUrl || memory.mediaUrl;
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
    if (memory.textdata || memory.textContent || memory.files?.[0]?.textContent) {
      return 'text';
    }
    return (memory.memoryType || 'photo') as Memory['memoryType'];
  };

  const inferredType = getDetectedType();

  const thumbnailUrl =
    firstFile?.thumbnailSignedUrl ||
    firstFile?.thumbnailUrl ||
    memory.thumbnailUrl ||
    (inferredType !== 'audio' && inferredType !== 'document' ? (firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl) : '') ||
    '';
  const hasThumbnail = !!thumbnailUrl && inferredType !== 'text' && inferredType !== 'audio' && inferredType !== 'document';

  const isDraft = ((memory.status || firstFile?.status) as string) === 'draft';
  const isArchived = memory.isArchived || firstFile?.isArchived || firstFile?.isArchive;
  const isTrashed = !!memory.deletedAt;
  const memId = firstFile?._id || memory._id || memory.memoryId || firstFile?.key;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (variant === 'masonry') {
    return (
      <div
        onClick={selectable && onSelect ? onSelect : onClick}
        className={`group cursor-pointer relative rounded-md bg-stone-100 dark:bg-[#1a1a1a] transition-all duration-300 ${selected ? 'ring-2 ring-inset ring-[#C2A46D]' : 'hover:shadow-lg'
          }`}
      >
        <div className="relative w-full h-full rounded-md overflow-hidden">
          {hasThumbnail && !imgError ? (
            <img
              src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
              alt={memory.title}
              className="w-full object-cover block transition-transform duration-500 group-hover:scale-[1.02] h-auto"
              loading="lazy"
              onError={() => setImgError(true)}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight && onImageLoad) {
                  onImageLoad(memory._id || memory.memoryId, naturalHeight / naturalWidth);
                }
                setImgLoaded(true);
              }}
            />
          ) : (
            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F6] to-[#F4F1EA] dark:from-[#1E1E1E] dark:to-[#121212] p-4 text-center">
              {inferredType === 'video' ? (
                <div className="flex flex-col items-center gap-1.5 text-[#C2A46D]">
                  <Video className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Video</span>
                </div>
              ) : inferredType === 'audio' ? (
                <div className="flex flex-col items-center gap-1.5 text-[#C2A46D] animate-pulse">
                  <Music className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Audio</span>
                </div>
              ) : inferredType === 'text' ? (
                <div className="flex flex-col items-center gap-1.5 text-[#C2A46D]">
                  <BookOpen className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Story</span>
                </div>
              ) : inferredType === 'document' ? (
                <div className="flex flex-col items-center gap-1.5 text-[#C2A46D]">
                  <FileText className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-[#C4B5A5] dark:text-[#555]">
                  <Camera className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Photo</span>
                </div>
              )}
            </div>
          )}

          {/* Draft badge - ALWAYS VISIBLE */}
          {isDraft && (
            <div className={`absolute top-3 ${selectable ? 'left-11' : 'left-3'} px-2 py-0.5 rounded-full bg-orange-500 shadow-lg z-20 flex items-center gap-1 border border-white/20`}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] text-white font-bold uppercase tracking-wider">Draft</span>
            </div>
          )}

          {/* Hover overlay gradient */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 transition-opacity duration-300 ${menuOpen || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`} />
        </div>

        {/* Actions & Info Overlaid */}
        <div className={`absolute inset-0 flex flex-col justify-between p-3 pointer-events-none transition-opacity duration-300 ${menuOpen || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
          {/* Top Actions & Selection */}
          <div className="flex items-start justify-between pointer-events-auto">
            {selectable ? (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selected ? 'bg-[#C2A46D] border-[#C2A46D]' : 'bg-white/80 border-white/60 backdrop-blur-sm'
                }`}>
                {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
            ) : <div />}

            {showActions && !selectable && (
              <div ref={menuRef} onClick={(e) => e.stopPropagation()} className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="flex items-center justify-center w-8 h-8 transition-transform border rounded-full shadow-sm bg-white/90 dark:bg-black/60 backdrop-blur-md hover:scale-105 border-white/20"
                >
                  <MoreHorizontal className="w-4 h-4 text-[#3D2E1F] dark:text-[#f5f5f5]" strokeWidth={2} />
                </button>
                {menuOpen && (
                  <div className="absolute top-10 right-0 w-44 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#E2DBCE]/40 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200">
                    {isDraft && onPublish && (
                      <button onClick={() => { onPublish(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><Send className="w-3.5 h-3.5 text-[#C2A46D]" /> Publish</button>
                    )}
                    {isTrashed && onRestore && (
                      <button onClick={() => { onRestore(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><RotateCcw className="w-3.5 h-3.5 text-blue-500" /> Restore</button>
                    )}
                    {!isTrashed && !isArchived && onArchive && (
                      <button onClick={() => { onArchive(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><Archive className="w-3.5 h-3.5 text-[#C2A46D]" /> Archive</button>
                    )}
                    {isArchived && onUnarchive && (
                      <button onClick={() => { onUnarchive(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><ArchiveRestore className="w-3.5 h-3.5 text-[#C2A46D]" /> Unarchive</button>
                    )}
                    {!isTrashed && onTrash && (
                      <button onClick={() => { onTrash(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Info */}
          <div className="pointer-events-auto transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
            <h3 className="text-white text-[13px] font-bold line-clamp-2 drop-shadow-md">
              {memory.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 opacity-90">
              {files.length > 0 && (
                <div className="flex items-center gap-1 text-white text-[10px] font-medium">
                  <Images className="w-3 h-3" /> {files.length}
                </div>
              )}
              {inferredType === 'video' && (
                <div className="flex items-center gap-1 text-white text-[10px] font-medium">
                  <Video className="w-3 h-3" /> Video
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Persistent play icon for video */}
        {inferredType === 'video' && hasThumbnail && imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <div className="flex items-center justify-center w-10 h-10 border rounded-full shadow-lg bg-white/20 backdrop-blur-sm border-white/30 group-hover:bg-[#C2A46D]/40 group-hover:border-[#C2A46D]/40 transition-all duration-300">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={selectable && onSelect ? onSelect : onClick}
      className={`group cursor-pointer rounded-2xl bg-white dark:bg-[#121212] flex flex-col h-full border border-[#E2DBCE]/40 dark:border-white/[0.08] transition-all duration-500 hover:translate-y-[-4px] ${selected
        ? 'ring-2 ring-[#C2A46D] shadow-[0_20px_40px_rgba(194,164,109,0.15)] bg-[#FAF9F6] dark:bg-[#1A1A1A]'
        : 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]'
        }`}
    >
      {/* Visual Area */}
      <div className="relative w-full p-3 shrink-0">
        <div
          className={`w-full rounded-xl overflow-hidden bg-[#F4F6FA] dark:bg-[#1a1a1a] relative ring-1 ring-black/[0.03] dark:ring-white/[0.05] ${useNaturalAspect && localAspect ? '' : 'aspect-[4/3]'
            }`}
          style={useNaturalAspect && localAspect ? { aspectRatio: 1 / localAspect } : undefined}
        >
          {hasThumbnail && !imgError ? (
            <img
              src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)}
              alt={memory.title}
              className={`w-full transition-all duration-700 ${objectFit === 'contain'
                ? 'object-contain group-hover:scale-105'
                : 'object-cover group-hover:scale-110 group-hover:rotate-1'
                } ${useNaturalAspect ? 'h-auto' : 'h-full'
                }`}
              loading="lazy"
              onError={() => setImgError(true)}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight) {
                  const calculatedAspect = naturalHeight / naturalWidth;
                  setLocalAspect(calculatedAspect);
                  if (onImageLoad) {
                    onImageLoad(memory._id || memory.memoryId, calculatedAspect);
                  }
                }
                setImgLoaded(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF9F6] to-[#F4F1EA] dark:from-[#1E1E1E] dark:to-[#121212] p-6 text-center">
              {inferredType === 'video' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D]">
                    <Video className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-[#8B7355] dark:text-[#999] font-semibold">Video Memory</span>
                </div>
              ) : inferredType === 'audio' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D] animate-pulse">
                    <Music className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-[#8B7355] dark:text-[#999] font-semibold">Audio Recording</span>
                </div>
              ) : inferredType === 'text' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D]">
                    <BookOpen className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="text-[10px] text-[#8B7355] dark:text-[#666] line-clamp-3 font-serif italic max-w-[120px] break-words break-all">
                    {memory.textContent || memory.files?.[0]?.textContent || (typeof memory.textdata === 'string' && memory.textdata) || memory.description || 'View Story...'}
                  </p>
                </div>
              ) : inferredType === 'document' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D]">
                    <FileText className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-[#8B7355] dark:text-[#999] font-semibold">Document File</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-[#C4B5A5] dark:text-[#555]">
                    <Camera className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-[#8B7355] dark:text-[#999] font-semibold">Photo Memory</span>
                </div>
              )}
            </div>
          )}

          {/* Overlays / Badges */}
          <div className="absolute inset-0 transition-opacity duration-500 opacity-0 bg-gradient-to-t from-black/40 via-transparent to-transparent group-hover:opacity-100" />

          {/* Top Left Status Badge (Draft) */}
          {isDraft && (
            <div className={`absolute top-3 ${selectable ? 'left-11' : 'left-3'} px-2 py-0.5 rounded-full bg-orange-500 shadow-lg z-20 flex items-center gap-1 border border-white/20`}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] text-white font-bold uppercase tracking-wider">Draft</span>
            </div>
          )}

          {/* Bottom Indicators (Glass-morphism style) */}
          <div className="absolute z-10 flex items-center justify-between bottom-3 left-3 right-3">
            {files.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white font-medium shadow-sm">
                <Images className="w-3 h-3 text-white/80" />
                <span className="text-[9px] uppercase tracking-wider">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/[0.05] dark:border-white/10 text-[#3D2E1F] dark:text-white font-bold shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C2A46D]" />
              <span className="text-[9px] uppercase tracking-wider">{inferredType}</span>
            </div>
          </div>

          {/* Video Play Overlay */}
          {inferredType === 'video' && hasThumbnail && imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 pointer-events-none group-hover:scale-110">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl group-hover:bg-[#C2A46D]/40 group-hover:border-[#C2A46D]/40 transition-all duration-300">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Action Button (Top Right) MOVED OUTSIDE OVERFLOW-HIDDEN */}
        {showActions && !selectable && (
          <div ref={menuRef} className="absolute top-5 right-5 z-20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="flex items-center justify-center w-8 h-8 transition-all duration-200 border rounded-full shadow-lg bg-white/90 dark:bg-black/60 backdrop-blur-md hover:bg-white dark:hover:bg-black border-white/20"
            >
              <MoreHorizontal className="w-4 h-4 text-[#3D2E1F] dark:text-[#f5f5f5]" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div className="absolute top-10 right-0 w-44 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#E2DBCE]/40 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200">
                {isDraft && onPublish && (
                  <button onClick={() => { onPublish(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><Send className="w-3.5 h-3.5 text-[#C2A46D]" /> Publish</button>
                )}
                {isTrashed && onRestore && (
                  <button onClick={() => { onRestore(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><RotateCcw className="w-3.5 h-3.5 text-blue-500" /> Restore</button>
                )}
                {!isTrashed && !isArchived && onArchive && (
                  <button onClick={() => { onArchive(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><Archive className="w-3.5 h-3.5 text-[#C2A46D]" /> Archive</button>
                )}
                {isArchived && onUnarchive && (
                  <button onClick={() => { onUnarchive(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#F4F6FA] dark:hover:bg-white/5 transition-colors"><ArchiveRestore className="w-3.5 h-3.5 text-[#C2A46D]" /> Unarchive</button>
                )}
                {/* {!isTrashed && onTrash && (
                  <button onClick={() => { onTrash(memId); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Move to Trash</button>
                )} */}
              </div>
            )}
          </div>
        )}

        {/* Selection indicator MOVED OUTSIDE OVERFLOW-HIDDEN */}
        {selectable && (
          <div className={`absolute top-5 left-5 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all duration-300 ${selected ? 'bg-[#C2A46D] border-[#C2A46D]' : 'bg-white/80 border-white/60 backdrop-blur-sm'
            }`}>
            {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 min-h-0 px-5 pt-1 pb-5">
        <h3 className="text-[14px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] mb-3 line-clamp-1 group-hover:text-[#C2A46D] transition-colors duration-300">
          {memory.title}
        </h3>

        <div className="flex items-center gap-3 mt-auto">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F6FA] dark:bg-white/5 border border-black/[0.02] dark:border-white/[0.02]">
            <Landmark className="w-3 h-3 text-[#C2A46D]" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-[#8B7355] dark:text-[#999] uppercase tracking-[0.05em]">
              {memory.category || 'Event'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F6FA] dark:bg-white/5 border border-black/[0.02] dark:border-white/[0.02]">
            <Calendar className="w-3 h-3 text-[#C2A46D]" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-[#8B7355] dark:text-[#999] uppercase tracking-[0.05em]">
              {formatDate(memory.dateTaken || memory.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
