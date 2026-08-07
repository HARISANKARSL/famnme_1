

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Pencil, Camera, Video, Music, FileText, BookOpen, MapPin, Calendar, AlertTriangle, ChevronLeft, ChevronRight, Gem, Landmark, Loader2, Mic, PartyPopper, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteMemory, transcribeMemory, uploadAIDescriptionUrl, updateMemory, fetchMemoryById } from '@/services/memoriesApiService';
import type { CeremonyDetectionResult } from '@/services/memoriesApiService';
import { getMemoryTemple, getTempleMembers, getTempleGenerationalPresence } from '@/services/templeLinkApiService';
import { getTempleById } from '@/data/temples';
import { resolveBackendUrl, API_BASE_URL } from '@/config/api';
import type { Memory } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { useNeo4jTreeStore } from '@/store/neo4jTreeStore';
import { useToast } from '@/components/ui/use-toast';

interface SimilarMemory {
  memoryId: string;
  title: string;
  memoryType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  similarity?: number;
}

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

interface MemoryDetailModalProps {
  memory: Memory;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onUpdate?: (updatedMemory?: Memory) => void;
  onEdit?: () => void;
  treeId?: string;
  onNavigateToTemple?: (templeId: string) => void;
  // Slideshow props
  memories?: Memory[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
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
  } catch {
    return dateStr;
  }
}

