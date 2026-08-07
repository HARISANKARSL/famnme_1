/**
 * Phase 5: Incremental Update Engine
 *
 * When a single person is added/removed, updates only the affected branch
 * rather than recalculating the entire tree.
 *
 * Key insight (from Othram Maps): Store positions as a mutable map.
 * An incremental update only needs to:
 * 1. Find the affected area
 * 2. Place the new/removed node
 * 3. Shift neighbors if needed
 */

import type { Person, Union } from '@/types';
import type { Relationship } from './types';
import type { Position, LayoutConfig, LayoutResult } from './types';
import { computeBounds } from './unionAnchorComputer';

// ============================================================================
// Change Detection
// ============================================================================

export type StructuralChangeType =
  | { type: 'none' }
  | { type: 'person-added'; personId: string; unionId?: string }
  | { type: 'person-removed'; personId: string }
  | { type: 'union-added'; unionId: string }
  | { type: 'complex' };

export function detectStructuralChange(
  prev: { persons: Person[]; unions: Union[]; relationships: Relationship[] },
  next: { persons: Person[]; unions: Union[]; relationships: Relationship[] }
): StructuralChangeType {
  const prevPersonIds = new Set(prev.persons.map(p => p.personId));
  const nextPersonIds = new Set(next.persons.map(p => p.personId));
  const prevUnionIds = new Set(prev.unions.map(u => u.unionId));
  const nextUnionIds = new Set(next.unions.map(u => u.unionId));

  const addedPersons = next.persons.filter(p => !prevPersonIds.has(p.personId));
  const removedPersons = prev.persons.filter(p => !nextPersonIds.has(p.personId));
  const addedUnions = next.unions.filter(u => !prevUnionIds.has(u.unionId));
  const removedUnions = prev.unions.filter(u => !nextUnionIds.has(u.unionId));

  if (addedPersons.length === 0 && removedPersons.length === 0 &&
      addedUnions.length === 0 && removedUnions.length === 0) {
    return { type: 'none' };
  }

  if (addedPersons.length === 1 && removedPersons.length === 0 && removedUnions.length === 0) {
    return {
      type: 'person-added',
      personId: addedPersons[0].personId,
      unionId: addedUnions.length === 1 ? addedUnions[0].unionId : undefined,
    };
  }

  if (addedPersons.length === 0 && addedUnions.length === 1 &&
      removedPersons.length === 0 && removedUnions.length === 0) {
    return { type: 'union-added', unionId: addedUnions[0].unionId };
  }

  if (removedPersons.length === 1 && addedPersons.length === 0 && addedUnions.length === 0) {
    return { type: 'person-removed', personId: removedPersons[0].personId };
  }

  return { type: 'complex' };
}

// ============================================================================
// Incremental Layout Update
// ============================================================================

/**
 * Attempt an incremental layout update. Returns null if a full recalc is needed.
 */
export function tryIncrementalUpdate(
  prevPositions: Map<string, Position>,
  prevData: { persons: Person[]; unions: Union[]; relationships: Relationship[] },
  nextData: { persons: Person[]; unions: Union[]; relationships: Relationship[] },
  config: LayoutConfig
): LayoutResult | null {
  const change = detectStructuralChange(prevData, nextData);

  // Data-only change: reuse positions exactly
  if (change.type === 'none') {
    const positions = new Map(prevPositions);
    return { positions, bounds: computeBounds(positions, config) };
  }

  // TEMPORARILY DISABLED: Always fall through to full recalc during layout rewrite.
  // The incremental updater may assume subtree-separated positions from the old algorithm.
  // Re-enable after the new sibling-ribbon layout is stable.
  return null;

  /* --- Original incremental handlers (disabled) ---

  // Single person added
  if (change.type === 'person-added') {
    return handlePersonAdded(
      prevPositions, nextData.relationships, change.personId, change.unionId, config
    );
  }

  // Union-only added (marry existing persons)
  if (change.type === 'union-added') {
    return handleUnionAdded(
      prevPositions, nextData.relationships, change.unionId, config
    );
  }

  // Single person removed
  if (change.type === 'person-removed') {
    return handlePersonRemoved(
      prevPositions, prevData.unions, nextData.unions, change.personId, config
    );
  }

  // Complex change — caller should do full recalc
  return null;
  --- End disabled incremental handlers --- */
}

// ============================================================================
// Handlers for each change type
// ============================================================================

