import type { FamilyMember, Relationship } from '@/types'

/**
 * Relationship Calculator Utility
 *
 * Calculates contextual relationship labels based on a reference person (usually selected node)
 * e.g., "John's parents", "Sarah's siblings", "Mike's grandchildren"
 */

export interface RelationshipPath {
  distance: number // Generational distance (-2 = great-grandparents, -1 = grandparents, 0 = siblings/spouse, +1 = children)
  type: 'ancestor' | 'descendant' | 'sibling' | 'spouse' | 'unknown'
  label: string // e.g., "parents", "grandparents", "children", "siblings"
}

/**
 * Build adjacency maps for relationships
 */
function buildRelationshipMaps(relationships: Relationship[]) {
  const parents = new Map<string, string[]>() // child -> [parent1, parent2]
  const children = new Map<string, string[]>() // parent -> [child1, child2, ...]
  const spouses = new Map<string, string>() // person -> spouse

  relationships.forEach((rel) => {
    if (rel.relationship_type === 'family') {
      // from_member_id = parent, to_member_id = child
      if (!children.has(rel.from_member_id)) {
        children.set(rel.from_member_id, [])
      }
      children.get(rel.from_member_id)!.push(rel.to_member_id)

      if (!parents.has(rel.to_member_id)) {
        parents.set(rel.to_member_id, [])
      }
      parents.get(rel.to_member_id)!.push(rel.from_member_id)
    } else if (rel.relationship_type === 'spouse') {
      spouses.set(rel.from_member_id, rel.to_member_id)
    }
  })

  return { parents, children, spouses }
}

/**
 * Calculate generational distance from reference person
 * Negative = ancestors, Positive = descendants, 0 = same generation
 */
export function calculateGenerationalDistance(
  fromMemberId: string,
  toMemberId: string,
  relationships: Relationship[]
): number {
  if (fromMemberId === toMemberId) return 0

  const { parents, children } = buildRelationshipMaps(relationships)
  const visited = new Set<string>()
  const queue: Array<{ id: string; distance: number }> = [{ id: fromMemberId, distance: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.id === toMemberId) return current.distance

    if (visited.has(current.id)) continue
    visited.add(current.id)

    // Go up (to parents) - negative distance
    const currentParents = parents.get(current.id) || []
    currentParents.forEach((parentId) => {
      if (!visited.has(parentId)) {
        queue.push({ id: parentId, distance: current.distance - 1 })
      }
    })

    // Go down (to children) - positive distance
    const currentChildren = children.get(current.id) || []
    currentChildren.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, distance: current.distance + 1 })
      }
    })
  }

  return 0 // Not connected
}

/**
 * Check if two people are siblings
 */
export function areSiblings(
  member1Id: string,
  member2Id: string,
  relationships: Relationship[]
): boolean {
  const { parents } = buildRelationshipMaps(relationships)

  const parents1 = parents.get(member1Id) || []
  const parents2 = parents.get(member2Id) || []

  // Share at least one parent
  return parents1.some((p) => parents2.includes(p))
}

/**
 * Check if two people are spouses
 */
export function areSpouses(
  member1Id: string,
  member2Id: string,
  relationships: Relationship[]
): boolean {
  return relationships.some(
    (rel) =>
      rel.relationship_type === 'spouse' &&
      ((rel.from_member_id === member1Id && rel.to_member_id === member2Id) ||
        (rel.from_member_id === member2Id && rel.to_member_id === member1Id))
  )
}

/**
 * Get all siblings of a person
 */
export function getSiblings(memberId: string, relationships: Relationship[]): string[] {
  const { parents } = buildRelationshipMaps(relationships)
  const myParents = parents.get(memberId) || []

  if (myParents.length === 0) return []

  // Find all people who share at least one parent
  const siblings = new Set<string>()

  relationships.forEach((rel) => {
    if (rel.relationship_type === 'family' && myParents.includes(rel.from_member_id)) {
      const siblingId = rel.to_member_id
      if (siblingId !== memberId) {
        siblings.add(siblingId)
      }
    }
  })

  return Array.from(siblings)
}

/**
 * Get contextual relationship label from reference person to target
 */
