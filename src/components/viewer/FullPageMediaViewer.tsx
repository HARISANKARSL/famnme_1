/**
 * FullPageMediaViewer - Phase 4
 *
 * Full-viewport media viewer with sidebar tabs:
 * Details, Comments, Edit, Actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Info, Pencil, MoreHorizontal, Download, Share2, Trash2, Image as ImageIcon, Video, Music, FileText, FileSpreadsheet, File, ExternalLink } from 'lucide-react';
import { ViewerDetailsTab } from './ViewerDetailsTab';
import { ViewerCommentsTab } from './ViewerCommentsTab';
import { ViewerEditTab } from './ViewerEditTab';
import { ViewerActionsTab } from './ViewerActionsTab';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useResponsive } from '@/hooks/useResponsive';
import { toggleMemoryLike, fetchMemoryLikeStatus, deleteMemory, fetchMemoryById, removeMemoriesFromAlbum } from '@/services/memoriesApiService';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ShareModal } from '@/components/modals/ShareModal';
import type { Memory } from '@/types';
import { resolveBackendUrl } from '@/config/api';

const PdfViewer = ({ url, title }: { url: string; title: string }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (!active) return;
        const localUrl = URL.createObjectURL(blob);
        setBlobUrl(localUrl);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load PDF blob:', err);
        if (active) {
          setError(err.message || 'Failed to load PDF');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#111] rounded-2xl">
        <div className="w-8 h-8 border-2 border-[#C2A46D]/30 border-t-[#C2A46D] rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#8B7355]">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#111] rounded-2xl text-white">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-3 border border-red-500/20">
          <X className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm mb-1">Failed to Open PDF</h4>
        <p className="text-[11px] text-white/50 mb-4 max-w-xs">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open PDF Directly
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl || ''}
      className="w-full h-full rounded-2xl border-0 bg-stone-900"
      title={title}
    />
  );
};

interface FullPageMediaViewerProps {
  memories: Memory[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onUpdate: (albumId?: string, albumName?: string) => void;
  onDelete: (memoryId?: string) => void;
  treeId: string;
  currentUserId: string;
  currentUserName: string;
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>;
  albumId?: string | null;
  readOnly?: boolean;
}

type SidebarTab = 'details' | 'comments' | 'edit' | 'actions';

export function FullPageMediaViewer({
  memories,
  currentIndex,
  onNavigate,
  onClose,
  onUpdate,
  onDelete,
  treeId,
  currentUserId,
  currentUserName,
  persons,
  albumId,
  readOnly = false,
}: FullPageMediaViewerProps) {
  const { isMobile } = useResponsive();
  const { toast } = useToast();
  const memory = memories[currentIndex];
  const [activeTab, setActiveTab] = useState<SidebarTab>('details');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [fullDetail, setFullDetail] = useState<Memory | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  // const memory = (currentIndex >= 0 && currentIndex < memories.length) ? memories[currentIndex] : null;

  // IF memory is null, we must return null early to avoid crashing on property access
  if (!memory) return null;

  // Use fetched detail if available, else fallback to prop memory
  const currentMem = fullDetail || memory;
  const files = currentMem.files || [];
  const currentFile = files.length > 0 ? files[currentFileIndex] : null;
  const currentMediaUrl = currentFile?.signedUrl || currentFile?.fileUrl || currentMem.mediaUrl;

  const isDocumentFile = (url?: string | null): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    const docExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.csv', '.txt', '.rtf', '.odt', '.ods', '.odp'
    ];
    return docExtensions.some(ext => cleanUrl.endsWith(ext));
  };

  const getFileMediaType = (file: any, mem: any): 'photo' | 'video' | 'audio' | 'text' | 'document' => {
    if (file?.fileType?.startsWith('video/')) return 'video';
    if (file?.fileType?.startsWith('audio/')) return 'audio';

    const mime = file?.fileType || mem?.fileType || '';
    const url = file?.signedUrl || file?.fileUrl || mem.mediaUrl;
    if (
      mime.startsWith('application/pdf') ||
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('presentation') ||
      mime.includes('powerpoint') ||
      mime.startsWith('text/') ||
      isDocumentFile(url) ||
      file?.fileType === 'application/pdf' ||
      mem?.fileType === 'application/pdf' ||
      file?.contentType === 'application/pdf' ||
      mem?.contentType === 'application/pdf'
    ) {
      return 'document';
    }

    if (mem.memoryType === 'text' || mem.textContent || mem.textdata || !!file?.textContent) return 'text';
    return 'photo';
  };

  const currentMediaType = getFileMediaType(currentFile, currentMem);

  const hasPrevMem = currentIndex > 0;
  const hasNextMem = currentIndex < memories.length - 1;
  const hasPrevFile = currentFileIndex > 0;
  const hasNextFile = currentFileIndex < files.length - 1;

  // Load like status
  useEffect(() => {
    if (!memory) return;
    const mid = memory.memoryId || (memory as any)._id;
    if (!mid) return;
    fetchMemoryLikeStatus(mid)
      .then(s => { setLikeCount(s.likeCount); setIsLiked(s.isLikedByMe); })
      .catch(() => { });
  }, [memory]);

  // Reset indices on navigate (or when memory changes via siblings)
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCurrentFileIndex(0);
    setFullDetail(null); // Clear previous detail
  }, [currentIndex, memory?.memoryId]);

  const loadFullDetail = useCallback(async () => {
    const mid = memory.memoryId || (memory as any)?._id;
    if (!mid) return;

    setLoadingDetail(true);
    try {
      const memFiles = memory.files || [];
      const fileAtIdx = memFiles[currentFileIndex] || memFiles[0];
      const filesId = fileAtIdx?._id || fileAtIdx?.fileId;

      const full = await fetchMemoryById(mid, filesId);
      setFullDetail(full);
    } catch (err) {
      console.error('Failed to fetch full memory detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [memory, currentFileIndex]);

  // Fetch Full Detailed Data when memory changes
  useEffect(() => {
    loadFullDetail();
  }, [loadFullDetail]);

  const handleRefresh = (updatedMemoryOrAlbumId?: any, albumName?: string) => {
    if (updatedMemoryOrAlbumId && typeof updatedMemoryOrAlbumId === 'object') {
      setFullDetail(updatedMemoryOrAlbumId);
      onUpdate?.();
    } else {
      loadFullDetail();
      onUpdate?.(updatedMemoryOrAlbumId, albumName);
    }
  };

  // Reset zoom/pan when switching files within the SAME memory
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentFileIndex]);

  // Programmatically handle video autoplay when media url or type changes
  useEffect(() => {
    if (currentMediaType === 'video' && videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Autoplay prevented:", error);
        });
      }
    }
  }, [currentMediaUrl, currentMediaType]);

  // Keyboard nav
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') {
      if (hasPrevFile) setCurrentFileIndex(prev => prev - 1);
      else if (hasPrevMem) onNavigate(currentIndex - 1);
    }
    if (e.key === 'ArrowRight') {
      if (hasNextFile) setCurrentFileIndex(prev => prev + 1);
      else if (hasNextMem) onNavigate(currentIndex + 1);
    }
  }, [hasPrevMem, hasNextMem, hasPrevFile, hasNextFile, currentIndex, onNavigate, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleLike = async () => {
    const isText = currentMediaType === 'text' || currentMem.memoryType === 'text' || memory.memoryType === 'text';
    const mid = isText
      ? ((currentMem as any)._id || currentMem.memoryId || (memory as any)._id || memory.memoryId)
      : (currentFile?._id || currentFile?.fileId || files[0]?._id || files[0]?.fileId || currentMem.memoryId || (currentMem as any)._id || memory.memoryId || (memory as any)._id);
    if (!mid) return;
    try {
      const result = await toggleMemoryLike(mid, currentUserName);
      setLikeCount(result.likeCount);
      setIsLiked(result.liked);
      onUpdate?.(); // Notify parent to refresh in list
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleDelete = async () => {
    try {
      const isText = currentMediaType === 'text' || currentMem.memoryType === 'text' || memory.memoryType === 'text';
      const id = isText
        ? ((currentMem as any)._id || currentMem.memoryId || (memory as any)._id || memory.memoryId)
        : (currentFile?._id || currentFile?.fileId || files[0]?._id || files[0]?.fileId || currentMem.memoryId || (currentMem as any)._id || memory.memoryId || (memory as any)._id);
      if (!id) return;
      setIsDeleting(true);
      if (albumId) {
        await removeMemoriesFromAlbum(albumId, [id]);
        toast({
          title: 'Memory Removed!',
          description: 'The memory has been removed from this album.'
        });
      } else {
        await deleteMemory(id);
        toast({
          title: isText ? 'Text Memory Deleted Successfully!' : 'Memory Deleted Successfully!',
          description: 'It will be deleted permanently.'
        });
      }
      onDelete(id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    let url = currentMediaUrl || window.location.href;
    setShareUrl(url);
    setShowShareModal(true);

    // Shorten if > 400 characters to prevent QR code failure or native app crash
    if (url.length > 400) {
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const shortUrl = await res.text();
          setShareUrl(shortUrl);
        }
      } catch (err) {
        console.warn('URL shorten failed:', err);
      }
    }
  };

  const handleDownload = async () => {
    if (!currentMediaUrl) return;
    const baseName = `${memory.title || 'memory'}-${currentFileIndex + 1}`;
    try {
      const res = await fetch(currentMediaUrl);
      const blob = await res.blob();

      const contentType = res.headers.get('content-type') || '';
      let extension = '';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
      else if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('mp4')) extension = '.mp4';
      else if (contentType.includes('quicktime') || contentType.includes('mov')) extension = '.mov';
      else if (contentType.includes('mpeg') || contentType.includes('mp3')) extension = '.mp3';
      else if (contentType.includes('wav')) extension = '.wav';

      if (!extension) {
        try {
          const pathname = new URL(currentMediaUrl).pathname;
          const lastDot = pathname.lastIndexOf('.');
          if (lastDot !== -1) {
            extension = pathname.slice(lastDot);
          }
        } catch { }
      }

      const filename = baseName.toLowerCase().endsWith(extension.toLowerCase()) ? baseName : `${baseName}${extension}`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Direct download failed, falling back to open in tab', err);
      const a = document.createElement('a');
      a.href = currentMediaUrl;
      a.target = '_blank';
      a.click();
    }
  };

  // Zoom via scroll wheel (Refined)
  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if it's a photo or we are actually zooming
    if (currentMediaType !== 'photo' && currentMediaType !== undefined) return;

    setZoom(prev => {
      const next = prev - e.deltaY * 0.0015;
      return Math.max(0.8, Math.min(6, next));
    });
  };

  // Pan via drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan(prev => ({
      x: prev.x + e.clientX - lastMouse.current.x,
      y: prev.y + e.clientY - lastMouse.current.y,
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => setDragging(false);

  const tabs: { id: SidebarTab; icon: typeof Icon; label: string }[] = [
    { id: 'details', icon: Info, label: 'Details' },
    // { id: 'comments', icon: MessageCircle, label: 'Comments' },
    ...(!readOnly ? [
      { id: 'edit' as SidebarTab, icon: Pencil, label: 'Edit' },
      { id: 'actions' as SidebarTab, icon: MoreHorizontal, label: 'Actions' }
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-10">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full h-full max-w--7xl bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

        {/* Left: Media Pane */}
        <div className="flex-1 relative flex flex-col bg-black overflow-hidden group">
          {/* Header Overlay (Matching Screenshot Design) */}
          <div className="absolute top-0 left-0 right-0 z-50 p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-4 pointer-events-auto">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 backdrop-blur-md border border-white/10 shadow-lg">
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-white tracking-tight drop-shadow-md">{currentMem.title || "Untitled Memory"}</h2>
                <div className="flex items-center gap-2 text-[11px] text-white/70 font-semibold uppercase tracking-wider">
                  {currentMediaType === 'text' ? (
                    <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Text Story</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> {files.length || 1} {files.length > 1 ? 'files' : 'file'}</span>
                  )}
                  <span className="opacity-40">•</span>
                  <span className="text-[#C2A46D]">Viewing {files.length > 0 ? (currentFileIndex + 1) : 1} of {files.length || 1}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pointer-events-auto">
              <button onClick={handleDownload} title="Download" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/5 shadow-md">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleShare} title="Share" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/5 shadow-md">
                <Share2 className="w-4 h-4" />
              </button>
              {!readOnly && (
                <>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button onClick={() => setShowDeleteConfirm(true)} title="Delete" className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/30 text-white hover:text-red-200 transition-all backdrop-blur-md border border-red-500/20 shadow-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Media Content Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden select-none touch-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Global Memory Nav (Floating Edges) */}
            {hasPrevMem && (
              <button onClick={() => onNavigate(currentIndex - 1)} className="absolute left-6 z-40 p-3.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {hasNextMem && (
              <button onClick={() => onNavigate(currentIndex + 1)} className="absolute right-6 z-40 p-3.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Content with Zoom/Pan */}
            <div style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: zoom > 1 ? 'grab' : 'default' }}
              className="transition-transform duration-75 max-w-full max-h-full flex items-center justify-center">

              {(currentMediaType === 'photo' || !currentMediaType) && currentMediaUrl && (
                <img src={currentMediaUrl} alt={memory.title} className="max-w-full max-h-[80vh] md:max-h-[90vh] object-contain rounded-lg transition-opacity duration-300" draggable={false}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800?text=Image+Unavailable'; }}
                />
              )}
              {currentMediaType === 'video' && currentMediaUrl && (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  style={{ objectFit: 'contain' }}
                  className="max-w-full max-h-[85vh] rounded-lg shadow-3xl object-contain"
                  src={currentMediaUrl}
                  poster={(() => {
                    const postUrl = currentFile?.thumbnailSignedUrl || currentFile?.thumbnailUrl || currentMem.thumbnailUrl || '';
                    if (!postUrl) return undefined;
                    return postUrl.startsWith('http') ? postUrl : resolveBackendUrl(postUrl);
                  })()}
                  preload="metadata"
                />
              )}
              {currentMediaType === 'audio' && currentMediaUrl && (
                <div className="bg-[#1a1a1a]/80 backdrop-blur-xl rounded-[2.5rem] p-16 text-center border border-white/5 shadow-[0_30px_70px_rgba(0,0,0,0.4)]">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C2A46D] via-[#A8894F] to-[#8B7355] flex items-center justify-center mx-auto mb-8 shadow-2xl relative">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-ping opacity-30" />
                    <Music className="w-10 h-10 text-white drop-shadow-xl" />
                  </div>
                  <audio controls className="w-80 h-11 invert brightness-200 opacity-90 hover:opacity-100 transition-opacity" src={currentMediaUrl} />
                </div>
              )}
              {currentMediaType === 'text' && (
                <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-12 max-w-2xl w-full max-h-[75vh] overflow-y-auto shadow-2xl border border-stone-100 dark:border-white/5 mx-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[#C2A46D]/10 flex items-center justify-center text-[#C2A46D] shadow-inner"><FileText className="w-6 h-6" /></div>
                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white tracking-tight">{currentMem.title}</h3>
                  </div>
                  <div className="prose dark:prose-invert prose-stone max-w-none whitespace-pre-wrap break-words break-all leading-relaxed text-gray-700 dark:text-gray-300 text-[15px]">
                    {currentMem.textContent || currentMem.files?.[0]?.textContent || (typeof currentMem.textdata === 'string' && currentMem.textdata) || (currentMem as any).description}
                  </div>
                </div>
              )}
              {currentMediaType === 'document' && currentMediaUrl && (
                (() => {
                  const isPdf =
                    currentMediaUrl.toLowerCase().split('?')[0].endsWith('.pdf') ||
                    currentFile?.fileType === 'application/pdf' ||
                    (currentFile as any)?.contentType === 'application/pdf' ||
                    (currentMem as any)?.fileType === 'application/pdf' ||
                    (currentMem as any)?.contentType === 'application/pdf' ||
                    currentMem.files?.some((f: any) => f.fileType === 'application/pdf');
                  const isExcel = currentMediaUrl.toLowerCase().split('?')[0].endsWith('.xls') || currentMediaUrl.toLowerCase().split('?')[0].endsWith('.xlsx') || currentFile?.fileType?.includes('excel') || currentFile?.fileType?.includes('spreadsheet');
                  const fileName = currentFile?.fileName || currentFile?.fileOriginalName || currentMem.title || 'Document File';

                  if (isPdf) {
                    return (
                      <div className="w-[90vw] max-w-4xl h-[75vh] md:h-[80vh] bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col p-2">
                        <PdfViewer url={currentMediaUrl} title={fileName} />
                      </div>
                    );
                  }

                  return (
                    <div className="bg-[#111]/85 backdrop-blur-xl rounded-[2.5rem] p-12 text-center border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] max-w-md w-full mx-4">
                      <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-[#C2A46D] via-[#A8894F] to-[#8B7355] flex items-center justify-center mx-auto mb-6 shadow-xl text-white">
                        {isExcel ? (
                          <FileSpreadsheet className="w-10 h-10" />
                        ) : (
                          <FileText className="w-10 h-10" />
                        )}
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2 truncate max-w-full px-4" title={fileName}>
                        {fileName}
                      </h3>
                      <p className="text-xs text-[#8B7355] dark:text-[#999] mb-8 uppercase tracking-widest font-semibold">
                        {isExcel ? 'Excel Spreadsheet' : 'Word Document'}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <button
                          onClick={handleDownload}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C2A46D] to-[#A8894F] hover:from-[#A8894F] hover:to-[#8B7355] text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
                        >
                          <Download className="w-4 h-4" />
                          Download File
                        </button>
                        {/* <a
                          href={currentMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 border border-white/10 backdrop-blur-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open File
                        </a> */}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Internal File Switcher (Bottom Center) - Removed as per request */}
            {/* {files.length > 1 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/5 shadow-xl">
                <button onClick={() => setCurrentFileIndex(p => Math.max(0, p - 1))} disabled={!hasPrevFile} className="p-1 px-1.5 text-white disabled:opacity-20 hover:text-[#C2A46D] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex gap-2.5">
                  {files.map((_, i) => (
                    <button key={i} onClick={() => setCurrentFileIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-sm ${currentFileIndex === i ? 'bg-[#C2A46D] w-6' : 'bg-white/20 hover:bg-white/40'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrentFileIndex(p => Math.min(files.length - 1, p + 1))} disabled={!hasNextFile} className="p-1 px-1.5 text-white disabled:opacity-20 hover:text-[#C2A46D] transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            )} */}
          </div>

          {/* Reaction Overlay */}
          {/* <div className="absolute bottom-8 left-8 flex items-center gap-3">
            <button onClick={handleLike} className={`group flex items-center gap-2.5 px-6 py-3 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-xl ${isLiked ? 'bg-red-500 text-white border-red-400' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}>
              <Heart className={`w-4 h-4 transition-transform group-hover:scale-125 ${isLiked ? 'fill-white' : ''}`} />
              <span className="text-[13px] font-bold tracking-tight">{likeCount || 0}</span>
            </button>
          </div> */}
        </div>

        {/* Right: Management Sidebar (White Section) */}
        <div className="w-full md:w-[400px] bg-white dark:bg-[#1a1a1a] flex flex-col border-l border-stone-100 dark:border-white/5 h-1/2 md:h-full">
          {/* Tabs Navigation */}
          <div className="flex border-b border-stone-50 dark:border-white/5 px-2 bg-stone-50/50 dark:bg-black/10">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center gap-2 py-4 text-[11px] font-bold tracking-widest uppercase transition-all duration-200 relative ${activeTab === id ? 'text-[#C2A46D]' : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300'
                  }`}>
                <Icon className={`w-4 h-4 ${activeTab === id ? 'animate-in zoom-in-75' : ''}`} />
                {label}
                {activeTab === id && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#C2A46D] rounded-full" />}
              </button>
            ))}
          </div>

          {/* Scrolling Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-[#1a1a1a]">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <div className="w-6 h-6 border-2 border-[#C2A46D]/30 border-t-[#C2A46D] rounded-full animate-spin" />
                <span className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-widest">Fetching Details...</span>
              </div>
            ) : (
              <>
                {activeTab === 'details' && currentMem && <ViewerDetailsTab memory={currentMem} treeId={treeId} onUpdate={handleRefresh} onNavigateToMemory={(id) => { const idx = memories.findIndex(m => (m.memoryId || (m as any)._id) === id); if (idx >= 0) onNavigate(idx); }} currentMediaType={currentMediaType} persons={persons} readOnly={readOnly} />}
                {activeTab === 'comments' && currentMem && <ViewerCommentsTab memory={currentMem} currentUserId={currentUserId} currentUserName={currentUserName} />}
                {activeTab === 'edit' && currentMem && <ViewerEditTab memory={currentMem} persons={persons} onUpdated={handleRefresh} />}
                {activeTab === 'actions' && currentMem && (
                  <ViewerActionsTab
                    memory={currentMem}
                    treeId={treeId}
                    currentUserName={currentUserName}
                    onDelete={() => {
                      const mid = currentMem.memoryId || (currentMem as any)._id;
                      if (mid) onDelete(mid);
                    }}
                    onUpdate={(albumId, albumName) => handleRefresh(albumId, albumName)}
                    albumId={albumId}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Confirm Deletion */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={albumId ? "Remove from Album" : "Delete Memory"}
        description={albumId ? "Are you sure you want to remove this item from the album?" : "Are you sure you want to remove this memory permanently?"}
        confirmText={albumId ? "Remove" : "Remove"}
        cancelText={albumId ? "Cancel" : "Keep Memory"}
        variant="danger"
        loading={isDeleting}
      />
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={currentMem.title || "Memory"}
        url={shareUrl}
      />
    </div>
  );
}
