/**
 * Phase 2: Assign Generations
 *
 * BFS from the home person, assigning generation numbers.
 * Critical constraint: all persons in the same generation share the same Y-coordinate.
 *
 * Algorithm (adapted from Buchheim et al.):
 * 1. Home person → generation 0
 * 2. BFS upward: parents → generation -1, grandparents → -2
 * 3. BFS downward: children → generation +1, grandchildren → +2
 * 4. Spouses → same generation as their partner
 * 5. Conflict resolution: if reachable at two generations (pedigree collapse),
 *    use the generation from child role (standard genealogical convention)
 */

import type { Relationship } from './types';

/**
 * Assign generation numbers to all persons reachable from the home person.
 *
 * @returns Map<personId, generationNumber> where 0 = home person,
 *          negative = ancestors, positive = descendants
 */
export function assignGenerations(
  homePersonId: string,
  relationships: Relationship[]
): Map<string, number> {
  const generations = new Map<string, number>();

  // Build lookup maps
  const unionPartners = new Map<string, string[]>();   // unionId → [personIds]
  const unionChildren = new Map<string, string[]>();   // unionId → [childIds]
  const personToUnions = new Map<string, string[]>();   // personId → [unionIds] (as partner)
  const childToParentUnion = new Map<string, string[]>(); // childId → [unionIds]

  for (const rel of relationships) {
    if (rel.type === 'PARTNER_IN') {
      // rel.fromId = person, rel.toId = union
      const partners = unionPartners.get(rel.toId) ?? [];
      partners.push(rel.fromId);
      unionPartners.set(rel.toId, partners);

      const unions = personToUnions.get(rel.fromId) ?? [];
      unions.push(rel.toId);
      personToUnions.set(rel.fromId, unions);
    } else if (rel.type === 'HAS_CHILD') {
      // rel.fromId = union, rel.toId = child
      const children = unionChildren.get(rel.fromId) ?? [];
      children.push(rel.toId);
      unionChildren.set(rel.fromId, children);

      const parentUnions = childToParentUnion.get(rel.toId) ?? [];
      parentUnions.push(rel.fromId);
      childToParentUnion.set(rel.toId, parentUnions);
    }
  }

  // BFS queue: [personId, generation]
  const queue: [string, number][] = [[homePersonId, 0]];
  const visited = new Set<string>();
  // Track which generation was assigned from child-role vs spouse-role
  const assignedAsChild = new Set<string>();

  generations.set(homePersonId, 0);

  while (queue.length > 0) {
    const [personId, gen] = queue.shift()!;

    if (visited.has(personId)) continue;
    visited.add(personId);

    // --- Traverse upward: find parent unions of this person ---
    const parentUnionIds = childToParentUnion.get(personId) ?? [];
    for (const unionId of parentUnionIds) {
      const partners = unionPartners.get(unionId) ?? [];
      for (const parentId of partners) {
        if (!visited.has(parentId)) {
          const existingGen = generations.get(parentId);
          const newGen = gen - 1;
          if (existingGen === undefined || !assignedAsChild.has(parentId)) {
            generations.set(parentId, newGen);
          }
          queue.push([parentId, newGen]);
        }
      }
    }

    // --- Traverse downward: find unions where this person is a partner ---
    const partnerUnionIds = personToUnions.get(personId) ?? [];
    for (const unionId of partnerUnionIds) {
      // Spouse: same generation
      const partners = unionPartners.get(unionId) ?? [];
      for (const spouseId of partners) {
        if (spouseId !== personId && !visited.has(spouseId)) {
          const existingGen = generations.get(spouseId);
          if (existingGen === undefined) {
            generations.set(spouseId, gen);
          }
          // Don't mark as child — this was assigned via spouse role
          queue.push([spouseId, gen]);
        }
      }

      // Children: next generation
      const childIds = unionChildren.get(unionId) ?? [];
      for (const childId of childIds) {
        if (!visited.has(childId)) {
          const newGen = gen + 1;
          generations.set(childId, newGen);
          assignedAsChild.add(childId);
          queue.push([childId, newGen]);
        }
      }
    }
  }

  return generations;
}

/**
 * Find all disconnected components in the graph and assign generations
 * to each component. Disconnected persons get generation 0.
 *
 * @returns Map<personId, generationNumber>
 */
export function assignGenerationsWithDisconnected(
  homePersonId: string,
  allPersonIds: string[],
  relationships: Relationship[]
): Map<string, number> {
  const generations = assignGenerations(homePersonId, relationships);

  // Find disconnected persons
  const unassigned = allPersonIds.filter(id => !generations.has(id));
  if (unassigned.length === 0) return generations;

  // For disconnected components, run BFS from the first unassigned person
  const processed = new Set(generations.keys());

  for (const startId of unassigned) {
    if (processed.has(startId)) continue;

    // Run BFS from this person as a new root at generation 0
    const componentGens = assignGenerations(startId, relationships);
    for (const [personId, gen] of componentGens) {
      if (!generations.has(personId)) {
        generations.set(personId, gen);
        processed.add(personId);
      }
    }
  }

  // Any truly isolated persons (no relationships at all)
  for (const id of allPersonIds) {
    if (!generations.has(id)) {
      generations.set(id, 0);
    }
  }

  return generations;
}

/**
 * Group persons by generation, sorted by generation number.
 */
export function groupByGeneration(
  generations: Map<string, number>
): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const [personId, gen] of generations) {
    const list = groups.get(gen) ?? [];
    list.push(personId);
    groups.set(gen, list);
  }
  return groups;
}
