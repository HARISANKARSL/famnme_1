/**
 * Strategy C: Descendant Layout
 *
 * Inverse of pedigree: person → children → grandchildren → ...
 * Filters to descendants only, then uses the full tree algorithm downward.
 *
 * Refactored from descendantLayoutService.ts to use the strategy interface.
 */

import type { Person, Union } from '@/types';
import type { Relationship } from '../types';
import type { FamilyUnit, LayoutConfig, LayoutStrategy, Position } from '../types';
import { FullTreeStrategy } from './fullTreeStrategy';

export class DescendantStrategy implements LayoutStrategy {
  private fullTreeStrategy = new FullTreeStrategy();

  calculate(
    familyUnits: FamilyUnit[],
    generations: Map<string, number>,
    persons: Person[],
    unions: Union[],
    relationships: Relationship[],
    config: LayoutConfig,
    injectedHomePersonId?: string
  ): Map<string, Position> {
    // Find the home person (generation 0)
    let homePersonId: string | null = injectedHomePersonId || null;
    if (!homePersonId) {
      for (const [pid, gen] of generations) {
        if (gen === 0) {
          homePersonId = pid;
          break;
        }
      }
    }
    if (!homePersonId) return new Map();

    // Filter to descendants only
    const { descendantIds, descendantUnionIds } = this.filterToDescendants(
      homePersonId, relationships
    );

    const filteredPersons = persons.filter(p => descendantIds.has(p.personId));
    const filteredUnions = unions.filter(u => descendantUnionIds.has(u.unionId));
    const filteredRels = relationships.filter(r => {
      if (r.type === 'PARTNER_IN') {
        return descendantIds.has(r.fromId) && descendantUnionIds.has(r.toId);
      }
      if (r.type === 'HAS_CHILD') {
        return descendantUnionIds.has(r.fromId) && descendantIds.has(r.toId);
      }
      return false;
    });

    // Filter family units to descendants
    const filteredUnits = familyUnits.filter(u => {
      if (u.union && descendantUnionIds.has(u.union.unionId)) return true;
      return u.parents.some(p => descendantIds.has(p.personId));
    });

    // Filter generations
    const filteredGens = new Map<string, number>();
    for (const [pid, gen] of generations) {
      if (descendantIds.has(pid)) {
        filteredGens.set(pid, gen);
      }
    }

    // Delegate to full tree strategy with filtered data
    return this.fullTreeStrategy.calculate(
      filteredUnits, filteredGens, filteredPersons, filteredUnions, filteredRels, config, homePersonId
    );
  }

  private filterToDescendants(
    homePersonId: string,
    relationships: Relationship[]
  ): { descendantIds: Set<string>; descendantUnionIds: Set<string> } {
    const descendantIds = new Set<string>([homePersonId]);
    const descendantUnionIds = new Set<string>();

    // Build lookups
    const personToUnions = new Map<string, string[]>();   // person → unions as partner
    const unionToChildren = new Map<string, string[]>();   // union → children
    const unionToPartners = new Map<string, string[]>();   // union → partners

    for (const rel of relationships) {
      if (rel.type === 'PARTNER_IN') {
        const list = personToUnions.get(rel.fromId) ?? [];
        list.push(rel.toId);
        personToUnions.set(rel.fromId, list);

        const partners = unionToPartners.get(rel.toId) ?? [];
        partners.push(rel.fromId);
        unionToPartners.set(rel.toId, partners);
      } else if (rel.type === 'HAS_CHILD') {
        const list = unionToChildren.get(rel.fromId) ?? [];
        list.push(rel.toId);
        unionToChildren.set(rel.fromId, list);
      }
    }

    // BFS downward from home person
    const queue = [homePersonId];
    while (queue.length > 0) {
      const personId = queue.shift()!;
      const unionIds = personToUnions.get(personId) ?? [];

      for (const unionId of unionIds) {
        descendantUnionIds.add(unionId);

        // Include spouses in the descendant view
        const partners = unionToPartners.get(unionId) ?? [];
        for (const partnerId of partners) {
          descendantIds.add(partnerId);
        }

        // Include children
        const children = unionToChildren.get(unionId) ?? [];
        for (const childId of children) {
          if (!descendantIds.has(childId)) {
            descendantIds.add(childId);
            queue.push(childId);
          }
        }
      }
    }

    return { descendantIds, descendantUnionIds };
  }
}
