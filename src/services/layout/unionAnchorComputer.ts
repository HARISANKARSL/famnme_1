/**
 * Phase 4: Compute Union Anchors & Edge Metadata
 *
 * After person positions are finalized, compute derived data for rendering:
 * - Union anchor points (midpoint between spouses)
 * - Bounding box of all positions
 */

import type { Union } from '@/types';
import type { Relationship } from './types';
import type { Position, UnionAnchor, LayoutConfig, LayoutResult } from './types';

/**
 * Compute union anchor positions for all unions.
 * Union anchor = midpoint between the two spouses, positioned at the
 * bottom edge of the spouse row.
 */
export function computeUnionAnchors(
  unions: Union[],
  relationships: Relationship[],
  positions: Map<string, Position>,
  config: LayoutConfig
): UnionAnchor[] {
  const anchors: UnionAnchor[] = [];

  // Pre-build lookup maps: O(r) once, then O(1) per union
  const partnersByUnion = new Map<string, string[]>();
  const childrenByUnion = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === 'PARTNER_IN') {
      const list = partnersByUnion.get(r.toId);
      if (list) list.push(r.fromId); else partnersByUnion.set(r.toId, [r.fromId]);
    } else if (r.type === 'HAS_CHILD') {
      const list = childrenByUnion.get(r.fromId);
      if (list) list.push(r.toId); else childrenByUnion.set(r.fromId, [r.toId]);
    }
  }

  for (const union of unions) {
    const partnerIds = partnersByUnion.get(union.unionId) ?? [];

    const childIds = childrenByUnion.get(union.unionId) ?? [];

    const childPositions = childIds
      .map(id => positions.get(id))
      .filter((p): p is Position => p !== undefined);

    if (partnerIds.length === 2) {
      const pos1 = positions.get(partnerIds[0]);
      const pos2 = positions.get(partnerIds[1]);
      if (pos1 && pos2) {
        const center1X = pos1.x + config.personWidth / 2;
        const center2X = pos2.x + config.personWidth / 2;
        anchors.push({
          unionId: union.unionId,
          x: (center1X + center2X) / 2,
          y: Math.min(pos1.y, pos2.y) + config.personHeight,
          partner1Pos: pos1,
          partner2Pos: pos2,
          childPositions,
        });
      }
    } else if (partnerIds.length === 1) {
      const pos = positions.get(partnerIds[0]);
      if (pos) {
        anchors.push({
          unionId: union.unionId,
          x: pos.x + config.personWidth / 2,
          y: pos.y + config.personHeight,
          partner1Pos: pos,
          partner2Pos: null,
          childPositions,
        });
      }
    }
  }

  return anchors;
}

/**
 * Compute the bounding box of all positions in the layout.
 */
export function computeBounds(
  positions: Map<string, Position>,
  config: LayoutConfig
): LayoutResult['bounds'] {
  if (positions.size === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + config.personWidth);
    maxY = Math.max(maxY, pos.y + config.personHeight);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
