/**
 * QuickActionsWidget — Context-aware navigation shortcuts
 *
 * Dynamic actions are computed from tree state and appear when relevant.
 * Static fallbacks (View Tree, Memories, Map, Stats, Invite) always available.
 */

import { useMemo } from 'react'
import { BookOpen, Map, Users, Send, BarChart3, Camera, Cake, Link } from 'lucide-react'
import type { Person } from '@/types'

interface Props {
  persons?: Person[]
  onNavigateToTree: () => void
  onOpenMemories?: () => void
  onOpenMigrationMap?: () => void
  onOpenStatistics?: () => void
  onInviteFamily?: () => void
  onOpenProfile?: (personId: string) => void
}

function daysUntilBirthday(birthDate: string): number | null {
  const [, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(today.getFullYear(), m - 1, d)
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}

export function QuickActionsWidget({
  persons = [],
  onNavigateToTree,
  onOpenMemories,
  onOpenMigrationMap,
  onOpenStatistics,
  onInviteFamily,
  onOpenProfile,
}: Props) {
  // Compute dynamic actions
  const dynamicActions = useMemo(() => {
    const actions: Array<{ icon: typeof Camera; label: string; sublabel?: string; color: string; action?: () => void }> = []

    // Birthday in next 7 days
    const upcomingBirthday = persons.find(p => {
      if (!p.birthDate || p.isLiving === false || p.deathDate) return false
      const days = daysUntilBirthday(p.birthDate)
      return days !== null && days <= 7 && days >= 0
    })
    if (upcomingBirthday) {
      const days = daysUntilBirthday(upcomingBirthday.birthDate!)!
      actions.push({
        icon: Cake,
        label: `${upcomingBirthday.firstName}'s Birthday`,
        sublabel: days === 0 ? 'Today!' : `in ${days} day${days !== 1 ? 's' : ''}`,
        color: '#2F3E8F',
        action: onOpenProfile ? () => onOpenProfile(upcomingBirthday.personId) : undefined,
      })
    }

    // Missing photos
    const missingPhotos = persons.filter(p => !p.profilePhotoUrl)
    if (missingPhotos.length > 0) {
      actions.push({
        icon: Camera,
        label: 'Add Missing Photos',
        sublabel: `${missingPhotos.length} without photo`,
        color: '#5A7E8E',
        action: onOpenProfile ? () => onOpenProfile(missingPhotos[0].personId) : undefined,
      })
    }

    // Island nodes (no parents, no children detectable from persons — simplified check)
    const islandPerson = persons.find(p => !p.isHomePerson && !p.profilePhotoUrl)
    if (!upcomingBirthday && !islandPerson && persons.length > 1) {
      actions.push({
        icon: Link,
        label: 'Connect Family',
        sublabel: 'Add relationships',
        color: '#6B8E5A',
        action: onNavigateToTree,
      })
    }

    return actions.slice(0, 2)
  }, [persons, onNavigateToTree, onOpenProfile])

  // Static actions
  const staticActions = [
    { id: 'tree', icon: Users, label: 'View Tree', color: '#2F3E8F', handler: onNavigateToTree },
    { id: 'memories', icon: BookOpen, label: 'Memories', color: '#6B8E5A', handler: onOpenMemories },
    { id: 'map', icon: Map, label: 'Migration Map', color: '#5A7E8E', handler: onOpenMigrationMap },
    { id: 'stats', icon: BarChart3, label: 'Statistics', color: '#8B6B8E', handler: onOpenStatistics },
    { id: 'invite', icon: Send, label: 'Invite Family', color: '#8E8B5A', handler: onInviteFamily },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Dynamic context actions */}
      {dynamicActions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {dynamicActions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                onClick={action.action}
                disabled={!action.action}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E2E8F0]/80 dark:border-[#2a2a2a] hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors disabled:opacity-40 text-left"
                style={{ borderLeftColor: action.color, borderLeftWidth: 3 }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${action.color}15` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: action.color }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">{action.label}</p>
                  {action.sublabel && <p className="text-[11px] text-[#8B7355]">{action.sublabel}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Static quick-nav buttons */}
      <div className="flex flex-wrap gap-2">
        {staticActions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.handler}
              disabled={!action.handler}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0]/80 dark:border-[#2a2a2a] hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon className="w-4 h-4" style={{ color: action.color }} strokeWidth={1.5} />
              <span className="text-sm text-[#3D2E1F] dark:text-[#f5f5f5]">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
