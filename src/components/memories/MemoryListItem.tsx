import { useState } from 'react';
import { Camera, Video, Music, FileText, BookOpen, Check, Play } from 'lucide-react';
import type { Memory } from '@/types';
import { resolveBackendUrl } from '@/config/api';
import { useNeo4jTreeStore } from '@/store/neo4jTreeStore';

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

interface MemoryListItemProps {
  memory: Memory;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

function TypeIcon({ type }: { type: Memory['memoryType'] | 'document' }) {
  const cls = 'w-3.5 h-3.5';
  switch (type) {
    case 'photo': return <Camera className={`${cls} text-[#2F3E8F]`} strokeWidth={1.5} />;
    case 'video': return <Video className={`${cls} text-[#9061ff]`} strokeWidth={1.5} />;
    case 'audio': return <Music className={`${cls} text-[#ecb730]`} strokeWidth={1.5} />;
    case 'text': return <BookOpen className={`${cls} text-[#2a6dfb]`} strokeWidth={1.5} />;
    case 'document': return <FileText className={`${cls} text-[#C2A46D]`} strokeWidth={1.5} />;
  }
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

const isDocumentFile = (url?: string | null): boolean => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  const docExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.csv', '.txt', '.rtf', '.odt', '.ods', '.odp'
  ];
  return docExtensions.some(ext => cleanUrl.endsWith(ext));
};

export function MemoryListItem({ memory, onClick, selectable, selected, onSelect }: MemoryListItemProps) {
  const storePersons = useNeo4jTreeStore((state) => state.persons);
  const activePersons = storePersons.filter((p: any) => !p.isDeleted);

  const files = memory.files || [];
  const firstFile = files.length > 0 ? files[0] : null;

  const isDoc = (() => {
    if (memory.memoryType === 'document' || (memory.memoryType as string) === 'document') return true;
    const file = firstFile;
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
      return true;
    }
    return false;
  })();

  const inferredType = (memory.memoryType ||
    (firstFile?.fileType?.startsWith('video/') ? 'video' :
      firstFile?.fileType?.startsWith('audio/') ? 'audio' :
        isDoc ? 'document' :
          (memory.textdata || memory.textContent || memory.files?.[0]?.textContent) ? 'text' : 'photo')
  ) as Memory['memoryType'] | 'document';

  const thumbnailUrl = firstFile?.thumbnailSignedUrl || firstFile?.signedUrl || firstFile?.thumbnailUrl || firstFile?.fileUrl || memory.thumbnailUrl || memory.mediaUrl || '';
  const hasThumbnail = !!thumbnailUrl && inferredType !== 'text' && inferredType !== 'document';

  return (
    <button
      onClick={selectable && onSelect ? onSelect : onClick}
      className={`w-full flex items-center gap-3.5 px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg border transition-all duration-150 text-left group active:bg-black/[0.03] ${selected
          ? 'border-[#2F3E8F]/30 bg-[#2F3E8F]/[0.04]'
          : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
        }`}
    >
      {selectable && (
        <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150 ${selected ? 'bg-[#C2A46D] border-[#C2A46D]' : 'border-[#E2DBCE] dark:border-[#444] group-hover:border-[#C2A46D]/50'
          }`}>
          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
        </div>
      )}

      <div className="w-14 h-14 md:w-10 md:h-10 rounded-xl md:rounded-lg bg-black/[0.03] dark:bg-white/[0.04] flex-shrink-0 overflow-hidden flex items-center justify-center relative">
        {hasThumbnail ? (
          <img src={thumbnailUrl.startsWith('http') ? thumbnailUrl : resolveBackendUrl(thumbnailUrl)} alt={memory.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <TypeIcon type={inferredType} />
        )}
        {memory.memoryType === 'video' && hasThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-3 h-3 md:w-2.5 md:h-2.5 text-white fill-white ml-px" />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] md:text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{memory.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <TypeIcon type={inferredType} />
          {memory.dateTaken && <span className="text-[12px] md:text-[11px] text-[#8B7355] dark:text-[#666] tabular-nums">{formatDate(memory.dateTaken)}</span>}
          {memory.category && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/[0.03] dark:bg-white/[0.04] text-[#8B7355] dark:text-[#999]">
              {memory.category}
            </span>
          )}
        </div>
      </div>

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
          <div className="flex items-center -space-x-1 shrink-0">
            {tagged.slice(0, 3).map((p: any) => {
              const id = p.id || p.personId;
              const firstName = p.firstName || (p.name ? p.name.split(' ')[0] : 'Unknown');
              const lastName = p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : '');
              const photoUrl = p.profilePhotoUrl || p.profileImageUrl || p.profilePhoto || p.image;
              return (
                <div key={id} className="w-6 h-6 rounded-full border-[1.5px] border-white dark:border-[#1a1a1a] bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden" title={`${firstName} ${lastName}`}>
                  <PersonAvatar
                    photoUrl={photoUrl}
                    firstName={firstName}
                    lastName={lastName}
                    fullName={p.name}
                    textClassName="text-[8px]"
                  />
                </div>
              );
            })}
            {tagged.length > 3 && (
              <div className="w-6 h-6 rounded-full border-[1.5px] border-white dark:border-[#1a1a1a] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
                <span className="text-[8px] text-[#8B7355] font-semibold">+{tagged.length - 3}</span>
              </div>
            )}
          </div>
        );
      })()}
    </button>
  );
}
