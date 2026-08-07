/**
 * bloodRelatives — Traces the home person's blood lineage through the relationship graph.
 * Returns a Set of personIds that are direct ancestors or descendants.
 * Excludes spouses/in-laws who joined via marriage.
 */

import type { Person } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'

export function getBloodRelativeIds(persons: Person[], relationships: Relationship[]): Set<string> {
  const homePerson = persons.find(p => p.isHomePerson && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
  if (!homePerson) return new Set(persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).map(p => p.personId))

  const bloodIds = new Set<string>()
  bloodIds.add(homePerson.personId)

  // Build lookup maps
  const unionChildren = new Map<string, string[]>()
  const personUnions = new Map<string, string[]>()

  for (const r of relationships) {
    if (r.type === 'PARTNER_IN') {
      const unions = personUnions.get(r.fromId) || []
      unions.push(r.toId)
      personUnions.set(r.fromId, unions)
    }
    if (r.type === 'HAS_CHILD') {
      const children = unionChildren.get(r.fromId) || []
      children.push(r.toId)
      unionChildren.set(r.fromId, children)
    }
  }

  // childId → unionIds they came from
  const childToUnion = new Map<string, string[]>()
  for (const [unionId, children] of unionChildren) {
    for (const childId of children) {
      const unions = childToUnion.get(childId) || []
      unions.push(unionId)
      childToUnion.set(childId, unions)
    }
  }

  // BFS upward: ancestors
  const ancestorQueue = [homePerson.personId]
  while (ancestorQueue.length > 0) {
    const personId = ancestorQueue.shift()!
    const parentUnionIds = childToUnion.get(personId) || []
    for (const unionId of parentUnionIds) {
      for (const r of relationships) {
        if (r.type === 'PARTNER_IN' && r.toId === unionId && !bloodIds.has(r.fromId)) {
          bloodIds.add(r.fromId)
          ancestorQueue.push(r.fromId)
        }
      }
    }
  }

  // BFS downward: descendants
  const descendantQueue = [homePerson.personId]
  while (descendantQueue.length > 0) {
    const personId = descendantQueue.shift()!
    const unions = personUnions.get(personId) || []
    for (const unionId of unions) {
      const children = unionChildren.get(unionId) || []
      for (const childId of children) {
        if (!bloodIds.has(childId)) {
          bloodIds.add(childId)
          descendantQueue.push(childId)
        }
      }
    }
  }

  return bloodIds
}
