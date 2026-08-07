/**
 * TreeOverviewWidget — Compact tree stats with quick navigation
 * Clickable stat cards drill down to filtered people views.
 * Sparklines show trend from localStorage history.
 */

import { useMemo, useEffect } from 'react'
import { Users, GitBranch, Heart, UserCheck } from 'lucide-react'
import type { Person, Union } from '@/types'
import { resolveBackendUrl } from '@/config/api'

interface PeopleFilter {
  isLiving?: boolean
  filterMarried?: boolean
  sort?: string
  order?: string
}

interface Props {
  treeId: string
  treeName: string
  persons: Person[]
  unions: Union[]
  onViewTree: () => void
  onOpenPeople?: (filter?: PeopleFilter) => void
}

interface SparkPoint { personCount: number; marriageCount: number; ts: number }

function loadHistory(treeId: string): SparkPoint[] {
  try {
    const raw = localStorage.getItem(`fc_stats_history_${treeId}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function saveHistory(treeId: string, points: SparkPoint[]) {
  try { localStorage.setItem(`fc_stats_history_${treeId}`, JSON.stringify(points.slice(-8))) } catch {}
}

function Sparkline({ values, className }: { values: number[]; className: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 40
  const h = 16
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h * 0.85 - 1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className={`ml-auto shrink-0 ${className}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </svg>
  )
}

export function TreeOverviewWidget({ treeId, treeName, persons, unions, onViewTree, onOpenPeople }: Props) {
  const homePerson = persons.find(p => p.isHomePerson)
  const photoUrl = homePerson?.profilePhotoUrl ? resolveBackendUrl(homePerson.profilePhotoUrl) : null

  const stats = useMemo(() => {
    const activePersons = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    const total = activePersons.length
    const living = activePersons.filter(p => p.isLiving !== false && !p.deathDate).length
    const deceased = total - living
    const generations = total > 0 ? Math.max(1, Math.ceil(Math.log2(total + 1))) : 0
    const marriages = unions.length
    return { total, living, deceased, generations, marriages }
  }, [persons, unions])

  // Store and retrieve sparkline history
  const history = useMemo(() => loadHistory(treeId), [treeId])

  useEffect(() => {
    if (stats.total === 0) return
    const existing = loadHistory(treeId)
    const lastPoint = existing[existing.length - 1]
    // Only add a new point if data changed or no point today
    const todayStr = new Date().toDateString()
    const lastTs = lastPoint ? new Date(lastPoint.ts).toDateString() : null
    if (!lastPoint || lastTs !== todayStr || lastPoint.personCount !== stats.total) {
      const updated = [...existing, { personCount: stats.total, marriageCount: stats.marriages, ts: Date.now() }]
      saveHistory(treeId, updated)
    }
  }, [treeId, stats.total, stats.marriages])

  const personHistory = history.map(p => p.personCount)
  const marriageHistory = history.map(p => p.marriageCount)

  const cards = [
    {
      label: 'Members',
      value: stats.total,
      icon: Users,
      colorClass: 'text-[#2F3E8F] dark:text-[#8CA0FF]',
      spark: personHistory,
      filter: undefined as PeopleFilter | undefined,
    },
    {
      label: 'Generations',
      value: `~${stats.generations}`,
      icon: GitBranch,
      colorClass: 'text-[#6B8E5A] dark:text-[#A2C594]',
      spark: [] as number[],
      filter: undefined as PeopleFilter | undefined,
      onClick: onViewTree,
    },
    {
      label: 'Marriages',
      value: stats.marriages,
      icon: Heart,
      colorClass: 'text-[#2F3E8F] dark:text-[#8CA0FF]',
      spark: marriageHistory,
      filter: { filterMarried: true } as PeopleFilter,
    },
    {
      label: 'Living / Deceased',
      value: `${stats.living} / ${stats.deceased}`,
      icon: UserCheck,
      colorClass: 'text-[#5A7E8E] dark:text-[#8CA8B8]',
      spark: [] as number[],
      filter: { isLiving: true } as PeopleFilter,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Home person + tree name */}
      <div className="flex items-center gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt={homePerson?.firstName} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#C2A46D]/20 flex items-center justify-center text-[#8B7355] dark:text-[#999] text-sm font-semibold">
            {homePerson?.firstName?.[0]}{homePerson?.lastName?.[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{treeName}</p>
          <p className="text-xs text-[#8B7355] dark:text-[#999]">{stats.total} members across ~{stats.generations} generations</p>
        </div>
        <button
          onClick={onViewTree}
          className="px-3 py-1.5 bg-[#2F3E8F] text-white text-xs font-medium rounded-lg hover:bg-[#3B4DA6] transition-colors shrink-0"
        >
          View Tree
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(card => {
          const Icon = card.icon
          const clickable = card.onClick || (onOpenPeople && card.filter !== undefined) || (card.label === 'Members' && onOpenPeople)
          const handleClick = card.onClick || (onOpenPeople ? () => onOpenPeople(card.filter) : undefined)
          return (
            <div
              key={card.label}
              className={`bg-[#F6F2EA] dark:bg-[#1E1E1E] rounded-lg p-3 text-center relative ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-[#C2A46D]/30 transition-all active:scale-[0.97]' : ''}`}
              onClick={handleClick}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${card.colorClass}`} strokeWidth={1.5} />
              <p className="text-lg font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{card.value}</p>
              <p className="text-[10px] text-[#8B7355] dark:text-[#999] uppercase tracking-wide">{card.label}</p>
              {card.spark.length >= 2 && (
                <div className="mt-1 flex justify-center">
                  <Sparkline values={card.spark} className={card.colorClass} />
                </div>
              )}
              {clickable && (
                <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-[#E2E8F0]/60 dark:ring-[#2a2a2a]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Living / deceased split buttons */}
      {onOpenPeople && (stats.living > 0 || stats.deceased > 0) && (
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => onOpenPeople({ isLiving: true })}
            className="flex-1 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2a2a2a] text-[#5A7E8E] dark:text-[#8CA8B8] hover:bg-[#5A7E8E]/5 dark:hover:bg-[#8CA8B8]/5 transition-colors"
          >
            {stats.living} Living
          </button>
          <button
            onClick={() => onOpenPeople({ isLiving: false })}
            className="flex-1 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2a2a2a] text-[#8B7355] dark:text-[#999] hover:bg-[#8B7355]/5 dark:hover:bg-[#999]/5 transition-colors"
          >
            {stats.deceased} Deceased
          </button>
        </div>
      )}
    </div>
  )
}
