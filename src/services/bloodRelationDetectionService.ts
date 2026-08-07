/**
 * Blood Relation Detection Service
 *
 * Detects blood relations starting from a primary person (anchor).
 * Blood relations are connected through biological parent-child relationships,
 * NOT through marriages.
 *
 * Algorithm: BFS traversal through HAS_CHILD relationships only
 * - Upward: Follow HAS_CHILD (reverse) to find parents
 * - Downward: Follow HAS_CHILD to find children
 * - Sideways: Find siblings via shared parent unions
 *
 * Special Cases:
 * - Adoption (GUARDIAN_OF with type='adoption'): Treat as blood relation
 * - Step-parents: NOT blood relations
 * - Foster/Legal Guardian: NOT blood relations
 * - Half-siblings: ARE blood relations (share one parent)
 */

import type { Person, Union, ExtendedRelationship } from '@/types';

/**
 * Detect all blood relations of a primary person
 *
 * @param primaryPersonId - The anchor person (usually the home person)
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns Set of person IDs who are blood relations of the primary person
 */
export function detectBloodRelations(
  primaryPersonId: string,
  _persons: Person[],
  _unions: Union[],
  relationships: ExtendedRelationship[]
): Set<string> {
  const bloodRelations = new Set<string>();
  const queue: string[] = [primaryPersonId];
  const visited = new Set<string>();

  // Add primary person
  bloodRelations.add(primaryPersonId);

  while (queue.length > 0) {
    const currentPersonId = queue.shift()!;

    if (visited.has(currentPersonId)) continue;
    visited.add(currentPersonId);

    // ============================================================================
    // 1. Find Parents (Upward Traversal)
    // ============================================================================

    // Find parent unions (unions that have this person as a child)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === currentPersonId)
      .map(r => r.fromId); // fromId is the union that produced this child

    // For each parent union, find the partners (parents)
    parentUnionIds.forEach(unionId => {
      const parents = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      parents.forEach(parentId => {
        if (!bloodRelations.has(parentId)) {
          bloodRelations.add(parentId);
          queue.push(parentId);
        }
      });
    });

    // ============================================================================
    // 2. Find Children (Downward Traversal)
    // ============================================================================

    // Find unions this person is a partner in
    const personUnionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === currentPersonId)
      .map(r => r.toId);

    // For each union, find children
    personUnionIds.forEach(unionId => {
      const children = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);

      children.forEach(childId => {
        if (!bloodRelations.has(childId)) {
          bloodRelations.add(childId);
          queue.push(childId);
        }
      });
    });

    // ============================================================================
    // 3. Find Siblings (Sideways Traversal)
    // ============================================================================

    // Siblings share at least one parent union
    parentUnionIds.forEach(unionId => {
      const siblings = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);

      siblings.forEach(siblingId => {
        if (siblingId !== currentPersonId && !bloodRelations.has(siblingId)) {
          bloodRelations.add(siblingId);
          queue.push(siblingId);
        }
      });
    });

    // ============================================================================
    // 4. Handle Adoption (GUARDIAN_OF with type='adoption')
    // ============================================================================

    // Find adopted children (where this person is guardian)
    const adoptedChildren = relationships
      .filter(r =>
        r.type === 'GUARDIAN_OF' &&
        r.guardianType === 'adoption' &&
        r.fromId === currentPersonId
      )
      .map(r => r.toId);

    adoptedChildren.forEach(childId => {
      if (!bloodRelations.has(childId)) {
        bloodRelations.add(childId);
        queue.push(childId);
      }
    });

    // Find adoptive parents (where this person is the child)
    const adoptiveParents = relationships
      .filter(r =>
        r.type === 'GUARDIAN_OF' &&
        r.guardianType === 'adoption' &&
        r.toId === currentPersonId
      )
      .map(r => r.fromId);

    adoptiveParents.forEach(parentId => {
      if (!bloodRelations.has(parentId)) {
        bloodRelations.add(parentId);
        queue.push(parentId);
      }
    });
  }

  return bloodRelations;
}

/**
 * Detect IMMEDIATE family of the home person — scoped for default view.
 *
 * Visible by default:
 * - Home person
 * - Spouse(s) + children + grandchildren (downward)
 * - Parents
 * - Siblings + their spouses
 * - Grandparents
 * - Great-grandparents
 *
 * NOT visible (expandable):
 * - Siblings of parents (uncles/aunts)
 * - Siblings of grandparents (great-uncles)
 * - Parents of in-laws (brother-in-law's parents)
 * - Extended family of spouses
 */
