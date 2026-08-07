import type { FamilyMember, Relationship } from '@/types'

interface CollapsedBranches {
  [nodeId: string]: {
    ancestorsCollapsed: boolean
    descendantsCollapsed: boolean
  }
}

/**
 * Filter members based on collapsed branch state
 * Returns only the members that should be visible
 */
export function filterVisibleMembers(
  members: FamilyMember[],
  relationships: Relationship[],
  collapsedBranches: CollapsedBranches
): FamilyMember[] {
  // Build relationship maps
  const parents = new Map<string, string[]>()
  const children = new Map<string, string[]>()

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
    }
  })

  // Get all ancestors of a node recursively
  const getAllAncestors = (nodeId: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(nodeId)) return visited

    const nodeParents = parents.get(nodeId) || []
    nodeParents.forEach((parentId) => {
      if (!visited.has(parentId)) {
        visited.add(parentId)
        getAllAncestors(parentId, visited)
      }
    })

    return visited
  }

  // Get all descendants of a node recursively
  const getAllDescendants = (nodeId: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(nodeId)) return visited

    const nodeChildren = children.get(nodeId) || []
    nodeChildren.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId)
        getAllDescendants(childId, visited)
      }
    })

    return visited
  }

  // Collect all nodes that should be hidden
  const hiddenNodes = new Set<string>()

  Object.entries(collapsedBranches).forEach(([nodeId, state]) => {
    if (state.ancestorsCollapsed) {
      const ancestors = getAllAncestors(nodeId)
      ancestors.forEach((ancestorId) => hiddenNodes.add(ancestorId))
    }

    if (state.descendantsCollapsed) {
      const descendants = getAllDescendants(nodeId)
      descendants.forEach((descendantId) => hiddenNodes.add(descendantId))
    }
  })

  // Return only visible members
  return members.filter((member) => !hiddenNodes.has(member.id))
}

/**
 * Filter relationships to only include those between visible members
 */
export function filterVisibleRelationships(
  relationships: Relationship[],
  visibleMemberIds: Set<string>
): Relationship[] {
  return relationships.filter(
    (rel) => visibleMemberIds.has(rel.from_member_id) && visibleMemberIds.has(rel.to_member_id)
  )
}
