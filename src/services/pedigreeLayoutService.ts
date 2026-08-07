/**
 * Pedigree Layout Service
 *
 * Filters tree data to ancestors only and calculates a horizontal
 * right-to-left pedigree layout using ELK.
 */

import { calculateFamilyTreeLayout, type Position, type Relationship } from './elkLayoutService';
import type { Person, Union } from '@/types';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';

/**
 * Filter tree data to only include ancestors of the given person.
 * Returns filtered persons, unions, and relationships.
 */
export function filterToAncestors(
  homePersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[]
): { persons: Person[]; unions: Union[]; relationships: Relationship[] } {
  const ancestorIds = new Set<string>([homePersonId]);
  const ancestorUnionIds = new Set<string>();
  const queue = [homePersonId];

  while (queue.length > 0) {
    const personId = queue.shift()!;

    // Find parent unions (unions that have this person as a child)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);

    for (const unionId of parentUnionIds) {
      ancestorUnionIds.add(unionId);

      // Find parents in this union
      const parentIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      for (const parentId of parentIds) {
        if (!ancestorIds.has(parentId)) {
          ancestorIds.add(parentId);
          queue.push(parentId);
        }
      }
    }
  }

  return {
    persons: persons.filter(p => ancestorIds.has(p.personId)),
    unions: unions.filter(u => ancestorUnionIds.has(u.unionId)),
    relationships: relationships.filter(r =>
      (ancestorIds.has(r.fromId) || ancestorUnionIds.has(r.fromId)) &&
      (ancestorIds.has(r.toId) || ancestorUnionIds.has(r.toId))
    ),
  };
}

/**
 * Calculate pedigree layout (ancestors only, horizontal)
 */
export async function calculatePedigreeLayout(
  homePersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[],
  layoutConstants: ResponsiveBreakpoint
): Promise<{ positions: Map<string, Position>; bounds: { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number } }> {
  const filtered = filterToAncestors(homePersonId, persons, unions, relationships);

  return calculateFamilyTreeLayout({
    persons: filtered.persons,
    unions: filtered.unions,
    relationships: filtered.relationships,
    layoutConstants,
    direction: 'RIGHT',
  });
}
