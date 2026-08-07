/**
 * GridOverlay Component - Mathematical Grid Visualization
 *
 * Displays the underlying mathematical grid structure that governs node placement.
 * Shows the "circuit board" foundation of the family tree layout.
 *
 * Features:
 * - Grid cells (180×240px) - the fundamental unit
 * - Generation lines (every 540px vertically)
 * - Anchor points (where edges connect)
 * - Node center points
 * - Spacing measurements
 * - Snap guides
 *
 * This is a DEVELOPMENT TOOL for validating mathematical alignment.
 */

import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import type { Position } from '@/services/elkLayoutService';
import type { Person, Union } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface GridOverlayProps {
  /** All node positions (for showing anchor points) */
  positions: Map<string, Position>;

  /** All persons (for labeling) */
  persons: Person[];

  /** All unions (for showing union centers) */
  unions: Union[];

  /** Canvas bounds */
  bounds: {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  /** Grid visibility toggles */
  showGrid?: boolean;
  showGenerationLines?: boolean;
  showAnchorPoints?: boolean;
  showMeasurements?: boolean;
  showNodeCenters?: boolean;
  showSnapGuides?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function GridOverlay({
  positions,
  persons,
  unions,
  bounds,
  showGrid = true,
  showGenerationLines = true,
  showAnchorPoints = true,
  showMeasurements = true,
  showNodeCenters = true,
  showSnapGuides = true,
}: GridOverlayProps) {
  const { width, height, minX, minY } = bounds;

  // Calculate grid lines
  const gridLines = calculateGridLines(width, height, minX, minY);
  const generationLines = calculateGenerationLines(height, minY);

  return (
    <svg
      className="grid-overlay pointer-events-none absolute top-0 left-0"
      width={width + 200}
      height={height + 200}
      style={{ zIndex: 1000, overflow: 'visible' }}
    >
      {/* Grid Cells (180×240px units) */}
      {showGrid && <GridCells lines={gridLines} />}

      {/* Generation Lines (every 540px) */}
      {showGenerationLines && (
        <GenerationLines lines={generationLines} width={width + 200} />
      )}

      {/* Anchor Points (where edges connect) */}
      {showAnchorPoints && (
        <AnchorPoints positions={positions} persons={persons} unions={unions} />
      )}

      {/* Node Centers */}
      {showNodeCenters && <NodeCenters positions={positions} persons={persons} />}

      {/* Spacing Measurements */}
      {showMeasurements && (
        <SpacingMeasurements positions={positions} persons={persons} />
      )}

      {/* Snap Guides (show grid snapping) */}
      {showSnapGuides && <SnapGuides positions={positions} persons={persons} />}

      {/* Legend */}
      <GridLegend x={20} y={20} />
    </svg>
  );
}

// ============================================================================
// Grid Cells (180×240 units)
// ============================================================================

interface GridLines {
  vertical: number[];
  horizontal: number[];
}

function calculateGridLines(
  width: number,
  height: number,
  minX: number,
  minY: number
): GridLines {
  const vertical: number[] = [];
  const horizontal: number[] = [];

  // Vertical lines every PERSON_WIDTH (180px)
  const startX = Math.floor(minX / LAYOUT_CONSTANTS.PERSON_WIDTH) * LAYOUT_CONSTANTS.PERSON_WIDTH;
  for (let x = startX; x <= width + 200; x += LAYOUT_CONSTANTS.PERSON_WIDTH) {
    vertical.push(x);
  }

  // Horizontal lines every PERSON_HEIGHT (240px)
  const startY = Math.floor(minY / LAYOUT_CONSTANTS.PERSON_HEIGHT) * LAYOUT_CONSTANTS.PERSON_HEIGHT;
  for (let y = startY; y <= height + 200; y += LAYOUT_CONSTANTS.PERSON_HEIGHT) {
    horizontal.push(y);
  }

  return { vertical, horizontal };
}

function GridCells({ lines }: { lines: GridLines }) {
  return (
    <g className="grid-cells" opacity={0.15}>
      {/* Vertical lines */}
      {lines.vertical.map((x, i) => (
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={5000}
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}

      {/* Horizontal lines */}
      {lines.horizontal.map((y, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={5000}
          y2={y}
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}
    </g>
  );
}

// ============================================================================
// Generation Lines (every 540px = PERSON_HEIGHT + GENERATION_GAP)
// ============================================================================

function calculateGenerationLines(height: number, minY: number): number[] {
  const lines: number[] = [];
  const generationSpacing = LAYOUT_CONSTANTS.PERSON_HEIGHT + LAYOUT_CONSTANTS.GENERATION_GAP;

  // Start from the first generation line
  const startY = Math.floor(minY / generationSpacing) * generationSpacing;

  for (let y = startY; y <= height + 200; y += generationSpacing) {
    lines.push(y);
  }

  return lines;
}

function GenerationLines({ lines, width }: { lines: number[]; width: number }) {
  return (
    <g className="generation-lines" opacity={0.3}>
      {lines.map((y, i) => (
        <g key={`gen-${i}`}>
          {/* Thick generation line */}
          <line
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke="#ef4444"
            strokeWidth={2}
          />

          {/* Generation label */}
          <text
            x={10}
            y={y - 5}
            fill="#ef4444"
            fontSize={12}
            fontFamily="monospace"
            fontWeight="bold"
          >
            Generation Y={y}px
          </text>
        </g>
      ))}
    </g>
  );
}

// ============================================================================
// Anchor Points (where edges connect)
// ============================================================================

function AnchorPoints({
  positions,
  persons,
  unions,
}: {
  positions: Map<string, Position>;
  persons: Person[];
  unions: Union[];
}) {
  const anchors: Array<{ x: number; y: number; type: string; label: string }> = [];

  // Person anchor points
  persons.forEach((person) => {
    const pos = positions.get(person.personId);
    if (!pos) return;

    const halfWidth = LAYOUT_CONSTANTS.PERSON_WIDTH / 2;
    const halfHeight = LAYOUT_CONSTANTS.PERSON_HEIGHT / 2;

    anchors.push(
      {
        x: pos.x + halfWidth,
        y: pos.y,
        type: 'top',
        label: `${person.firstName} TOP`,
      },
      {
        x: pos.x + halfWidth,
        y: pos.y + LAYOUT_CONSTANTS.PERSON_HEIGHT,
        type: 'bottom',
        label: `${person.firstName} BOTTOM`,
      },
      {
        x: pos.x,
        y: pos.y + halfHeight,
        type: 'left',
        label: `${person.firstName} LEFT`,
      },
      {
        x: pos.x + LAYOUT_CONSTANTS.PERSON_WIDTH,
        y: pos.y + halfHeight,
        type: 'right',
        label: `${person.firstName} RIGHT`,
      }
    );
  });

  // Union anchor points
  unions.forEach((union) => {
    const pos = positions.get(union.unionId);
    if (!pos) return;

    anchors.push({
      x: pos.x + LAYOUT_CONSTANTS.UNION_WIDTH / 2,
      y: pos.y + LAYOUT_CONSTANTS.UNION_HEIGHT / 2,
      type: 'union',
      label: `Union ${union.unionId.slice(0, 8)}`,
    });
  });

  const colorMap = {
    top: '#10b981',
    bottom: '#60a5fa',
    left: '#8b5cf6',
    right: '#ec4899',
    union: '#ef4444',
  };

  return (
    <g className="anchor-points" opacity={0.8}>
      {anchors.map((anchor, i) => (
        <g key={i}>
          {/* Anchor point circle */}
          <circle
            cx={anchor.x}
            cy={anchor.y}
            r={4}
            fill={colorMap[anchor.type as keyof typeof colorMap]}
            stroke="white"
            strokeWidth={1}
          />

          {/* Crosshair */}
          <line
            x1={anchor.x - 8}
            y1={anchor.y}
            x2={anchor.x + 8}
            y2={anchor.y}
            stroke={colorMap[anchor.type as keyof typeof colorMap]}
            strokeWidth={1}
          />
          <line
            x1={anchor.x}
            y1={anchor.y - 8}
            x2={anchor.x}
            y2={anchor.y + 8}
            stroke={colorMap[anchor.type as keyof typeof colorMap]}
            strokeWidth={1}
          />
        </g>
      ))}
    </g>
  );
}

// ============================================================================
// Node Centers (visual center of each card)
// ============================================================================

function NodeCenters({
  positions,
  persons,
}: {
  positions: Map<string, Position>;
  persons: Person[];
}) {
  return (
    <g className="node-centers" opacity={0.6}>
      {persons.map((person) => {
        const pos = positions.get(person.personId);
        if (!pos) return null;

        const centerX = pos.x + LAYOUT_CONSTANTS.PERSON_WIDTH / 2;
        const centerY = pos.y + LAYOUT_CONSTANTS.PERSON_HEIGHT / 2;

        return (
          <g key={person.personId}>
            {/* Center point */}
            <circle cx={centerX} cy={centerY} r={3} fill="#3b82f6" />

            {/* Coordinate label */}
            <text
              x={centerX + 10}
              y={centerY - 10}
              fill="#3b82f6"
              fontSize={10}
              fontFamily="monospace"
              fontWeight="bold"
            >
              ({Math.round(centerX)}, {Math.round(centerY)})
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// Spacing Measurements (show distances between nodes)
// ============================================================================

function SpacingMeasurements({
  positions,
  persons,
}: {
  positions: Map<string, Position>;
  persons: Person[];
}) {
  const measurements: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    distance: number;
    type: 'horizontal' | 'vertical';
  }> = [];

  // Calculate horizontal spacing between adjacent nodes in same generation
  const byGeneration = new Map<number, Array<{ person: Person; pos: Position }>>();

  persons.forEach((person) => {
    const pos = positions.get(person.personId);
    if (!pos) return;

    const gen = Math.round(pos.y / LAYOUT_CONSTANTS.PERSON_HEIGHT);
    if (!byGeneration.has(gen)) {
      byGeneration.set(gen, []);
    }
    byGeneration.get(gen)!.push({ person, pos });
  });

  // For each generation, measure spacing between adjacent nodes
  byGeneration.forEach((nodes) => {
    // Sort by X position
    nodes.sort((a, b) => a.pos.x - b.pos.x);

    for (let i = 0; i < nodes.length - 1; i++) {
      const node1 = nodes[i];
      const node2 = nodes[i + 1];

      const x1 = node1.pos.x + LAYOUT_CONSTANTS.PERSON_WIDTH;
      const x2 = node2.pos.x;
      const y = node1.pos.y + LAYOUT_CONSTANTS.PERSON_HEIGHT / 2;

      measurements.push({
        x1,
        y1: y,
        x2,
        y2: y,
        distance: x2 - x1,
        type: 'horizontal',
      });
    }
  });

  // Calculate vertical spacing between generations
  const generations = Array.from(byGeneration.keys()).sort((a, b) => a - b);

  console.log('=== VERTICAL SPACING DEBUG ===');
  console.log('Generations found:', generations);
  byGeneration.forEach((nodes, gen) => {
    console.log(`Gen ${gen}: ${nodes.length} nodes, Y positions:`, nodes.map(n => ({
      name: n.person.firstName,
      y: n.pos.y
    })));
  });

  for (let i = 0; i < generations.length - 1; i++) {
    const gen1 = generations[i];
    const gen2 = generations[i + 1];
    const gen1Nodes = byGeneration.get(gen1)!;
    const gen2Nodes = byGeneration.get(gen2)!;

    // Take first node from each generation to measure vertical spacing
    if (gen1Nodes.length > 0 && gen2Nodes.length > 0) {
      const node1 = gen1Nodes[0];
      const node2 = gen2Nodes[0];

      const x = node1.pos.x + LAYOUT_CONSTANTS.PERSON_WIDTH / 2;
      const y1 = node1.pos.y + LAYOUT_CONSTANTS.PERSON_HEIGHT;
      const y2 = node2.pos.y;
      const distance = y2 - y1;

      console.log(`Vertical gap Gen ${gen1} → Gen ${gen2}:`, {
        from: node1.person.firstName,
        to: node2.person.firstName,
        y1,
        y2,
        distance
      });

      measurements.push({
        x1: x,
        y1,
        x2: x,
        y2,
        distance,
        type: 'vertical',
      });
    }
  }

  return (
    <g className="spacing-measurements" opacity={0.7}>
      {measurements.map((m, i) => {
        const midX = (m.x1 + m.x2) / 2;
        const midY = (m.y1 + m.y2) / 2;

        // Color based on type and spacing
        let expectedSpacing: number;
        let color: string;

        if (m.type === 'horizontal') {
          expectedSpacing = LAYOUT_CONSTANTS.NODE_SPACING;
          const isCorrect = m.distance >= expectedSpacing;
          color = isCorrect ? '#10b981' : '#ef4444';
        } else {
          // Vertical measurements - use purple/magenta color
          expectedSpacing = LAYOUT_CONSTANTS.GENERATION_GAP;
          const isCorrect = Math.abs(m.distance - expectedSpacing) < 50;
          color = isCorrect ? '#a855f7' : '#ec4899';
        }

        return (
          <g key={i}>
            {/* Measurement line */}
            <line
              x1={m.x1}
              y1={m.y1}
              x2={m.x2}
              y2={m.y2}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="2 2"
            />

            {/* End markers */}
            <circle cx={m.x1} cy={m.y1} r={3} fill={color} />
            <circle cx={m.x2} cy={m.y2} r={3} fill={color} />

            {/* Distance label */}
            <rect
              x={midX - 30}
              y={midY - 12}
              width={60}
              height={18}
              fill="white"
              stroke={color}
              strokeWidth={1}
              rx={2}
            />
            <text
              x={midX}
              y={midY + 4}
              fill={color}
              fontSize={11}
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {Math.round(m.distance)}px
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// Snap Guides (show grid alignment)
// ============================================================================

function SnapGuides({
  positions,
  persons,
}: {
  positions: Map<string, Position>;
  persons: Person[];
}) {
  return (
    <g className="snap-guides" opacity={0.4}>
      {persons.map((person) => {
        const pos = positions.get(person.personId);
        if (!pos) return null;

        // Check if position snaps to grid
        const xSnapped = pos.x % LAYOUT_CONSTANTS.PERSON_WIDTH === 0;
        const ySnapped = pos.y % LAYOUT_CONSTANTS.PERSON_HEIGHT === 0;

        return (
          <g key={person.personId}>
            {/* Vertical snap guide */}
            {xSnapped && (
              <line
                x1={pos.x}
                y1={pos.y - 20}
                x2={pos.x}
                y2={pos.y + LAYOUT_CONSTANTS.PERSON_HEIGHT + 20}
                stroke="#10b981"
                strokeWidth={2}
              />
            )}

            {/* Horizontal snap guide */}
            {ySnapped && (
              <line
                x1={pos.x - 20}
                y1={pos.y}
                x2={pos.x + LAYOUT_CONSTANTS.PERSON_WIDTH + 20}
                y2={pos.y}
                stroke="#10b981"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// Legend
// ============================================================================

function GridLegend({ x, y }: { x: number; y: number }) {
  const items = [
    { color: '#3b82f6', label: 'Grid (180×240px)' },
    { color: '#ef4444', label: 'Generation Lines' },
    { color: '#10b981', label: 'Top Anchor / H-Spacing' },
    { color: '#a855f7', label: 'V-Spacing (Gen Gap)' },
    { color: '#60a5fa', label: 'Bottom Anchor' },
    { color: '#8b5cf6', label: 'Left Anchor' },
    { color: '#ec4899', label: 'Right Anchor' },
  ];

  return (
    <g className="grid-legend">
      {/* Background */}
      <rect
        x={x}
        y={y}
        width={180}
        height={items.length * 20 + 30}
        fill="white"
        stroke="#e5e7eb"
        strokeWidth={2}
        rx={4}
        opacity={0.95}
      />

      {/* Title */}
      <text
        x={x + 10}
        y={y + 18}
        fill="#1f2937"
        fontSize={12}
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        Grid Overlay
      </text>

      {/* Items */}
      {items.map((item, i) => (
        <g key={i}>
          <circle cx={x + 15} cy={y + 38 + i * 20} r={4} fill={item.color} />
          <text
            x={x + 25}
            y={y + 42 + i * 20}
            fill="#4b5563"
            fontSize={10}
            fontFamily="sans-serif"
          >
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}
