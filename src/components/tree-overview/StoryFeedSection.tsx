import { useState, useMemo } from 'react'
import { BookOpen, UserPlus, Edit2, Trash2, ChevronDown, Quote } from 'lucide-react'
import type { Person } from '@/types'
import type { ChangeLogEntry } from '@/services/neo4jDataService'
import { buildFamilyTimeline, type TimelineEvent } from '@/services/familyTimelineService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  narrative: { narrative: string; paragraphs: string[] } | null
  activity: { entries: ChangeLogEntry[]; total: number } | null
  persons: Person[]
  onPersonClick?: (personId: string) => void
}

function formatActivityEntry(entry: ChangeLogEntry): { icon: typeof UserPlus; color: string; text: string; personId?: string } {
  const name = entry.personName || 'Someone'
  switch (entry.action) {
    case 'create':
      return { icon: UserPlus, color: '#7B8C5E', text: `${name} was added to the family tree`, personId: entry.entityId }
    case 'update':
      return { icon: Edit2, color: '#2F3E8F', text: `${name}'s profile was updated`, personId: entry.entityId }
    case 'delete':
      return { icon: Trash2, color: '#2F3E8F', text: `${name} was removed from the tree` }
    default:
      return { icon: Edit2, color: '#8B7355', text: `Changes made to ${name}`, personId: entry.entityId }
  }
}

function formatDate(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return ''
  }
}

function timelineEventToFeedItem(event: TimelineEvent): { icon: typeof BookOpen; color: string; text: string; personId?: string } {
  if (event.type === 'birth') {
    return {
      icon: BookOpen,
      color: '#7B8C5E',
      text: `${event.personName || 'A family member'} was born in ${event.year}`,
      personId: event.personId,
    }
  }
  if (event.type === 'death') {
    return {
      icon: BookOpen,
      color: '#8B7355',
      text: `${event.personName || 'A family member'} passed away in ${event.year}`,
      personId: event.personId,
    }
  }
  return {
    icon: BookOpen,
    color: '#5A7E8E',
    text: event.label,
  }
}

export function StoryFeedSection({ narrative, activity, persons, onPersonClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const timelineEvents = useMemo(() => buildFamilyTimeline(persons, 5), [persons])

  const getFeedColor = (color: string) => {
    if (!isDark) return color
    switch (color) {
      case '#2F3E8F': return '#7B8FD4'
      case '#7B8C5E': return '#9AB07E'
      case '#8B7355': return '#C2A46D'
      case '#5A7E8E': return '#7BA3B5'
      default: return color
    }
  }

  // Build mixed feed
  type FeedItem = {
    id: string
    icon: typeof BookOpen
    color: string
    text: string
    personId?: string
    timestamp?: string
    isNarrative?: boolean
  }

  const feedItems = useMemo(() => {
    const items: FeedItem[] = []

    // Activity entries
    if (activity?.entries) {
      for (const entry of activity.entries) {
        const formatted = formatActivityEntry(entry)
        items.push({
          id: `activity-${entry.changeLogId}`,
          ...formatted,
          color: getFeedColor(formatted.color),
          timestamp: entry.timestamp,
        })
      }
    }

    // Timeline events (births/deaths/historical)
    for (const event of timelineEvents) {
      const formatted = timelineEventToFeedItem(event)
      items.push({
        id: `timeline-${event.year}-${event.type}-${event.personId || event.label}`,
        ...formatted,
        color: getFeedColor(formatted.color),
      })
    }

    // Sort: activity first (by timestamp), then timeline
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      if (a.timestamp) return -1
      if (b.timestamp) return 1
      return 0
    })

    return items
  }, [activity, timelineEvents, isDark])

  const visibleItems = expanded ? feedItems : feedItems.slice(0, 6)

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
        Your Family Story
      </h3>

      {/* Narrative quote */}
      {narrative?.paragraphs?.[0] && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: isDark ? '#232328' : '#F4F6F9',
            borderLeft: isDark ? '3px solid #7B8FD4' : '3px solid #2F3E8F',
          }}
        >
          <Quote size={14} className="mb-2" style={{ color: isDark ? '#7B8FD4' : '#2F3E8F', opacity: 0.5 }} />
          <p className="text-sm leading-relaxed italic" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
            {narrative.paragraphs[0].length > 250
              ? narrative.paragraphs[0].slice(0, 250) + '...'
              : narrative.paragraphs[0]}
          </p>

        </div>
      )}

      {/* Feed items */}
      <div className="space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => item.personId && onPersonClick?.(item.personId)}
              disabled={!item.personId}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left hover:bg-[#F8F2EC] dark:hover:bg-[#232328] disabled:hover:bg-transparent"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${item.color}18` }}
              >
                <Icon size={13} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{item.text}</p>
                {item.timestamp && (
                  <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#999999' : '#B8A090' }}>
                    {formatDate(item.timestamp)}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {feedItems.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: isDark ? '#666666' : '#C4B5A5' }}>
          Start adding family members to see your story unfold
        </p>
      )}

      {feedItems.length > 6 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1 mt-3 text-xs font-medium transition-colors"
          style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
        >
          Show more <ChevronDown size={14} />
        </button>
      )}
    </div>
  )
}
