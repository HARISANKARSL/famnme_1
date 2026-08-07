/**
 * SacredPlacesWidget — Kuldevata / Temple highlight
 *
 * Shows family's sacred connections.
 */

import { Landmark, ArrowRight } from 'lucide-react'

interface SacredPlacesWidgetProps {
  kulaDevataName?: string | null
  templeName?: string | null
  templeMemoryCount?: number
  onOpenTemples?: () => void
}

export function SacredPlacesWidget({
  kulaDevataName,
  templeName,
  templeMemoryCount = 0,
  onOpenTemples,
}: SacredPlacesWidgetProps) {
  if (!kulaDevataName && !templeName) return null

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#4B2C5E]/10 dark:bg-[#4B2C5E]/20 flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-[#4B2C5E] dark:text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B2C5E] dark:text-[#a78bfa] mb-0.5">Sacred Heritage</p>
          {kulaDevataName && (
            <p className="text-sm font-bold text-stone-800 dark:text-[#F5F1E8]">{kulaDevataName}</p>
          )}
          {templeName && (
            <p className="text-[12px] text-[#8B7355] dark:text-[#999] mt-0.5">{templeName}</p>
          )}
          {templeMemoryCount > 0 && (
            <p className="text-[11px] text-[#8B7355] dark:text-[#999] mt-0.5">{templeMemoryCount} temple memor{templeMemoryCount === 1 ? 'y' : 'ies'}</p>
          )}
          {onOpenTemples && (
            <button
              onClick={onOpenTemples}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#4B2C5E] dark:text-[#a78bfa] hover:underline"
            >
              Explore heritage <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