export function getRelationshipLabel(
  referenceMemberId: string,
  targetMemberId: string,
  members: FamilyMember[],
  relationships: Relationship[]
): RelationshipPath {
  const referenceMember = members.find((m) => m.id === referenceMemberId)
  if (!referenceMemberId || !referenceMember) {
    return { distance: 0, type: 'unknown', label: '' }
  }

  const referenceName = referenceMember.first_name

  // Check if spouse
  if (areSpouses(referenceMemberId, targetMemberId, relationships)) {
    return { distance: 0, type: 'spouse', label: `${referenceName}'s spouse` }
  }

  // Check if sibling
  if (areSiblings(referenceMemberId, targetMemberId, relationships)) {
    return { distance: 0, type: 'sibling', label: `${referenceName}'s sibling` }
  }

  // Calculate generational distance
  const distance = calculateGenerationalDistance(referenceMemberId, targetMemberId, relationships)

  if (distance < 0) {
    // Ancestor
    const absDistance = Math.abs(distance)
    if (absDistance === 1) {
      return { distance, type: 'ancestor', label: `${referenceName}'s parent` }
    } else if (absDistance === 2) {
      return { distance, type: 'ancestor', label: `${referenceName}'s grandparent` }
    } else if (absDistance === 3) {
      return { distance, type: 'ancestor', label: `${referenceName}'s great-grandparent` }
    } else {
      const greats = 'great-'.repeat(absDistance - 2)
      return { distance, type: 'ancestor', label: `${referenceName}'s ${greats}grandparent` }
    }
  } else if (distance > 0) {
    // Descendant
    if (distance === 1) {
      return { distance, type: 'descendant', label: `${referenceName}'s child` }
    } else if (distance === 2) {
      return { distance, type: 'descendant', label: `${referenceName}'s grandchild` }
    } else if (distance === 3) {
      return { distance, type: 'descendant', label: `${referenceName}'s great-grandchild` }
    } else {
      const greats = 'great-'.repeat(distance - 2)
      return { distance, type: 'descendant', label: `${referenceName}'s ${greats}grandchild` }
    }
  }

  return { distance: 0, type: 'unknown', label: '' }
}

/**
 * Get contextual label for a group (e.g., parents, siblings, children)
 */
export function getGroupRelationshipLabel(
  referenceMemberId: string,
  groupMemberIds: string[],
  members: FamilyMember[],
  relationships: Relationship[]
): string {
  if (groupMemberIds.length === 0) return ''

  const referenceMember = members.find((m) => m.id === referenceMemberId)
  if (!referenceMember) return ''

  const referenceName = referenceMember.first_name

  // Check first member to determine group type
  const firstMemberId = groupMemberIds[0]

  // Check if siblings
  if (areSiblings(referenceMemberId, firstMemberId, relationships)) {
    return `${referenceName}'s siblings`
  }

  // Calculate distance for first member
  const distance = calculateGenerationalDistance(referenceMemberId, firstMemberId, relationships)

  if (distance === -1) {
    return `${referenceName}'s parents`
  } else if (distance === -2) {
    return `${referenceName}'s grandparents`
  } else if (distance === -3) {
    return `${referenceName}'s great-grandparents`
  } else if (distance < -3) {
    const greats = 'great-'.repeat(Math.abs(distance) - 2)
    return `${referenceName}'s ${greats}grandparents`
  } else if (distance === 1) {
    return `${referenceName}'s children`
  } else if (distance === 2) {
    return `${referenceName}'s grandchildren`
  } else if (distance === 3) {
    return `${referenceName}'s great-grandchildren`
  } else if (distance > 3) {
    const greats = 'great-'.repeat(distance - 2)
    return `${referenceName}'s ${greats}grandchildren`
  }

  return ''
}

/**
 * Get parents of a member
 */
export function getParents(memberId: string, relationships: Relationship[]): string[] {
  const { parents } = buildRelationshipMaps(relationships)
  return parents.get(memberId) || []
}

/**
 * Get children of a member
 */
export function getChildren(memberId: string, relationships: Relationship[]): string[] {
  const { children } = buildRelationshipMaps(relationships)
  return children.get(memberId) || []
}

/**
 * Get spouse of a member
 */
export function getSpouse(memberId: string, relationships: Relationship[]): string | null {
  const { spouses } = buildRelationshipMaps(relationships)
  return spouses.get(memberId) || null
}
