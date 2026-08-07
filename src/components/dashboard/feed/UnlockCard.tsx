import { Lock } from 'lucide-react'
import type { UnlockCardData } from '@/services/feedEngineService'

interface Props {
  card: UnlockCardData
  onAction: () => void
}

export function UnlockCard({ card, onAction }: Props) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#2F3E8F]/30 bg-stone-50 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-[#2F3E8F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-700 leading-snug">{card.message}</p>
          <button
            onClick={onAction}
            className="mt-3 text-xs font-semibold text-[#2F3E8F] hover:text-blue-800 hover:underline transition-colors"
          >
            {card.ctaLabel} →
          </button>
        </div>
      </div>
    </div>
  )
}
