/**
 * RecentActivityWidget — Last few tree edits with field-level diff pills
 */

import { useEffect, useState } from 'react'
import { UserPlus, Edit3, Trash2, RotateCcw, Clock, Loader2, Activity } from 'lucide-react'
import { getTreeActivity } from '@/services/activityService'
import type { ChangeLog } from '@/types'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'

interface Props {
  treeId: string
  persons?: Person[]
  onViewAll?: () => void
  onOpenProfile?: (personId: string) => void
}

const ACTION_CONFIG = {
  create: { icon: UserPlus, color: '#6B8E5A', label: 'Added' },
  update: { icon: Edit3, color: '#2F3E8F', label: 'Updated' },
  delete: { icon: Trash2, color: '#2F3E8F', label: 'Removed' },
  revert: { icon: RotateCcw, color: '#5A7E8E', label: 'Reverted' },
}

const FRIENDLY_FIELD: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  birthDate: 'Birth date',
  deathDate: 'Death date',
  birthPlace: 'Birth place',
  deathPlace: 'Death place',
  gender: 'Gender',
  occupation: 'Occupation',
  biography: 'Bio',
  religion: 'Religion',
  profilePhotoUrl: 'Photo',
}

function getChangedFields(before: string | null, after: string | null): Array<{ field: string; old: string; new: string }> {
  if (!before && !after) return []
  try {
    const b: Record<string, unknown> = before ? JSON.parse(before) : {}
    const a: Record<string, unknown> = after ? JSON.parse(after) : {}
    const changed: Array<{ field: string; old: string; new: string }> = []
    const keys = new Set([...Object.keys(b), ...Object.keys(a)])
    for (const key of keys) {
      const oldVal = b[key] ?? ''
      const newVal = a[key] ?? ''
      if (String(oldVal) !== String(newVal) && FRIENDLY_FIELD[key]) {
        changed.push({
          field: FRIENDLY_FIELD[key],
          old: String(oldVal).slice(0, 30) || '—',
          new: String(newVal).slice(0, 30) || '—',
        })
      }
    }
    return changed
  } catch {
    return []
  }
}

function dayLabel(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function RecentActivityWidget({ treeId, persons = [], onViewAll, onOpenProfile }: Props) {
  const [entries, setEntries] = useState<ChangeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getTreeActivity(treeId, 8)
        if (!cancelled) setEntries(result.entries)
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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Activity className="w-8 h-8 text-[#E2DBCE] mb-2" strokeWidth={1} />
        <p className="text-sm text-[#8B7355]">No recent activity</p>
        <p className="text-xs text-[#B8A090] mt-0.5">Start adding family members!</p>
      </div>
    )
  }

  // Group by day label
  const groups: Array<{ label: string; entries: ChangeLog[] }> = []
  for (const entry of entries) {
    const label = dayLabel(entry.timestamp)
    const existing = groups.find(g => g.label === label)
    if (existing) existing.entries.push(entry)
    else groups.push({ label, entries: [entry] })
  }

  return (
    <div>
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-[#B8A090] uppercase tracking-wider mb-1.5">{group.label}</p>
            <div className="space-y-1">
              {group.entries.map(entry => {
                const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update
                const Icon = config.icon
                const diffs = entry.action === 'update' ? getChangedFields(entry.before, entry.after) : []
                const shown = diffs.slice(0, 2)
                const extra = diffs.length - shown.length

                // Look up person photo
                const person = persons.find(p => p.personId === entry.entityId)
                const photoUrl = person?.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null

                return (
                  <div
                    key={entry.changeLogId}
                    className={`flex items-start gap-2.5 p-2 rounded-lg ${onOpenProfile ? 'cursor-pointer hover:bg-[#F4F6FA] dark:hover:bg-[#222]' : ''} transition-colors`}
                    onClick={() => onOpenProfile && entry.entityId && onOpenProfile(entry.entityId)}
                  >
                    {/* Avatar */}
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${config.color}15` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-[#3D2E1F] dark:text-[#f5f5f5] truncate">
                          <span className="font-medium">{config.label}</span>{' '}
                          {entry.personName || 'a family member'}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] text-[#B8A090] shrink-0">
                          <Clock className="w-3 h-3" />
                          {timeAgo(entry.timestamp)}
                        </span>
                      </div>
                      {/* Field diff pills */}
                      {shown.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {shown.map(d => (
                            <span key={d.field} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E2E8F0]/60 dark:bg-[#2a2a2a] text-[#5A4A3A] dark:text-[#ccc]">
                              {d.field}: <span className="line-through opacity-60">{d.old}</span> ? {d.new}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E2E8F0]/40 text-[#8B7355]">+{extra} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-3 text-center text-xs text-[#2F3E8F] hover:text-[#A8603A] font-medium transition-colors"
        >
          View all activity
        </button>
      )}
    </div>
  )
}
