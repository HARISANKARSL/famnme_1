import { useMemo } from 'react';
import { Camera, Landmark } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { getEraForYear } from '@/constants/timelineEras';
import { getEventsInRange } from '@/data/historicalEvents';
import type { Memory } from '@/types';

interface MemoriesTimelineProps {
  memories: Memory[];
  onMemoryClick: (index: number) => void;
  loading: boolean;
}

function getYear(m: Memory): number {
  return new Date(m.dateTaken || m.createdAt).getFullYear();
}

function getDecade(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

interface YearGroup { year: number; memories: Memory[]; indices: number[] }

export function MemoriesTimeline({ memories, onMemoryClick, loading }: MemoriesTimelineProps) {
  const yearGroups = useMemo(() => {
    const map = new Map<number, YearGroup>();
    memories.forEach((m, idx) => {
      const year = getYear(m);
      if (!map.has(year)) map.set(year, { year, memories: [], indices: [] });
      const g = map.get(year)!;
      g.memories.push(m);
      g.indices.push(idx);
    });
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [memories]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-8 h-8 border-2 border-[#2F3E8F] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-[#8B7355] dark:text-[#666]">Loading timeline...</p>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center">
          <Camera className="w-6 h-6 text-[#C4B5A5] dark:text-[#555]" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-[#8B7355] dark:text-[#666]">No memories to display</p>
      </div>
    );
  }

  let lastDecade = '';
  let lastEraId = '';

  return (
    <div className="relative pl-10 max-w-5xl">
      {/* Timeline line */}
      <div className="absolute left-[14px] top-4 bottom-4 w-[1.5px] bg-[#E2E8F0]/80 dark:bg-[#2a2a2a]" />

      {yearGroups.map((group) => {
        const decade = getDecade(group.year);
        const showDecade = decade !== lastDecade;
        lastDecade = decade;

        // Era header
        const era = getEraForYear(group.year);
        const showEra = era && era.id !== lastEraId;
        if (era) lastEraId = era.id;

        // Historical events for this year
        const events = getEventsInRange(group.year, group.year);

        return (
          <div key={group.year} className="relative mb-10">
            {/* Era header */}
            {showEra && era && (
              <div className="relative mb-6 -ml-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3D2E1F] dark:bg-[#f5f5f5] z-10 relative">
                  <span className="text-[13px] font-bold text-white dark:text-[#3D2E1F]">{era.label}</span>
                  <span className="text-[10px] text-white/60 dark:text-[#3D2E1F]/60">{era.description}</span>
                </div>
              </div>
            )}

            {/* Decade marker */}
            {showDecade && (
              <div className="relative flex items-center mb-5 -ml-10">
                <div className="h-6 px-3 rounded-full text-[11px] font-bold flex items-center justify-center z-10 text-white"
                  style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)', boxShadow: '0 2px 8px rgba(192,106,62,0.2)' }}>
                  {decade}
                </div>
                <div className="ml-3 h-px flex-1 bg-[#E2E8F0]/60 dark:bg-[#2a2a2a]" />
              </div>
            )}

            {/* Historical event markers */}
            {/* {events.map(event => (
              <div key={event.title} className="relative flex items-center mb-3 -ml-10">
                <div className="w-[30px] flex items-center justify-center z-10">
                  <div className="w-[8px] h-[8px] rounded-full bg-blue-400 dark:bg-[#E8EDFF]0" />
                </div>
                <div className="ml-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8EDFF] dark:bg-blue-950/20 border border-[#2F3E8F]/30/60 dark:border-blue-800/30">
                  <Landmark className="w-3 h-3 text-[#2F3E8F] dark:text-blue-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300">{event.title}</span>
                  <span className="text-[10px] text-[#2F3E8F]/60 dark:text-blue-400/60">{event.year}</span>
                </div>
              </div>
            ))} */}

            {/* Year header */}
            {(() => {
              const festivalAnnotations = [...new Set(group.memories.map(m => m.templeFestival).filter(Boolean) as string[])];
              return (
                <div className="relative flex items-center flex-wrap gap-y-1 mb-4 -ml-10">
                  <div className="w-[30px] flex items-center justify-center z-10">
                    <div className="w-[10px] h-[10px] rounded-full bg-white dark:bg-[#1E1E1E] border-2 border-[#2F3E8F]" />
                  </div>
                  <span className="ml-2.5 text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{group.year}</span>
                  <span className="ml-2 text-[11px] text-[#B8A090] dark:text-[#666] font-medium">{group.memories.length} {group.memories.length === 1 ? 'memory' : 'memories'}</span>
                  {festivalAnnotations.map(festival => (
                    <span key={festival} className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8EDFF] dark:bg-blue-950/20 border border-[#2F3E8F]/30/60 dark:border-blue-700/30 text-[10px] text-[#2F3E8F] dark:text-blue-400 font-medium">
                      <Landmark className="w-2.5 h-2.5" />
                      {festival}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.memories.map((m, localIdx) => (
                <MemoryCard
                  key={m.memoryId}
                  memory={m}
                  onClick={() => onMemoryClick(group.indices[localIdx])}
                  objectFit="contain"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
