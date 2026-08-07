import type { ProgressCardData } from '@/services/feedEngineService'

interface Props {
  card: ProgressCardData
  onAction: (action: 'open-suggestions' | 'open-profile' | 'navigate-tree', personId?: string) => void
}

export function ProgressCard({ card, onAction }: Props) {
  const ringSize = 64
  const strokeWidth = 5
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ringColor = card.percent > 70 ? '#6B8E5A' : card.percent > 40 ? '#2F3E8F' : '#2F3E8F'

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <div className="flex items-center gap-4">
        {/* Ring gauge */}
        <div className="relative shrink-0">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#F0EBE3" strokeWidth={strokeWidth} />
            <circle
              cx={ringSize / 2} cy={ringSize / 2} r={radius}
              fill="none" stroke={ringColor} strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - card.percent / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: ringColor }}
          >
            {card.percent}%
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#2F3E8F] uppercase tracking-wider mb-0.5">Tree Completeness</p>
          <p className="text-lg font-bold text-stone-800 leading-tight">
            {card.percent < 30 ? 'Just getting started' : card.percent < 60 ? 'Good progress' : card.percent < 85 ? 'Almost there' : 'Nearly complete'}
          </p>
          {card.topSuggestionName && (
            <p className="text-sm text-stone-500 mt-0.5">
              {card.topSuggestionName} is missing key info
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onAction(card.ctaAction, card.topSuggestionPersonId)}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] hover:brightness-110"
        style={{ background: ringColor }}
      >
        {card.ctaLabel}
      </button>
    </div>
  )
}
