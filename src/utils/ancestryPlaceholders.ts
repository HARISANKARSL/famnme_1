import type { FamilyMember, Relationship } from '@/types'

interface PlaceholderConfig {
  cardWidth: number
  cardHeight: number
  spouseGap: number
  generationGap: number
}

/**
 * Generate placeholder nodes that work with ancestryTreeLayout
 * This ensures proper spacing and no overlaps with existing nodes
 */
export function generateAncestryPlaceholders(
  members: FamilyMember[],
  relationships: Relationship[],
  positions: Map<string, { x: number; y: number }>,
  onAddPlaceholder?: (
    memberId: string,
    relationship: 'father' | 'mother' | 'brother' | 'sister' | 'spouse' | 'son' | 'daughter',
    position?: { x: number; y: number }
  ) => void,
  config: PlaceholderConfig = {
    cardWidth: 220,
    cardHeight: 280,
    spouseGap: 160,      // Genealogical Standard: 160px (R2)
    generationGap: 100,  // Genealogical Standard: 100px (R1)
  }
): Array<{
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    onAdd?: () => void
    childId?: string
  }
}> {
  const placeholders: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: { label: string; onAdd?: () => void; childId?: string }
  }> = []

  // Build parent map
  const parentsOf = new Map<string, { fatherId?: string; motherId?: string }>()
  const spouseOf = new Map<string, string>()

  relationships.forEach(rel => {
    if (rel.relationship_type === 'family') {
      const parent = members.find(m => m.id === rel.from_member_id)
      if (!parent) return

      if (!parentsOf.has(rel.to_member_id)) {
        parentsOf.set(rel.to_member_id, {})
      }

      const parentInfo = parentsOf.get(rel.to_member_id)!
      if (parent.gender === 'Male') {
        parentInfo.fatherId = parent.id
      } else if (parent.gender === 'Female') {
        parentInfo.motherId = parent.id
      }
    } else if (rel.relationship_type === 'spouse') {
      spouseOf.set(rel.from_member_id, rel.to_member_id)
      spouseOf.set(rel.to_member_id, rel.from_member_id)
    }
  })

  // Track which positions are already occupied
  const occupiedPositions = new Set<string>()
  positions.forEach((pos, _id) => {
    const key = `${Math.round(pos.x)},${Math.round(pos.y)}`
    occupiedPositions.add(key)
  })

  // For each member, check if they're missing parents
  members.forEach(member => {
    const memberPos = positions.get(member.id)
    if (!memberPos) return

    const parents = parentsOf.get(member.id) || {}
    const hasFather = !!parents.fatherId
    const hasMother = !!parents.motherId

    // Calculate child's center X
    const childCenterX = memberPos.x + config.cardWidth / 2

    // Missing both parents - create couple placeholder above
    if (!hasFather && !hasMother) {
      const parentY = memberPos.y - config.generationGap - config.cardHeight

      // Position father and mother using Genealogical Standard formulas (R6)
      // coupleCenterX = childCenterX (centered above child)
      // fatherX = coupleCenterX - (spouseGap / 2) - (cardWidth / 2)
      // motherX = coupleCenterX + (spouseGap / 2) - (cardWidth / 2)
      const fatherX = childCenterX - (config.spouseGap / 2) - (config.cardWidth / 2)
      const motherX = childCenterX + (config.spouseGap / 2) - (config.cardWidth / 2)

      // Check if positions are free
      const fatherKey = `${Math.round(fatherX)},${Math.round(parentY)}`
      const motherKey = `${Math.round(motherX)},${Math.round(parentY)}`

      if (!occupiedPositions.has(fatherKey)) {
        placeholders.push({
          id: `placeholder-father-${member.id}`,
          type: 'placeholder',
          position: { x: fatherX, y: parentY },
          data: {
            label: 'Add father',
            onAdd: () => onAddPlaceholder?.(member.id, 'father', { x: fatherX, y: parentY }),
            childId: member.id,
          },
        })
        occupiedPositions.add(fatherKey)
      }

      if (!occupiedPositions.has(motherKey)) {
        placeholders.push({
          id: `placeholder-mother-${member.id}`,
          type: 'placeholder',
          position: { x: motherX, y: parentY },
          data: {
            label: 'Add mother',
            onAdd: () => onAddPlaceholder?.(member.id, 'mother', { x: motherX, y: parentY }),
            childId: member.id,
          },
        })
        occupiedPositions.add(motherKey)
      }
    } else if (!hasFather && hasMother) {
      // Missing only father - position next to mother using Genealogical Standard (R6)
      // placeholderX = existingParentX - (spouseGap + nodeWidth) [left of mother]
      const motherPos = positions.get(parents.motherId!)
      if (motherPos) {
        const fatherX = motherPos.x - config.spouseGap - config.cardWidth
        const fatherKey = `${Math.round(fatherX)},${Math.round(motherPos.y)}`

        if (!occupiedPositions.has(fatherKey)) {
          placeholders.push({
            id: `placeholder-father-${member.id}`,
            type: 'placeholder',
            position: { x: fatherX, y: motherPos.y },
            data: {
              label: 'Add father',
              onAdd: () => onAddPlaceholder?.(member.id, 'father', { x: fatherX, y: motherPos.y }),
              childId: member.id,
            },
          })
          occupiedPositions.add(fatherKey)
        }
      }
    } else if (hasFather && !hasMother) {
      // Missing only mother - position next to father using Genealogical Standard (R6)
      // placeholderX = existingParentX + (spouseGap + nodeWidth) [right of father]
      const fatherPos = positions.get(parents.fatherId!)
      if (fatherPos) {
        const motherX = fatherPos.x + config.cardWidth + config.spouseGap
        const motherKey = `${Math.round(motherX)},${Math.round(fatherPos.y)}`

        if (!occupiedPositions.has(motherKey)) {
          placeholders.push({
            id: `placeholder-mother-${member.id}`,
            type: 'placeholder',
            position: { x: motherX, y: fatherPos.y },
            data: {
              label: 'Add mother',
              onAdd: () => onAddPlaceholder?.(member.id, 'mother', { x: motherX, y: fatherPos.y }),
              childId: member.id,
            },
          })
          occupiedPositions.add(motherKey)
        }
      }
    }
  })

  return placeholders
}
