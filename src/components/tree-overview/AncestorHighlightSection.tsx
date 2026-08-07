import { useMemo, useState, useEffect } from 'react'
import { MapPin, Briefcase, Gem, BookOpen, Users } from 'lucide-react'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { resolveBackendUrl } from '@/config/api'
import { fetchAIAncestorInsight } from '@/services/neo4jDataService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  onPersonClick?: (personId: string) => void
  onAddMemory?: (personId: string) => void
}

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

interface AncestorInfo {
  person: Person
  generation: number
}

function collectAncestors(homePersonId: string, persons: Person[], relationships: Relationship[]): AncestorInfo[] {
  if (!persons || !relationships) return []
  const personMap = new Map(persons.map(p => [p.personId, p]))
  const ancestors: AncestorInfo[] = []
  const visited = new Set<string>([homePersonId])
  const queue: Array<[string, number]> = [[homePersonId, 0]]

  while (queue.length > 0) {
    const [personId, gen] = queue.shift()!
    const parentUnionIds = relationships.filter(r => r.type === 'HAS_CHILD' && r.toId === personId).map(r => r.fromId)
    for (const unionId of parentUnionIds) {
      const parentIds = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === unionId).map(r => r.fromId)
      for (const parentId of parentIds) {
        if (visited.has(parentId)) continue
        visited.add(parentId)
        const parent = personMap.get(parentId)
        if (!parent) continue
        ancestors.push({ person: parent, generation: gen + 1 })
        queue.push([parentId, gen + 1])
      }
    }
  }
  return ancestors
}

function countDescendants(personId: string, relationships: Relationship[]): number {
  const visited = new Set<string>([personId])
  const queue: string[] = [personId]
  let count = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    const unionIds = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === current).map(r => r.toId)
    for (const unionId of unionIds) {
      const childIds = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId).map(r => r.toId)
      for (const childId of childIds) {
        if (!visited.has(childId)) {
          visited.add(childId)
          count++
          queue.push(childId)
        }
      }
    }
  }
  return count
}

function getGenerationLabel(generation: number, gender: string): string {
  const isMale = gender === 'male'
  switch (generation) {
    case 1: return isMale ? 'Your father' : 'Your mother'
    case 2: return isMale ? 'Your grandfather' : 'Your grandmother'
    case 3: return isMale ? 'Your great-grandfather' : 'Your great-grandmother'
    default: {
      const prefix = generation > 3 ? `Your ${generation - 2}x great-` : 'Your '
      return prefix + (isMale ? 'grandfather' : 'grandmother')
    }
  }
}

export function AncestorHighlightSection({ persons, relationships, onPersonClick, onAddMemory }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { spotlight, genLabel, descendantCount } = useMemo(() => {
    const homePerson = persons.find(p => p.isHomePerson)
    if (!homePerson) return { spotlight: null, genLabel: '', descendantCount: 0 }
    const ancestors = collectAncestors(homePerson.personId, persons, relationships)
    if (ancestors.length === 0) return { spotlight: null, genLabel: '', descendantCount: 0 }
    const index = getDayOfYear() % ancestors.length
    const picked = ancestors[index]
    const dc = countDescendants(picked.person.personId, relationships)
    return {
      spotlight: picked.person,
      genLabel: getGenerationLabel(picked.generation, picked.person.gender || 'male'),
      descendantCount: dc,
    }
  }, [persons, relationships])

  // Fetch AI insight for the spotlight ancestor
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  useEffect(() => {
    if (!spotlight) return
    let cancelled = false
    fetchAIAncestorInsight(spotlight.personId, 2, descendantCount).then(insight => {
      if (!cancelled) setAiInsight(insight)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [spotlight?.personId, descendantCount])

  if (!spotlight) {
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
          Ancestor of the Day
        </h3>
        <p className="text-sm text-center py-3" style={{ color: isDark ? '#999999' : '#8B7355' }}>
          Add ancestors to see daily spotlights
        </p>
      </div>
    )
  }

  const photoUrl = spotlight.profilePhotoUrl ? resolveBackendUrl(spotlight.profilePhotoUrl) : null
  const name = `${spotlight.firstName} ${spotlight.lastName || ''}`.trim()
  const birthYear = spotlight.birthDate ? new Date(spotlight.birthDate).getFullYear() : null
  const deathYear = spotlight.deathDate ? new Date(spotlight.deathDate).getFullYear() : null
  const lifespan = birthYear ? `${birthYear}-${deathYear || (spotlight.isLiving !== false ? 'Present' : '?')}` : null

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
      <div className="flex items-center gap-2 mb-3">
        <Gem size={13} style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
          Ancestor of the Day
        </h3>
      </div>

      <button
        onClick={() => onPersonClick?.(spotlight.personId)}
        className="w-full text-left group"
      >
        <div className="flex items-start gap-3">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-14 h-14 rounded-xl object-cover shrink-0 group-hover:ring-2 dark:ring-[#7B8FD4]/30 ring-[#2F3E8F]/30 transition-all" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#E8DCC8] to-[#E2DBCE] dark:from-[#232328] dark:to-[#1C1C22] flex items-center justify-center shrink-0 text-[#8B7355] dark:text-[#B8A090] text-lg font-bold">
              {spotlight.firstName?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold group-hover:text-[#2F3E8F] dark:group-hover:text-[#7B8FD4] transition-colors" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{name}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}>{genLabel}</p>
            {lifespan && <p className="text-xs mt-0.5" style={{ color: isDark ? '#999999' : '#8B7355' }}>{lifespan}</p>}

            <div className="flex flex-wrap gap-2 mt-2">
              {spotlight.birthPlace && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? '#999999' : '#8B7355' }}>
                  <MapPin size={10} /> {spotlight.birthPlace}
                </span>
              )}
              {spotlight.occupation && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? '#999999' : '#8B7355' }}>
                  <Briefcase size={10} /> {spotlight.occupation}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* AI Insight */}
      {aiInsight && (
        <p className="mt-3 text-xs italic leading-relaxed px-1" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
          \"{aiInsight}\"
        </p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {descendantCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: isDark ? 'rgba(123,143,212,0.15)' : 'rgba(194,120,74,0.1)', color: isDark ? '#7B8FD4' : '#2F3E8F' }}>
            <Users size={11} /> {descendantCount} descendant{descendantCount !== 1 ? 's' : ''}
          </span>
        )}
        {onAddMemory && (
          <button
            onClick={() => onAddMemory(spotlight.personId)}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors hover:bg-[#2F3E8F]/10 dark:hover:bg-[#7B8FD4]/10"
            style={{ borderColor: isDark ? 'rgba(123,143,212,0.3)' : 'rgba(194,120,74,0.3)', color: isDark ? '#7B8FD4' : '#2F3E8F' }}
          >
            <BookOpen size={11} /> Write a memory
          </button>
        )}
      </div>
    </div>
  )
}
