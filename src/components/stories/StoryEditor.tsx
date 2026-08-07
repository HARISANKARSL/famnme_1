/**
 * StoryEditor - Multi-step story creation wizard
 *
 * Steps: 1) Pick photos from memories  2) Arrange order  3) Preview & Publish
 *
 * If no photos exist, offers a text-only story with a placeholder slide.
 */

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, Loader2, GripVertical, Image, FileText, AlertCircle, Upload as UploadIcon, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchMemories, getBulkPresignedUrls, uploadToS3, confirmMemories, compressImage, fetchMemoryImages } from '@/services/memoriesApiService';
import { saveStory } from '@/services/storyApiService';
import { resolveBackendUrl } from '@/config/api';
import type { Memory } from '@/types';
import { validateField } from '@/utils/validation';

interface StoryEditorProps {
  treeId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onClose: () => void;
  onCreated: () => void;
}

interface SlideData {
  memoryId?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  captionText: string;
  captionPosition: 'top' | 'center' | 'bottom';
  duration: number;
}

/** Placeholder image for text-only slides (1x1 transparent data URI won't work; use a subtle gradient) */
const TEXT_SLIDE_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#f3f2f1"/><text x="200" y="300" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#a19f9d">Text Slide</text></svg>'
);

export function StoryEditor({ treeId, currentUserId: _currentUserId, currentUserName, currentUserAvatar, onClose, onCreated }: StoryEditorProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');

  const titleValidation = validateField(title, {
    name: 'Story Title',
    maxLength: 50,
    required: true,
    noWhitespaceOnly: true,
  });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [textSlideContent, setTextSlideContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMemoriesData = () => {
    setLoadingMemories(true);
    fetchMemoryImages({ limit: 50 })
      .then(response => {
        const list = Array.isArray(response) ? response : (response.items || response.memories || []);
        const imageMemories = list.filter((m: any) => {
          const firstFile = m.files?.[0] || {};
          const fileType = (firstFile.fileType || '').toLowerCase();
          const fileName = (firstFile.fileName || m.title || '').toLowerCase();
          const mUrl = (m.mediaUrl || (m as any).fileUrl || firstFile.fileUrl || '').toLowerCase();

          const isAllowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(fileType);
          const isAllowedExt = /\.(png|jpe?g|webp)$/i.test(fileName) || /\.(png|jpe?g|webp)$/i.test(mUrl);

          return isAllowedMime || isAllowedExt;
        });
        setMemories(imageMemories);
      })
      .catch(err => {
        console.error('Failed to load memories for story:', err);
        setError('Could not load photos. Please try again.');
      })
      .finally(() => setLoadingMemories(false));
  };

  useEffect(() => {
    loadMemoriesData();
  }, [treeId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const invalidFiles = fileList.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      const mime = f.type.toLowerCase();
      return !allowedMimeTypes.includes(mime) && !allowedExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setError('Only PNG, JPG, JPEG, and WEBP image files are allowed in stories.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // 1. Get presigned URLs
      const presignPayload = fileList.map(f => ({
        fileName: f.name,
        fileType: f.type,
        fileSize: f.size,
      }));
      const remoteFiles = await getBulkPresignedUrls(presignPayload);

      // 2. Upload main files and thumbnails
      const uploads = remoteFiles.map(async (rf, i) => {
        const file = fileList[i];

        // Upload main file
        await uploadToS3(rf.uploadUrl, file, file.type);

        // Upload thumbnail if supported by API
        if (rf.thumbnailUploadUrl) {
          try {
            const thumbBlob = await compressImage(file, 150_000);
            await uploadToS3(rf.thumbnailUploadUrl, thumbBlob, 'image/webp');
          } catch (tErr) {
            console.warn('Thumbnail generation/upload failed, skipping:', tErr);
          }
        }
      });

      await Promise.all(uploads);

      // 3. Store as pending (with local preview for immediate display)
      const newPending = remoteFiles.map((rf, i) => {
        const localPreview = URL.createObjectURL(fileList[i]);
        return {
          tempId: rf.key,
          mediaUrl: localPreview, // Use local blob for instant preview
          remoteUrl: rf.fileUrl,  // Keep the final S3 URL for saving later
          thumbnailUrl: localPreview,
          title: fileList[i].name,
          fileInfo: {
            fileUrl: rf.fileUrl,
            fileType: fileList[i].type,
            fileName: fileList[i].name,
            fileSize: fileList[i].size,
            key: rf.key,
            thumbnailKey: rf.thumbnailKey
          }
        };
      });

      setPendingUploads(prev => [...prev, ...newPending]);

      // Auto-select them
      setSelectedIds(prev => {
        const next = new Set(prev);
        newPending.forEach(p => next.add(p.tempId));
        return next;
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasPhotos = memories.some(m => !!(m.mediaUrl || (m as any).fileUrl || m.files?.[0]?.fileUrl)) || pendingUploads.length > 0;

  // Build slides from selected memories (both existing and pending)
  const buildSlides = () => {
    const newSlides: SlideData[] = [];

    // Existing memories
    for (const m of memories) {
      const mid = m._id || m.memoryId;
      const firstFile = m.files?.[0] || {};
      const mUrl = firstFile.signedUrl || m.mediaUrl || (m as any).fileUrl || firstFile.fileUrl;
      const tUrl = firstFile.thumbnailSignedUrl || m.thumbnailUrl || (m as any).thumbUrl || firstFile.thumbnailUrl || mUrl;
      const uniqueFileId = firstFile._id || mid || firstFile.key;

      if (uniqueFileId && selectedIds.has(uniqueFileId)) {
        newSlides.push({
          memoryId: uniqueFileId,
          mediaUrl: mUrl || '',
          thumbnailUrl: tUrl || undefined,
          captionText: '',
          captionPosition: 'bottom',
          duration: 5,
        });
      }
    }

    // Pending uploads
    for (const p of pendingUploads) {
      if (selectedIds.has(p.tempId)) {
        newSlides.push({
          memoryId: p.tempId, // temporary
          mediaUrl: p.mediaUrl,
          thumbnailUrl: p.thumbnailUrl,
          captionText: '',
          captionPosition: 'bottom',
          duration: 5,
        });
      }
    }

    setSlides(newSlides);
  };

  // Build a single text-only slide
  const buildTextSlide = () => {
    setSlides([{
      mediaUrl: TEXT_SLIDE_PLACEHOLDER,
      captionText: textSlideContent,
      captionPosition: 'center',
      duration: 8,
    }]);
  };

  const toggleMemory = (id: string) => {
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const moveSlide = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= slides.length) return;
    const copy = [...slides];
    [copy[from], copy[to]] = [copy[to], copy[from]];
    setSlides(copy);
  };



  const handlePublish = async () => {
    if (!title.trim() || !titleValidation.isValid || slides.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      // Pull personName (full name) from sessionStorage
      let sessionFullName = '';
      try {
        const rawUser = sessionStorage.getItem('userData');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          sessionFullName = parsed.fullName || parsed.name || '';
        }
      } catch (e) {
        console.error('Failed to parse userData from sessionStorage:', e);
      }

      // 1. Build the unified payload for saveStory
      const payload: any = {
        title: title.trim(),
        type: textOnlyMode ? 'textstory' : 'photo',
        textstory: textOnlyMode ? textSlideContent : undefined,
        files: [],
        personName: sessionFullName || undefined,
      };

      if (!textOnlyMode) {
        // Map slides to file objects requested by the API
        payload.files = slides.map(s => {
          // Check if this was a pending upload (we have full file info)
          const pending = pendingUploads.find(p => p.tempId === s.memoryId);
          if (pending) {
            return {
              fileName: pending.fileInfo.fileName,
              fileType: pending.fileInfo.fileType,
              key: pending.fileInfo.key,
              thumbnailKey: pending.fileInfo.thumbnailKey
            };
          }

          // Check if it's an existing memory from the picker
          const existing = memories.find(m => {
            const firstFile = m.files?.[0] || {};
            const uniqueFileId = firstFile._id || m._id || m.memoryId || firstFile.key;
            return uniqueFileId === s.memoryId;
          });
          if (existing) {
            const firstFile = existing.files?.[0] || {};
            return {
              fileName: existing.title || firstFile.fileName || 'memory.webp',
              fileType: firstFile.fileType || 'image/webp',
              key: firstFile.key || (existing as any).key || s.memoryId,
              thumbnailKey: firstFile.thumbnailKey || (existing as any).thumbnailKey || undefined,
              url: s.mediaUrl
            };
          }

          // Fallback
          return {
            fileName: s.captionText || 'slide.webp',
            fileType: 'image/webp',
            key: s.memoryId
          };
        });
      }

      // 2. Call the new save API
      await saveStory(treeId, payload);

      onCreated();
    } catch (err: unknown) {
      console.error('Failed to create story:', err);
      setError(err instanceof Error ? err.message : 'Failed to create story. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isSinglePhotoStory = !textOnlyMode && (step === 1 ? selectedIds.size === 1 : slides.length === 1);

  const stepTitle = textOnlyMode
    ? ['', 'Write Story', 'Preview & Publish'][step] || ''
    : isSinglePhotoStory
      ? ['', 'Pick Photos', '', 'Review & Publish'][step] || ''
      : ['', 'Pick Photos', 'Arrange Order', 'Review & Publish'][step];

  const totalSteps = textOnlyMode || isSinglePhotoStory ? 2 : 3;

  const visualStep = step === 3 && isSinglePhotoStory ? 2 : step;

  // Determine if "Next" should be enabled for step 1
  const canProceedStep1 = title.trim().length > 0 && titleValidation.isValid && (
    textOnlyMode ? textSlideContent.trim().length > 0 : selectedIds.size > 0
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-2 sm:mx-4 bg-[#ffffff] dark:bg-[#292827] rounded-xl shadow-fluent-16 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9] dark:border-[#484644]">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => {
                  if (isSinglePhotoStory && step === 3) {
                    setStep(1);
                  } else {
                    setStep(s => s - 1);
                  }
                }}
                className="p-1 rounded hover:bg-[#F3F2F1] dark:hover:bg-[#323130]"
              >
                <ChevronLeft className="w-4 h-4 text-[#605E5C] dark:text-[#D2D0CE]" />
              </button>
            )}
            <h2 className="text-base font-semibold text-[#323130] dark:text-[#F3F2F1]">
              Create Story
              <span className="text-xs font-normal text-[#A19F9D] ml-2">Step {visualStep}/{totalSteps} — {stepTitle}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
            <X className="w-4 h-4 text-[#605E5C] dark:text-[#D2D0CE]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Error banner */}
          {error && (
            <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Pick photos (or text-only mode) */}
          {step === 1 && (
            <div>
              <div className="mb-3">
                <Label className="text-sm text-[#605E5C] dark:text-[#D2D0CE]">Story Title <span className="text-white">*</span></Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (canProceedStep1) {
                        if (textOnlyMode) {
                          buildTextSlide();
                          setStep(2);
                        } else {
                          buildSlides();
                          if (selectedIds.size === 1) {
                            setStep(3);
                          } else {
                            setStep(2);
                          }
                        }
                      }
                    }
                  }}
                  placeholder="Give your story a title"
                  autoFocus
                  error={title.length > 0 ? titleValidation.error : undefined}
                  showCharCount
                  charLimit={50}
                />
              </div>

              {/* Mode toggle: photos vs text-only */}
              {!loadingMemories && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setTextOnlyMode(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${!textOnlyMode
                      ? 'bg-[#2F3E8F] text-white border-[#2F3E8F]'
                      : 'bg-[#F3F2F1] dark:bg-[#323130] text-[#605E5C] dark:text-[#D2D0CE] border-[#EDEBE9] dark:border-[#484644] hover:bg-[#EDEBE9] dark:hover:bg-[#484644]'
                      }`}
                  >
                    <Image className="w-4 h-4" />
                    Photo Story
                  </button>
                  <button
                    onClick={() => setTextOnlyMode(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${textOnlyMode
                      ? 'bg-[#2F3E8F] text-white border-[#2F3E8F]'
                      : 'bg-[#F3F2F1] dark:bg-[#323130] text-[#605E5C] dark:text-[#D2D0CE] border-[#EDEBE9] dark:border-[#484644] hover:bg-[#EDEBE9] dark:hover:bg-[#484644]'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    Text Story
                  </button>
                </div>
              )}

              {textOnlyMode ? (
                /* Text-only story input */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-[#A19F9D]">Write your story content below</p>
                    <span className={`text-xs ${textSlideContent.length >= 300 ? 'text-red-500 font-semibold' : 'text-[#A19F9D]'}`}>
                      {textSlideContent.length}/300
                    </span>
                  </div>
                  <Textarea
                    value={textSlideContent}
                    onChange={e => setTextSlideContent(e.target.value.slice(0, 300))}
                    maxLength={300}
                    placeholder="Share a memory, a family anecdote, or a message for your family..."
                    className="min-h-[200px] text-sm"
                    autoFocus={!!title}
                  />
                </div>
              ) : (
                /* Photo picker */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-[#A19F9D]">Select photos for your story ({selectedIds.size} selected)</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-xs font-medium text-[#2F3E8F] hover:underline flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{uploading ? 'Uploading...' : 'Upload New'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={handleFileUpload}
                    />
                  </div>
                  {loadingMemories ? (
                    <p className="text-sm text-[#A19F9D] text-center py-8">Loading photos...</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                      {/* Upload Tile */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square rounded-lg border-2 border-dashed border-[#EDEBE9] dark:border-[#484644] flex flex-col items-center justify-center gap-1 hover:bg-[#F3F2F1] dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="w-5 h-5 text-[#A19F9D] animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5 text-[#A19F9D]" />
                        )}
                        <span className="text-[10px] text-[#A19F9D] font-medium">Add New</span>
                      </button>

                      {/* Pending Uploads (Pre-confirmation) */}
                      {pendingUploads.map(p => {
                        const selected = selectedIds.has(p.tempId);
                        return (
                          <button
                            key={p.tempId}
                            onClick={() => toggleMemory(p.tempId)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-[3px] transition-all ${selected ? 'border-[#1A255C] dark:border-[#8CA0FF] scale-[0.97]' : 'border-transparent hover:border-[#EDEBE9]'}`}
                          >
                            <div className="relative w-full h-full flex items-center justify-center bg-stone-50 dark:bg-stone-900">
                              <img src={p.mediaUrl} alt="" className="w-full h-full object-contain" />
                              {selected && (
                                <div className="absolute inset-0 bg-[#1A255C]/15 dark:bg-[#8CA0FF]/20 pointer-events-none" />
                              )}
                              <div className="absolute top-1.5 right-1.5 bg-sky-500 rounded-full p-0.5 z-10">
                                <UploadIcon className="w-2.5 h-2.5 text-white" />
                              </div>
                              {selected && (
                                <div className="absolute bottom-1.5 right-1.5 bg-[#1A255C] dark:bg-[#8CA0FF] text-white rounded-full p-0.5 shadow-md z-10 flex items-center justify-center border border-white dark:border-[#1b1b1b]">
                                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {memories.map((m, index) => {
                        const mid = m._id || m.memoryId;
                        const firstFile = m.files?.[0] || {};
                        const mUrl = firstFile.signedUrl || m.mediaUrl || (m as any).fileUrl || firstFile.fileUrl;
                        if (!mUrl || !mid) return null;

                        const uniqueFileId = firstFile._id || mid || firstFile.key;
                        const selected = selectedIds.has(uniqueFileId);
                        const tUrl = firstFile.thumbnailSignedUrl || m.thumbnailUrl || (m as any).thumbUrl || firstFile.thumbnailUrl || mUrl;

                        return (
                          <button
                            key={`${mid}-${uniqueFileId}-${index}`}
                            onClick={() => toggleMemory(uniqueFileId)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-[3px] transition-all ${selected ? 'border-[#1A255C] dark:border-[#8CA0FF] scale-[0.97]' : 'border-transparent hover:border-[#EDEBE9]'}`}
                          >
                            <div className="relative w-full h-full flex items-center justify-center bg-stone-50 dark:bg-stone-900">
                              <img src={resolveBackendUrl(tUrl)} alt={m.title} className="w-full h-full object-contain" />
                              {selected && (
                                <>
                                  <div className="absolute inset-0 bg-[#1A255C]/15 dark:bg-[#8CA0FF]/20 pointer-events-none" />
                                  <div className="absolute top-1.5 right-1.5 bg-[#1A255C] dark:bg-[#8CA0FF] text-white rounded-full p-0.5 shadow-md z-10 flex items-center justify-center border border-white dark:border-[#1b1b1b]">
                                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                  </div>
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {!hasPhotos && (
                        <div className="col-span-3 text-center py-8">
                          <Image className="w-8 h-8 text-[#D2D0CE] mx-auto mb-2" />
                          <p className="text-sm text-[#A19F9D]">No photos available</p>
                          <p className="text-xs text-[#A19F9D] mt-1">Upload photos in Memories first, or switch to Text Story mode</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2 for text-only mode: Preview & Publish */}
          {textOnlyMode && step === 2 && (
            <div>
              <div className="text-center mb-4 px-4 w-full">
                <h3 className="text-lg font-semibold text-[#323130] dark:text-[#F3F2F1] break-words">{title}</h3>
                <p className="text-sm text-[#A19F9D]">1 slide by {currentUserName}</p>
              </div>
              <div className="mx-auto max-w-[200px] aspect-[9/16] rounded-lg overflow-hidden relative bg-[#F3F2F1] dark:bg-[#323130] flex items-center justify-center p-4">
                <p className="text-sm text-[#323130] dark:text-[#F3F2F1] text-center whitespace-pre-wrap break-words break-all w-full">{slides[0]?.captionText}</p>
              </div>
            </div>
          )}

          {/* Step 2 for photo mode: Arrange order */}
          {!textOnlyMode && step === 2 && (
            <div>
              <p className="text-sm text-[#A19F9D] mb-3">Drag to reorder slides</p>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border border-[#EDEBE9] dark:border-[#484644] rounded-lg bg-[#ffffff] dark:bg-[#292827]">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveSlide(i, -1)} disabled={i === 0}
                        className="p-0.5 rounded hover:bg-[#F3F2F1] dark:hover:bg-[#323130] disabled:opacity-30">
                        <ChevronLeft className="w-3 h-3 rotate-90" />
                      </button>
                      <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                        className="p-0.5 rounded hover:bg-[#F3F2F1] dark:hover:bg-[#323130] disabled:opacity-30">
                        <ChevronLeft className="w-3 h-3 -rotate-90" />
                      </button>
                    </div>
                    <div className="w-12 h-12 rounded bg-[#F3F2F1] dark:bg-[#323130] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={resolveBackendUrl(s.thumbnailUrl || s.mediaUrl)} alt="" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-sm text-[#605E5C] dark:text-[#D2D0CE] flex-1">Slide {i + 1}</span>
                    <GripVertical className="w-4 h-4 text-[#D2D0CE]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview (photo mode) */}
          {!textOnlyMode && step === 3 && (
            <div>
              <div className="text-center mb-4 px-4 w-full">
                <h3 className="text-lg font-semibold text-[#323130] dark:text-[#F3F2F1] break-words">{title}</h3>
                <p className="text-sm text-[#A19F9D]">{slides.length} slides by {currentUserName}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {slides.map((s, i) => (
                  <div key={i} className="aspect-[9/16] rounded-lg overflow-hidden relative bg-[#F3F2F1] dark:bg-[#323130] flex items-center justify-center">
                    <img src={resolveBackendUrl(s.thumbnailUrl || s.mediaUrl)} alt="" className="w-full h-full object-contain animate-fade-in" />
                    {s.captionText && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                        <p className="text-[8px] text-white truncate">{s.captionText}</p>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 bg-black/40 text-white text-[8px] px-1 rounded">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDEBE9] dark:border-[#484644]">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div key={s} className={`w-2 h-2 rounded-full ${s === visualStep ? 'bg-[#2F3E8F]' : 'bg-[#EDEBE9] dark:bg-[#484644]'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step === 1 && (
              <Button size="sm" onClick={() => {
                if (textOnlyMode) {
                  buildTextSlide();
                  setStep(2);
                } else {
                  buildSlides();
                  if (selectedIds.size === 1) {
                    setStep(3);
                  } else {
                    setStep(2);
                  }
                }
              }} disabled={!canProceedStep1}>
                {textOnlyMode || isSinglePhotoStory ? 'Preview' : `Next (${selectedIds.size} photos)`}
              </Button>
            )}
            {!textOnlyMode && step === 2 && (
              <Button size="sm" onClick={() => setStep(3)}>Preview</Button>
            )}
            {((textOnlyMode && step === 2) || (!textOnlyMode && step === 3)) && (
              <Button size="sm" onClick={handlePublish} disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Publishing...</> : 'Publish Story'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
