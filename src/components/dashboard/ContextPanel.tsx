/**
 * ContextPanel — Sticky right sidebar on the dashboard home
 *
 * Contains:
 *  1. MiniTreeBlock   — SVG ego network (home + 2-level BFS)
 *  2. QuickActions    — 3 action buttons
 *  3. LiveInsights    — marriages, oldest, generation depth
 *  4. RelationshipSearch — extracted from RelationshipExplorerWidget
 */

import { useState, useCallback, useMemo } from 'react'
import { Plus, BookImage, UserPlus, Heart, Cake, Search, GitBranch, Loader2, ChevronRight, Eye } from 'lucide-react'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { fetchRelationshipPath, type DerivedRelationship, type StepLabel } from '@/services/neo4jDataService'
import { resolveBackendUrl } from '@/config/api'
import type { FeedCard } from '@/services/feedEngineService'

interface Props {
  treeId: string
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  onAddMember: () => void
  onOpenMemories: () => void
  onInviteFamily?: () => void
  onOpenProfile: (personId: string) => void
  onNodeClick?: (personId: string) => void
  focusedCard?: FeedCard | null
}

// -- Mini Tree --------------------------------------------------------------

interface MiniNode {
  id: string
  label: string
  x: number
  y: number
  isHome: boolean
  isActiveInEra: boolean
  photo?: string | null
  initial: string
}

function buildMiniTree(
  persons: Person[],
  relationships: Relationship[],
  focusPersonId?: string,
  eraYear?: number
): MiniNode[] {
  const home = focusPersonId
    ? (persons.find(p => p.personId === focusPersonId) || persons.find(p => p.isHomePerson))
    : persons.find(p => p.isHomePerson)
  if (!home) return []

  const isActiveInEra = (p: Person): boolean => {
    if (!eraYear) return true
    if (!p.birthDate) return false
    const born = new Date(p.birthDate).getFullYear()
    const died = p.deathDate ? new Date(p.deathDate).getFullYear() : p.isLiving !== false ? 9999 : born + 70
    return born <= eraYear && died >= eraYear - 20
  }

  const nodes: MiniNode[] = []
  const W = 300
  const ROW_H = 72
  const COL_W = 70

  // Home center
  nodes.push({ id: home.personId, label: home.firstName, x: W / 2, y: ROW_H * 2, isHome: true, isActiveInEra: true, photo: home.profilePhotoUrl, initial: home.firstName?.[0] || '?' })

  // Parents (level -1)
  const parentUnions = relationships.filter(r => r.type === 'HAS_CHILD' && r.toId === home.personId).map(r => r.fromId)
  const parentIds: string[] = []
  for (const uid of parentUnions) {
    const partners = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === uid).map(r => r.fromId)
    for (const pid of partners) {
      if (!parentIds.includes(pid)) parentIds.push(pid)
    }
  }
  const parentSpacing = parentIds.length > 1 ? COL_W : 0
  parentIds.forEach((pid, i) => {
    const p = persons.find(x => x.personId === pid)
    if (!p) return
    const offset = (i - (parentIds.length - 1) / 2) * parentSpacing
    nodes.push({ id: pid, label: p.firstName, x: W / 2 + offset, y: ROW_H, isHome: false, isActiveInEra: isActiveInEra(p), photo: p.profilePhotoUrl, initial: p.firstName?.[0] || '?' })
  })

  // Spouse(s) (same level, right of home)
  const spouseUnions = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === home.personId).map(r => r.toId)
  const spouseIds: string[] = []
  for (const uid of spouseUnions) {
    const partners = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === uid && r.fromId !== home.personId).map(r => r.fromId)
    for (const sid of partners) {
      if (!spouseIds.includes(sid) && sid !== home.personId) spouseIds.push(sid)
    }
  }
  spouseIds.slice(0, 2).forEach((sid, i) => {
    const s = persons.find(x => x.personId === sid)
    if (!s) return
    nodes.push({ id: sid, label: s.firstName, x: W / 2 + COL_W * (i + 1), y: ROW_H * 2, isHome: false, isActiveInEra: isActiveInEra(s), photo: s.profilePhotoUrl, initial: s.firstName?.[0] || '?' })
  })

  // Children (level +1)
  const childIds: string[] = []
  for (const uid of spouseUnions) {
    const children = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === uid).map(r => r.toId)
    for (const cid of children) {
      if (!childIds.includes(cid)) childIds.push(cid)
    }
  }
  const childSpacing = Math.min(COL_W, childIds.length > 1 ? (W - 40) / childIds.length : COL_W)
  childIds.slice(0, 4).forEach((cid, i) => {
    const c = persons.find(x => x.personId === cid)
    if (!c) return
    const offset = (i - (Math.min(childIds.length, 4) - 1) / 2) * childSpacing
    nodes.push({ id: cid, label: c.firstName, x: W / 2 + offset, y: ROW_H * 3, isHome: false, isActiveInEra: isActiveInEra(c), photo: c.profilePhotoUrl, initial: c.firstName?.[0] || '?' })
  })

  return nodes
}

