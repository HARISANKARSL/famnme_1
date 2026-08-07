import type { FamilyMember, Relationship } from '@/types'

interface LayoutConfig {
  cardWidth: number
  cardHeight: number
  spouseGap: number // horizontal gap between spouses
  siblingGap: number // horizontal gap between siblings
  generationGap: number // vertical gap between generations
  minNodeGap: number // minimum gap between any two nodes
}

const defaultConfig: LayoutConfig = {
  cardWidth: 160,
  cardHeight: 220,
  spouseGap: 40, // Small gap like Ancestry (they use 26px for 56px cards)
  siblingGap: 100, // Gap between sibling groups
  generationGap: 180, // Vertical space between generations (Ancestry uses 150-170px)
  minNodeGap: 20, // Minimum padding between nodes
}

// Layout node used internally
// interface PersonNode {
//   id: string
//   member: FamilyMember
//   x: number
//   y: number
//   generation: number
//   spouseId?: string
//   parentIds: string[]
//   childIds: string[]
// }

/**
 * Simple coordinate-based layout inspired by Ancestry.com
 * No elkjs - just direct position calculation
 */
export async function calculateSimpleTreeLayout(
  members: FamilyMember[],
  relationships: Relationship[],
  config: Partial<LayoutConfig> = {}
): Promise<Map<string, { x: number; y: number }>> {
  const cfg = { ...defaultConfig, ...config }
  const positions = new Map<string, { x: number; y: number }>()

  if (members.length === 0) return positions

  // Find primary user
  const primaryUser = members.find(m => m.is_primary_user)
  if (!primaryUser) {
    // Fallback: simple row layout
    members.forEach((member, index) => {
      positions.set(member.id, {
        x: index * (cfg.cardWidth + cfg.minNodeGap),
        y: 0,
      })
    })
    return positions
  }

  // Build relationship maps
  const spouseMap = new Map<string, string>() // personId -> spouseId
  const parentsMap = new Map<string, string[]>() // childId -> [parent1, parent2]
  const childrenMap = new Map<string, string[]>() // parentId -> [child1, child2, ...]

  relationships.forEach(rel => {
    if (rel.relationship_type === 'spouse') {
      spouseMap.set(rel.from_member_id, rel.to_member_id)
    } else if (rel.relationship_type === 'family') {
      // from = parent, to = child
      if (!childrenMap.has(rel.from_member_id)) {
        childrenMap.set(rel.from_member_id, [])
      }
      childrenMap.get(rel.from_member_id)!.push(rel.to_member_id)

      if (!parentsMap.has(rel.to_member_id)) {
        parentsMap.set(rel.to_member_id, [])
      }
      parentsMap.get(rel.to_member_id)!.push(rel.from_member_id)
    }
  })

  // Calculate generations via BFS
  const generations = new Map<string, number>()
  const queue: string[] = [primaryUser.id]
  generations.set(primaryUser.id, 0)

  while (queue.length > 0) {
    const personId = queue.shift()!
    const gen = generations.get(personId)!

    // Process parents (generation - 1)
    const parents = parentsMap.get(personId) || []
    parents.forEach(parentId => {
      if (!generations.has(parentId)) {
        generations.set(parentId, gen - 1)
        queue.push(parentId)
      }
    })

    // Process children (generation + 1)
    const children = childrenMap.get(personId) || []
    children.forEach(childId => {
      if (!generations.has(childId)) {
        generations.set(childId, gen + 1)
        queue.push(childId)
      }
    })

    // Process spouse (same generation)
    const spouseId = spouseMap.get(personId)
    if (spouseId && !generations.has(spouseId)) {
      generations.set(spouseId, gen)
      queue.push(spouseId)
    }
  }

  // Group people by generation
  const generationGroups = new Map<number, FamilyMember[]>()
  members.forEach(member => {
    const gen = generations.get(member.id) ?? 0
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, [])
    }
    generationGroups.get(gen)!.push(member)
  })

  // Sort generations (top to bottom: oldest to youngest)
  const sortedGenerations = Array.from(generationGroups.keys()).sort((a, b) => a - b)

  // Position each generation
  sortedGenerations.forEach(gen => {
    const genMembers = generationGroups.get(gen)!
    const genY = (gen - Math.min(...sortedGenerations)) * (cfg.cardHeight + cfg.generationGap)

    // Identify couples in this generation
    const positioned = new Set<string>()
    const coupleGroups: FamilyMember[][] = []
    const singles: FamilyMember[] = []

    genMembers.forEach(member => {
      if (positioned.has(member.id)) return

      const spouseId = spouseMap.get(member.id)
      if (spouseId && genMembers.find(m => m.id === spouseId)) {
        // It's a couple in this generation
        const spouse = members.find(m => m.id === spouseId)!
        coupleGroups.push([member, spouse])
        positioned.add(member.id)
        positioned.add(spouseId)
      } else {
        // Single person
        singles.push(member)
        positioned.add(member.id)
      }
    })

    // Calculate total width needed for this generation
    let currentX = 0

    // Position couples first
    coupleGroups.forEach((couple, _index) => {
      const [person1, person2] = couple

      // Determine order (male first if possible, for consistency)
      const orderedCouple = person1.gender === 'Male' ? [person1, person2] : [person2, person1]

      // Position couple side-by-side
      positions.set(orderedCouple[0].id, { x: currentX, y: genY })
      positions.set(orderedCouple[1].id, {
        x: currentX + cfg.cardWidth + cfg.spouseGap,
        y: genY,
      })

      // Position children below couple (if any)
      const children = childrenMap.get(orderedCouple[0].id) || childrenMap.get(orderedCouple[1].id) || []
      const coupleCenter = currentX + cfg.cardWidth + cfg.spouseGap / 2

      if (children.length > 0) {
        // Check if children are in next generation
        const childGeneration = gen + 1
        const childMembers = children
          .map(id => members.find(m => m.id === id))
          .filter((m): m is FamilyMember => m !== undefined && generations.get(m.id) === childGeneration)

        if (childMembers.length > 0) {
          // Position children centered under parents
          const childrenWidth = childMembers.length * cfg.cardWidth + (childMembers.length - 1) * cfg.siblingGap
          const startX = coupleCenter - childrenWidth / 2

          childMembers.forEach((child, childIndex) => {
            const childX = startX + childIndex * (cfg.cardWidth + cfg.siblingGap)
            const childY = genY + cfg.cardHeight + cfg.generationGap

            // Only set if not already positioned
            if (!positions.has(child.id)) {
              positions.set(child.id, { x: childX, y: childY })
            }
          })
        }
      }

      // Move to next couple position
      currentX += cfg.cardWidth * 2 + cfg.spouseGap + cfg.siblingGap
    })

    // Position singles
    singles.forEach(single => {
      if (!positions.has(single.id)) {
        positions.set(single.id, { x: currentX, y: genY })
        currentX += cfg.cardWidth + cfg.siblingGap
      }
    })
  })

  // Normalize positions to center the tree (find bounds and offset)
  const allX = Array.from(positions.values()).map(p => p.x)
  const allY = Array.from(positions.values()).map(p => p.y)
  const minX = Math.min(...allX)
  const minY = Math.min(...allY)

  // Offset all positions to start from (100, 100) for padding
  const paddingX = 100
  const paddingY = 100
  positions.forEach((pos, id) => {
    positions.set(id, {
      x: pos.x - minX + paddingX,
      y: pos.y - minY + paddingY,
    })
  })

  return positions
}
