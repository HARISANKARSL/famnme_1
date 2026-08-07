/**
 * HeroCard — Family identity gradient card
 *
 * Full-width gradient card showing family name, member count,
 * generation depth, heritage chips, and "Explore Tree" CTA.
 * Replaces SnapshotCard + HeritageSummaryStrip merged into one visual.
 */

import { ArrowRight, Flame, Star, Landmark, MapPin } from 'lucide-react'
import { useMemo } from 'react'
import type { Person } from '@/types'

interface HeritageChip {
  icon: typeof Flame
  text: string
}

interface HeroCardProps {
  familyName: string
  memberCount: number
  generationDepth: number
  rootAncestorName?: string | null
  rootAncestorYear?: number | null
  narrativeLine?: string | null
  persons: Person[]
  treeStatistics?: {
    topGotras?: Array<{ gotra: string; count: number }>
    topBirthPlaces?: Array<{ place: string; count: number }>
  }
  kulaDevataName?: string | null
  onNavigateToTree: () => void
}

function detectReligion(persons: Person[]): string | null {
  if (persons.length === 0) return null
  const counts = new Map<string, number>()
  for (const p of persons) {
    if (p.religion) {
      const r = p.religion.trim()
      counts.set(r, (counts.get(r) || 0) + 1)
    }
  }
  if (counts.size === 0) return null
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0][1] >= 2 ? sorted[0][0] : null
}

export function HeroCard({
  familyName,
  memberCount,
  generationDepth,
  rootAncestorName,
  rootAncestorYear,
  narrativeLine,
  persons,
  treeStatistics,
  kulaDevataName,
  onNavigateToTree,
}: HeroCardProps) {
  const heritageChips = useMemo(() => {
    const chips: HeritageChip[] = []
    const religion = detectReligion(persons)
    if (religion) chips.push({ icon: Flame, text: religion })
    const gotra = treeStatistics?.topGotras?.[0]?.gotra
    if (gotra) chips.push({ icon: Star, text: `${gotra} Gotra` })
    if (kulaDevataName) chips.push({ icon: Landmark, text: kulaDevataName })
    const topPlace = treeStatistics?.topBirthPlaces?.[0]?.place
    if (topPlace) chips.push({ icon: MapPin, text: topPlace })
    return chips
  }, [persons, treeStatistics, kulaDevataName])

  return (
    <div
      className="rounded-2xl p-6 md:p-8 shadow-lg text-white relative overflow-hidden animate-stagger-1"
      style={{ background: 'linear-gradient(135deg, #2F3E8F 0%, #3D2E6E 50%, #4B2C5E 100%)' }}
    >
      {/* Subtle decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/[0.04]" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-white/[0.03]" />

      {/* Label */}
      <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-1 relative" style={{ color: '#C2A46D' }}>
        Your Family Identity
      </p>

      {/* Family name */}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight relative" style={{ fontFamily: "'Playfair Display', serif" }}>
        The {familyName} Family
      </h2>

      {rootAncestorYear && (
        <p className="text-sm mt-1 font-medium relative" style={{ color: '#C2A46D' }}>
          Est. {rootAncestorYear}
        </p>
      )}

      {narrativeLine && (
        <p className="text-sm text-white/80 mt-1 italic relative">{narrativeLine}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/15 relative">
        <div className="text-center">
          <p className="text-2xl md:text-3xl font-bold animate-counter-up">{memberCount}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#C2A46D' }}>people</p>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="text-center">
          <p className="text-2xl md:text-3xl font-bold animate-counter-up" style={{ animationDelay: '100ms' }}>{generationDepth}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#C2A46D' }}>generation{generationDepth !== 1 ? 's' : ''}</p>
        </div>
        {rootAncestorName && (
          <>
            <div className="w-px h-8 bg-white/15" />
            <div className="min-w-0">
              <p className="text-[11px]" style={{ color: '#C2A46D' }}>Root ancestor</p>
              <p className="text-sm font-semibold truncate mt-0.5">{rootAncestorName}</p>
            </div>
          </>
        )}
      </div>

      {/* Heritage chips */}
      {heritageChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 relative">
          {heritageChips.map((chip) => (
            <span
              key={chip.text}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 text-white/90 backdrop-blur-sm"
            >
              <chip.icon className="w-3 h-3" style={{ color: '#C2A46D' }} />
              {chip.text}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onNavigateToTree}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-semibold text-white active:scale-[0.97] relative"
        style={{
          background: 'rgba(194, 164, 109, 0.15)',
          border: '1px solid rgba(194, 164, 109, 0.35)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(194, 164, 109, 0.25)'; e.currentTarget.style.borderColor = 'rgba(194, 164, 109, 0.6)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(194, 164, 109, 0.15)'; e.currentTarget.style.borderColor = 'rgba(194, 164, 109, 0.35)' }}
      >
        Explore your family tree
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
