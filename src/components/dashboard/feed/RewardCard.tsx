import type { RewardCardData } from '@/services/feedEngineService'

interface Props {
  card: RewardCardData
}

export function RewardCard({ card }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 p-5 shadow-md text-white">
      <div className="flex items-center gap-3">
        <span className="text-4xl leading-none">{card.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold leading-snug">{card.headline}</p>
          {card.subtext && (
            <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{card.subtext}</p>
          )}
        </div>
      </div>
    </div>
  )
}
