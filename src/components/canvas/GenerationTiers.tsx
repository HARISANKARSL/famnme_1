import { memo, useMemo } from 'react'
import type { FamilyMember, Relationship } from '@/types'

interface GenerationTiersProps {
  members: FamilyMember[]
  relationships: Relationship[]
}

interface Generation {
  level: number
  y: number
  label: string
  color: string
}

/**
 * GenerationTiers component
 * Displays subtle background bands and labels for each generation level
 */
export const GenerationTiers = memo(({ members, relationships }: GenerationTiersProps) => {
  const generations = useMemo(() => {
    if (members.length === 0) return []

    // Find the primary user
    const primaryUser = members.find(m => m.is_primary_user)
    if (!primaryUser) return []

    // Build relationship maps
    const parentsMap = new Map<string, string[]>()
    const childrenMap = new Map<string, string[]>()

    relationships.forEach(rel => {
      if (rel.relationship_type === 'family') {
        if (!parentsMap.has(rel.to_member_id)) {
          parentsMap.set(rel.to_member_id, [])
        }
        parentsMap.get(rel.to_member_id)!.push(rel.from_member_id)

        if (!childrenMap.has(rel.from_member_id)) {
          childrenMap.set(rel.from_member_id, [])
        }
        childrenMap.get(rel.from_member_id)!.push(rel.to_member_id)
      }
    })

    // Calculate generation levels using BFS
    const levels = new Map<string, number>()
    const queue: Array<{ id: string; level: number }> = [{ id: primaryUser.id, level: 0 }]
    const visited = new Set<string>()

    levels.set(primaryUser.id, 0)
    visited.add(primaryUser.id)

    while (queue.length > 0) {
      const { id, level } = queue.shift()!

      // Process parents (level - 1)
      const parents = parentsMap.get(id) || []
      parents.forEach(parentId => {
        if (!visited.has(parentId)) {
          visited.add(parentId)
          levels.set(parentId, level - 1)
          queue.push({ id: parentId, level: level - 1 })
        }
      })

      // Process children (level + 1)
      const children = childrenMap.get(id) || []
      children.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId)
          levels.set(childId, level + 1)
          queue.push({ id: childId, level: level + 1 })
        }
      })
    }

    // Group members by level and calculate Y positions
    const levelGroups = new Map<number, FamilyMember[]>()
    members.forEach(member => {
      const level = levels.get(member.id) ?? 0
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(member)
    })

    // Calculate average Y position for each level
    const generationList: Generation[] = []
    levelGroups.forEach((membersInLevel, level) => {
      const avgY = membersInLevel.reduce((sum, m) => sum + m.position_y, 0) / membersInLevel.length
      const label = getGenerationLabel(level)
      const color = getGenerationColor(level)

      generationList.push({ level, y: avgY, label, color })
    })

    // Sort by Y position (top to bottom)
    return generationList.sort((a, b) => a.y - b.y)
  }, [members, relationships])

  if (generations.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {generations.map((gen, index) => {
        const nextGen = generations[index + 1]
        const bandHeight = nextGen ? nextGen.y - gen.y : 400
        const bandY = gen.y - 150 // Offset to center around nodes

        return (
          <g key={gen.level}>
            {/* Background band */}
            <rect
              x={-5000}
              y={bandY}
              width={10000}
              height={bandHeight}
              fill={gen.color}
              opacity={0.05}
            />

            {/* Top border line */}
            <line
              x1={-5000}
              y1={bandY}
              x2={5000}
              y2={bandY}
              stroke={gen.color}
              strokeWidth={1}
              opacity={0.15}
              strokeDasharray="5,5"
            />

            {/* Generation label */}
            <text
              x={20}
              y={bandY + 25}
              fill="#9ca3af"
              fontSize="13"
              fontWeight="600"
              opacity={0.7}
            >
              {gen.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

GenerationTiers.displayName = 'GenerationTiers'

/**
 * Get human-readable generation label
 */
function getGenerationLabel(level: number): string {
  if (level === 0) return 'You'
  if (level === -1) return 'Parents'
  if (level === -2) return 'Grandparents'
  if (level === -3) return 'Great-Grandparents'
  if (level < -3) {
    const greats = 'Great-'.repeat(Math.abs(level) - 2)
    return `${greats}Grandparents`
  }
  if (level === 1) return 'Children'
  if (level === 2) return 'Grandchildren'
  if (level === 3) return 'Great-Grandchildren'
  if (level > 3) {
    const greats = 'Great-'.repeat(level - 2)
    return `${greats}Grandchildren`
  }
  return ''
}

/**
 * Get color for generation level
 */
function getGenerationColor(level: number): string {
  // Alternating colors for better distinction
  const colors = [
    '#3B82F6', // blue-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#2F3E8F', // amber-500
    '#10B981', // emerald-500
  ]
  const index = Math.abs(level) % colors.length
  return colors[index]
}
