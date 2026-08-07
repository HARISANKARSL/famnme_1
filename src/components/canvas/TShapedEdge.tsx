import { useStore, type ReactFlowState } from 'reactflow'

interface EdgeData {
  sourceId?: string
  spouseId?: string
  parent1Id?: string
  parent2Id?: string
  siblingIds?: string[]
  label?: string
}

interface CustomEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  style?: React.CSSProperties
  markerEnd?: string
  data?: EdgeData
  source?: string
  target?: string
}

interface FlowNode {
  id: string
  position?: { x: number; y: number }
  internals?: { positionAbsolute?: { x: number; y: number } }
  measured?: { width?: number; height?: number }
  width?: number
  height?: number
}

export function TShapedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}: CustomEdgeProps) {
  // Calculate the T-shaped path
  // The path goes: source -> midpoint horizontal -> down vertical -> target

  const midY = sourceY // Keep at source Y level for horizontal line
  const dropY = targetY // Drop down to target

  // Create the T-shaped path
  const path = `
    M ${sourceX},${sourceY}
    L ${targetX},${midY}
    L ${targetX},${dropY}
  `

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        fill="none"
      />
    </>
  )
}

export function SpouseEdge({
  id,
  source,
  target,
  style = {},
  sourceX,
  sourceY,
  targetX,
  targetY,
}: CustomEdgeProps) {
  // Get both spouse nodes to connect their center points
  const nodes = useStore((store: ReactFlowState) => (store.getNodes?.() ?? []) as FlowNode[])
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    // Fallback: use provided coordinates
    if (sourceX !== undefined && targetX !== undefined) {
      const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
      return (
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={path}
          fill="none"
        />
      )
    }
    return null
  }

  // Get node positions and dimensions - check both internals and position
  const sourcePos = sourceNode.internals?.positionAbsolute || { x: sourceNode.position?.x || 0, y: sourceNode.position?.y || 0 }
  const targetPos = targetNode.internals?.positionAbsolute || { x: targetNode.position?.x || 0, y: targetNode.position?.y || 0 }
  const sourceWidth = sourceNode.measured?.width || sourceNode.width || 100
  const sourceHeight = sourceNode.measured?.height || sourceNode.height || 100
  const targetWidth = targetNode.measured?.width || targetNode.width || 100
  const targetHeight = targetNode.measured?.height || targetNode.height || 100

  // Ensure we have valid positions before proceeding
  if (!sourcePos || !targetPos) {
    // Fallback: use provided coordinates
    if (sourceX !== undefined && targetX !== undefined) {
      const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
      return (
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={path}
          fill="none"
        />
      )
    }
    return null
  }

  // Determine which is left and which is right
  const isSourceLeft = sourcePos.x < targetPos.x

  let startX, startY, endX, endY

  if (isSourceLeft) {
    // Source is on left, connect from right-center of source to left-center of target
    startX = sourcePos.x + sourceWidth // right edge of source
    startY = sourcePos.y + sourceHeight / 2 // center Y of source
    endX = targetPos.x // left edge of target
    endY = targetPos.y + targetHeight / 2 // center Y of target
  } else {
    // Source is on right, connect from left-center of source to right-center of target
    startX = sourcePos.x // left edge of source
    startY = sourcePos.y + sourceHeight / 2 // center Y of source
    endX = targetPos.x + targetWidth // right edge of target
    endY = targetPos.y + targetHeight / 2 // center Y of target
  }

  const path = `M ${startX},${startY} L ${endX},${endY}`

  return (
    <path
      id={id}
      style={style}
      className="react-flow__edge-path"
      d={path}
      fill="none"
    />
  )
}

