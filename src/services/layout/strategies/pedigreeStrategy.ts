/**
 * Strategy B: Pedigree Layout
 *
 * Fixed binary tree: person → 2 parents → 4 grandparents → 8 great-grandparents.
 * Filters data to ancestors only, then uses the tree strategy with RIGHT direction.
 *
 * Refactored from pedigreeLayoutService.ts to use the strategy interface.
 */

import type { Person, Union } from '@/types';
import type { Relationship } from '../types';
import type { FamilyUnit, LayoutConfig, LayoutStrategy, Position } from '../types';

export class PedigreeStrategy implements LayoutStrategy {
  calculate(
    _familyUnits: FamilyUnit[],
    generations: Map<string, number>,
    persons: Person[],
    unions: Union[],
    relationships: Relationship[],
    config: LayoutConfig,
    injectedHomePersonId?: string
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

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
    if (!homePersonId) return positions;

    // Filter to ancestors only
    const { ancestorIds, ancestorUnionIds } = this.filterToAncestors(
      homePersonId, relationships
    );

    // Only include ancestors in the layout
    const filteredPersons = persons.filter(p => ancestorIds.has(p.personId));
    const filteredUnions = unions.filter(u => ancestorUnionIds.has(u.unionId));

    if (filteredPersons.length === 0) return positions;

    // Find generation range
    const genValues: number[] = [];
    for (const p of filteredPersons) {
      const gen = generations.get(p.personId);
      if (gen !== undefined) genValues.push(gen);
    }
    const minGen = Math.min(...genValues);
    const maxGen = Math.max(...genValues);

    // For pedigree, we layout RIGHT (generations go left to right)
    // Generation 0 (home) on the left, ancestors extend right
    const genCount = maxGen - minGen + 1;

    // Pedigree: each generation has a fixed number of slots
    // Gen 0: 1 slot, Gen -1: 2 slots, Gen -2: 4 slots, etc.
    for (const person of filteredPersons) {
      const gen = generations.get(person.personId);
      if (gen === undefined) continue;

      // For pedigree layout, X = generation depth (horizontal), Y = slot within generation
      // Actually, ancestors are negative generations. Flip for display.
      const displayDepth = Math.abs(gen); // 0 = home, 1 = parents, 2 = grandparents

      const x = config.canvasPadding + displayDepth * (config.personWidth + config.generationGap);

      // Calculate Y slot position based on generation
      // This is a simplified slot assignment — group by generation
      const sameGenPersons = filteredPersons
        .filter(p => generations.get(p.personId) === gen)
        .sort((a, b) => a.firstName.localeCompare(b.firstName));

      const slotIndex = sameGenPersons.findIndex(p => p.personId === person.personId);
      const totalSlots = sameGenPersons.length;
      const generationHeight = totalSlots * (config.personHeight + config.nodeSpacing) - config.nodeSpacing;
      const startY = config.canvasPadding + (Math.pow(2, genCount - 1) * (config.personHeight + config.nodeSpacing) - generationHeight) / 2;

      const y = startY + slotIndex * (config.personHeight + config.nodeSpacing);

      positions.set(person.personId, { x, y });
    }

    // Place union anchors
    for (const union of filteredUnions) {
      const partnerIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
        .map(r => r.fromId);

      if (partnerIds.length >= 1) {
        const partnerPositions = partnerIds
          .map(id => positions.get(id))
          .filter((p): p is Position => p !== undefined);

        if (partnerPositions.length > 0) {
          const avgX = partnerPositions.reduce((s, p) => s + p.x, 0) / partnerPositions.length;
          const avgY = partnerPositions.reduce((s, p) => s + p.y, 0) / partnerPositions.length;
          positions.set(union.unionId, {
            x: avgX + config.personWidth / 2 - config.unionWidth / 2,
            y: avgY + config.personHeight / 2 - config.unionHeight,
          });
        }
      }
    }

    return positions;
  }

  private filterToAncestors(
    homePersonId: string,
    relationships: Relationship[]
  ): { ancestorIds: Set<string>; ancestorUnionIds: Set<string> } {
    const ancestorIds = new Set<string>([homePersonId]);
    const ancestorUnionIds = new Set<string>();

    // Build lookup: child → parent unions
    const childToParentUnions = new Map<string, string[]>();
    const unionToPartners = new Map<string, string[]>();

    for (const rel of relationships) {
      if (rel.type === 'HAS_CHILD') {
        const list = childToParentUnions.get(rel.toId) ?? [];
        list.push(rel.fromId);
        childToParentUnions.set(rel.toId, list);
      } else if (rel.type === 'PARTNER_IN') {
        const list = unionToPartners.get(rel.toId) ?? [];
        list.push(rel.fromId);
        unionToPartners.set(rel.toId, list);
      }
    }

    // BFS upward from home person
    const queue = [homePersonId];
    while (queue.length > 0) {
      const personId = queue.shift()!;
      const parentUnionIds = childToParentUnions.get(personId) ?? [];

      for (const unionId of parentUnionIds) {
        ancestorUnionIds.add(unionId);
        const partners = unionToPartners.get(unionId) ?? [];
        for (const parentId of partners) {
          if (!ancestorIds.has(parentId)) {
            ancestorIds.add(parentId);
            queue.push(parentId);
          }
        }
      }
    }

    return { ancestorIds, ancestorUnionIds };
  }
}