function MiniTreeBlock({ persons, relationships, onNodeClick, focusPersonId, eraYear }: {
  persons: Person[]
  relationships: Relationship[]
  onNodeClick?: (personId: string) => void
  focusPersonId?: string
  eraYear?: number
}) {
  const nodes = useMemo(() => buildMiniTree(persons, relationships, focusPersonId, eraYear), [persons, relationships, focusPersonId, eraYear])
  const home = nodes.find(n => n.isHome)

  if (nodes.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-stone-400">
        Add family members to see your tree
      </div>
    )
  }

  const W = 300
  const H = 230
  const NODE_R = 18

  // Build edges: home?parents, home?spouses, home?children
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  if (home) {
    for (const n of nodes) {
      if (n.id !== home.id) {
        edges.push({ x1: home.x, y1: home.y, x2: n.x, y2: n.y })
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-[#F6F2EA]">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Edges */}
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#E8D9C8" strokeWidth={1.5} />
        ))}
        {/* Nodes */}
        {nodes.map(n => {
          const photoUrl = n.photo ? resolveBackendUrl(n.photo) : null
          return (
            <g
              key={n.id}
              onClick={() => onNodeClick?.(n.id)}
              className={onNodeClick ? 'cursor-pointer' : ''}
            >
              <circle
                cx={n.x} cy={n.y} r={NODE_R + (n.isHome ? 3 : 0)}
                fill={n.isHome ? '#2F3E8F' : n.isActiveInEra ? '#F5EDE0' : '#D6D3D1'}
                stroke={n.isHome ? '#A8603A' : n.isActiveInEra && eraYear ? '#2F3E8F' : n.isActiveInEra ? '#E2DBCE' : '#B0A898'}
                strokeWidth={n.isHome ? 2 : n.isActiveInEra && eraYear ? 2 : 1}
              />
              {photoUrl ? (
                <>
                  <defs>
                    <clipPath id={`clip-${n.id}`}>
                      <circle cx={n.x} cy={n.y} r={NODE_R + (n.isHome ? 3 : 0) - 1} />
                    </clipPath>
                  </defs>
                  <image href={photoUrl} x={n.x - NODE_R - (n.isHome ? 2 : 0)} y={n.y - NODE_R - (n.isHome ? 2 : 0)} width={(NODE_R + (n.isHome ? 3 : 0)) * 2} height={(NODE_R + (n.isHome ? 3 : 0)) * 2} clipPath={`url(#clip-${n.id})`} preserveAspectRatio="xMidYMid slice" />
                </>
              ) : (
                <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={n.isHome ? 14 : 11} fontWeight="600" fill={n.isHome ? 'white' : '#8B7355'}>
                  {n.initial}
                </text>
              )}
              <text x={n.x} y={n.y + NODE_R + (n.isHome ? 3 : 0) + 10} textAnchor="middle" fontSize={8} fill="#8B7355" fontWeight="500">
                {n.label.slice(0, 7)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// -- Live Insights ----------------------------------------------------------

function LiveInsightsBlock({ persons, unions }: {
  persons: Person[]
  unions: Union[]
}) {
  // Oldest living member
  const oldest = useMemo(() => {
    const living = persons.filter(p => p.isLiving !== false && p.birthDate)
    if (living.length === 0) return null
    living.sort((a, b) => new Date(a.birthDate!).getTime() - new Date(b.birthDate!).getTime())
    const p = living[0]
    const age = new Date().getFullYear() - new Date(p.birthDate!).getFullYear()
    return { name: p.firstName, age }
  }, [persons])

  const stats = [
    { icon: Heart, label: 'Marriages', value: String(unions.length), color: '#2F3E8F' },
    { icon: Cake, label: 'Oldest', value: oldest ? `${oldest.name}, ${oldest.age}` : '—', color: '#2F3E8F' },
  ]

  return (
    <div className="space-y-2">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F6F2EA]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
            <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-stone-400 font-medium">{s.label}</p>
            <p className="text-sm font-semibold text-stone-700 truncate">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// -- Relationship Search ----------------------------------------------------

function RelationshipSearch({ treeId, persons, onOpenProfile }: {
  treeId: string
  persons: Person[]
  onOpenProfile: (personId: string) => void
}) {
  const home = persons.find(p => p.isHomePerson)
  const homePersonId = home?.personId || ''

  const [query, setQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [result, setResult] = useState<DerivedRelationship | null>(null)
  const [pathPersons, setPathPersons] = useState<Person[]>([])
  const [stepLabels, setStepLabels] = useState<StepLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = query.trim().length >= 2
    ? persons.filter(p => p.personId !== homePersonId)
        .filter(p => `${p.firstName} ${p.lastName || ''}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : []

  const handleSelect = useCallback(async (person: Person) => {
    setSelectedPerson(person)
    setQuery(`${person.firstName} ${person.lastName || ''}`.trim())
    setShowDropdown(false)
    setLoading(true)
    setResult(null)
    setStepLabels([])
    try {
      const res = await fetchRelationshipPath(homePersonId, person.personId, treeId)
      setResult(res.derivedRelationship || null)
      setPathPersons(res.path || [])
      setStepLabels(res.stepLabels || [])
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [homePersonId, treeId])

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); if (e.target.value.trim().length < 2) { setSelectedPerson(null); setResult(null) } }}
          onFocus={() => { if (filtered.length > 0) setShowDropdown(true) }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search a family member…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 focus:border-blue-400 bg-stone-50"
        />
        {showDropdown && filtered.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
            {filtered.map(p => (
              <li key={p.personId} onMouseDown={() => handleSelect(p)} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#E8EDFF] text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-[#2F3E8F] shrink-0">{p.firstName?.[0]}</div>
                <span className="text-stone-700">{p.firstName} {p.lastName || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#2F3E8F]" /></div>}

      {!loading && result && selectedPerson && (
        <div className="mt-3 p-3 rounded-xl bg-[#E8EDFF] border border-[#2F3E8F]/20">
          <div className="flex items-center gap-1.5 mb-1">
            <GitBranch className="w-3 h-3 text-[#2F3E8F]" />
            <span className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider">{result.label}</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">{result.description}</p>
          {pathPersons.length > 0 && (
            <div className="flex items-center gap-0.5 flex-wrap mt-2">
              {pathPersons.map((p, i) => (
                <div key={p.personId} className="flex items-center gap-0.5">
                  <button onClick={() => onOpenProfile(p.personId)} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#2F3E8F]/30 text-stone-700 hover:bg-[#E8EDFF] truncate max-w-[60px]">{p.firstName}</button>
                  {i < pathPersons.length - 1 && (
                    <div className="flex items-center gap-0.5">
                      <ChevronRight className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                      {stepLabels[i] && <span className="text-[9px] text-[#2F3E8F] font-medium whitespace-nowrap">{stepLabels[i].label}</span>}
                      <ChevronRight className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && selectedPerson && !result && (
        <p className="text-xs text-stone-400 text-center mt-3">No connection found in tree</p>
      )}
    </div>
  )
}

// -- Focus Context Block ----------------------------------------------------

function FocusContextBlock({ focusedCard, persons }: {
  focusedCard: FeedCard
  persons: Person[]
}) {
  if (focusedCard.kind === 'ancestor') {
    const { person, generationLabel, descendantCount, contextNote } = focusedCard
    return (
      <div className="p-3 rounded-xl bg-[#E8EDFF] border border-[#2F3E8F]/20 animate-fade-in">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Eye className="w-3 h-3 text-[#2F3E8F]" />
          <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Viewing this ancestor</p>
        </div>
        <p className="text-sm font-bold text-stone-800">
          {person.firstName} {person.lastName || ''}
        </p>
        <p className="text-xs text-[#2F3E8F] mt-0.5">{generationLabel}</p>
        {contextNote && <p className="text-xs italic text-[#2F3E8F]/70 mt-0.5">{contextNote}</p>}
        {descendantCount > 0 && (
          <p className="text-xs text-stone-500 mt-1">{descendantCount} descendant{descendantCount !== 1 ? 's' : ''} in your tree</p>
        )}
      </div>
    )
  }

  if (focusedCard.kind === 'timeline' && focusedCard.eventType === 'historical') {
    const { year, activeMemberCount } = focusedCard
    const alive = persons.filter(p => {
      if (!p.birthDate) return false
      const born = new Date(p.birthDate).getFullYear()
      const died = p.deathDate ? new Date(p.deathDate).getFullYear() : p.isLiving !== false ? 9999 : born + 70
      return born <= year && died >= year
    }).slice(0, 4)
    return (
      <div className="p-3 rounded-xl bg-[#E8EDFF] border border-[#2F3E8F]/20 animate-fade-in">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Eye className="w-3 h-3 text-[#2F3E8F]" />
          <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Your family in {year}</p>
        </div>
        {activeMemberCount !== undefined && activeMemberCount > 0 ? (
          <>
            <p className="text-xs text-stone-500 mb-1.5">{activeMemberCount} member{activeMemberCount !== 1 ? 's' : ''} were alive</p>
            <div className="space-y-1">
              {alive.map(p => {
                const age = year - new Date(p.birthDate!).getFullYear()
                return (
                  <p key={p.personId} className="text-xs text-stone-700">
                    <span className="font-medium">{p.firstName}</span>
                    {age >= 0 && age < 130 && <span className="text-stone-400"> · age {age}</span>}
                  </p>
                )
              })}
              {activeMemberCount > 4 && (
                <p className="text-xs text-stone-400">+{activeMemberCount - 4} more</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-stone-400">No family members with birth dates in this era</p>
        )}
      </div>
    )
  }

  if (focusedCard.kind === 'progress') {
    return (
      <div className="p-3 rounded-xl bg-[#E8EDFF] border border-[#2F3E8F]/20 animate-fade-in">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Eye className="w-3 h-3 text-[#2F3E8F]" />
          <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Profile completeness</p>
        </div>
        <p className="text-xs text-stone-500">
          {focusedCard.topSuggestionName
            ? `${focusedCard.topSuggestionName} has missing information`
            : 'Complete member profiles to grow your family story'}
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#E8EDFF]0 transition-all"
            style={{ width: `${focusedCard.percent}%` }}
          />
        </div>
        <p className="text-[10px] text-stone-400 mt-1">{focusedCard.percent}% documented</p>
      </div>
    )
  }

  return null
}

// -- Section wrapper --------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#C2A46D' }}>{title}</p>
      {children}
    </div>
  )
}

// -- Main export ------------------------------------------------------------

export function ContextPanel({
  treeId, persons, unions, relationships,
  onAddMember, onOpenMemories, onInviteFamily, onOpenProfile, onNodeClick, focusedCard,
}: Props) {
  // Derive focusPersonId for mini tree re-centering
  const focusPersonId = focusedCard?.kind === 'ancestor' ? focusedCard.person.personId : undefined
  // Derive eraYear for mini tree era highlighting
  const eraYear = focusedCard?.kind === 'timeline' && focusedCard.eventType === 'historical'
    ? focusedCard.year : undefined

  return (
    <div className="space-y-5">

      {/* Context-aware block (shown when hovering a feed card) */}
      {focusedCard && (
        <FocusContextBlock focusedCard={focusedCard} persons={persons} />
      )}

      {/* Mini Tree */}
      <Section title="Your Family">
        <MiniTreeBlock persons={persons} relationships={relationships} onNodeClick={onNodeClick} focusPersonId={focusPersonId} eraYear={eraYear} />
      </Section>

      {/* Quick Actions */}
      <Section title="Quick Actions">
        <div className="space-y-2">
          <button
            onClick={onAddMember}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2F3E8F] text-white text-sm font-semibold hover:bg-[#3B4DA6] active:scale-[0.97] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
          <button
            onClick={onOpenMemories}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#ECE7DF] border border-[#E2DBCE] text-[#3A3A3A] text-sm font-semibold hover:bg-[#E2DBCE] active:scale-[0.97] transition-all"
          >
            <BookImage className="w-4 h-4 text-[#C2A46D]" />
            Add Memory
          </button>
          {onInviteFamily && (
            <button
              onClick={onInviteFamily}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#ECE7DF] border border-[#E2DBCE] text-[#3A3A3A] text-sm font-semibold hover:bg-[#E2DBCE] active:scale-[0.97] transition-all"
            >
              <UserPlus className="w-4 h-4 text-[#C2A46D]" />
              Invite Family
            </button>
          )}
        </div>
      </Section>

      {/* Live Insights — hidden when timeline card is focused (replaced by FocusContextBlock) */}
      {persons.length > 0 && !(focusedCard?.kind === 'timeline' && focusedCard.eventType === 'historical') && (
        <Section title="Live Insights">
          <LiveInsightsBlock persons={persons} unions={unions} />
        </Section>
      )}

      {/* Relationship Search */}
      {persons.length > 1 && (
        <Section title="How Are You Related?">
          <RelationshipSearch treeId={treeId} persons={persons} onOpenProfile={onOpenProfile} />
        </Section>
      )}
    </div>
  )
}