export function FamilyUnitEdge({
  id,
  target,
  style = {},
  markerEnd,
  data,
}: CustomEdgeProps) {
  // Get both parent nodes and child node
  const nodes = useStore((store: ReactFlowState) => (store.getNodes?.() ?? []) as FlowNode[])
  const sourceNode = nodes.find((n) => n.id === data?.sourceId)
  const spouseNode = nodes.find((n) => n.id === data?.spouseId)
  const childNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !spouseNode || !childNode) {
    // Don't render if we don't have all the nodes we need
    return null
  }

  // Get parent node positions and dimensions - check both internals and position
  const parent1Pos = sourceNode.internals?.positionAbsolute || { x: sourceNode.position?.x || 0, y: sourceNode.position?.y || 0 }
  const parent1Width = sourceNode.measured?.width || sourceNode.width || 100
  const parent1Height = sourceNode.measured?.height || sourceNode.height || 100

  const parent2Pos = spouseNode.internals?.positionAbsolute || { x: spouseNode.position?.x || 0, y: spouseNode.position?.y || 0 }
  const parent2Width = spouseNode.measured?.width || spouseNode.width || 100
  const parent2Height = spouseNode.measured?.height || spouseNode.height || 100

  // Get child node position and dimensions
  const childPos = childNode.internals?.positionAbsolute || { x: childNode.position?.x || 0, y: childNode.position?.y || 0 }
  const childWidth = childNode.measured?.width || childNode.width || 100

  // Ensure we have valid positions before proceeding
  if (!parent1Pos || !parent2Pos || !childPos) {
    return null
  }

  // Determine which parent is on the left
  const isParent1Left = parent1Pos.x < parent2Pos.x

  let leftParentRightCenterX, leftParentRightCenterY
  let rightParentLeftCenterX

  if (isParent1Left) {
    // Parent 1 is on left
    leftParentRightCenterX = parent1Pos.x + parent1Width // right edge
    leftParentRightCenterY = parent1Pos.y + parent1Height / 2 // center Y
    rightParentLeftCenterX = parent2Pos.x // left edge
  } else {
    // Parent 2 is on left
    leftParentRightCenterX = parent2Pos.x + parent2Width // right edge
    leftParentRightCenterY = parent2Pos.y + parent2Height / 2 // center Y
    rightParentLeftCenterX = parent1Pos.x // left edge
  }

  // Calculate center of horizontal spouse line
  const spouseLineCenterX = (leftParentRightCenterX + rightParentLeftCenterX) / 2
  const spouseLineCenterY = leftParentRightCenterY // same Y level

  // Calculate top-center of child node
  const childTopCenterX = childPos.x + childWidth / 2
  const childTopCenterY = childPos.y // top edge

  // Create path: vertical line from spouse line center to child top-center
  const path = `
    M ${spouseLineCenterX},${spouseLineCenterY}
    L ${spouseLineCenterX},${childTopCenterY}
    L ${childTopCenterX},${childTopCenterY}
  `

  // Calculate label position (middle of vertical line)
  const labelX = spouseLineCenterX + 5 // Slight offset to the right
  const labelY = (spouseLineCenterY + childTopCenterY) / 2

  return (
    <g>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        fill="none"
      />
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          fill="#9ca3af"
          fontSize="12"
          fontWeight="400"
        >
          {data.label}
        </text>
      )}
    </g>
  )
}

FamilyUnitEdge.displayName = 'FamilyUnitEdge'

/**
 * SiblingBracketEdge - Creates a horizontal bracket above siblings with a label
 * This provides visual grouping for siblings
 */
export function SiblingBracketEdge({
  id,
  source,
  target,
  style = {},
  data,
}: CustomEdgeProps) {
  const nodes = useStore((store: ReactFlowState) => (store.getNodes?.() ?? []) as FlowNode[])

  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    return null
  }

  const sourcePos = sourceNode.internals?.positionAbsolute || sourceNode.position || { x: 0, y: 0 }
  const targetPos = targetNode.internals?.positionAbsolute || targetNode.position || { x: 0, y: 0 }

  const nodeWidth = 120 // Standard node width
  const bracketOffset = 30 // Distance above the nodes
  const curveRadius = 15 // Radius for rounded corners

  // Calculate positions - bracket above the siblings
  const leftX = Math.min(sourcePos.x, targetPos.x) + nodeWidth / 2
  const rightX = Math.max(sourcePos.x, targetPos.x) + nodeWidth / 2
  const bracketY = Math.min(sourcePos.y, targetPos.y) - bracketOffset

  // Create the bracket path (horizontal line with rounded ends)
  const path = `
    M ${leftX},${bracketY + curveRadius}
    Q ${leftX},${bracketY} ${leftX + curveRadius},${bracketY}
    L ${rightX - curveRadius},${bracketY}
    Q ${rightX},${bracketY} ${rightX},${bracketY + curveRadius}
  `

  // Calculate label position (center of bracket, above it)
  const labelX = (leftX + rightX) / 2
  const labelY = bracketY - 10

  return (
    <g>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        fill="none"
        strokeWidth={2}
      />
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="14"
          fontWeight="500"
        >
          {data.label}
        </text>
      )}
    </g>
  )
}

SiblingBracketEdge.displayName = 'SiblingBracketEdge'

