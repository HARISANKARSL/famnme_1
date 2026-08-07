import type { TimelineCardData } from '@/services/feedEngineService'

interface Props {
  card: TimelineCardData
  onOpenProfile?: (personId: string) => void
  onViewPeopleInEra?: () => void
}

const TYPE_CONFIG = {
  birth: { label: 'Birth', bg: 'bg-emerald-50', dot: '#6B8E5A', text: 'text-emerald-700', tag: 'bg-emerald-100 text-emerald-700' },
  death: { label: 'Passed', bg: 'bg-stone-50', dot: '#8B7355', text: 'text-stone-600', tag: 'bg-stone-100 text-stone-600' },
  historical: { label: 'History', bg: 'bg-[#E8EDFF]', dot: '#2F3E8F', text: 'text-[#2F3E8F]', tag: 'bg-blue-100 text-[#2F3E8F]' },
}

export function TimelineCard({ card, onOpenProfile, onViewPeopleInEra }: Props) {
  const cfg = TYPE_CONFIG[card.eventType]
  const isClickable = card.personId && onOpenProfile

  const inner = (
    // Tier 3: p-4, no shadow, ring-0
    <div className={`rounded-2xl ${cfg.bg} p-4 ring-1 ring-stone-100/60 ${isClickable ? 'cursor-pointer hover:ring-blue-200 transition-all active:scale-[0.98]' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Year pill */}
        <div className="shrink-0 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ background: cfg.dot }}
          >
            {card.year}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${cfg.tag}`}>
            {cfg.label}
          </span>
          <p className="text-sm font-bold text-stone-800 leading-snug">{card.label}</p>
          {card.detail && (
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">{card.detail}</p>
          )}
          {card.personName && (
            <p className="text-xs text-stone-400 mt-0.5">{card.personName}</p>
          )}
          {card.eventType === 'historical' && card.activeMemberCount !== undefined && card.activeMemberCount > 0 && (
            <p className="text-xs text-[#2F3E8F] font-medium mt-1.5">
              {card.activeMemberCount} family member{card.activeMemberCount !== 1 ? 's' : ''}
              {card.activeMemberNames && card.activeMemberNames.length > 0
                ? `, including ${card.activeMemberNames[0]},`
                : ''}
              {' '}were alive during this period
            </p>
          )}
          {card.eventType === 'historical' && onViewPeopleInEra && (
            <button
              onClick={onViewPeopleInEra}
              className="text-[11px] font-semibold text-[#2F3E8F] hover:underline mt-1.5 block"
            >
              View people from this period →
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (isClickable) {
    return (
      <button className="w-full text-left" onClick={() => onOpenProfile!(card.personId!)}>
        {inner}
      </button>
    )
  }
  return inner
}