function TypeBadge({ type }: { type: Memory['memoryType'] | 'document' }) {
  const config = {
    photo: { icon: Camera, label: 'Photo', color: 'bg-[#F3E8DE] text-[#25327A]' },
    video: { icon: Video, label: 'Video', color: 'bg-purple-100 text-purple-700' },
    audio: { icon: Music, label: 'Audio', color: 'bg-blue-100 text-[#2F3E8F]' },
    text: { icon: BookOpen, label: 'Text', color: 'bg-[#F3E8DE] text-[#25327A]' },
    document: { icon: FileText, label: 'Document', color: 'bg-amber-100 text-amber-700' },
  }[type];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function MemoryDetailModal({
  memory,
  open,
  onClose,
  onDelete,
  onUpdate,
  onEdit,
  treeId,
  onNavigateToTemple,
  memories,
  currentIndex,
  onNavigate,
}: MemoryDetailModalProps) {
  const storePersons = useNeo4jTreeStore((state) => state.persons);
  const activePersons = storePersons.filter((p: any) => !p.isDeleted);

  const inferredType = (() => {
    const isDocumentFile = (url?: string | null): boolean => {
      if (!url) return false;
      const cleanUrl = url.toLowerCase().split('?')[0];
      const docExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.csv', '.txt', '.rtf', '.odt', '.ods', '.odp'
      ];
      return docExtensions.some(ext => cleanUrl.endsWith(ext));
    };

    if (memory.memoryType === 'document' || (memory.memoryType as string) === 'document') return 'document';

    const file = memory.files?.[0];
    const url = file?.fileUrl || file?.signedUrl || memory.mediaUrl;
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

    if (memory.memoryType === 'text' || memory.textdata || memory.textContent || !!memory.files?.[0]?.textContent) return 'text';
    const fileForType = memory.files?.[0];
    if (fileForType?.fileType?.startsWith('video/')) return 'video';
    if (fileForType?.fileType?.startsWith('audio/')) return 'audio';
    return memory.memoryType === 'image' ? 'photo' : (memory.memoryType || 'photo');
  })();

  const mainMediaUrl = (() => {
    const firstFile = memory.files?.[0];
    return firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl || '';
  })();

  const mainThumbnailUrl = (() => {
    const firstFile = memory.files?.[0];
    return firstFile?.thumbnailSignedUrl || firstFile?.thumbnailUrl || '';
  })();

  const { toast } = useToast();
  const { isMobile } = useResponsive();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [similarMemories, setSimilarMemories] = useState<SimilarMemory[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [linkedTempleInfo, setLinkedTempleInfo] = useState<{ templeId: string; festival: string | null; ritual: string | null } | null>(null);
  const [templeMembers, setTempleMembers] = useState<Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl: string | null; memoryCount: number }>>([]);
  const [generationalPresence, setGenerationalPresence] = useState<{ generationCount: number; persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl: string | null }> } | null>(null);

  // AI feature states
  const [transcribing, setTranscribing] = useState(false);
  const [localTranscription, setLocalTranscription] = useState<string | null>(null);
  const [localCeremony, setLocalCeremony] = useState<CeremonyDetectionResult | null>(null);

  // Photo description state
  const [photoDesc, setPhotoDesc] = useState<string>(memory.description || '');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [pendingAiDesc, setPendingAiDesc] = useState<string | null>(null);

  // Reset AI state when memory changes
  useEffect(() => {
    setLocalTranscription(null);
    setLocalCeremony(null);
    setPhotoDesc(memory.description || '');
    setEditingDesc(false);
    setPendingAiDesc(null);
  }, [memory?.memoryId, memory?.description]);

  // Fetch linked temple info when memory changes
  useEffect(() => {
    if (!open || !treeId || !memory?.memoryId) {
      setLinkedTempleInfo(null);
      setTempleMembers([]);
      return;
    }
    getMemoryTemple(treeId, memory.memoryId)
      .then(setLinkedTempleInfo)
      .catch(() => setLinkedTempleInfo(null));
  }, [open, treeId, memory?.memoryId]);

  // Fetch "also at this temple" members when temple link is resolved
  useEffect(() => {
    if (!treeId || !linkedTempleInfo?.templeId || !memory?.memoryId) {
      setTempleMembers([]);
      setGenerationalPresence(null);
      return;
    }
    getTempleMembers(treeId, linkedTempleInfo.templeId, memory.memoryId)
      .then(setTempleMembers)
      .catch(() => setTempleMembers([]));
    getTempleGenerationalPresence(treeId, linkedTempleInfo.templeId)
      .then(data => setGenerationalPresence(data.generationCount >= 2 ? data : null))
      .catch(() => setGenerationalPresence(null));
  }, [treeId, linkedTempleInfo?.templeId, memory?.memoryId]);

  // Fetch similar memories when memory changes
  useEffect(() => {
    if (!open || !treeId || !memory?.memoryId) {
      setSimilarMemories([]);
      return;
    }
    let cancelled = false;
    setLoadingSimilar(true);
    const token = localStorage.getItem('auth_token');
    fetch(`${API_BASE_URL.replace(/\/api$/, '')}/api/tree/${treeId}/memories/${memory.memoryId}/similar?limit=6`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.similar) setSimilarMemories(data.similar);
      })
      .catch(() => { /* silently fail — similar memories is non-critical */ })
      .finally(() => { if (!cancelled) setLoadingSimilar(false); });
    return () => { cancelled = true; };
  }, [open, treeId, memory?.memoryId]);

  const canNavigate = memories && memories.length > 1 && currentIndex !== undefined && onNavigate;
  const hasPrev = canNavigate && currentIndex > 0;
  const hasNext = canNavigate && currentIndex < memories.length - 1;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!canNavigate) return;
    if (e.key === 'ArrowLeft' && hasPrev) {
      onNavigate(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && hasNext) {
      onNavigate(currentIndex + 1);
    }
  }, [canNavigate, hasPrev, hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleTranscribe = async () => {
    if (!treeId) return;
    setTranscribing(true);
    try {
      const mid = memory.memoryId || (memory as any)._id;
      const result = await transcribeMemory(treeId, mid);
      if (result.transcription) {
        setLocalTranscription(result.transcription);
      }
    } catch (err) {
      console.error('Failed to transcribe:', err);
    } finally {
      setTranscribing(false);
    }
  };

  const handleGenerateDesc = async () => {
    const firstFile = memory.files?.[0];
    const mediaUrl = firstFile?.thumbnailSignedUrl || firstFile?.signedUrl || memory.mediaUrl || firstFile?.fileUrl || '';
    if (!mediaUrl) return;
    setGeneratingDesc(true);
    try {
      const result = await uploadAIDescriptionUrl(resolveBackendUrl(mediaUrl));
      if (result.description) setPendingAiDesc(result.description);
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleAcceptAiDesc = async () => {
    if (!pendingAiDesc) return;
    setSavingDesc(true);
    try {
      const mid = memory.memoryId || (memory as any)._id;
      const fileId = memory.files?.[0]?._id;
      await updateMemory(mid, {
        description: pendingAiDesc,
        ...(fileId ? { fileId, fileid: fileId } : {})
      });
      setPhotoDesc(pendingAiDesc);
      setPendingAiDesc(null);
      try {
        const updated = await fetchMemoryById(mid);
        onUpdate?.(updated);
      } catch (e) {
        console.error('Failed to refetch memory after enrich:', e);
        onUpdate?.();
      }
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setSavingDesc(false);
    }
  };

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    try {
      const mid = memory.memoryId || (memory as any)._id;
      const fileId = memory.files?.[0]?._id;
      await updateMemory(mid, {
        description: editDescValue.trim(),
        ...(fileId ? { fileId, fileid: fileId } : {})
      });
      setPhotoDesc(editDescValue.trim());
      setEditingDesc(false);
      try {
        const updated = await fetchMemoryById(mid);
        onUpdate?.(updated);
      } catch (e) {
        console.error('Failed to refetch memory after save:', e);
        onUpdate?.();
      }
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setSavingDesc(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const mid = memory.memoryId || (memory as any)._id;
      await deleteMemory(mid);
      
      const isText = inferredType === 'text';
      toast({
        title: isText ? 'Text Memory Deleted Successfully!' : 'Memory Deleted Successfully!',
        description: 'It will be deleted permanently.'
      });

      onDelete?.();
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[60] ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Slideshow prev arrow */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-2 sm:left-4 z-[61] p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          title="Previous memory"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Slideshow next arrow */}
      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-2 sm:right-4 z-[61] p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          title="Next memory"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Modal */}
      <div className={`relative w-full bg-white shadow-2xl flex flex-col ${isMobile ? 'rounded-t-xl rounded-b-none max-h-[90dvh] overflow-hidden' : 'max-w-2xl mx-2 sm:mx-4 rounded-xl max-h-[95vh] sm:max-h-[90vh]'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <TypeBadge type={inferredType} />
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{memory.title}</h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canNavigate && (
              <span className="text-xs text-gray-400 mr-2">
                {currentIndex + 1} / {memories.length}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Media Display */}
          <div className="bg-gray-900 flex items-center justify-center min-h-[150px] sm:min-h-[200px] relative">
            {inferredType === 'photo' && mainMediaUrl && (
              <img
                src={mainMediaUrl.startsWith('http') ? mainMediaUrl : resolveBackendUrl(mainMediaUrl)}
                alt={memory.title}
                className="max-w-full max-h-[40vh] sm:max-h-[50vh] object-contain"
              />
            )}
            {inferredType === 'video' && mainMediaUrl && (
              <div className="relative w-full max-h-[40vh] sm:max-h-[50vh] flex items-center justify-center bg-black">
                <video
                  controls
                  className="max-w-full max-h-[40vh] sm:max-h-[50vh] w-full"
                  src={mainMediaUrl.startsWith('http') ? mainMediaUrl : resolveBackendUrl(mainMediaUrl)}
                  poster={mainThumbnailUrl || undefined}
                  preload="none"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {inferredType === 'audio' && mainMediaUrl && (
              <div className="py-8 sm:py-12 px-4 sm:px-8 w-full">
                <Music className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <audio
                  controls
                  className="w-full"
                  src={mainMediaUrl.startsWith('http') ? mainMediaUrl : resolveBackendUrl(mainMediaUrl)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            {inferredType === 'text' && (
              <div className="w-full p-4 sm:p-6 bg-white">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words break-all text-gray-700">
                  {memory.textContent || memory.files?.[0]?.textContent || (typeof memory.textdata === 'string' && memory.textdata)}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="px-3 sm:px-5 py-3 sm:py-4 space-y-3">
            {/* Photo Description */}
            {inferredType === 'photo' && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Photo Description</p>
                  {!editingDesc && !pendingAiDesc && photoDesc && (
                    <button
                      onClick={() => { setEditDescValue(photoDesc); setEditingDesc(true); }}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* AI pending preview */}
                {pendingAiDesc !== null && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[#25327A] flex items-center gap-1">
                      <Gem className="w-3 h-3" /> AI Suggestion
                    </p>
                    <textarea
                      value={pendingAiDesc}
                      onChange={e => setPendingAiDesc(e.target.value)}
                      rows={4}
                      className="w-full text-sm border border-[#2F3E8F]/30 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-[#2F3E8F] bg-white"
                      placeholder="AI-generated description..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcceptAiDesc}
                        disabled={savingDesc}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50"
                      >
                        {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Accept & Add
                      </button>
                      <button
                        onClick={() => setPendingAiDesc(null)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <X className="w-3 h-3" /> Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual edit mode */}
                {!pendingAiDesc && editingDesc && (
                  <div className="space-y-2">
                    <textarea
                      value={editDescValue}
                      onChange={e => setEditDescValue(e.target.value)}
                      rows={4}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-[#2F3E8F]"
                      placeholder="Describe this photo..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDesc}
                        disabled={savingDesc}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50"
                      >
                        {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDesc(false)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved description display */}
                {!pendingAiDesc && !editingDesc && (
                  photoDesc
                    ? <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-[160px] overflow-y-auto pr-1 whitespace-pre-wrap break-words break-all custom-scrollbar">{photoDesc}</div>
                    : <p className="text-xs text-gray-400 dark:text-gray-500 italic">No description yet.</p>
                )}

                {/* Analyze & Enrich button */}
                {!pendingAiDesc && !editingDesc && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <button
                      onClick={handleGenerateDesc}
                      disabled={generatingDesc}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2F3E8F]/30 dark:border-[#8CA0FF]/30 text-[12px] text-[#25327A] dark:text-[#8CA0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#8CA0FF]/10 transition-colors disabled:opacity-50"
                    >
                      {generatingDesc ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</> : <><Gem className="w-3 h-3" />Analyze & Enrich</>}
                    </button>
                    {!photoDesc && (
                      <button
                        onClick={() => { setEditDescValue(''); setEditingDesc(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-stone-800 text-[12px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Write manually
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Description for video / audio types — editable */}
            {(inferredType === 'video' || inferredType === 'audio') && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Description</p>
                  {!editingDesc && !pendingAiDesc && photoDesc && (
                    <button
                      onClick={() => { setEditDescValue(photoDesc); setEditingDesc(true); }}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* AI pending preview */}
                {pendingAiDesc !== null && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[#25327A] flex items-center gap-1">
                      <Gem className="w-3 h-3" /> AI Suggestion
                    </p>
                    <textarea
                      value={pendingAiDesc}
                      onChange={e => setPendingAiDesc(e.target.value)}
                      rows={4}
                      className="w-full text-sm border border-[#2F3E8F]/30 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-[#2F3E8F] bg-white"
                      placeholder="AI-generated description..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcceptAiDesc}
                        disabled={savingDesc}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50"
                      >
                        {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Accept & Add
                      </button>
                      <button
                        onClick={() => setPendingAiDesc(null)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <X className="w-3 h-3" /> Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual edit mode */}
                {!pendingAiDesc && editingDesc && (
                  <div className="space-y-2">
                    <textarea
                      value={editDescValue}
                      onChange={e => setEditDescValue(e.target.value)}
                      rows={4}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-[#2F3E8F]"
                      placeholder="Describe this memory..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDesc}
                        disabled={savingDesc}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50"
                      >
                        {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDesc(false)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved description display */}
                {!pendingAiDesc && !editingDesc && (
                  photoDesc
                    ? <div className="text-sm text-gray-600 leading-relaxed max-h-[160px] overflow-y-auto pr-1 whitespace-pre-wrap break-words break-all custom-scrollbar">{photoDesc}</div>
                    : <p className="text-xs text-gray-400 italic">No description yet.</p>
                )}

                {/* Analyze & Enrich + Write manually buttons */}
                {!pendingAiDesc && !editingDesc && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {/* <button
                      onClick={handleGenerateDesc}
                      disabled={generatingDesc}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2F3E8F]/30 text-[12px] text-[#25327A] hover:bg-[#E8EDFF] transition-colors disabled:opacity-50"
                    >
                      {generatingDesc ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</> : <><Gem className="w-3 h-3" />Analyze & Enrich </>}
                    </button> */}
                    {!photoDesc && (
                      <button
                        onClick={() => { setEditDescValue(''); setEditingDesc(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Write manually
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {memory.dateTaken && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(memory.dateTaken)}
                </span>
              )}
              {memory.placeTaken && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {memory.placeTaken}
                </span>
              )}
            </div>

            {/* AI Transcription (audio/video memories) */}
            {(inferredType === 'audio' || inferredType === 'video') && (() => {
              const transcription = localTranscription || memory.textContent || memory.files?.[0]?.textContent;
              if (transcription) {
                return (
                  <div className="rounded-lg border border-[#2F3E8F]/30/60 bg-[#E8EDFF]/50 p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      Transcription
                    </p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all leading-relaxed max-h-40 overflow-y-auto">
                      {transcription}
                    </div>
                  </div>
                );
              }
              // return treeId ? (
              //   <button
              //     onClick={handleTranscribe}
              //     disabled={transcribing}
              //     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2F3E8F]/30 text-[12px] text-[#25327A] hover:bg-[#E8EDFF] transition-colors disabled:opacity-50"
              //   >
              //     {transcribing ? (
              //       <><Loader2 className="w-3 h-3 animate-spin" />Transcribing...</>
              //     ) : (
              //       <><Gem className="w-3 h-3" />Transcribe with AI</>
              //     )}
              //   </button>
              // ) : null;
            })()}

            {/* AI Ceremony Detection (photo memories) */}
            {inferredType === 'photo' && (() => {
              const ceremony = localCeremony || (memory.aiCeremonyName ? { detected: true, ceremonyName: memory.aiCeremonyName, ceremonyCategory: null, confidence: (memory.aiCeremonyConfidence || 'medium') as 'high' | 'medium' | 'low', description: null } : null);
              if (ceremony?.detected && ceremony.ceremonyName) {
                const confidenceColor = ceremony.confidence === 'high' ? 'bg-green-100 text-green-800 border-green-200' : ceremony.confidence === 'medium' ? 'bg-blue-100 text-blue-800 border-[#2F3E8F]/30' : 'bg-gray-100 text-gray-700 border-gray-200';
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border ${confidenceColor}`}>
                      <PartyPopper className="w-3 h-3" />
                      {ceremony.ceremonyName}
                    </span>
                    {ceremony.confidence !== 'low' && (
                      <span className="text-[10px] text-gray-400">
                        {ceremony.confidence} confidence
                      </span>
                    )}
                    {ceremony.description && (
                      <p className="w-full text-xs text-gray-500 mt-0.5">{ceremony.description}</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Linked Temple */}
            {linkedTempleInfo && (() => {
              const temple = getTempleById(linkedTempleInfo.templeId);
              if (!temple) return null;
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onNavigateToTemple?.(linkedTempleInfo.templeId)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8EDFF] border border-[#2F3E8F]/30 text-[12px] text-[#25327A] hover:bg-[#2F3E8F]/10 transition-colors"
                  >
                    <Landmark className="w-3 h-3" />
                    {temple.name}
                  </button>
                  {linkedTempleInfo.festival && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E8EDFF] border border-[#2F3E8F]/30/60 text-[11px] text-[#2F3E8F]">
                      {linkedTempleInfo.festival}
                    </span>
                  )}
                  {linkedTempleInfo.ritual && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E8EDFF] border border-[#2F3E8F]/30/60 text-[11px] text-[#2F3E8F]">
                      {linkedTempleInfo.ritual}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Also at this temple */}
            {templeMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <Landmark className="w-3 h-3" />
                  Also at this temple
                </p>
                <div className="flex flex-wrap gap-2">
                  {templeMembers.map((p) => (
                    <div
                      key={p.personId}
                      className="flex items-center gap-1.5 px-2 py-1 bg-[#E8EDFF] border border-[#2F3E8F]/20 rounded-full"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-200 overflow-hidden flex-shrink-0">
                        {p.profilePhotoUrl ? (
                          <img
                            src={resolveBackendUrl(p.profilePhotoUrl)}
                            alt={p.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[8px] text-[#2F3E8F] font-medium">
                            {p.firstName[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-blue-800">
                        {p.firstName} {p.lastName}
                      </span>
                      {p.memoryCount > 1 && (
                        <span className="text-[10px] text-[#2F3E8F] font-medium">{p.memoryCount}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generational Continuity Card */}
            {generationalPresence && linkedTempleInfo && (() => {
              const temple = getTempleById(linkedTempleInfo.templeId);
              if (!temple) return null;
              return (
                <div className="rounded-xl p-3 border border-[#2F3E8F]/30/60" style={{ background: 'linear-gradient(135deg, #fffbeb, #fff7ed)' }}>
                  <p className="text-[12px] font-semibold text-blue-800 mb-1.5">
                    Your family has visited {temple.name} across {generationalPresence.generationCount} generation{generationalPresence.generationCount > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {generationalPresence.persons.slice(0, 6).map(p => (
                      <div key={p.personId} className="w-7 h-7 rounded-full bg-blue-200 overflow-hidden border-2 border-white" title={`${p.firstName} ${p.lastName}`}>
                        {p.profilePhotoUrl ? (
                          <img src={resolveBackendUrl(p.profilePhotoUrl)} alt={p.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[9px] text-[#2F3E8F] font-medium">
                            {p.firstName[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Tagged Persons */}
            {(() => {
              const rawTagged = (memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.taggedPersons || memory.files?.[0]?.taggedPersons || [];
              const tagged = activePersons.length > 0
                ? rawTagged.filter((p: any) => {
                    const pid = p.id || p.personId;
                    return activePersons.some((ap: any) => ap.personId === pid);
                  })
                : rawTagged;
              if (tagged.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Tagged People</p>
                  <div className="flex flex-wrap gap-2">
                    {tagged.map((p: any) => {
                      const id = p.id || p.personId;
                      const firstName = p.firstName || (p.name ? p.name.split(' ')[0] : 'Unknown');
                      const lastName = p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : '');
                      const photoUrl = p.profilePhotoUrl || p.profileImageUrl || p.profilePhoto || p.image;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-white/5 rounded-full"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex-shrink-0">
                            <PersonAvatar
                              photoUrl={photoUrl}
                              firstName={firstName}
                              lastName={lastName}
                              fullName={p.name}
                              textClassName="text-[8px]"
                            />
                          </div>
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {firstName} {lastName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Similar Memories */}
            {!loadingSimilar && similarMemories.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <Gem className="w-3 h-3" />
                  Similar Memories
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {similarMemories.map((sm) => (
                    <div
                      key={sm.memoryId}
                      className="shrink-0 w-24 sm:w-28 cursor-pointer group"
                      onClick={() => {
                        if (memories && onNavigate) {
                          const idx = memories.findIndex(m => m.memoryId === sm.memoryId);
                          if (idx >= 0) onNavigate(idx);
                        }
                      }}
                    >
                      <div className="w-full aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 group-hover:border-[#2F3E8F]/40 transition-colors relative">
                        {sm.thumbnailUrl ? (
                          <img src={resolveBackendUrl(sm.thumbnailUrl)} alt={sm.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : sm.memoryType === 'photo' && sm.mediaUrl ? (
                          <img src={resolveBackendUrl(sm.mediaUrl)} alt={sm.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : sm.memoryType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Video className="w-6 h-6 text-gray-400" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        {sm.memoryType === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                              <Video className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 line-clamp-2 leading-tight">{sm.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Added {formatDate(memory.createdAt)}
          </p>
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-7 text-xs text-[#2F3E8F] hover:text-[#25327A] hover:bg-[#E8EDFF]"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
