import { ArrowRight } from 'lucide-react'
import type { SnapshotCardData } from '@/services/feedEngineService'

interface Props {
  card: SnapshotCardData
  onNavigateToTree: () => void
}

export function SnapshotCard({ card, onNavigateToTree }: Props) {
  return (
    <div
      className="rounded-2xl p-6 shadow-md text-white"
      style={{ background: 'linear-gradient(160deg, #2F3E8F 0%, #3D2E6E 50%, #4B2C5E 100%)' }}
    >
      {/* Label — gold instead of pale blue */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#C2A46D' }}>Your Family Identity</p>

      <h2 className="text-3xl font-bold leading-tight tracking-tight">
        The {card.familyName} Family
      </h2>

      {card.rootAncestorYear && (
        <p className="text-sm mt-1 font-medium" style={{ color: '#C2A46D' }}>Est. {card.rootAncestorYear}</p>
      )}

      {/* Narrative line — higher contrast, emotional weight */}
      {card.narrativeLine && (
        <p className="text-sm text-white/90 mt-1 italic font-medium">{card.narrativeLine}</p>
      )}
      {card.dynamicInsight && (
        <p className="text-xs mt-0.5" style={{ color: '#E8D9C8' }}>{card.dynamicInsight}</p>
      )}

      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/15">
        <div className="text-center">
          <p className="text-2xl font-bold">{card.memberCount}</p>
          <p className="text-xs mt-0.5" style={{ color: '#C2A46D' }}>people</p>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="text-center">
          <p className="text-2xl font-bold">{card.generationDepth}</p>
          <p className="text-xs mt-0.5" style={{ color: '#C2A46D' }}>generation{card.generationDepth !== 1 ? 's' : ''}</p>
        </div>
        {card.rootAncestorName && (
          <>
            <div className="w-px h-8 bg-white/15" />
            <div className="min-w-0">
              <p className="text-xs" style={{ color: '#C2A46D' }}>Root ancestor</p>
              <p className="text-sm font-semibold truncate mt-0.5">{card.rootAncestorName}</p>
            </div>
          </>
        )}
      </div>

      {/* CTA — gold border glow for emotional weight */}
      <button
        onClick={onNavigateToTree}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-semibold text-white active:scale-[0.97]"
        style={{
          background: 'rgba(200, 169, 106, 0.12)',
          border: '1px solid rgba(200, 169, 106, 0.35)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200, 169, 106, 0.22)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200, 169, 106, 0.6)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200, 169, 106, 0.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200, 169, 106, 0.35)' }}
      >
        Explore your family tree
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