function _handlePersonAdded(
  prevPositions: Map<string, Position>,
  relationships: Relationship[],
  personId: string,
  unionId: string | undefined,
  config: LayoutConfig
): LayoutResult | null {
  const positions = new Map(prevPositions);

  // Find what the new person is connected to
  const partnerInRel = relationships.find(
    r => r.type === 'PARTNER_IN' && r.fromId === personId
  );
  const childOfRel = relationships.find(
    r => r.type === 'HAS_CHILD' && r.toId === personId
  );

  // Case 1: New spouse
  if (partnerInRel) {
    const connectedUnionId = partnerInRel.toId;
    const otherPartnerRel = relationships.find(
      r => r.type === 'PARTNER_IN' && r.toId === connectedUnionId && r.fromId !== personId
    );
    if (otherPartnerRel) {
      const otherPos = positions.get(otherPartnerRel.fromId);
      if (otherPos) {
        positions.set(personId, {
          x: otherPos.x + config.personWidth + config.spouseGap,
          y: otherPos.y,
        });

        if (unionId) {
          placeUnionBetween(positions, otherPartnerRel.fromId, personId, unionId, config);
        }

        return { positions, bounds: computeBounds(positions, config) };
      }
    }
  }

  // Case 2: New child
  if (childOfRel) {
    const parentUnionId = childOfRel.fromId;
    const unionPos = positions.get(parentUnionId);
    if (unionPos) {
      const existingSiblingIds = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === parentUnionId && r.toId !== personId)
        .map(r => r.toId);

      if (existingSiblingIds.length > 0) {
        let maxSiblingX = -Infinity;
        for (const sibId of existingSiblingIds) {
          const sibPos = positions.get(sibId);
          if (sibPos && sibPos.x > maxSiblingX) maxSiblingX = sibPos.x;
        }
        positions.set(personId, {
          x: maxSiblingX + config.personWidth + config.nodeSpacing,
          y: unionPos.y + config.unionHeight + config.generationGap / 2,
        });
      } else {
        positions.set(personId, {
          x: unionPos.x + config.unionWidth / 2 - config.personWidth / 2,
          y: unionPos.y + config.unionHeight + config.generationGap / 2,
        });
      }

      return { positions, bounds: computeBounds(positions, config) };
    }
  }

  // Case 3: New parent
  if (unionId) {
    const childRel = relationships.find(r => r.type === 'HAS_CHILD' && r.fromId === unionId);
    if (childRel) {
      const childPos = positions.get(childRel.toId);
      if (childPos) {
        positions.set(personId, {
          x: childPos.x - config.personWidth - config.spouseGap,
          y: childPos.y - config.generationGap - config.personHeight,
        });

        const otherPartner = relationships.find(
          r => r.type === 'PARTNER_IN' && r.toId === unionId && r.fromId !== personId
        );
        const parentPos = positions.get(personId)!;
        if (otherPartner) {
          placeUnionBetween(positions, personId, otherPartner.fromId, unionId, config);
        } else {
          positions.set(unionId, {
            x: parentPos.x + config.personWidth / 2 - config.unionWidth / 2,
            y: parentPos.y + config.personHeight / 2 - config.unionHeight,
          });
        }

        return { positions, bounds: computeBounds(positions, config) };
      }
    }
  }

  // Couldn't place incrementally
  return null;
}

function _handleUnionAdded(
  prevPositions: Map<string, Position>,
  relationships: Relationship[],
  unionId: string,
  config: LayoutConfig
): LayoutResult | null {
  const positions = new Map(prevPositions);

  const partnerRels = relationships.filter(
    r => r.type === 'PARTNER_IN' && r.toId === unionId
  );
  if (partnerRels.length === 2) {
    const pos1 = positions.get(partnerRels[0].fromId);
    const pos2 = positions.get(partnerRels[1].fromId);
    if (pos1 && pos2) {
      placeUnionBetween(positions, partnerRels[0].fromId, partnerRels[1].fromId, unionId, config);
      return { positions, bounds: computeBounds(positions, config) };
    }
  }

  return null;
}

function _handlePersonRemoved(
  prevPositions: Map<string, Position>,
  prevUnions: Union[],
  nextUnions: Union[],
  personId: string,
  config: LayoutConfig
): LayoutResult {
  const positions = new Map(prevPositions);
  positions.delete(personId);

  // Remove orphaned unions
  const nextUnionIds = new Set(nextUnions.map(u => u.unionId));
  for (const union of prevUnions) {
    if (!nextUnionIds.has(union.unionId)) {
      positions.delete(union.unionId);
    }
  }

  return { positions, bounds: computeBounds(positions, config) };
}

// ============================================================================
// Helper
// ============================================================================

function placeUnionBetween(
  positions: Map<string, Position>,
  person1Id: string,
  person2Id: string,
  unionId: string,
  config: LayoutConfig
): void {
  const pos1 = positions.get(person1Id);
  const pos2 = positions.get(person2Id);
  if (!pos1 || !pos2) return;

  const midX = (pos1.x + config.personWidth / 2 + pos2.x + config.personWidth / 2) / 2;
  const midY = Math.min(pos1.y, pos2.y) + config.personHeight / 2 - config.unionHeight;

  positions.set(unionId, {
    x: midX - config.unionWidth / 2,
    y: midY,
  });
}
