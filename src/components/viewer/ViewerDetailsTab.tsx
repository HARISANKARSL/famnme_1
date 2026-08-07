/**
 * ViewerDetailsTab - Details sidebar tab for FullPageMediaViewer
 */

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Tag, Camera, Video, Music, FileText, Shield, Gem, Loader2, Mic, PartyPopper, Pencil, Check, X } from 'lucide-react';
import type { Memory } from '@/types';
import { resolveBackendUrl, API_BASE_URL } from '@/config/api';
import { transcribeMemory, uploadAIDescriptionUrl, updateMemory, fetchMemoryById } from '@/services/memoriesApiService';
import type { CeremonyDetectionResult } from '@/services/memoriesApiService';
import { useNeo4jTreeStore } from '@/store/neo4jTreeStore';

interface SimilarMemory {
  memoryId: string;
  title: string;
  memoryType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
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

interface ViewerDetailsTabProps {
  memory: Memory;
  treeId?: string;
  onNavigateToMemory?: (memoryId: string) => void;
  onUpdate?: (updatedMemory?: Memory) => void;
  currentMediaType?: 'photo' | 'video' | 'audio' | 'text' | 'document';
  persons?: any[];
  readOnly?: boolean;
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
  } catch { return dateStr; }
}

const TYPE_CONFIG = {
  photo: { icon: Camera, label: 'Photo', color: 'text-[#2F3E8F] bg-[#E8EDFF]' },
  video: { icon: Video, label: 'Video', color: 'text-purple-600 bg-purple-50' },
  audio: { icon: Music, label: 'Audio', color: 'text-[#2F3E8F] bg-[#E8EDFF]' },
  text: { icon: FileText, label: 'Text', color: 'text-[#2F3E8F] bg-[#E8EDFF]' },
  document: { icon: FileText, label: 'Document', color: 'text-[#C2A46D] bg-[#C2A46D]/10' },
};

const PRIVACY_LABELS: Record<string, string> = { private: 'Private', close_family: 'Close Family', tree: 'Tree Members', public: 'Public' };

