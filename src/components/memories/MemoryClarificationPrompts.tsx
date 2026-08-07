/**
 * MemoryClarificationPrompts — "Help Us Remember"
 * Shows incomplete memories that need metadata (no date, no tags, no place)
 * and prompts family members to fill in the gaps
 */

import { useState, useMemo } from 'react';
import { HelpCircle, Calendar, MapPin, Users, X, ChevronRight } from 'lucide-react';
import type { Memory } from '@/types';

interface MemoryClarificationPromptsProps {
  memories: Memory[];
  onMemoryClick: (memoryId: string) => void;
}

interface IncompleteMemory {
  memory: Memory;
  missing: ('date' | 'place' | 'tags')[];
}

export function MemoryClarificationPrompts({ memories, onMemoryClick }: MemoryClarificationPromptsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const incompleteMemories = useMemo(() => {
    const results: IncompleteMemory[] = [];
    for (const m of memories) {
      const missing: ('date' | 'place' | 'tags')[] = [];
      if (!m.dateTaken) missing.push('date');
      if (!m.placeTaken) missing.push('place');
      const tagged = m.taggedPersons || (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.files?.[0]?.taggedPersons || [];
      if (tagged.length === 0) missing.push('tags');
      if (missing.length >= 2) results.push({ memory: m, missing });
    }
    return results.slice(0, 5);
  }, [memories]);

  if (incompleteMemories.length === 0 || dismissed) return null;

  const MISSING_ICONS = {
    date: { icon: Calendar, label: 'Date' },
    place: { icon: MapPin, label: 'Place' },
    tags: { icon: Users, label: 'People' },
  };

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-[#E8EDFF]/30 dark:bg-blue-950/10">
      <div className="px-5 sm:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 shrink-0">
            <HelpCircle className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-blue-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Help Us Remember</p>
            <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{incompleteMemories.length} memories need more details</p>
          </div>
          <button onClick={() => setExpanded(!expanded)}
            className="text-[12px] font-medium text-[#2F3E8F] dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1">
            {expanded ? 'Hide' : 'Show'}
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <button onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
            <X className="w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            {incompleteMemories.map(({ memory, missing }) => (
              <button
                key={memory.memoryId}
                onClick={() => onMemoryClick(memory.memoryId)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-white/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{memory.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {missing.map(m => {
                      const { icon: Icon, label } = MISSING_ICONS[m];
                      return (
                        <span key={m} className="flex items-center gap-1 text-[10px] text-[#2F3E8F] dark:text-blue-400">
                          <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
                          Missing {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#B8A090] dark:text-[#666] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
