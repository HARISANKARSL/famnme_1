import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Upload, Image as ImageIcon, FileText, Loader2, X, Play, Music, BookOpen } from 'lucide-react';
import type { Memory } from '@/types';
import { fetchPersonMemories, getBulkPresignedUrls, uploadToS3, generateVideoThumbnail, compressImage, confirmMemories, fetchMemoryById } from '@/services/memoriesApiService';
import { MemoryDetailModal } from '@/components/modals/MemoryDetailModal';
import { FamilyUploadLoader } from '@/components/ui/FamilyUploadLoader';
import { useResponsive } from '@/hooks/useResponsive';

/** Unified media item — can originate from attachments or memory media */
type MediaItem = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption: string | null;
  source: 'attachment' | 'memory';
  type: 'photo' | 'video' | 'audio' | 'document' | 'text';
  memoryIndex?: number;     // only for memory-sourced items (for detail modal)
  memoryId?: string;
  textContent?: string;
};

interface GalleryTabProps {
  personId: string;
  treeId: string;
  personName: string;
  profilePhotoUrl?: string | null;
  onCreateMemory?: () => void;
}

type GallerySubTab = 'photos' | 'documents' | 'memories';

export function GalleryTab({ personId, treeId, personName: _personName, profilePhotoUrl, onCreateMemory }: GalleryTabProps) {
  const [subTab, setSubTab] = useState<GallerySubTab>('photos');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [totalMemories, setTotalMemories] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchPersonMemories(treeId, personId, {
        page: 1,
        limit: 10,
        filter: { taggedPeople: [personId], status: 'publish' }
      }).catch(() => ({ memories: [], pagination: null }));
      const fetched = (response.memories || []).filter((m: any) => (m.status || m.files?.[0]?.status) !== 'draft');
      const pag = response.pagination;
      setMemories(fetched);
      setTotalMemories(pag?.total ?? fetched.length);
      const tp = pag?.totalPages ?? (fetched.length < 10 ? 1 : 2);
      setTotalPages(tp);
      setHasMore(1 < tp);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [personId, treeId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await fetchPersonMemories(treeId, personId, {
        page: next,
        limit: 10,
        filter: { taggedPeople: [personId], status: 'publish' }
      }).catch(() => ({ memories: [], pagination: null }));
      const newMemories = (response.memories || []).filter((m: any) => (m.status || m.files?.[0]?.status) !== 'draft');
      const pag = response.pagination;

      if (newMemories.length > 0) {
        setMemories(prev => {
          const existingIds = new Set(prev.map((m: any) => m.memoryId || m._id));
          const filtered = newMemories.filter((m: any) => !existingIds.has(m.memoryId || m._id));
          return [...prev, ...filtered];
        });
        setPage(next);
      }

      if (pag) {
        setTotalMemories(pag.total ?? totalMemories);
        setTotalPages(pag.totalPages ?? totalPages);
        setHasMore(next < (pag.totalPages ?? totalPages));
      } else {
        // Fallback: no more data if we got fewer than limit
        setHasMore(newMemories.length >= 10);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, personId, treeId, totalMemories, totalPages]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  // Merge memory media into a single unified list
  const { allMedia, documents } = useMemo(() => {
    const media: MediaItem[] = [];
    const docs: MediaItem[] = [];

    // Memory photos/videos/audio/docs/text
    memories.forEach((m: any, idx) => {
      const mediaFiles = (m.files || []).filter((file: any) => {
        const isImage = file.fileType?.startsWith('image/');
        const isVideo = file.fileType?.startsWith('video/');
        const isAudio = file.fileType?.startsWith('audio/');
        return isImage || isVideo || isAudio;
      });
      const hasMedia = mediaFiles.length > 0 || !!m.mediaUrl;

      if (!hasMedia) {
        const textContent = m.textContent || m.files?.[0]?.textContent || m.description || '';
        media.push({
          id: `mem-${m.memoryId || m._id}-text`,
          url: '',
          caption: m.title || null,
          source: 'memory',
          memoryIndex: idx,
          memoryId: m.memoryId || m._id,
          type: 'text',
          textContent: textContent
        });
      } else if (m.files && m.files.length > 0) {
        m.files.forEach((file: any, fIdx: number) => {
          const isImage = file.fileType?.startsWith('image/');
          const isVideo = file.fileType?.startsWith('video/');
          const isAudio = file.fileType?.startsWith('audio/');

          const type = isImage ? 'photo' : isVideo ? 'video' : isAudio ? 'audio' : 'document';

          const item: MediaItem = {
            id: `mem-${m.memoryId || m._id}-${fIdx}`,
            url: file.signedUrl || file.fileUrl,
            thumbnailUrl: file.thumbnailSignedUrl || file.thumbnailUrl,
            caption: m.title || null,
            source: 'memory',
            memoryIndex: idx,
            memoryId: m.memoryId || m._id,
            type
          };

          if (type === 'document') {
            docs.push(item);
          } else {
            media.push(item);
          }
        });
      } else if (m.mediaUrl) {
        // legacy fallback
        const isVideo = m.memoryType === 'video';
        const isAudio = m.memoryType === 'audio';
        const type = isVideo ? 'video' : isAudio ? 'audio' : 'photo';

        media.push({
          id: `mem-${m.memoryId || m._id}`,
          url: m.mediaUrl,
          caption: m.title || null,
          source: 'memory',
          memoryIndex: idx,
          memoryId: m.memoryId || m._id,
          type
        });
      }
    });

    return { allMedia: media, documents: docs };
  }, [memories]);

  const allPhotos = allMedia; // Maintain backward compatibility for now
  console.log("alllllll", allPhotos)
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
    if (allPhotos.length === 0) return 1;
    if (allPhotos.length <= 2) return allPhotos.length;
    if (allPhotos.length === 4 || allPhotos.length === 5) return 2; // balance perfectly for small sets
    return maxCols;
  }, [viewportWidth, allPhotos.length]);

  const columns = useMemo(() => {
    const cols: MediaItem[][] = Array.from({ length: columnCount }, () => []);
    const colHeights = Array(columnCount).fill(0);

    allPhotos.forEach((item) => {
      let minHeightIdx = 0;
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < colHeights[minHeightIdx]) {
          minHeightIdx = i;
        }
      }
      cols[minHeightIdx].push(item);
      const aspect = aspectRatios[item.id] || (item.type === 'text' ? 0.75 : 1.33);
      const colWidth = viewportWidth < 640 ? viewportWidth / 2 : 300;
      const cardWidth = aspect > 1.2 ? Math.min(colWidth, 320) : colWidth;
      const layoutHeight = cardWidth * aspect;
      const balancedAspect = layoutHeight / colWidth;
      colHeights[minHeightIdx] += balancedAspect;
    });
    return cols;
  }, [allPhotos, columnCount, aspectRatios]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    setUploading(true);
    setSubmitProgress('Preparing files...');
    try {
      // 0. Pre-process files
      setSubmitProgress('Optimizing media...');
      const processedFiles = await Promise.all(fileArray.map(async (file) => {
        const isPhoto = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name);
        const isVideo = file.type.startsWith('video/');
        if (isPhoto) {
          try {
            const compressed = await compressImage(file, 2_000_000);
            return { file: compressed, isPhoto, isVideo };
          } catch (e) {
            console.error('Compression failed for', file.name, e);
            return { file, isPhoto, isVideo };
          }
        }
        return { file, isPhoto, isVideo };
      }));

      // 1. Get presigned URLs
      const presignPayload = processedFiles.map(pf => ({
        fileName: pf.file.name,
        fileType: pf.file.type || (pf.isPhoto ? 'image/webp' : pf.isVideo ? 'video/mp4' : 'application/octet-stream')
      }));

      const presignData = await getBulkPresignedUrls(presignPayload);

      // 2. Sequential Upload
      const uploadedFilesData = [];
      for (let i = 0; i < processedFiles.length; i++) {
        const pf = processedFiles[i];
        const ps = presignData[i];

        setSubmitProgress(`Vaulting media ${i + 1} of ${processedFiles.length}...`);

        const contentType = pf.file.type || (pf.isPhoto ? 'image/webp' : pf.isVideo ? 'video/mp4' : 'application/octet-stream');
        await uploadToS3(ps.uploadUrl, pf.file, contentType);

        if (ps.thumbnailUploadUrl) {
          setSubmitProgress(`Optimizing thumbnail ${i + 1}...`);
          let thumbBlob: Blob | null = null;

          if (pf.isVideo) {
            const thumbFile = await generateVideoThumbnail(pf.file);
            thumbBlob = thumbFile;
          } else if (pf.isPhoto) {
            const thumbFile = await compressImage(pf.file, 150_000);
            thumbBlob = thumbFile;
          }

          if (thumbBlob) {
            await uploadToS3(ps.thumbnailUploadUrl, thumbBlob, 'image/webp');
          }
        }

        uploadedFilesData.push({
          fileName: pf.file.name,
          fileType: contentType,
          key: ps.key || '',
          fileSize: pf.file.size,
          thumbnailKey: ps.thumbnailKey,
          fileId: ps.fileId
        });
      }

      setSubmitProgress('Publishing...');

      await confirmMemories(treeId, {
        title: `${_personName}'s Media`,
        description: '',
        category: 'Event',
        type: 'post',
        status: 'publish',
        taggedPeople: [{
          id: personId,
          name: _personName,
          profilePhotoUrl: profilePhotoUrl || null,
          profileImageUrl: profilePhotoUrl || null
        }],
        files: uploadedFilesData,
        textdata: ""
      });

      await loadData();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setSubmitProgress('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleMemoryClick = async (index: number) => {
    const memory = memories[index];
    const memoryId = memory.memoryId || (memory as any)._id;
    if (!memoryId) {
      setSelectedMemoryIndex(index);
      return;
    }

    try {
      const detailedMemory = await fetchMemoryById(memoryId);
      setMemories(prev => {
        const updated = [...prev];
        updated[index] = detailedMemory;
        return updated;
      });
    } catch (err) {
      console.error('Fetch memory details failed:', err);
    }
    setSelectedMemoryIndex(index);
  };

  const selectedMemory = selectedMemoryIndex !== null ? memories[selectedMemoryIndex] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <FamilyUploadLoader open={uploading} progressText={submitProgress} />

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg p-1 w-fit">
        {([
          { id: 'photos' as const, label: 'Photos & Videos', count: allPhotos.length },
          // { id: 'documents' as const, label: 'Documents', count: documents.length },
          // { id: 'memories' as const, label: 'Memories', count: memories.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${subTab === t.id ? 'bg-white dark:bg-[#1E1E1E] shadow-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5]' : 'text-gray-500 dark:text-[#a0a0a0] hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Upload area */}
      {subTab !== 'memories' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/20' : 'border-gray-300 dark:border-[#444] bg-gray-50 dark:bg-[#1e1e1e]/30'
            }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F] mx-auto" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop files here, or</p>
              <label className="inline-block mt-2 px-4 py-1.5 text-sm bg-[#2F3E8F] text-white rounded-lg cursor-pointer hover:bg-[#25327A] transition-colors">
                Browse Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* Masonry photo grid — Unsplash-style auto-height columns */}
      {subTab === 'photos' && (
        allPhotos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1 text-gray-400">Upload photos directly or add them via Memories</p>
          </div>
        ) : (
          <div className={`flex gap-3 sm:gap-4 ${allPhotos.length === 1 ? 'justify-center' : ''}`}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} className={`flex flex-col gap-3 sm:gap-4 ${allPhotos.length === 1 ? 'max-w-[450px] w-full flex-none' : 'flex-1'}`}>
                {col.map(item => {
                  const aspect = aspectRatios[item.id] || 1.33;
                  const isPortrait = aspect > 1.2;
                  const cardMaxWidth = isPortrait ? '320px' : '100%';

                  return (
                    <div
                      key={item.id}
                      className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-stone-900 cursor-pointer shadow-sm hover:shadow-md transition-shadow mx-auto w-full"
                      style={{ maxWidth: cardMaxWidth }}
                      onClick={() => {
                        if (item.memoryIndex !== undefined) {
                          handleMemoryClick(item.memoryIndex);
                        } else {
                          setPreviewUrl(item.url);
                        }
                      }}
                    >
                      {item.type === 'photo' ? (
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.caption || 'Photo'}
                          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                          loading="lazy"
                          onLoad={(e) => {
                            const { naturalWidth, naturalHeight } = e.currentTarget;
                            if (naturalWidth && naturalHeight) {
                              handleImageLoad(item.id, naturalHeight / naturalWidth);
                            }
                          }}
                        />
                      ) : item.type === 'video' ? (
                        <div className="relative">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                              alt=""
                              loading="lazy"
                              onLoad={(e) => {
                                const { naturalWidth, naturalHeight } = e.currentTarget;
                                if (naturalWidth && naturalHeight) {
                                  handleImageLoad(item.id, naturalHeight / naturalWidth);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                              <Play className="h-8 w-8 text-white/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                              <Play className="h-5 w-5 text-white fill-current" />
                            </div>
                          </div>
                        </div>
                      ) : item.type === 'audio' ? (
                        <div className="w-full aspect-square bg-blue-50 flex flex-col items-center justify-center p-4">
                          <div className="w-12 h-12 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center mb-2">
                            <Music className="h-6 w-6 text-[#2F3E8F]" />
                          </div>
                          <p className="text-[10px] text-[#2F3E8F] font-medium uppercase tracking-wider">Audio</p>
                        </div>
                      ) : item.type === 'text' ? (
                        <div className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F6] to-[#F4F1EA] dark:from-[#1E1E1E] dark:to-[#121212] p-4 text-center">
                          <div className="flex flex-col items-center gap-1.5 text-[#C2A46D]">
                            <BookOpen className="w-6 h-6" strokeWidth={1.5} />
                            <span className="text-[9px] text-[#8B7355] dark:text-[#999] font-semibold">Story</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center p-4">
                          <FileText className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-[10px] text-gray-500 font-medium uppercase truncate w-full text-center px-1">
                            {item.caption || 'Document'}
                          </p>
                        </div>
                      )}

                      {/* Hover overlay with caption */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      {item.caption && item.type !== 'document' && item.type !== 'audio' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <p className="text-xs text-white font-medium line-clamp-2">{item.caption}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      )}

      {subTab === 'documents' && (
        documents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center p-3 rounded-xl border border-gray-100 bg-white hover:border-[#2F3E8F]/20 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => doc.memoryIndex !== undefined && handleMemoryClick(doc.memoryIndex)}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.caption || 'Untitled Document'}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Memory Document</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Memories - Using MemoryCard grid with slideshow */}
      {/* {subTab === 'memories' && (
        <>
          {onCreateMemory && (
            <button
              onClick={onCreateMemory}
              className="mb-4 flex items-center gap-1.5 text-sm text-[#2F3E8F] hover:text-[#8B5E3C]"
            >
              <Plus className="h-3.5 w-3.5" /> Create Memory
            </button>
          )}
          {memories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No memories yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {memories.map((m, i) => (
                <MemoryCard
                  key={m.memoryId}
                  memory={m}
                  onClick={() => setSelectedMemoryIndex(i)}
                />
              ))}
            </div>
          )}
        </>
      )} */}

      {/* Memory Detail Modal with slideshow */}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          open={!!selectedMemory}
          onClose={() => setSelectedMemoryIndex(null)}
          onDelete={() => {
            setSelectedMemoryIndex(null);
            loadData();
          }}
          onUpdate={(updated) => {
            if (updated) {
              setMemories(prev => prev.map(m => {
                const id = m.memoryId || (m as any)._id;
                const updatedId = updated.memoryId || (updated as any)._id;
                return id === updatedId ? updated : m;
              }));
            } else {
              loadData();
            }
          }}
          memories={memories}
          currentIndex={selectedMemoryIndex!}
          onNavigate={(i) => setSelectedMemoryIndex(i)}
        />
      )}

      {/* Full-size preview overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 p-2 text-white hover:text-gray-300" onClick={() => setPreviewUrl(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}

      {/* Infinite Scroll Target */}
      <div ref={observerTarget} className="flex justify-center py-6 mt-4">
        {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F]" />}
      </div>
    </div>
  );
}
