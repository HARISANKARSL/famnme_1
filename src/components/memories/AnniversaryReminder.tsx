/**
 * AnniversaryReminder — in-app notification for memory anniversaries
 */

import { useMemo, useState } from 'react';
import { Cake, X } from 'lucide-react';
import type { Memory } from '@/types';

interface AnniversaryReminderProps {
  memories: Memory[];
  onMemoryClick: (memoryId: string) => void;
}

interface Anniversary {
  memory: Memory;
  yearsAgo: number;
}

export function AnniversaryReminder({ memories, onMemoryClick }: AnniversaryReminderProps) {
  const [dismissed, setDismissed] = useState(false);

  const anniversaries = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), d = now.getDate(), y = now.getFullYear();
    const results: Anniversary[] = [];

    for (const mem of memories) {
      if (!mem.dateTaken) continue;
      const dt = new Date(mem.dateTaken);
      if (dt.getMonth() !== m || dt.getDate() !== d) continue;
      const yearsAgo = y - dt.getFullYear();
      if (yearsAgo <= 0) continue;
      // Only show significant anniversaries (5, 10, 15, 20, 25, 50, or any year > 0)
      results.push({ memory: mem, yearsAgo });
    }

    return results.sort((a, b) => b.yearsAgo - a.yearsAgo);
  }, [memories]);

  if (anniversaries.length === 0 || dismissed) return null;

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-[#E8EDFF]/50 dark:bg-blue-950/10">
      <div className="px-5 sm:px-8 py-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 shrink-0 mt-0.5">
            <Cake className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-blue-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            {anniversaries.map(({ memory, yearsAgo }) => (
              <button
                key={memory.memoryId}
                onClick={() => onMemoryClick(memory.memoryId)}
                className="block w-full text-left group"
              >
                <p className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5]">
                  <span className="font-semibold">Today marks {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'}</span>
                  {' '}since{' '}
                  <span className="text-[#2F3E8F] group-hover:underline">{memory.title}</span>
                </p>
              </button>
            ))}
          </div>
          <button onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] shrink-0">
            <X className="w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
