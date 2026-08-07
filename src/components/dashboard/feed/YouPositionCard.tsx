import { MapPin } from 'lucide-react'
import type { YouPositionCardData } from '@/services/feedEngineService'

interface Props {
  card: YouPositionCardData
  onComplete?: () => void
}

export function YouPositionCard({ card, onComplete }: Props) {
  const msg = `You are in generation ${card.yourGeneration} of ${card.totalGenerations}`
  const sub = card.generationsAbove >= 2
    ? `${card.generationsAbove} generation${card.generationsAbove !== 1 ? 's' : ''} above you are recorded`
    : 'Add your parents and grandparents to go deeper'

  return (
    <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-100 p-4 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
        <MapPin className="w-5 h-5 text-[#2F3E8F]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F]">Your Position</span>
        <p className="text-sm font-bold text-stone-800 mt-0.5 leading-snug">{msg}</p>
        <p className="text-xs text-stone-500 mt-0.5">{sub}</p>
        {card.branchCompleteness !== 'high' && onComplete && (
          <button
            onClick={onComplete}
            className="mt-2 text-xs font-semibold text-[#2F3E8F] hover:underline"
          >
            Complete your branch →
          </button>
        )}
      </div>
    </div>
  )
}
