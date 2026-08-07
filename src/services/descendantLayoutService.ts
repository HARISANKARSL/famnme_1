/**
 * Descendant Layout Service
 *
 * Filters tree data to descendants only and calculates
 * a downward layout using ELK.
 */

import { calculateFamilyTreeLayout, type Position, type Relationship } from './elkLayoutService';
import type { Person, Union } from '@/types';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';

/**
 * Filter tree data to only include descendants of the given person.
 */
export function filterToDescendants(
  homePersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[]
): { persons: Person[]; unions: Union[]; relationships: Relationship[] } {
  const descendantIds = new Set<string>([homePersonId]);
  const descendantUnionIds = new Set<string>();
  const queue = [homePersonId];

  while (queue.length > 0) {
    const personId = queue.shift()!;

    // Find unions this person is a partner in
    const partnerUnionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);

    for (const unionId of partnerUnionIds) {
      descendantUnionIds.add(unionId);

      // Also include the spouse
      const spouseIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId && r.fromId !== personId)
        .map(r => r.fromId);
      spouseIds.forEach(id => descendantIds.add(id));

      // Find children of this union
      const childIds = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);

      for (const childId of childIds) {
        if (!descendantIds.has(childId)) {
          descendantIds.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  return {
    persons: persons.filter(p => descendantIds.has(p.personId)),
    unions: unions.filter(u => descendantUnionIds.has(u.unionId)),
    relationships: relationships.filter(r =>
      (descendantIds.has(r.fromId) || descendantUnionIds.has(r.fromId)) &&
      (descendantIds.has(r.toId) || descendantUnionIds.has(r.toId))
    ),
  };
}

/**
 * Calculate descendant layout (descendants only, downward)
 */
export async function calculateDescendantLayout(
  homePersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[],
  layoutConstants: ResponsiveBreakpoint
): Promise<{ positions: Map<string, Position>; bounds: { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number } }> {
  const filtered = filterToDescendants(homePersonId, persons, unions, relationships);

  return calculateFamilyTreeLayout({
    persons: filtered.persons,
    unions: filtered.unions,
    relationships: filtered.relationships,
    layoutConstants,
    direction: 'DOWN',
  });
}
