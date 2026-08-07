import { Gem } from 'lucide-react'
import type { SurpriseCardData } from '@/services/feedEngineService'

interface Props {
  card: SurpriseCardData
}

export function SurpriseCard({ card }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-stone-700 to-stone-800 p-5 shadow-md text-white">
      <div className="flex items-center gap-2 mb-2">
        <Gem className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.5} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C2A46D]">{card.badge}</span>
      </div>
      <p className="text-xl font-bold text-white leading-tight">{card.stat}</p>
      <p className="text-sm text-stone-300 mt-1 leading-relaxed">{card.context}</p>
    </div>
  )
}
