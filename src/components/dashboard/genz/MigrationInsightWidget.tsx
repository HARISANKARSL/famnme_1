/**
 * MigrationInsightWidget — "Your family moved from X to Y"
 *
 * Traces only blood relatives (ancestors + descendants of home person)
 * to show accurate migration patterns. Excludes in-laws.
 */

import { MapPin, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import type { Person } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { getBloodRelativeIds } from '@/utils/bloodRelatives'

interface MigrationInsightWidgetProps {
  persons: Person[]
  relationships: Relationship[]
  onOpenMigrationMap?: () => void
}

export function MigrationInsightWidget({
  persons,
  relationships,
  onOpenMigrationMap,
}: MigrationInsightWidgetProps) {
  const insight = useMemo(() => {
    // Only consider blood relatives
    const bloodIds = getBloodRelativeIds(persons, relationships)
    const bloodPersons = persons.filter(p => !p.isDeleted && bloodIds.has(p.personId))

    // Collect native places and birth places from blood relatives only
    const nativePlaces = new Map<string, number>()
    const birthPlaces = new Map<string, number>()

    for (const p of bloodPersons) {
      if (p.nativePlace) {
        const place = p.nativePlace.trim()
        nativePlaces.set(place, (nativePlaces.get(place) || 0) + 1)
      }
      if (p.birthPlace) {
        const place = p.birthPlace.trim()
        birthPlaces.set(place, (birthPlaces.get(place) || 0) + 1)
      }
    }

    // Origin = most common native place among blood relatives
    const topNative = [...nativePlaces.entries()].sort((a, b) => b[1] - a[1])[0]
    // Destination = most common birth place that differs from origin
    const topBirth = [...birthPlaces.entries()].sort((a, b) => b[1] - a[1])
      .find(([place]) => place !== topNative?.[0])

    if (!topNative || !topBirth) return null

    const uniquePlaces = new Set([...nativePlaces.keys(), ...birthPlaces.keys()])

    return {
      from: topNative[0],
      to: topBirth[0],
      totalPlaces: uniquePlaces.size,
    }
  }, [persons, relationships])

  if (!insight) return null

  return (
    <div className="rounded-2xl bg-[#1a1a2e] dark:bg-[#1a1a2e] p-4 ring-1 ring-[#2a2a4e] text-white">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-[#C2A46D]" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">Migration Insight</p>
      </div>

      <p className="text-sm font-medium text-white/90 leading-relaxed">
        Your family moved from{' '}
        <span className="font-bold text-[#C2A46D]">{insight.from}</span>
        {' '}to{' '}
        <span className="font-bold text-[#C2A46D]">{insight.to}</span>
      </p>
      <p className="text-[11px] text-white/50 mt-1">
        Spanning {insight.totalPlaces} location{insight.totalPlaces !== 1 ? 's' : ''} across generations
      </p>

      {onOpenMigrationMap && (
        <button
          onClick={onOpenMigrationMap}
          className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#C2A46D] hover:text-[#E8D9C8] transition-colors"
        >
          View full migration map <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
