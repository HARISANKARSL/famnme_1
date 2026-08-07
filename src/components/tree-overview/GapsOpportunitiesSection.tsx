import { Camera, Calendar, Users, AlertCircle, ChevronRight } from 'lucide-react'
import type { SuggestionsResult } from '@/services/neo4jDataService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  suggestions: SuggestionsResult | null
  onPersonClick?: (personId: string) => void
  onViewAllSuggestions?: () => void
}

const GAP_TYPES: Array<{
  key: string
  label: string
  icon: typeof Camera
  color: string
  actionLabel: string
}> = [
  { key: 'missingParents', label: 'members missing parents', icon: Users, color: '#2F3E8F', actionLabel: 'Add parents' },
  { key: 'missingPhoto', label: 'members without photos', icon: Camera, color: '#5A7E8E', actionLabel: 'Upload photos' },
  { key: 'missingBirthDate', label: 'members missing birth dates', icon: Calendar, color: '#2F3E8F', actionLabel: 'Add dates' },
  { key: 'missingSpouse', label: 'members missing spouses', icon: Users, color: '#8B7355', actionLabel: 'Add spouses' },
  { key: 'brokenLineage', label: 'disconnected members', icon: AlertCircle, color: '#2F3E8F', actionLabel: 'Fix connections' },
  { key: 'singleParent', label: 'single-parent records', icon: Users, color: '#6B8E5A', actionLabel: 'Add other parent' },
]

export function GapsOpportunitiesSection({ suggestions, onViewAllSuggestions }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const getGapColor = (color: string) => {
    if (!isDark) return color
    switch (color) {
      case '#2F3E8F': return '#7B8FD4'
      case '#5A7E8E': return '#7BA3B5'
      case '#6B8E5A': return '#82A370'
      case '#8B7355': return '#C2A46D'
      default: return color
    }
  }

  if (!suggestions) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #1A1A1E 0%, #121214 100%)'
            : 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF8 100%)',
          boxShadow: isDark
            ? '0 4px 20px rgba(0, 0, 0, 0.4)'
            : '0 4px 20px rgba(139, 111, 78, 0.08)',
          border: isDark ? '1px solid #2a2a30' : '1px solid #EDE4DA',
        }}
      >
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#2F3E8F] dark:border-[#7B8FD4] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const stats = suggestions.stats as Record<string, number>
  const gaps = GAP_TYPES.filter(g => (stats[g.key] ?? 0) > 0)

  if (gaps.length === 0) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #1A1A1E 0%, #121214 100%)'
            : 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF8 100%)',
          boxShadow: isDark
            ? '0 4px 20px rgba(0, 0, 0, 0.4)'
            : '0 4px 20px rgba(139, 111, 78, 0.08)',
          border: isDark ? '1px solid #2a2a30' : '1px solid #EDE4DA',
        }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
          Family Completeness
        </h3>
        <div className="flex flex-col items-center py-2">
          <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-2">
            <span className="text-green-600 dark:text-green-400 text-sm">&#10003;</span>
          </div>
          <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>Looking great!</p>
          <p className="text-xs mt-0.5" style={{ color: isDark ? '#999999' : '#8B7355' }}>No major gaps detected</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #1A1A1E 0%, #121214 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF8 100%)',
        boxShadow: isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.4)'
          : '0 4px 20px rgba(139, 111, 78, 0.08)',
        border: isDark ? '1px solid #2a2a30' : '1px solid #EDE4DA',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
        Improve Your Family Story
      </h3>

      <div className="space-y-2">
        {gaps.slice(0, 5).map(gap => {
          const Icon = gap.icon
          const count = stats[gap.key]
          const gapColor = getGapColor(gap.color)
          return (
            <div
              key={gap.key}
              className="flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-[#F8F2EC] dark:hover:bg-[#232328]"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${gapColor}18` }}
              >
                <Icon size={14} style={{ color: gapColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>
                  <strong style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{count}</strong> {gap.label}
                </p>
              </div>
              <ChevronRight size={14} style={{ color: isDark ? '#999999' : '#B8A090' }} className="shrink-0" />
            </div>
          )
        })}
      </div>

      {onViewAllSuggestions && gaps.length > 0 && (
        <button
          onClick={onViewAllSuggestions}
          className="w-full mt-3 text-center text-xs font-medium transition-colors"
          style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
        >
          View all suggestions
        </button>
      )}
    </div>
  )
}
