/**
 * AncestorSpotlightWidget — "Ancestor of the Day"
 *
 * Picks only TRUE ancestors (parents, grandparents, etc.) by walking UP
 * the tree from the home person. Shows generation label like "Your grandmother".
 */

import { useMemo } from 'react'
import { MapPin, Briefcase, Gem, BookOpen, Users } from 'lucide-react'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { resolveBackendUrl } from '@/config/api'

interface Props {
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  onOpenProfile: (personId: string) => void
  onAddMemory?: (personId: string) => void
}

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

interface AncestorInfo {
  person: Person
  generation: number  // 1=parent, 2=grandparent, etc.
}

/**
 * Count descendants by walking DOWN from an ancestor.
 */
function countDescendants(
  personId: string,
  relationships: Relationship[]
): number {
  const visited = new Set<string>([personId])
  const queue: string[] = [personId]
  let count = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    // Find unions this person is a partner in
    const unionIds = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === current).map(r => r.toId)
    for (const unionId of unionIds) {
      // Find children of this union
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

/**
 * Walk UP the tree from home person collecting ancestors with generation depth.
 */
function collectAncestors(
  homePersonId: string,
  persons: Person[],
  relationships: Relationship[]
): AncestorInfo[] {
  if (!persons || !relationships) return []
  const personMap = new Map(persons.map(p => [p.personId, p]))
  const ancestors: AncestorInfo[] = []
  const visited = new Set<string>([homePersonId])

  // BFS queue: [personId, generation]
  const queue: Array<[string, number]> = [[homePersonId, 0]]

  while (queue.length > 0) {
    const [personId, gen] = queue.shift()!

    // Find parent unions (unions that have this person as a child)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId)

    for (const unionId of parentUnionIds) {
      // Find parents in this union
      const parentIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId)

      for (const parentId of parentIds) {
        if (visited.has(parentId)) continue
        visited.add(parentId)

        const parent = personMap.get(parentId)
        if (!parent) continue

        const nextGen = gen + 1
        ancestors.push({ person: parent, generation: nextGen })
        queue.push([parentId, nextGen])
      }
    }
  }

  return ancestors
}

/**
 * Get a human-readable generation label: "Your mother", "Your great-grandfather", etc.
 */
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

export function AncestorSpotlightWidget({ persons, unions: _unions, relationships, onOpenProfile, onAddMemory }: Props) {
  const { spotlight, genLabel, descendantCount } = useMemo(() => {
    const homePerson = persons.find(p => p.isHomePerson)
    if (!homePerson) return { spotlight: null, genLabel: '', descendantCount: 0 }

    const ancestors = collectAncestors(homePerson.personId, persons, relationships)
    if (ancestors.length === 0) return { spotlight: null, genLabel: '', descendantCount: 0 }

    // Deterministic daily pick
    const index = getDayOfYear() % ancestors.length
    const picked = ancestors[index]
    const dc = countDescendants(picked.person.personId, relationships)
    return {
      spotlight: picked.person,
      genLabel: getGenerationLabel(picked.generation, picked.person.gender || 'male'),
      descendantCount: dc,
    }
  }, [persons, relationships])

  if (!spotlight) {
    return (
      <div className="flex items-center justify-center py-6 text-center">
        <p className="text-sm text-[#8B7355]">Add ancestors to your tree to see daily spotlights</p>
      </div>
    )
  }

  const photoUrl = spotlight.profilePhotoUrl ? resolveBackendUrl(spotlight.profilePhotoUrl) : null
  const name = `${spotlight.firstName} ${spotlight.lastName || ''}`.trim()

  const birthYear = spotlight.birthDate ? new Date(spotlight.birthDate).getFullYear() : null
  const deathYear = spotlight.deathDate ? new Date(spotlight.deathDate).getFullYear() : null
  const lifespan = birthYear
    ? `${birthYear}–${deathYear || (spotlight.isLiving !== false ? 'Present' : '?')}`
    : null

  const bioSnippet = spotlight.biography
    ? spotlight.biography.length > 120
      ? spotlight.biography.slice(0, 120) + '...'
      : spotlight.biography
    : null

  return (
    <button
      onClick={() => onOpenProfile(spotlight.personId)}
      className="w-full text-left group"
    >
      <div className="flex items-start gap-4">
        {/* Photo */}
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-16 h-16 rounded-xl object-cover shrink-0 group-hover:ring-2 ring-[#2F3E8F]/30 transition-all" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#E8DCC8] to-[#E2DBCE] flex items-center justify-center shrink-0 text-[#8B7355] text-xl font-serif-display">
            {spotlight.firstName?.[0]}
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Gem className="w-3.5 h-3.5 text-[#2F3E8F]" />
            <span className="text-[10px] text-[#2F3E8F] font-semibold uppercase tracking-wider">Ancestor of the Day</span>
          </div>
          <p className="text-base font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] group-hover:text-[#2F3E8F] transition-colors">{name}</p>
          <p className="text-xs text-[#2F3E8F]/80 font-medium mt-0.5">{genLabel}</p>
          {lifespan && (
            <p className="text-xs text-[#8B7355] mt-0.5">{lifespan}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-2">
            {spotlight.birthPlace && (
              <span className="flex items-center gap-1 text-xs text-[#8B7355]">
                <MapPin className="w-3 h-3" /> {spotlight.birthPlace}
              </span>
            )}
            {spotlight.occupation && (
              <span className="flex items-center gap-1 text-xs text-[#8B7355]">
                <Briefcase className="w-3 h-3" /> {spotlight.occupation}
              </span>
            )}
          </div>

          {bioSnippet && (
            <p className="text-xs text-[#9A8D82] mt-2 leading-relaxed italic">"{bioSnippet}"</p>
          )}

          {/* Descendant count + Write memory */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {descendantCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F]">
                <Users className="w-3 h-3" /> {descendantCount} descendant{descendantCount !== 1 ? 's' : ''}
              </span>
            )}
            {onAddMemory && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddMemory(spotlight.personId) }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[#2F3E8F]/30 text-[#2F3E8F] hover:bg-[#2F3E8F]/10 transition-colors"
              >
                <BookOpen className="w-3 h-3" /> Write a memory
              </button>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