export function ViewerDetailsTab({ memory, treeId, onNavigateToMemory, onUpdate, currentMediaType, persons, readOnly = false }: ViewerDetailsTabProps) {
  const storePersons = useNeo4jTreeStore((state) => state.persons);
  const activePersons = (persons && persons.length > 0 ? persons : storePersons)
    .filter((p: any) => !p.isDeleted);

  const inferredType = currentMediaType || (() => {
    if (memory.memoryType === 'text' || memory.textdata || memory.textContent || !!memory.files?.[0]?.textContent) return 'text';
    const file = memory.files?.[0];
    if (file?.fileType?.startsWith('video/')) return 'video';
    if (file?.fileType?.startsWith('audio/')) return 'audio';
    return memory.memoryType || 'photo';
  })();
  const typeConf = TYPE_CONFIG[inferredType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.photo;
  const TypeIcon = typeConf.icon;
  const [similarMemories, setSimilarMemories] = useState<SimilarMemory[]>([]);

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

  const handleTranscribe = async () => {
    if (!treeId) return;
    setTranscribing(true);
    try {
      const mid = memory.memoryId || (memory as any)._id;
      const result = await transcribeMemory(treeId, mid);
      if (result.transcription) setLocalTranscription(result.transcription);
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

  useEffect(() => {
    if (!treeId || !memory?.memoryId) { setSimilarMemories([]); return; }
    let cancelled = false;
    const token = localStorage.getItem('auth_token');
    const base = API_BASE_URL.replace(/\/api$/, '');
    fetch(`${base}/api/tree/${treeId}/memories/${memory.memoryId}/similar?limit=6`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data?.similar) setSimilarMemories(data.similar); })
      .catch(() => { })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [treeId, memory?.memoryId]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{memory.title}</h3>
      </div>

      {/* Photo Description */}
      {inferredType === 'photo' && (
        <div className="rounded-lg border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Photo Description</p>
            {!readOnly && !editingDesc && !pendingAiDesc && photoDesc && (
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

          {/* Analyze & Enrich button (always available when not in pending/edit mode) */}
          {!readOnly && !pendingAiDesc && !editingDesc && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                onClick={handleGenerateDesc}
                disabled={generatingDesc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2F3E8F]/30 dark:border-[#8CA0FF]/30 text-[12px] text-[#25327A] dark:text-[#8CA0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#8CA0FF]/10 transition-colors disabled:opacity-50"
              >
                {generatingDesc ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</> : <><Gem className="w-3 h-3" />Analyze & Enrich </>}
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

      {/* Description for non-photo types */}
      {inferredType !== 'photo' && memory.description && (
        <div className="text-sm text-gray-600 max-h-[160px] overflow-y-auto pr-1 whitespace-pre-wrap break-words break-all custom-scrollbar">{memory.description}</div>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConf.color}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConf.label}
        </span>
        {memory.category && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Tag className="w-3 h-3" />
            {memory.category}
          </span>
        )}
        {/* <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          <Shield className="w-3 h-3" />
          {memory.privacy ? (PRIVACY_LABELS[memory.privacy] || memory.privacy) : 'Tree Members'}
        </span> */}
      </div>

      {/* AI Transcription (audio/video) */}
      {(inferredType === 'audio' || inferredType === 'video') && (() => {
        const transcription = localTranscription || memory.textContent || memory.files?.[0]?.textContent;
        if (transcription) {
          return (
            <div className="rounded-lg border border-[#2F3E8F]/30/60 bg-[#E8EDFF]/50 dark:bg-[#1A1F35] p-3">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Transcription
              </p>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words break-all leading-relaxed max-h-40 overflow-y-auto">
                {transcription}
              </div>
              {memory.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal bg-stone-50 dark:bg-black/20 p-4 rounded-2xl border border-stone-100 dark:border-white/5 italic">
                  "{memory.description}"
                </p>
              )}
            </div>
          );
        }
        // return treeId ? (
        //   <button
        //     onClick={handleTranscribe}
        //     disabled={transcribing}
        //     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2F3E8F]/30 text-[12px] text-[#25327A] dark:text-[#A0B0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#2F3E8F]/20 transition-colors disabled:opacity-50"
        //   >
        //     {transcribing ? (
        //       <><Loader2 className="w-3 h-3 animate-spin" />Transcribing...</>
        //     ) : (
        //       <><Gem className="w-3 h-3" />Transcribe with AI</>
        //     )}
        //   </button>
        // ) : null;
      })()}

      {/* Ceremony badge (show only if already detected) */}
      {inferredType === 'photo' && (() => {
        const ceremony = localCeremony || (memory.aiCeremonyName ? { detected: true, ceremonyName: memory.aiCeremonyName, ceremonyCategory: null, confidence: (memory.aiCeremonyConfidence || 'medium') as 'high' | 'medium' | 'low', description: null } : null);
        if (!ceremony?.detected || !ceremony.ceremonyName) return null;
        const confidenceColor = ceremony.confidence === 'high' ? 'bg-green-100 text-green-800 border-green-200' : ceremony.confidence === 'medium' ? 'bg-blue-100 text-blue-800 border-[#2F3E8F]/30' : 'bg-gray-100 text-gray-700 border-gray-200';
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border ${confidenceColor}`}>
              <PartyPopper className="w-3 h-3" />
              {ceremony.ceremonyName}
            </span>
            {ceremony.confidence !== 'low' && (
              <span className="text-[10px] text-gray-400">{ceremony.confidence} confidence</span>
            )}
            {ceremony.description && (
              <p className="w-full text-xs text-gray-500 mt-0.5">{ceremony.description}</p>
            )}
          </div>
        );
      })()}

      {/* Metadata */}
      <div className="space-y-2">
        {memory.dateTaken && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            {formatDate(memory.dateTaken)}
          </div>
        )}
        {(memory.place || (memory as any).placeTaken) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            {memory.place || (memory as any).placeTaken}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          Added {formatDate(memory.createdAt)}
        </div>
      </div>

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
            <div className="space-y-1.5">
              {tagged.map((p: any) => {
                const id = p.id || p.personId;
                const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
                const firstName = p.firstName || (p.name ? p.name.split(' ')[0] : 'Unknown');
                const lastName = p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : '');
                const photoUrl = p.profilePhotoUrl || p.profileImageUrl || p.profilePhoto || p.image;
                return (
                  <div key={id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex-shrink-0">
                      <PersonAvatar
                        photoUrl={photoUrl}
                        firstName={firstName}
                        lastName={lastName}
                        fullName={name}
                        textClassName="text-[10px]"
                      />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Similar Memories */}
      {similarMemories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Gem className="w-3 h-3" />
            Similar Memories
          </p>
          <div className="grid grid-cols-3 gap-2">
            {similarMemories.map((sm) => (
              <div
                key={sm.memoryId}
                className="cursor-pointer group"
                onClick={() => onNavigateToMemory?.(sm.memoryId)}
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
  );
}
