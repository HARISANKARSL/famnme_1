import { Compass } from 'lucide-react'
import type { DiscoveryCardData } from '@/services/feedEngineService'

interface Props {
  card: DiscoveryCardData
  onAction: () => void
}

export function DiscoveryCard({ card, onAction }: Props) {
  return (
    <div className="rounded-2xl bg-stone-800 p-5 shadow-md text-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Compass className="w-[18px] h-[18px] text-[#C2A46D]" strokeWidth={1.5} />
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Mystery</span>
          <p className="text-base font-bold text-white mt-0.5 leading-snug">{card.question}</p>
        </div>
      </div>
      <p className="text-sm text-stone-300 leading-relaxed">{card.hook}</p>
      <button
        onClick={onAction}
        className="mt-4 text-xs font-semibold text-[#C2A46D] hover:text-[#C2A46D] transition-colors"
      >
        {card.ctaLabel} →
      </button>
    </div>
  )
}
