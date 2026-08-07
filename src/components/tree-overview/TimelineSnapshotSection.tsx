import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import type { Person } from '@/types'
import { buildFamilyTimeline, getTimelineStats } from '@/services/familyTimelineService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  persons: Person[]
  onViewFullTimeline?: () => void
}

export function TimelineSnapshotSection({ persons, onViewFullTimeline }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { events, stats } = useMemo(() => ({
    events: buildFamilyTimeline(persons, 5),
    stats: getTimelineStats(persons),
  }), [persons])

  const getEventColor = (color?: string) => {
    const baseColor = color || '#2F3E8F'
    if (!isDark) return baseColor
    switch (baseColor) {
      case '#2F3E8F': return '#7B8FD4'
      case '#7B8C5E': return '#9AB07E'
      case '#8B7355': return '#C2A46D'
      case '#5A7E8E': return '#7BA3B5'
      default: return baseColor
    }
  }

  if (!stats.earliestYear || events.length === 0) {
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
          Family Timeline
        </h3>
        <p className="text-sm text-center py-3" style={{ color: isDark ? '#666666' : '#C4B5A5' }}>
          Add birth dates to see your family timeline
        </p>
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
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
        Family Timeline
      </h3>

      <p className="text-xs mb-4" style={{ color: isDark ? '#B8A090' : '#8B7355' }}>
        Your family story spans <strong style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{stats.spanYears} years</strong>
        {' '}from {stats.earliestYear} to {stats.latestYear}
      </p>

      {/* Mini vertical timeline */}
      <div className="relative pl-5">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-1 bottom-1 w-px"
          style={{ background: isDark ? '#2a2a30' : '#E0D2C2' }}
        />

        <div className="space-y-3">
          {events.slice(0, 5).map((event, i) => (
            <div key={`${event.year}-${event.type}-${i}`} className="flex items-start gap-3 relative">
              {/* Dot */}
              <div
                className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2"
                style={{
                  borderColor: getEventColor(event.color),
                  background: isDark ? '#121214' : '#FFFFFF',
                }}
              />

              <div>
                <span className="text-xs font-semibold" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>
                  {event.year}
                </span>
                <p className="text-xs mt-0.5" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
                  {event.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onViewFullTimeline && (
        <button
          onClick={onViewFullTimeline}
          className="flex items-center gap-1 mt-4 text-xs font-medium transition-colors"
          style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
        >
          <Clock size={12} /> View full timeline
        </button>
      )}
    </div>
  )
}
