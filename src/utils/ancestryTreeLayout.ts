import type { FamilyMember, Relationship } from '@/types'

/**
 * Proper Ancestry.com-style tree layout with no overlaps
 *
 * Key principles:
 * 1. Process generations from bottom-up to calculate space requirements
 * 2. Position couples as units on the same row
 * 3. Center children under their parent couple
 * 4. Ensure no overlaps by tracking used space
 */

interface LayoutConfig {
  cardWidth: number
  cardHeight: number
  spouseGap: number
  siblingGap: number
  generationGap: number
  minNodeGap: number
}

const defaultConfig: LayoutConfig = {
  cardWidth: 220,      // Genealogical Standard: 220px
  cardHeight: 280,     // Genealogical Standard: 280px
  spouseGap: 160,      // Genealogical Standard: 160px (R2)
  siblingGap: 180,     // Genealogical Standard: 180px (R4)
  generationGap: 100,  // Genealogical Standard: 100px (R1)
  minNodeGap: 20,      // Minimum gap between nodes
}

interface PersonNode {
  id: string
  spouseId: string | null
  parentIds: string[]
  childIds: string[]
  generation: number
  x: number
  y: number
  subtreeWidth: number // Total width needed for this person + all descendants
}

export async function calculateAncestryTreeLayout(
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
    // Fallback: simple row
    members.forEach((member, index) => {
      positions.set(member.id, {
        x: index * (cfg.cardWidth + cfg.siblingGap),
        y: 0,
      })
    })
    return positions
  }

  // Build relationship maps
  const spouseMap = new Map<string, string>()
  const parentsMap = new Map<string, string[]>()
  const childrenMap = new Map<string, Set<string>>()

  relationships.forEach(rel => {
    if (rel.relationship_type === 'spouse') {
      spouseMap.set(rel.from_member_id, rel.to_member_id)
    } else if (rel.relationship_type === 'family') {
      if (!childrenMap.has(rel.from_member_id)) {
        childrenMap.set(rel.from_member_id, new Set())
      }
      childrenMap.get(rel.from_member_id)!.add(rel.to_member_id)

      if (!parentsMap.has(rel.to_member_id)) {
        parentsMap.set(rel.to_member_id, [])
      }
      parentsMap.get(rel.to_member_id)!.push(rel.from_member_id)
    }
  })

  // Calculate generations (BFS from primary user)
  const generations = new Map<string, number>()
  const queue: string[] = [primaryUser.id]
  generations.set(primaryUser.id, 0)

  while (queue.length > 0) {
    const personId = queue.shift()!
    const gen = generations.get(personId)!

    // Parents
    const parents = parentsMap.get(personId) || []
    parents.forEach(parentId => {
      if (!generations.has(parentId)) {
        generations.set(parentId, gen - 1)
        queue.push(parentId)
      }
    })

    // Children
    const children = childrenMap.get(personId) || new Set()
    children.forEach(childId => {
      if (!generations.has(childId)) {
        generations.set(childId, gen + 1)
        queue.push(childId)
      }
    })

    // Spouse (same generation)
    const spouseId = spouseMap.get(personId)
    if (spouseId && !generations.has(spouseId)) {
      generations.set(spouseId, gen)
      queue.push(spouseId)
    }
  }

  // Group by generation
  const generationGroups = new Map<number, string[]>()
  members.forEach(member => {
    const gen = generations.get(member.id) ?? 0
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, [])
    }
    generationGroups.get(gen)!.push(member.id)
  })

  const sortedGens = Array.from(generationGroups.keys()).sort((a, b) => a - b)
  const minGen = Math.min(...sortedGens)
  const maxGen = Math.max(...sortedGens)

  // Build person nodes with relationships
  const nodes = new Map<string, PersonNode>()
  members.forEach(member => {
    nodes.set(member.id, {
      id: member.id,
      spouseId: spouseMap.get(member.id) || null,
      parentIds: parentsMap.get(member.id) || [],
      childIds: Array.from(childrenMap.get(member.id) || []),
      generation: generations.get(member.id) ?? 0,
      x: 0,
      y: 0,
      subtreeWidth: cfg.cardWidth,
    })
  })

  // Calculate subtree widths (bottom-up from youngest generation)
  for (let gen = maxGen; gen >= minGen; gen--) {
    const genPeople = generationGroups.get(gen) || []

    genPeople.forEach(personId => {
      const node = nodes.get(personId)!
      const children = node.childIds

      if (children.length === 0) {
        // Leaf node - check if part of couple
        const spouse = node.spouseId
        if (spouse && generations.get(spouse) === gen) {
          // Part of couple - use combined width
          node.subtreeWidth = cfg.cardWidth * 2 + cfg.spouseGap
        } else {
          node.subtreeWidth = cfg.cardWidth
        }
      } else {
        // Has children - subtree width is max of:
        // 1. Own width (with spouse if applicable)
        // 2. Sum of children subtree widths + gaps
        const ownWidth = node.spouseId ? cfg.cardWidth * 2 + cfg.spouseGap : cfg.cardWidth

        const childrenSubtreeWidths = children.map(cId => nodes.get(cId)!.subtreeWidth)
        const childrenTotalWidth = childrenSubtreeWidths.reduce((sum, w) => sum + w, 0) +
                                   (children.length - 1) * cfg.siblingGap

        node.subtreeWidth = Math.max(ownWidth, childrenTotalWidth)
      }
    })
  }

  // Pre-calculate Y coordinates for each generation level
  // This ensures ALL nodes in the same generation are at the exact same Y
  const generationYPositions = new Map<number, number>()
  const startY = 100 // Top offset

  for (let gen = minGen; gen <= maxGen; gen++) {
    const genIndex = gen - minGen
    generationYPositions.set(gen, startY + genIndex * (cfg.cardHeight + cfg.generationGap))
  }

  console.log('Generation Y positions:', Array.from(generationYPositions.entries()))

  // Position nodes (top-down from oldest generation)
  const positionSubtree = (personId: string, centerX: number) => {
    const node = nodes.get(personId)!
    const spouse = node.spouseId
    const genY = generationYPositions.get(node.generation)!

    // Position this person/couple at their generation's Y level
    if (spouse && generations.get(spouse) === node.generation) {
      // Couple - position both centered around centerX
      const coupleWidth = cfg.cardWidth * 2 + cfg.spouseGap
      const leftX = centerX - coupleWidth / 2

      positions.set(personId, { x: leftX, y: genY })
      positions.set(spouse, { x: leftX + cfg.cardWidth + cfg.spouseGap, y: genY })
    } else {
      // Single person
      positions.set(personId, { x: centerX - cfg.cardWidth / 2, y: genY })
    }

    // Position children (horizontally centered beneath parents)
    const children = node.childIds
    if (children.length > 0) {
      const childrenSubtreeWidths = children.map(cId => nodes.get(cId)!.subtreeWidth)
      const childrenTotalWidth = childrenSubtreeWidths.reduce((sum, w) => sum + w, 0) +
                                 (children.length - 1) * cfg.siblingGap

      let childX = centerX - childrenTotalWidth / 2

      children.forEach((childId, index) => {
        const childSubtreeWidth = childrenSubtreeWidths[index]
        const childCenterX = childX + childSubtreeWidth / 2

        positionSubtree(childId, childCenterX)

        childX += childSubtreeWidth + cfg.siblingGap
      })
    }
  }

  // Start positioning from primary user
  const primaryNode = nodes.get(primaryUser.id)!

  console.log('Primary user:', primaryUser.first_name, 'Subtree width:', primaryNode.subtreeWidth)
  console.log('Generations:', minGen, 'to', maxGen)
  console.log('Starting position - centerX:', primaryNode.subtreeWidth / 2 + 100)

  positionSubtree(primaryUser.id, primaryNode.subtreeWidth / 2 + 100)

  console.log('Final positions:', Array.from(positions.entries()).map(([id, pos]) => {
    const member = members.find(m => m.id === id)
    return { name: member?.first_name, x: pos.x, y: pos.y }
  }))

  // Handle any unpositioned nodes (shouldn't happen but safety net)
  members.forEach((member, index) => {
    if (!positions.has(member.id)) {
      console.warn('Unpositioned member:', member.id, member.first_name)
      positions.set(member.id, {
        x: 100 + index * (cfg.cardWidth + cfg.siblingGap),
        y: 100,
      })
    }
  })

  return positions
}
