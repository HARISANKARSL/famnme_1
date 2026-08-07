/**
 * Phase 6: Viewport Culling (Large Tree Performance)
 *
 * For trees with 200+ nodes, only render nodes visible in the current viewport.
 * Uses a simple spatial grid hash for O(1) viewport queries.
 *
 * Approach (from React virtualization patterns + Othram Maps):
 * 1. Build a spatial index at layout time
 * 2. On each frame/pan/zoom, query the grid for visible nodes
 * 3. Only render those nodes as React components
 */

import type { Position, LayoutConfig } from './types';

// ============================================================================
// Spatial Grid Index
// ============================================================================

/** Grid cell size — should be larger than most person cards */
const GRID_CELL_SIZE = 400;

export interface SpatialIndex {
  /** Grid cells mapping cellKey → Set<nodeId> */
  cells: Map<string, Set<string>>;
  /** All node positions */
  positions: Map<string, Position>;
  /** Layout config for node dimensions */
  config: LayoutConfig;
}

/**
 * Build a spatial index for all node positions.
 * Call this once after layout calculation.
 */
export function buildSpatialIndex(
  positions: Map<string, Position>,
  config: LayoutConfig
): SpatialIndex {
  const cells = new Map<string, Set<string>>();

  for (const [nodeId, pos] of positions) {
    // A node can span multiple grid cells
    const minCellX = Math.floor(pos.x / GRID_CELL_SIZE);
    const maxCellX = Math.floor((pos.x + config.personWidth) / GRID_CELL_SIZE);
    const minCellY = Math.floor(pos.y / GRID_CELL_SIZE);
    const maxCellY = Math.floor((pos.y + config.personHeight) / GRID_CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        let cell = cells.get(key);
        if (!cell) {
          cell = new Set();
          cells.set(key, cell);
        }
        cell.add(nodeId);
      }
    }
  }

  return { cells, positions, config };
}

// ============================================================================
// Viewport Culling
// ============================================================================

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the set of node IDs visible in the current viewport.
 *
 * @param index - Spatial index built from positions
 * @param viewport - Current viewport rectangle (in world coordinates)
 * @param zoom - Current zoom level
 * @param buffer - Extra pixels around viewport to pre-render (default 200)
 * @returns Set of visible node IDs
 */
export function getVisibleNodes(
  index: SpatialIndex,
  viewport: Viewport,
  zoom: number = 1,
  buffer: number = 200
): Set<string> {
  const visible = new Set<string>();

  // Expand viewport by buffer (in world coordinates)
  const bufferWorld = buffer / zoom;
  const vx = viewport.x - bufferWorld;
  const vy = viewport.y - bufferWorld;
  const vw = viewport.width + bufferWorld * 2;
  const vh = viewport.height + bufferWorld * 2;

  // Find grid cells that overlap the viewport
  const minCellX = Math.floor(vx / GRID_CELL_SIZE);
  const maxCellX = Math.floor((vx + vw) / GRID_CELL_SIZE);
  const minCellY = Math.floor(vy / GRID_CELL_SIZE);
  const maxCellY = Math.floor((vy + vh) / GRID_CELL_SIZE);

  for (let cx = minCellX; cx <= maxCellX; cx++) {
    for (let cy = minCellY; cy <= maxCellY; cy++) {
      const cell = index.cells.get(`${cx},${cy}`);
      if (cell) {
        for (const nodeId of cell) {
          // Fine-grained check: does the node actually overlap the viewport?
          const pos = index.positions.get(nodeId);
          if (pos) {
            const nodeRight = pos.x + index.config.personWidth;
            const nodeBottom = pos.y + index.config.personHeight;
            if (nodeRight >= vx && pos.x <= vx + vw &&
                nodeBottom >= vy && pos.y <= vy + vh) {
              visible.add(nodeId);
            }
          }
        }
      }
    }
  }

  return visible;
}

/**
 * Determine if viewport culling should be active based on node count.
 * For small trees (< 100 nodes), culling overhead isn't worth it.
 */
export function shouldCull(nodeCount: number): boolean {
  return nodeCount >= 100;
}

/**
 * Get visible edges: an edge is visible if either endpoint is visible.
 */
export function getVisibleEdges(
  visibleNodes: Set<string>,
  edges: Array<{ from: string; to: string }>
): Array<{ from: string; to: string }> {
  return edges.filter(e => visibleNodes.has(e.from) || visibleNodes.has(e.to));
}
