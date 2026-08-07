/**
 * ParallelTimeline — Cross-member parallel timeline
 * Select 2-4 family members, see memories on parallel color-coded tracks
 */

import { useState, useMemo } from 'react';
import { X, Search, Users } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { resolveBackendUrl } from '@/config/api';
import type { Memory } from '@/types';

interface ParallelTimelineProps {
  allMemories: Memory[];
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>;
  onMemoryClick: (memoryId: string) => void;
  onClose: () => void;
}

const TRACK_COLORS = ['#2F3E8F', '#6366f1', '#10b981', '#60a5fa'];

function getYear(m: Memory): number {
  return new Date(m.dateTaken || m.createdAt).getFullYear();
}

export function ParallelTimeline({ allMemories, persons, onMemoryClick, onClose }: ParallelTimelineProps) {
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const filteredPersons = persons.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q);
  });

  const togglePerson = (personId: string) => {
    setSelectedPersonIds(prev => {
      if (prev.includes(personId)) return prev.filter(id => id !== personId);
      if (prev.length >= 4) return prev;
      return [...prev, personId];
    });
  };

  // Group memories by year for each selected person
  const { years, trackData } = useMemo(() => {
    if (selectedPersonIds.length < 2) return { years: [], trackData: [] };

    const tracks = selectedPersonIds.map(pid => {
      const personMemories = allMemories.filter(m => {
        const tagged = m.taggedPersons || (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.files?.[0]?.taggedPersons || [];
        return tagged.some((tp: any) => (tp.personId || tp.id) === pid);
      });
      const byYear = new Map<number, Memory[]>();
      personMemories.forEach(m => {
        const y = getYear(m);
        if (!byYear.has(y)) byYear.set(y, []);
        byYear.get(y)!.push(m);
      });
      return { personId: pid, byYear };
    });

    const allYears = new Set<number>();
    tracks.forEach(t => t.byYear.forEach((_, y) => allYears.add(y)));
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);

    return { years: sortedYears, trackData: tracks };
  }, [selectedPersonIds, allMemories]);

  const selectedPersons = selectedPersonIds.map(id => persons.find(p => p.personId === id)!).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[55] bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
        <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <X className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Parallel Timeline</h1>
          <p className="text-[12px] text-[#8B7355] dark:text-[#999]">Compare memories across 2-4 family members</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Person selector sidebar */}
        <div className="w-64 border-r border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex flex-col shrink-0">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#B8A090]" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[#3D2E1F] dark:text-[#f5f5f5] focus:border-[#2F3E8F] outline-none"
              />
            </div>
            <p className="text-[10px] text-[#B8A090] dark:text-[#666] mt-2">{selectedPersonIds.length}/4 selected</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filteredPersons.map(p => {
              const selected = selectedPersonIds.includes(p.personId);
              const colorIdx = selectedPersonIds.indexOf(p.personId);
              return (
                <button
                  key={p.personId}
                  onClick={() => togglePerson(p.personId)}
                  disabled={!selected && selectedPersonIds.length >= 4}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                    selected
                      ? 'bg-[#2F3E8F]/[0.06] dark:bg-[#2F3E8F]/10'
                      : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03] disabled:opacity-30'
                  }`}
                >
                  {selected && (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TRACK_COLORS[colorIdx] }} />
                  )}
                  <div className="w-6 h-6 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden shrink-0">
                    {p.profilePhotoUrl ? (
                      <img src={resolveBackendUrl(p.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[9px] text-[#8B7355] font-semibold">{p.firstName[0]}</span>
                    )}
                  </div>
                  <span className="text-[12px] text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{p.firstName} {p.lastName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline content */}
        <div className="flex-1 overflow-auto p-6">
          {selectedPersonIds.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#C4B5A5] dark:text-[#555]" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-[#8B7355] dark:text-[#666]">Select at least 2 people to compare timelines</p>
            </div>
          ) : (
            <div>
              {/* Track headers */}
              <div className="flex gap-4 mb-6 sticky top-0 bg-white dark:bg-[#0a0a0a] z-10 pb-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
                <div className="w-16 shrink-0" />
                {selectedPersons.map((p, i) => (
                  <div key={p.personId} className="flex-1 min-w-[140px] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: TRACK_COLORS[i] }} />
                    <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{p.firstName} {p.lastName}</span>
                  </div>
                ))}
              </div>

              {/* Year rows */}
              {years.map(year => (
                <div key={year} className="flex gap-4 mb-6">
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-[14px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5]">{year}</span>
                  </div>
                  {trackData.map((track, i) => {
                    const memories = track.byYear.get(year) || [];
                    return (
                      <div key={track.personId} className="flex-1 min-w-[140px]">
                        <div className="border-l-2 pl-3 min-h-[40px]" style={{ borderColor: TRACK_COLORS[i] }}>
                          {memories.length === 0 ? (
                            <div className="h-10 flex items-center">
                              <div className="w-full h-px bg-[#E2E8F0]/30 dark:bg-[#2a2a2a]" />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {memories.slice(0, 3).map(m => (
                                <div key={m.memoryId} className="w-32">
                                  <MemoryCard memory={m} onClick={() => onMemoryClick(m.memoryId)} />
                                </div>
                              ))}
                              {memories.length > 3 && (
                                <p className="text-[10px] text-[#B8A090] dark:text-[#666]">+{memories.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {years.length === 0 && (
                <p className="text-center text-[13px] text-[#8B7355] dark:text-[#666] py-12">No tagged memories found for selected people</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
