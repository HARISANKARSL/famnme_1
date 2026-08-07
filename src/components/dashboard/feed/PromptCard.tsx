import { useState } from 'react'
import { X, BookOpen } from 'lucide-react'
import type { PromptCardData } from '@/services/feedEngineService'

interface Props {
  card: PromptCardData
  onAction: (action: PromptCardData['ctaAction']) => void
}

export function PromptCard({ card, onAction }: Props) {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(card.dismissKey) === '1'
  )

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(card.dismissKey, '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 shadow-md text-white relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{card.emoji}</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/90">{card.title}</p>
      </div>

      <p className="text-base font-semibold leading-snug mb-4 pr-6">
        "{card.question}"
      </p>

      <button
        onClick={() => onAction(card.ctaAction)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#2F3E8F] text-sm font-semibold rounded-xl hover:bg-[#E8EDFF] active:scale-95 transition-all shadow-sm"
      >
        <BookOpen className="w-4 h-4" />
        {card.ctaLabel}
      </button>
    </div>
  )
}