/**
 * SiblingGroupEdge - Creates the complete connection pattern for a group of siblings
 * Pattern: Parent center -> vertical drop -> horizontal line across siblings -> vertical drops to each sibling
 * Includes bracket label above the horizontal line
 */
export function SiblingGroupEdge({
  id,
  style = {},
  data,
}: CustomEdgeProps) {
  const nodes = useStore((store: ReactFlowState) => (store.getNodes?.() ?? []) as FlowNode[])

  if (!data?.parent1Id || !data?.parent2Id || !data?.siblingIds || data.siblingIds.length === 0) {
    return null
  }

  const parent1Node = nodes.find((n) => n.id === data.parent1Id)
  const parent2Node = nodes.find((n) => n.id === data.parent2Id)
  const siblingNodes = data.siblingIds.map((sid: string) => nodes.find((n) => n.id === sid)).filter(Boolean) as FlowNode[]

  if (!parent1Node || !parent2Node || siblingNodes.length === 0) {
    return null
  }

  // Get parent positions
  const parent1Pos = parent1Node.internals?.positionAbsolute || parent1Node.position || { x: 0, y: 0 }
  const parent1Width = parent1Node.measured?.width || parent1Node.width || 120
  const parent1Height = parent1Node.measured?.height || parent1Node.height || 200

  const parent2Pos = parent2Node.internals?.positionAbsolute || parent2Node.position || { x: 0, y: 0 }
  const parent2Width = parent2Node.measured?.width || parent2Node.width || 120

  // Calculate parent center point (center of spouse line)
  const isParent1Left = parent1Pos.x < parent2Pos.x
  const leftParentRightX = isParent1Left ? parent1Pos.x + parent1Width : parent2Pos.x + parent2Width
  const rightParentLeftX = isParent1Left ? parent2Pos.x : parent1Pos.x
  const parentCenterX = (leftParentRightX + rightParentLeftX) / 2
  const parentCenterY = parent1Pos.y + parent1Height / 2

  // Get sibling positions and sort by X
  const siblingPositions = siblingNodes.map((node) => {
    const pos = node.internals?.positionAbsolute || node.position || { x: 0, y: 0 }
    const width = node.measured?.width || node.width || 120
    return {
      id: node.id,
      x: pos.x,
      y: pos.y,
      centerX: pos.x + width / 2,
    }
  }).sort((a, b) => a.x - b.x)

  // Calculate horizontal line position (above siblings, below bracket)
  const siblingY = siblingPositions[0].y
  const horizontalLineY = siblingY - 80 // Space for bracket above
  const leftmostX = siblingPositions[0].centerX
  const rightmostX = siblingPositions[siblingPositions.length - 1].centerX

  // Bracket position
  const bracketY = siblingY - 110
  const bracketOffset = 15

  // Create the complete path
  const paths: string[] = []

  // 1. Vertical line from parent center to horizontal line level
  paths.push(`M ${parentCenterX},${parentCenterY} L ${parentCenterX},${horizontalLineY}`)

  // 2. Horizontal line across all siblings
  paths.push(`M ${leftmostX},${horizontalLineY} L ${rightmostX},${horizontalLineY}`)

  // 3. Vertical drops from horizontal line to each sibling
  siblingPositions.forEach((sibling) => {
    paths.push(`M ${sibling.centerX},${horizontalLineY} L ${sibling.centerX},${sibling.y}`)
  })

  // 4. Bracket above horizontal line
  const bracketPath = `
    M ${leftmostX},${bracketY + bracketOffset}
    Q ${leftmostX},${bracketY} ${leftmostX + bracketOffset},${bracketY}
    L ${rightmostX - bracketOffset},${bracketY}
    Q ${rightmostX},${bracketY} ${rightmostX},${bracketY + bracketOffset}
  `

  // Calculate label position
  const labelX = (leftmostX + rightmostX) / 2
  const labelY = bracketY - 10

  return (
    <g>
      {/* Connection lines */}
      {paths.map((path, index) => (
        <path
          key={`${id}-path-${index}`}
          style={style}
          className="react-flow__edge-path"
          d={path}
          fill="none"
          strokeWidth={2}
        />
      ))}
      {/* Bracket */}
      <path
        id={`${id}-bracket`}
        style={style}
        className="react-flow__edge-path"
        d={bracketPath}
        fill="none"
        strokeWidth={2}
      />
      {/* Label */}
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="14"
          fontWeight="500"
        >
          {data.label}
        </text>
      )}
    </g>
  )
}

SiblingGroupEdge.displayName = 'SiblingGroupEdge'
