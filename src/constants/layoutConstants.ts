/**
 * Layout Constants for Union-Based Family Tree
 *
 * Fixed dimensions required by ELK.js layout algorithm.
 * These dimensions are non-negotiable for proper ELK layering.
 *
 * @see references/family-tree_ancestry.md
 */

export const LAYOUT_CONSTANTS = {
  // Person Card Dimensions (fixed size for ELK)
  PERSON_WIDTH: 180,
  PERSON_HEIGHT: 240,

  // Union Node Dimensions (invisible anchor points)
  UNION_WIDTH: 24,
  UNION_HEIGHT: 24,

  // Vertical Spacing (professional breathing room for clear hierarchy)
  GENERATION_GAP: 180,  // Distance between parent and child generations

  // Horizontal Spacing (aligned with ELK for consistency)
  NODE_SPACING: 60,      // Minimum horizontal distance between nodes
  SPOUSE_GAP: 48,        // Distance between spouses (side-by-side)
  SIBLING_GAP: 60,       // Distance between siblings
  FAMILY_UNIT_GAP: 120,  // Gap between different family units in same row (2x sibling gap for visual grouping)

  // Edge Rendering
  EDGE_STROKE_WIDTH: 2.0,
  EDGE_COLOR: '#707070',  // Neutral gray for all connectors (Ancestry style)
  EDGE_HOVER_COLOR: '#505050',  // Even darker on hover
  SPOUSE_LINE_COLOR: '#707070',  // Single neutral gray for spouse lines (no gender split)
  SPOUSE_DOT_COLOR: '#2F3E8F',  // Orange-brown dot at union midpoint (Ancestry style)
  EDGE_CORNER_RADIUS: 14,  // Arc radius for rounded corners on branch paths (Ancestry uses ~12-15px)
  SPOUSE_DOT_RADIUS: 5,  // Circle at spouse line endpoints (union dot)
  CHEVRON_BUTTON_RADIUS: 12,  // Expand/collapse button size
  SPOUSE_LINE_Y_OFFSET: 30, // Vertical spacing between spouse lines for polygamy (clear visual separation)
  SPOUSE_TO_CHILDREN_CLEARANCE: 8, // Minimum clearance between spouse lines and children edges
  BRANCH_STAGGER_PX: 20,   // Y offset per rank for same-row branch staggering

  // Anchor Points (relative to node dimensions)
  ANCHOR_TOP_OFFSET: 0,           // Top center (for parent connection)
  ANCHOR_BOTTOM_OFFSET: 240,      // Bottom center (for child connection)
  ANCHOR_LEFT_OFFSET: 0,          // Left center (for spouse connection)
  ANCHOR_RIGHT_OFFSET: 180,       // Right center (for spouse connection)

  // Animation
  LAYOUT_TRANSITION_DURATION: 300,  // milliseconds
  LAYOUT_TRANSITION_EASING: 'cubic-bezier(0.2, 0, 0.2, 1)',

  // Canvas
  CANVAS_PADDING: 50,  // Padding around the tree
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 2.0,
  DEFAULT_ZOOM: 1.0,
} as const;

export type LayoutConstants = typeof LAYOUT_CONSTANTS;

/**
 * ELK-specific layout configuration
 * These options control how ELK arranges the graph
 */
export const ELK_CONFIG = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',

  // Spacing between layers (generations)
  'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYOUT_CONSTANTS.GENERATION_GAP),

  // Horizontal spacing between nodes
  'elk.spacing.nodeNode': String(LAYOUT_CONSTANTS.NODE_SPACING),

  // Edge routing
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.edgeRouting': 'ORTHOGONAL',

  // Crossing minimization for cleaner layout
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',

  // Node placement strategy
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',

  // Padding around the graph
  'elk.padding': `[top=${LAYOUT_CONSTANTS.CANVAS_PADDING},left=${LAYOUT_CONSTANTS.CANVAS_PADDING},bottom=${LAYOUT_CONSTANTS.CANVAS_PADDING},right=${LAYOUT_CONSTANTS.CANVAS_PADDING}]`,

  // Prioritize straight edges where possible
  'elk.layered.nodePlacement.favorStraightEdges': 'true',

  // Consider model order (maintain sibling order)
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
} as const;

/**
 * Get anchor point coordinates for a person card
 */
export function getAnchorPoint(
  position: 'top' | 'bottom' | 'left' | 'right',
  x: number,
  y: number,
  personWidth: number = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: number = LAYOUT_CONSTANTS.PERSON_HEIGHT
): { x: number; y: number } {
  const halfWidth = personWidth / 2;
  const halfHeight = personHeight / 2;

  switch (position) {
    case 'top':
      return { x: x + halfWidth, y };
    case 'bottom':
      return { x: x + halfWidth, y: y + personHeight };
    case 'left':
      return { x, y: y + halfHeight };
    case 'right':
      return { x: x + personWidth, y: y + halfHeight };
  }
}

/**
 * Get the center point of a union node
 */
export function getUnionCenter(x: number, y: number): { x: number; y: number } {
  return {
    x: x + LAYOUT_CONSTANTS.UNION_WIDTH / 2,
    y: y + LAYOUT_CONSTANTS.UNION_HEIGHT / 2,
  };
}

/**
 * Calculate bounding box for a set of positions
 */
export function calculateBoundingBox(
  positions: Map<string, { x: number; y: number }>,
  personWidth: number = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: number = LAYOUT_CONSTANTS.PERSON_HEIGHT
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (positions.size === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  positions.forEach(({ x, y }) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + personWidth);
    maxY = Math.max(maxY, y + personHeight);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
