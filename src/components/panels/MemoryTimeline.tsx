/**
 * MemoryTimeline - Vertical timeline grouping memories by year/month
 */

import { useMemo } from 'react';
import { Camera, Video, Music, FileText } from 'lucide-react';
import type { Memory } from '@/types';

interface MemoryTimelineProps {
  memories: Memory[];
  onMemoryClick: (memory: Memory) => void;
}

function getDateKey(memory: Memory): { year: number; month: number } {
  const dateStr = memory.dateTaken || memory.createdAt;
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function TypeIcon({ type }: { type: Memory['memoryType'] }) {
  const cls = 'w-3.5 h-3.5';
  switch (type) {
    case 'photo': return <Camera className={`${cls} text-[#2F3E8F]`} />;
    case 'video': return <Video className={`${cls} text-purple-500`} />;
    case 'audio': return <Music className={`${cls} text-blue-500`} />;
    case 'text': return <FileText className={`${cls} text-[#2F3E8F]`} />;
  }
}

interface TimelineGroup {
  year: number;
  month: number;
  label: string;
  memories: Memory[];
}

export function MemoryTimeline({ memories, onMemoryClick }: MemoryTimelineProps) {
  const groups = useMemo(() => {
    const map = new Map<string, TimelineGroup>();

    for (const m of memories) {
      const { year, month } = getDateKey(m);
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, {
          year,
          month,
          label: `${MONTH_NAMES[month]} ${year}`,
          memories: [],
        });
      }
      map.get(key)!.memories.push(m);
    }

    // Sort groups newest first
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [memories]);

  let lastYear: number | null = null;

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />

      {groups.map((group) => {
        const showYear = group.year !== lastYear;
        lastYear = group.year;

        return (
          <div key={`${group.year}-${group.month}`} className="relative mb-4">
            {/* Year header */}
            {showYear && (
              <div className="relative flex items-center mb-3 ml-0">
                <div className="w-6 h-6 rounded-full bg-[#2F3E8F] text-white text-[10px] font-bold flex items-center justify-center z-10">
                  {String(group.year).slice(-2)}
                </div>
                <span className="ml-2 text-sm font-semibold text-gray-800">{group.year}</span>
              </div>
            )}

            {/* Month sub-header */}
            <div className="relative flex items-center mb-2 ml-0">
              <div className="w-6 h-6 flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              </div>
              <span className="ml-2 text-xs font-medium text-gray-500">{MONTH_NAMES[group.month]}</span>
            </div>

            {/* Memory cards in this group */}
            <div className="ml-8 space-y-2">
              {group.memories.map((m) => (
                <button
                  key={m.memoryId}
                  onClick={() => onMemoryClick(m)}
                  className="w-full flex items-center gap-3 p-2.5 bg-white border border-gray-100 rounded-lg hover:border-[#E8D5C4] hover:shadow-sm transition-all text-left"
                >
                  {/* Thumbnail or icon */}
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {(m.memoryType === 'photo' || m.memoryType === 'video') && (m.thumbnailUrl || m.mediaUrl) ? (
                      <img
                        src={m.thumbnailUrl || m.mediaUrl || ''}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <TypeIcon type={m.memoryType} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.title}</p>
                    {m.description && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <TypeIcon type={m.memoryType} />
                      {((m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.taggedPersons || m.files?.[0]?.taggedPersons || []).length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {((m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.taggedPersons || m.files?.[0]?.taggedPersons || []).length} tagged
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