export function detectImmediateFamily(
  homePersonId: string,
  _persons: Person[],
  _unions: Union[],
  relationships: ExtendedRelationship[]
): Set<string> {
  const visible = new Set<string>();
  visible.add(homePersonId);

  // Helper: find parents of a person
  const getParents = (personId: string): string[] => {
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);
    const parents: string[] = [];
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === uid)
        .forEach(r => parents.push(r.fromId));
    }
    return parents;
  };

  // Helper: find children of a person (through their unions)
  const getChildren = (personId: string): string[] => {
    const unionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);
    const children: string[] = [];
    for (const uid of unionIds) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid)
        .forEach(r => children.push(r.toId));
    }
    return children;
  };

  // Helper: find spouses of a person
  const getSpouses = (personId: string): string[] => {
    const unionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);
    const spouses: string[] = [];
    for (const uid of unionIds) {
      relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === uid && r.fromId !== personId)
        .forEach(r => spouses.push(r.fromId));
    }
    return spouses;
  };

  // Helper: find siblings of a person (share parent union)
  const getSiblings = (personId: string): string[] => {
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);
    const siblings: string[] = [];
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid && r.toId !== personId)
        .forEach(r => siblings.push(r.toId));
    }
    return siblings;
  };

  // 1. Home person's spouses
  const homeSpouses = getSpouses(homePersonId);
  homeSpouses.forEach(id => visible.add(id));

  // 2. Home person's children + grandchildren (recursive downward)
  const addDescendants = (personId: string, depth: number) => {
    if (depth > 5) return; // Safety limit
    const children = getChildren(personId);
    for (const childId of children) {
      visible.add(childId);
      // Add child's spouses
      getSpouses(childId).forEach(sid => visible.add(sid));
      // Recurse for grandchildren
      addDescendants(childId, depth + 1);
    }
  };
  addDescendants(homePersonId, 0);

  // 3. Home person's siblings + their spouses
  const siblings = getSiblings(homePersonId);
  for (const sibId of siblings) {
    visible.add(sibId);
    getSpouses(sibId).forEach(sid => visible.add(sid));
    // Also show siblings' children (nieces/nephews)
    const nephews = getChildren(sibId);
    for (const nid of nephews) {
      visible.add(nid);
      getSpouses(nid).forEach(sid => visible.add(sid));
    }
  }

  // 4. Direct ancestors (parents, grandparents, great-grandparents)
  // Only go straight up — no siblings of ancestors
  let currentGen: string[] = [homePersonId];
  for (let gen = 0; gen < 4; gen++) { // Up to great-grandparents (4 generations)
    const nextGen: string[] = [];
    for (const pid of currentGen) {
      const parents = getParents(pid);
      for (const parentId of parents) {
        visible.add(parentId);
        // Add parent's spouse (the other parent)
        getSpouses(parentId).forEach(sid => visible.add(sid));
        nextGen.push(parentId);
      }
    }
    currentGen = nextGen;
    if (currentGen.length === 0) break;
  }

  // 5. Handle adoption — same as biological for visibility
  relationships
    .filter(r => r.type === 'GUARDIAN_OF' && r.guardianType === 'adoption')
    .forEach(r => {
      if (visible.has(r.fromId)) visible.add(r.toId);
      if (visible.has(r.toId)) visible.add(r.fromId);
    });

  return visible;
}

/**
 * Check if a person is a blood relation of the primary person
 *
 * @param personId - Person to check
 * @param primaryPersonId - The anchor person
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns True if the person is a blood relation
 */
export function isBloodRelation(
  personId: string,
  primaryPersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): boolean {
  const bloodRelations = detectBloodRelations(
    primaryPersonId,
    persons,
    unions,
    relationships
  );

  return bloodRelations.has(personId);
}

/**
 * Get all non-blood persons in the tree
 * (Persons who are NOT blood relations of the primary person)
 *
 * @param primaryPersonId - The anchor person
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns Array of person IDs who are NOT blood relations
 */
export function getNonBloodPersons(
  primaryPersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): string[] {
  const bloodRelations = detectBloodRelations(
    primaryPersonId,
    persons,
    unions,
    relationships
  );

  return persons
    .filter(p => !bloodRelations.has(p.personId))
    .map(p => p.personId);
}
