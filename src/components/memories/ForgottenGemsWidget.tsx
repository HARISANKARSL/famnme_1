import { useState, useMemo } from 'react';
import { Gem, X } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import type { Memory } from '@/types';

interface ForgottenGemsWidgetProps {
  memories: Memory[];
  onMemoryClick: (memoryId: string) => void;
  inline?: boolean;
}

export function ForgottenGemsWidget({ memories, onMemoryClick, inline = false }: ForgottenGemsWidgetProps) {
  const [dismissed, setDismissed] = useState(false);

  const gems = useMemo(() => {
    // Deduplicate batch uploads first
    const seenBatch = new Set<string>();
    const withMedia = memories.filter(m => {
      if (!m.mediaUrl) return false;
      const ts = m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 120000) : 0;
      const key = `${(m.title || '').replace(/\s*\(\d+\)\s*$/, '').trim()}__${m.memoryType}__${ts}`;
      if (seenBatch.has(key)) return false;
      seenBatch.add(key);
      return true;
    });
    if (withMedia.length < 4) return [];

    const sorted = [...withMedia].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const oldHalf = sorted.slice(0, Math.ceil(sorted.length / 2));

    // Date-seeded pseudo-random selection (changes daily)
    const daySeed = Math.floor(Date.now() / 86400000);
    const pick = (arr: Memory[], count: number): Memory[] => {
      const result: Memory[] = [];
      const pool = [...arr];
      let seed = daySeed;
      while (result.length < count && pool.length > 0) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const idx = seed % pool.length;
        result.push(pool.splice(idx, 1)[0]);
      }
      return result;
    };

    const maxItems = inline ? 2 : 3;
    return pick(oldHalf, Math.min(maxItems, oldHalf.length));
  }, [memories, inline]);

  if (gems.length === 0 || dismissed) return null;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
          <Gem className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
        </div>
        <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">
          A memory that deserves another look
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
        </button>
      </div>
      <div className={`flex gap-3 overflow-x-auto scrollbar-hide pb-1${inline ? ' max-w-[280px]' : ''}`}>
        {gems.map(m => (
          <div key={m.memoryId} className="shrink-0 w-40">
            <MemoryCard memory={m} onClick={() => onMemoryClick(m.memoryId)} />
          </div>
        ))}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] p-3 mx-1 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
      <div className="px-5 sm:px-8 py-4">
        {content}
      </div>
    </div>
  );
}
