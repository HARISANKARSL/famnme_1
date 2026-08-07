import { useState, useMemo } from 'react';
import { Calendar, ChevronRight, Heart, Plus } from 'lucide-react';
import { MemoryCard } from '@/components/cards/MemoryCard';
import { toggleMemoryLike } from '@/services/memoriesApiService';
import type { Memory } from '@/types';

interface OnThisDayWidgetProps {
  memories: Memory[];
  onMemoryClick: (memoryId: string) => void;
  currentUserName?: string;
  onAddMemoryForDate?: (date: string) => void;
}

export function OnThisDayWidget({ memories, onMemoryClick, currentUserName, onAddMemoryForDate }: OnThisDayWidgetProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const { matchedMemories, label } = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), d = now.getDate(), y = now.getFullYear();

    // Exact date match first
    const exact = memories.filter(mem => {
      if (!mem.dateTaken) return false;
      const dt = new Date(mem.dateTaken);
      return dt.getMonth() === m && dt.getDate() === d && dt.getFullYear() !== y;
    });
    if (exact.length > 0) return { matchedMemories: exact, label: 'On This Day' };

    // Fallback: +/- 3 days ("This Week in Your Family")
    const todayOfYear = m * 31 + d; // rough day-of-year
    const nearby = memories.filter(mem => {
      if (!mem.dateTaken) return false;
      const dt = new Date(mem.dateTaken);
      if (dt.getFullYear() === y) return false;
      const memDoy = dt.getMonth() * 31 + dt.getDate();
      return Math.abs(memDoy - todayOfYear) <= 3;
    });
    if (nearby.length > 0) return { matchedMemories: nearby, label: 'This Week in Your Family' };

    return { matchedMemories: [], label: '' };
  }, [memories]);

  if (matchedMemories.length === 0) return null;

  const handleLike = async (memoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleMemoryLike(memoryId, currentUserName || 'User');
      setLikedIds(prev => {
        const next = new Set(prev);
        if (next.has(memoryId)) next.delete(memoryId);
        else next.add(memoryId);
        return next;
      });
    } catch { /* ignore */ }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-[#2F3E8F]/[0.03]">
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5 px-5 sm:px-8 py-3 group">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#2F3E8F12' }}>
          <Calendar className="w-3.5 h-3.5 text-[#2F3E8F]" strokeWidth={1.5} />
        </div>
        <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{label}</span>
        <span className="min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center text-white leading-none"
          style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}>
          {matchedMemories.length}
        </span>
        <div className="flex-1" />
        <ChevronRight className={`w-4 h-4 text-[#B8A090] dark:text-[#666] transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`} strokeWidth={1.5} />
      </button>

      {!collapsed && (
        <div className="px-5 sm:px-8 pb-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {matchedMemories.map(mem => {
              const year = new Date(mem.dateTaken!).getFullYear();
              const yearsAgo = new Date().getFullYear() - year;
              const isLiked = likedIds.has(mem.memoryId) ? !mem.isLikedByMe : mem.isLikedByMe;
              return (
                <div key={mem.memoryId} className="shrink-0 w-36 relative">
                  <MemoryCard memory={mem} onClick={() => onMemoryClick(mem.memoryId)} />
                  {/* Years ago badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white z-10"
                    style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                  </div>
                  {/* Like button */}
                  <button
                    onClick={(e) => handleLike(mem.memoryId, e)}
                    className="absolute bottom-[52px] right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 shadow-sm hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              );
            })}
            {/* Add memory CTA */}
            {onAddMemoryForDate && (
              <button
                onClick={() => onAddMemoryForDate(todayStr)}
                className="shrink-0 w-36 aspect-square rounded-xl border-2 border-dashed border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex flex-col items-center justify-center gap-2 hover:border-[#2F3E8F]/40 hover:bg-[#2F3E8F]/[0.02] transition-colors"
              >
                <Plus className="w-6 h-6 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
                <span className="text-[11px] text-[#8B7355] dark:text-[#999] font-medium text-center px-2">
                  Add a memory from this day
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
