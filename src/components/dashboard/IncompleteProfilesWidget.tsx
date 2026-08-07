/**
 * IncompleteProfilesWidget — Top profiles missing key data
 */

import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, Camera, Users, Loader2 } from 'lucide-react'
import { fetchSuggestions, type Suggestion } from '@/services/neo4jDataService'

interface Props {
  treeId: string
  onOpenProfile: (personId: string) => void
  onViewAll?: () => void
}

const TYPE_CONFIG: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
  'missing-birthdate': { icon: Calendar, label: 'Missing birth date', color: '#2F3E8F' },
  'missing-parents': { icon: Users, label: 'Missing parents', color: '#2F3E8F' },
  'missing-photo': { icon: Camera, label: 'No photo', color: '#5A7E8E' },
  'missing-spouse': { icon: Users, label: 'Missing spouse', color: '#8B7355' },
  'single-parent': { icon: Users, label: 'Single parent record', color: '#6B8E5A' },
  'incomplete-profile': { icon: AlertCircle, label: 'Incomplete profile', color: '#8B7355' },
  'broken-lineage': { icon: AlertCircle, label: 'Disconnected from tree', color: '#2F3E8F' },
  'missing-generation': { icon: AlertCircle, label: 'Possible missing generation', color: '#2F3E8F' },
}

export function IncompleteProfilesWidget({ treeId, onOpenProfile, onViewAll }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [completeness, setCompleteness] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await fetchSuggestions(treeId)
        if (cancelled) return
        setSuggestions(result.suggestions.slice(0, 5))
        setCompleteness(result.completenessPercent)
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [treeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#2F3E8F]" />
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
          <span className="text-green-600 text-lg">✓</span>
        </div>
        <p className="text-sm text-[#3D2E1F] font-medium">All profiles look great!</p>
        <p className="text-xs text-[#8B7355] mt-0.5">No missing data detected</p>
      </div>
    )
  }

  // SVG ring parameters
  const ringSize = 56
  const strokeWidth = 5
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ringColor = completeness > 70 ? '#6B8E5A' : completeness > 40 ? '#2F3E8F' : '#2F3E8F'

  return (
    <div>
      {/* Completeness ring */}
      <div className="flex items-center gap-3 mb-3">
        <svg width={ringSize} height={ringSize} className="shrink-0 -rotate-90">
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke={ringColor} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - completeness / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div>
          <p className="text-lg font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] leading-none">{completeness}%</p>
          <p className="text-[11px] text-[#8B7355] mt-0.5">complete</p>
        </div>
      </div>

      {/* Suggestion list */}
      <div className="space-y-1.5">
        {suggestions.map(sug => {
          const config = TYPE_CONFIG[sug.type] || TYPE_CONFIG['incomplete-profile']
          const Icon = config.icon
          return (
            <button
              key={sug.id}
              onClick={() => onOpenProfile(sug.personId)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${config.color}15` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{sug.personName}</p>
                <p className="text-xs text-[#8B7355] truncate">{config.label}</p>
              </div>
              <span className="text-[10px] text-[#B8A090] shrink-0">Fix →</span>
            </button>
          )
        })}
      </div>

      {onViewAll && suggestions.length >= 5 && (
        <button
          onClick={onViewAll}
          className="w-full mt-3 text-center text-xs text-[#2F3E8F] hover:text-[#A8603A] font-medium transition-colors"
        >
          View all suggestions
        </button>
      )}
    </div>
  )
}
