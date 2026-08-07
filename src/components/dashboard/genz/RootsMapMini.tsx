/**
 * RootsMapMini — Lightweight SVG-based family migration mini-map
 *
 * Compact card showing family locations as glowing dots.
 * Uses simple SVG instead of full Leaflet for performance.
 */

import { MapPin, ArrowRight, Share2 } from 'lucide-react'
import { useMemo } from 'react'
import type { Person } from '@/types'
import { shareCard } from '@/utils/shareCardGenerator'

interface RootsMapMiniProps {
  persons: Person[]
  familyName?: string
  onOpenFullMap?: () => void
}

interface LocationPoint {
  name: string
  count: number
}

function extractLocations(persons: Person[]): LocationPoint[] {
  const locationMap = new Map<string, number>()

  for (const p of persons) {
    if (p.isDeleted) continue
    for (const place of [p.birthPlace, p.nativePlace, p.deathPlace]) {
      if (place) {
        const normalized = place.trim()
        if (normalized) {
          locationMap.set(normalized, (locationMap.get(normalized) || 0) + 1)
        }
      }
    }
  }

  return [...locationMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

// Simple seeded hash for consistent dot placement per location name
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

export function RootsMapMini({
  persons,
  familyName,
  onOpenFullMap,
}: RootsMapMiniProps) {
  const locations = useMemo(() => extractLocations(persons), [persons])

  const uniqueCities = locations.length
  // Count unique "states" or top-level regions from place names
  const regionSet = useMemo(() => {
    const set = new Set<string>()
    for (const loc of locations) {
      // Take last part of comma-separated place as region
      const parts = loc.name.split(',').map(s => s.trim())
      if (parts.length > 1) set.add(parts[parts.length - 1])
      else set.add(parts[0])
    }
    return set
  }, [locations])

  const handleShare = async () => {
    await shareCard({
      title: 'My Family Roots',
      highlight: `${uniqueCities} locations`,
      subtitle: `Spanning ${regionSet.size} region${regionSet.size !== 1 ? 's' : ''}`,
      familyName: familyName || 'My Family',
      gradient: ['#1a1a2e', '#16213e'],
    })
  }

  // Empty state
  if (locations.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#242424] p-5 shadow-sm ring-1 ring-stone-100 dark:ring-[#333] animate-stagger-3">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/10 flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5 text-[#2F3E8F] dark:text-[#5A6BFF]" />
          </div>
          <p className="text-sm font-semibold text-stone-700 dark:text-[#ccc]">Your Roots Map</p>
          <p className="text-xs text-[#8B7355] dark:text-[#999] mt-1">Add locations to see where your family comes from</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#1a1a2e] dark:bg-[#1a1a2e] p-5 shadow-sm ring-1 ring-[#2a2a4e] overflow-hidden relative animate-stagger-3">
      {/* SVG Map visualization */}
      <div className="relative h-[140px] mb-3">
        <svg width="100%" height="100%" viewBox="0 0 300 140" className="opacity-90">
          {/* Subtle grid lines */}
          {[0, 35, 70, 105, 140].map(y => (
            <line key={`h-${y}`} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}
          {[0, 60, 120, 180, 240, 300].map(x => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}

          {/* Connection lines between locations */}
          {locations.slice(0, 8).map((loc, i) => {
            if (i === 0) return null
            const prev = locations[i - 1]
            const prevHash = hashCode(prev.name)
            const curHash = hashCode(loc.name)
            const x1 = 20 + (prevHash % 260)
            const y1 = 15 + (prevHash * 7 % 110)
            const x2 = 20 + (curHash % 260)
            const y2 = 15 + (curHash * 7 % 110)
            return (
              <line
                key={`line-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(194, 164, 109, 0.3)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )
          })}

          {/* Location dots */}
          {locations.slice(0, 8).map((loc, i) => {
            const hash = hashCode(loc.name)
            const cx = 20 + (hash % 260)
            const cy = 15 + (hash * 7 % 110)
            const r = Math.min(4 + loc.count * 1.5, 10)
            return (
              <g key={loc.name}>
                {/* Glow */}
                <circle cx={cx} cy={cy} r={r + 4} fill="rgba(194, 164, 109, 0.15)" className={`animate-pin-drop`} style={{ animationDelay: `${i * 100}ms` }} />
                {/* Dot */}
                <circle cx={cx} cy={cy} r={r} fill="#C2A46D" className={`animate-pin-drop`} style={{ animationDelay: `${i * 100}ms` }} />
                {/* Label */}
                {i < 4 && (
                  <text
                    x={cx} y={cy + r + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontSize="8"
                    fontFamily="Inter, system-ui"
                  >
                    {loc.name.split(',')[0].slice(0, 12)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Stats overlay */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D] mb-0.5">Your Roots</p>
          <p className="text-sm text-white/90">
            <span className="font-bold text-white">{uniqueCities}</span> location{uniqueCities !== 1 ? 's' : ''} across{' '}
            <span className="font-bold text-white">{regionSet.size}</span> region{regionSet.size !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Share your roots map"
          >
            <Share2 className="w-4 h-4 text-white/60 hover:text-white/90" />
          </button>
          {onOpenFullMap && (
            <button
              onClick={onOpenFullMap}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#C2A46D] bg-white/10 hover:bg-white/15 active:scale-[0.97] transition-all"
            >
              Explore
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
