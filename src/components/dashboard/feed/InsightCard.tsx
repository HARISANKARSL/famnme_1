import { TreeDeciduous, Layers, Heart, Clock } from 'lucide-react'
import type { InsightCardData } from '@/services/feedEngineService'

interface Props {
  card: InsightCardData
  onAction?: (type: InsightCardData['actionType']) => void
}

const ICON_MAP = {
  tree: TreeDeciduous,
  generations: Layers,
  marriages: Heart,
  span: Clock,
}

const GRADIENT_MAP: Record<InsightCardData['icon'], string> = {
  tree: 'from-blue-50 to-sky-50',
  generations: 'from-stone-50 to-sky-50',
  marriages: 'from-blue-50 to-sky-50',
  span: 'from-blue-50 to-yellow-50',
}

const ACCENT_MAP: Record<InsightCardData['icon'], string> = {
  tree: '#2F3E8F',
  generations: '#8B6B3A',
  marriages: '#2F3E8F',
  span: '#A8803A',
}

export function InsightCard({ card, onAction }: Props) {
  const Icon = ICON_MAP[card.icon]
  const accent = ACCENT_MAP[card.icon]

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${GRADIENT_MAP[card.icon]} p-5 shadow-sm ring-1 ring-stone-100`}>
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: `${accent}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-stone-800 leading-tight">{card.headline}</p>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">{card.subtext}</p>
          {card.whyItMatters && (
            <p className="text-xs italic text-stone-400 mt-1">{card.whyItMatters}</p>
          )}
          {card.chain && card.chain.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-[#2F3E8F]/30 space-y-1.5">
              {card.chain.slice(0, 2).map((step, i) => (
                <p key={i} className="text-xs text-stone-600 flex items-start gap-1">
                  <span className="text-blue-400 font-bold shrink-0 leading-none mt-0.5">→</span>
                  {step}
                </p>
              ))}
            </div>
          )}
          {card.actionLabel && onAction && (
            <button
              onClick={() => onAction(card.actionType)}
              className="mt-3 text-xs font-semibold transition-colors hover:underline"
              style={{ color: accent }}
            >
              {card.actionLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
