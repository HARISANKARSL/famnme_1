/**
 * ReliveMemoryWidget — "This happened X years ago today"
 *
 * Resurfaces old memories based on dateTaken matching today's date.
 * High emotional engagement driver.
 */

import { Clock, Heart } from 'lucide-react'
import { useMemo } from 'react'
import type { Memory } from '@/types'
import { resolveBackendUrl } from '@/config/api'

interface ReliveMemoryWidgetProps {
  memories: Memory[]
  onOpenMemory?: (memoryId: string) => void
}

function getYearsAgo(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return now.getFullYear() - d.getFullYear()
}

export function ReliveMemoryWidget({
  memories,
  onOpenMemory,
}: ReliveMemoryWidgetProps) {
  const todayMemories = useMemo(() => {
    const today = new Date()
    const m = today.getMonth() + 1
    const d = today.getDate()
    const yr = today.getFullYear()

    return memories
      .filter(mem => {
        if (!mem.dateTaken) return false
        const dt = new Date(mem.dateTaken)
        return dt.getMonth() + 1 === m && dt.getDate() === d && dt.getFullYear() !== yr
      })
      .sort((a, b) => {
        const ya = new Date(a.dateTaken!).getFullYear()
        const yb = new Date(b.dateTaken!).getFullYear()
        return ya - yb // oldest first
      })
      .slice(0, 3)
  }, [memories])

  if (todayMemories.length === 0) return null

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="w-7 h-7 rounded-full bg-[#C2A46D]/15 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-[#C2A46D]" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">On This Day</p>
          <p className="text-xs text-[#8B7355] dark:text-[#999]">Relive your family memories</p>
        </div>
      </div>

      {/* Memory cards */}
      <div className="px-4 pb-4 space-y-3 mt-2">
        {todayMemories.map(mem => {
          const yearsAgo = getYearsAgo(mem.dateTaken!)
          const thumbnailUrl = mem.thumbnailUrl || mem.mediaUrl
          const photoUrl = thumbnailUrl ? resolveBackendUrl(thumbnailUrl) : null

          return (
            <button
              key={mem.memoryId}
              onClick={() => onOpenMemory?.(mem.memoryId)}
              className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-[#2a2a2a] transition-colors text-left group"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={mem.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#F4F6F9] dark:bg-[#1E1E1E] flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[#C2A46D]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#C2A46D]">{yearsAgo} year{yearsAgo !== 1 ? 's' : ''} ago today</p>
                <p className="text-sm font-medium text-stone-800 dark:text-[#F5F1E8] truncate mt-0.5">{mem.title}</p>
                {mem.description && (
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] truncate mt-0.5">{mem.description}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
