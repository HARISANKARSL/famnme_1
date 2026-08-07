/**
 * HeritageSummaryStrip — Identity chips showing heritage context
 *
 * Compact horizontal strip with religion, gotra, kula devata, origins, and temple count.
 * Only renders if at least 2 chips have data.
 */

import { useMemo } from 'react'
import { Flame, Landmark, MapPin, Star } from 'lucide-react'
import type { Person } from '@/types'

interface Props {
  persons: Person[]
  treeStatistics?: {
    topGotras?: Array<{ gotra: string; count: number }>
    topBirthPlaces?: Array<{ place: string; count: number }>
  }
  kulaDevataName?: string | null
  templeMemoryCount?: number
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

export function HeritageSummaryStrip({
  persons,
  treeStatistics,
  kulaDevataName,
  templeMemoryCount = 0,
}: Props) {
  const chips = useMemo(() => {
    const result: Array<{ icon: typeof Flame; text: string; color: string }> = []

    // Religion
    const religion = detectReligion(persons)
    if (religion) {
      result.push({ icon: Flame, text: religion, color: '#2F3E8F' })
    }

    // Gotra
    const gotra = treeStatistics?.topGotras?.[0]?.gotra
    if (gotra) {
      result.push({ icon: Star, text: `${gotra} Gotra`, color: '#8B6B8E' })
    }

    // Kula Devata
    if (kulaDevataName) {
      result.push({ icon: Landmark, text: kulaDevataName, color: '#25327A' })
    }

    // Origins
    const origins = treeStatistics?.topBirthPlaces?.[0]?.place
    if (origins) {
      result.push({ icon: MapPin, text: `${origins} Origins`, color: '#6B8E5A' })
    }

    // Temple memories
    if (templeMemoryCount >= 3) {
      result.push({ icon: Landmark, text: `${templeMemoryCount} Temple Memories`, color: '#2F3E8F' })
    }

    return result
  }, [persons, treeStatistics, kulaDevataName, templeMemoryCount])

  // Don't render if fewer than 2 chips
  if (chips.length < 2) return null

  return (
    <div className="mb-5 overflow-x-auto scrollbar-hide">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#C2A46D]/40 dark:border-[#C2A46D]/20 whitespace-nowrap"
        style={{
          background: 'linear-gradient(to right, rgba(254,243,199,0.5), rgba(255,237,213,0.4))',
        }}
      >
        {chips.map((chip, i) => {
          const Icon = chip.icon
          return (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <span className="text-[#C4A882] text-xs">·</span>}
              <div className="flex items-center gap-1">
                <Icon className="w-3 h-3 shrink-0" style={{ color: chip.color }} strokeWidth={1.5} />
                <span className="text-[12px] text-[#1e3a5f] dark:text-[#93c5fd] font-medium">{chip.text}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
