/**
 * LifePhaseView — group a person's memories by life phase
 */

import { useMemo } from 'react';
import { Baby, GraduationCap, Briefcase, Heart, Camera } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { LIFE_PHASES, getAgeAtDate, getPhaseForAge } from '@/utils/lifePhaseUtils';
import type { Memory } from '@/types';

interface LifePhaseViewProps {
  memories: Memory[];
  personDob: string | null;
  onMemoryClick: (index: number) => void;
}

const PHASE_ICONS: Record<string, typeof Baby> = {
  childhood: Baby,
  'young-adult': GraduationCap,
  adulthood: Briefcase,
  elder: Heart,
};

const PHASE_COLORS: Record<string, string> = {
  childhood: '#60a5fa',
  'young-adult': '#a78bfa',
  adulthood: '#60a5fa',
  elder: '#ef4444',
};

interface PhaseGroup {
  phase: typeof LIFE_PHASES[0];
  memories: Memory[];
  indices: number[];
}

export function LifePhaseView({ memories, personDob, onMemoryClick }: LifePhaseViewProps) {
  const groups = useMemo(() => {
    if (!personDob) return [];

    const phaseMap = new Map<string, PhaseGroup>();
    LIFE_PHASES.forEach(p => phaseMap.set(p.id, { phase: p, memories: [], indices: [] }));

    memories.forEach((m, idx) => {
      const date = m.dateTaken || m.createdAt;
      const age = getAgeAtDate(personDob, date);
      if (age === null) return;
      const phase = getPhaseForAge(age);
      const group = phaseMap.get(phase.id);
      if (group) {
        group.memories.push(m);
        group.indices.push(idx);
      }
    });

    return Array.from(phaseMap.values()).filter(g => g.memories.length > 0);
  }, [memories, personDob]);

  if (!personDob) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-[13px] text-[#8B7355] dark:text-[#666]">Date of birth needed for life phase view</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center">
          <Camera className="w-6 h-6 text-[#C4B5A5] dark:text-[#555]" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-[#8B7355] dark:text-[#666]">No memories to display by life phase</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {groups.map(({ phase, memories: phaseMemories, indices }) => {
        const Icon = PHASE_ICONS[phase.id] || Heart;
        const color = PHASE_COLORS[phase.id] || '#2F3E8F';
        return (
          <div key={phase.id}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{phase.label}</h3>
                <p className="text-[11px] text-[#8B7355] dark:text-[#666]">
                  Ages {phase.startAge}–{phase.endAge > 100 ? '...' : phase.endAge} · {phaseMemories.length} {phaseMemories.length === 1 ? 'memory' : 'memories'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {phaseMemories.map((m, localIdx) => (
                <MemoryCard key={m.memoryId} memory={m} onClick={() => onMemoryClick(indices[localIdx])} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
