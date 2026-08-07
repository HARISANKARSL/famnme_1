import type { SuggestionsResult } from '@/services/neo4jDataService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  suggestions: SuggestionsResult | null
}

export function FamilyStoryScore({ suggestions }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const getPromptColor = (color: string) => {
    if (!isDark) return color
    switch (color) {
      case '#2F3E8F': return '#7B8FD4'
      case '#5A7E8E': return '#7BA3B5'
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

  const pct = suggestions.completenessPercent
  const total = suggestions.totalPersons || 1
  const stats = suggestions.stats as Record<string, number>

  const ringSize = 80
  const strokeWidth = 7
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ringColor = pct > 70 ? '#6B8E5A' : (isDark ? '#7B8FD4' : '#2F3E8F')

  // Calculate breakdown percentages
  const breakdowns = [
    { label: 'Birth dates', count: stats.missingBirthDate ?? 0, color: getPromptColor('#2F3E8F') },
    { label: 'Photos', count: stats.missingPhoto ?? 0, color: getPromptColor('#5A7E8E') },
    { label: 'Parents', count: stats.missingParents ?? 0, color: getPromptColor('#2F3E8F') },
    { label: 'Spouses', count: stats.missingSpouse ?? 0, color: getPromptColor('#8B7355') },
  ].filter(b => b.count > 0)

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
        Family Story Score
      </h3>

      <div className="flex items-center gap-4">
        {/* SVG ring */}
        <div className="relative shrink-0">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={isDark ? '#2a2a30' : '#E2E8F0'} strokeWidth={strokeWidth} />
            <circle
              cx={ringSize / 2} cy={ringSize / 2} r={radius}
              fill="none" stroke={ringColor} strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{pct}%</span>
            <span className="text-[9px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>complete</span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 space-y-2">
          {breakdowns.slice(0, 4).map(b => {
            const pctMissing = Math.round((b.count / total) * 100)
            return (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>{b.label}</span>
                  <span style={{ color: isDark ? '#999999' : '#B8A090' }}>{b.count} missing</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: isDark ? '#2a2a30' : '#EDE4DA' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pctMissing, 100)}%`,
                      background: b.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
