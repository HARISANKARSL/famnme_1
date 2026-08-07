/**
 * HighlightsCarousel — "Your Family's Story" curated highlight reel
 */

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import type { Memory } from '@/types';

interface HighlightsCarouselProps {
  memories: Memory[];
  onMemoryClick: (memoryId: string) => void;
  inline?: boolean;
}

export function HighlightsCarousel({ memories, onMemoryClick, inline = false }: HighlightsCarouselProps) {
  const highlights = useMemo(() => {
    if (memories.length < 3) return [];

    // Deduplicate batch uploads: keep only one per title+time-window
    const seenBatch = new Set<string>();
    const deduped = memories.filter(m => {
      const ts = m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 120000) : 0;
      const key = `${(m.title || '').replace(/\s*\(\d+\)\s*$/, '').trim()}__${m.memoryType}__${ts}`;
      if (seenBatch.has(key)) return false;
      seenBatch.add(key);
      return true;
    });

    if (deduped.length < 2) return deduped;

    const daySeed = Math.floor(Date.now() / 86400000);
    const picks: Memory[] = [];
    const usedIds = new Set<string>();

    const addPick = (m: Memory | undefined) => {
      if (m && !usedIds.has(m.memoryId)) {
        picks.push(m);
        usedIds.add(m.memoryId);
      }
    };

    // Top liked
    const byLikes = [...deduped].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    addPick(byLikes[0]);

    // Most tagged
    const getTaggedCount = (m: Memory) => {
      const tagged = m.taggedPersons || (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.files?.[0]?.taggedPersons || [];
      return tagged.length;
    };
    const byTags = [...deduped].sort((a, b) => getTaggedCount(b) - getTaggedCount(a));
    addPick(byTags[0]);

    // Newest
    const byDate = [...deduped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    addPick(byDate[0]);

    // Random "deep cut" from older half
    const olderHalf = [...deduped]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, Math.ceil(memories.length / 2))
      .filter(m => !usedIds.has(m.memoryId));
    if (olderHalf.length > 0) {
      const seed = (daySeed * 1103515245 + 12345) & 0x7fffffff;
      addPick(olderHalf[seed % olderHalf.length]);
    }

    return picks;
  }, [memories]);

  if (highlights.length === 0) return null;

  const thumbnailWidth = inline ? 'w-32' : 'w-44';

  const content = (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
          <Star className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-blue-400" strokeWidth={1.5} />
        </div>
        <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Your Family's Story</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
        {highlights.map(m => (
          <div key={m.memoryId} className={`shrink-0 ${thumbnailWidth} snap-start`}>
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
