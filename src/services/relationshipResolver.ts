/**
 * Relationship Resolver Service for Indian Kinship Terms
 *
 * Calculates structural relationships between two people and maps them to
 * culturally-appropriate Indian kinship terms (chachera bhai, mausera bhai, etc.)
 *
 * Key Features:
 * - Find lowest common ancestor (LCA)
 * - Calculate generational distance
 * - Determine lineage (paternal vs maternal)
 * - Support for elder/younger distinction
 *
 * @see references/new file-ancestry.md - Indian kinship system details
 */

import type { Person, Union } from '@/types';
import type { Relationship } from './elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface StructuralRelationship {
  relationship: 'parent' | 'child' | 'sibling' | 'cousin' | 'uncle' | 'aunt' | 'nephew' | 'niece' | 'grandparent' | 'grandchild' | 'spouse' | 'step-parent' | 'step-child' | 'adoptive-parent' | 'adopted-child' | 'foster-parent' | 'foster-child' | 'guardian' | 'ward' | 'none';
  degree: number;        // 0 for siblings, 1 for first cousin, 2 for second cousin, etc.
  removed: number;       // 0 for same generation, 1 for once removed, etc.
  lineage: 'paternal' | 'maternal' | 'mixed' | 'direct';
  gender: 'male' | 'female' | 'other';
  elderStatus?: 'elder' | 'younger' | null;
  // Guardian-specific fields
  guardianType?: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian';
}

export interface ResolvedRelationship {
  structural: StructuralRelationship;
  commonAncestor: Person | null;
  pathLength: number;
}

export interface RelationshipResolverInput {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
}

// ============================================================================
// Main Resolver Function
// ============================================================================

/**
 * Resolve the relationship between two people
 *
 * @param personAId - First person
 * @param personBId - Second person (whose relationship TO personA we want to describe)
 * @param data - Family tree data
 * @returns Structural relationship information
 */
export async function resolveRelationship(
  personAId: string,
  personBId: string,
  data: RelationshipResolverInput
): Promise<ResolvedRelationship> {
  const { persons, unions: _unions, relationships } = data;

  // Find the two persons
  const personA = persons.find(p => p.personId === personAId);
  const personB = persons.find(p => p.personId === personBId);

  if (!personA || !personB) {
    throw new Error('Person not found');
  }

  // Check for direct relationships first
  const directRel = checkDirectRelationship(personAId, personBId, relationships, personB);
  if (directRel) {
    return {
      structural: directRel,
      commonAncestor: null,
      pathLength: 1,
    };
  }

  // Find lowest common ancestor
  const lca = await findLowestCommonAncestor(personAId, personBId, data);

  if (!lca) {
    // No common ancestor found - not related
    return {
      structural: {
        relationship: 'none',
        degree: 0,
        removed: 0,
        lineage: 'mixed',
        gender: personB.gender,
        elderStatus: null,
      },
      commonAncestor: null,
      pathLength: 0,
    };
  }

  // Calculate generational distances
  const depthA = await getGenerationalDistance(personAId, lca.personId, data);
  const depthB = await getGenerationalDistance(personBId, lca.personId, data);

  // Determine lineage (paternal vs maternal)
  const lineage = await determineLineage(personAId, lca.personId, data);

  // Determine elder/younger status for same generation
  const elderStatus = depthA === depthB ? determineElderStatus(personA, personB) : null;

  // Classify the relationship type and apply gender-specific naming
  let relationship = classifyRelationship(depthA, depthB);

  // Gender-specific relationship names
  if (personB.gender === 'female') {
    if (relationship === 'nephew') relationship = 'niece';
    if (relationship === 'uncle') relationship = 'aunt';
  }

  const structural: StructuralRelationship = {
    relationship,
    degree: Math.min(depthA, depthB) - 1,
    removed: Math.abs(depthA - depthB),
    lineage,
    gender: personB.gender,
    elderStatus,
  };

  return {
    structural,
    commonAncestor: lca,
    pathLength: depthA + depthB,
  };
}

// ============================================================================
// Direct Relationship Checks
// ============================================================================

/**
 * Check for direct relationships (parent, child, spouse, sibling)
 */
function checkDirectRelationship(
  personAId: string,
  personBId: string,
  relationships: Relationship[],
  personB: Person
): StructuralRelationship | null {
  // Check if B is A's spouse
  const isSpouse = relationships.some(
    r => r.type === 'PARTNER_IN' &&
    relationships.some(
      r2 => r2.type === 'PARTNER_IN' &&
      r.toId === r2.toId &&
      r.fromId === personAId &&
      r2.fromId === personBId
    )
  );

  if (isSpouse) {
    return {
      relationship: 'spouse',
      degree: 0,
      removed: 0,
      lineage: 'direct',
      gender: personB.gender,
      elderStatus: null,
    };
  }

  // Check if B is A's parent
  const isParent = relationships.some(
    r => r.type === 'HAS_CHILD' && r.toId === personAId &&
    relationships.some(
      r2 => r2.type === 'PARTNER_IN' && r2.fromId === personBId && r2.toId === r.fromId
    )
  );

  if (isParent) {
    const lineage = personB.gender === 'male' ? 'paternal' : personB.gender === 'female' ? 'maternal' : 'mixed';
    return {
      relationship: 'parent',
      degree: 0,
      removed: 0,
      lineage: lineage as 'paternal' | 'maternal' | 'mixed',
      gender: personB.gender,
      elderStatus: 'elder',
    };
  }

  // Check if B is A's child
  const isChild = relationships.some(
    r => r.type === 'HAS_CHILD' && r.toId === personBId &&
    relationships.some(
      r2 => r2.type === 'PARTNER_IN' && r2.fromId === personAId && r2.toId === r.fromId
    )
  );

  if (isChild) {
    return {
      relationship: 'child',
      degree: 0,
      removed: 0,
      lineage: 'direct',
      gender: personB.gender,
      elderStatus: 'younger',
    };
  }

  // Check if B is A's sibling (same parent union)
  const aParentUnions = relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personAId)
    .map(r => r.fromId);

  const bParentUnions = relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personBId)
    .map(r => r.fromId);

  const sharedParentUnion = aParentUnions.find(u => bParentUnions.includes(u));

  if (sharedParentUnion) {
    return {
      relationship: 'sibling',
      degree: 0,
      removed: 0,
      lineage: 'direct',
      gender: personB.gender,
      elderStatus: null, // Will be determined by birth date
    };
  }

  // Check if B is A's guardian (step-parent, adoptive parent, foster parent, legal guardian)
  const guardianRel = relationships.find(
    r => r.type === 'GUARDIAN_OF' && r.fromId === personBId && r.toId === personAId
  );

  if (guardianRel) {
    const guardianType = guardianRel.guardianType;

    let relationshipType: StructuralRelationship['relationship'] = 'guardian';
    if (guardianType === 'step-parent') {
      relationshipType = 'step-parent';
    } else if (guardianType === 'adoption') {
      relationshipType = 'adoptive-parent';
    } else if (guardianType === 'foster') {
      relationshipType = 'foster-parent';
    }

    return {
      relationship: relationshipType,
      degree: 0,
      removed: 0,
      lineage: 'direct',
      gender: personB.gender,
      elderStatus: 'elder',
      guardianType,
    };
  }

  // Check if B is A's ward (A is B's guardian)
  const wardRel = relationships.find(
    r => r.type === 'GUARDIAN_OF' && r.fromId === personAId && r.toId === personBId
  );

  if (wardRel) {
    const guardianType = wardRel.guardianType;

    let relationshipType: StructuralRelationship['relationship'] = 'ward';
    if (guardianType === 'step-parent') {
      relationshipType = 'step-child';
    } else if (guardianType === 'adoption') {
      relationshipType = 'adopted-child';
    } else if (guardianType === 'foster') {
      relationshipType = 'foster-child';
    }

    return {
      relationship: relationshipType,
      degree: 0,
      removed: 0,
      lineage: 'direct',
      gender: personB.gender,
      elderStatus: 'younger',
      guardianType,
    };
  }

  return null;
}

// ============================================================================
// Lowest Common Ancestor (LCA)
// ============================================================================

/**
 * Find the lowest common ancestor of two persons
 */
async function findLowestCommonAncestor(
  personAId: string,
  personBId: string,
  data: RelationshipResolverInput
): Promise<Person | null> {
  // Get all ancestors of person A
  const ancestorsA = await getAllAncestors(personAId, data);

  // Get all ancestors of person B
  const ancestorsB = await getAllAncestors(personBId, data);

  // Find common ancestors
  const commonAncestors = ancestorsA.filter(a =>
    ancestorsB.some(b => b.personId === a.personId)
  );

  if (commonAncestors.length === 0) {
    return null;
  }

  // Return the "lowest" (closest) common ancestor
  // This is the one with the shortest combined path distance
  let closestAncestor = commonAncestors[0];
  let minDistance = Infinity;

  for (const ancestor of commonAncestors) {
    const distA = await getGenerationalDistance(personAId, ancestor.personId, data);
    const distB = await getGenerationalDistance(personBId, ancestor.personId, data);
    const totalDist = distA + distB;

    if (totalDist < minDistance) {
      minDistance = totalDist;
      closestAncestor = ancestor;
    }
  }

  return closestAncestor;
}

/**
 * Get all ancestors of a person (parents, grandparents, etc.)
 */
async function getAllAncestors(
  personId: string,
  data: RelationshipResolverInput
): Promise<Person[]> {
  const { persons, relationships } = data;
  const ancestors: Person[] = [];
  const visited = new Set<string>();

  // Include the person themselves so they can be found as LCA
  // when they are a direct ancestor of the other person
  const self = persons.find(p => p.personId === personId);
  if (self) {
    ancestors.push(self);
  }

  const queue: string[] = [personId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find parent unions
    const parentUnions = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === currentId)
      .map(r => r.fromId);

    // Find parents in those unions
    for (const unionId of parentUnions) {
      const parents = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      for (const parentId of parents) {
        const parent = persons.find(p => p.personId === parentId);
        if (parent && !ancestors.some(a => a.personId === parentId)) {
          ancestors.push(parent);
          queue.push(parentId);
        }
      }
    }
  }

  return ancestors;
}

// ============================================================================
// Generational Distance
// ============================================================================

/**
 * Calculate generational distance from descendant to ancestor
 */
async function getGenerationalDistance(
  descendantId: string,
  ancestorId: string,
  data: RelationshipResolverInput
): Promise<number> {
  const { relationships } = data;

  if (descendantId === ancestorId) {
    return 0;
  }

  const visited = new Set<string>();
  const queue: Array<{ id: string; distance: number }> = [{ id: descendantId, distance: 0 }];

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    if (id === ancestorId) {
      return distance;
    }

    // Find parent unions
    const parentUnions = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === id)
      .map(r => r.fromId);

    // Find parents in those unions
    for (const unionId of parentUnions) {
      const parents = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      for (const parentId of parents) {
        if (!visited.has(parentId)) {
          queue.push({ id: parentId, distance: distance + 1 });
        }
      }
    }
  }

  return Infinity; // Not found
}

// ============================================================================
// Lineage Determination
// ============================================================================

/**
 * Determine if the relationship is through paternal or maternal line
 */
async function determineLineage(
  personId: string,
  ancestorId: string,
  data: RelationshipResolverInput
): Promise<'paternal' | 'maternal' | 'mixed' | 'direct'> {
  const { persons, relationships } = data;

  // Find the first hop from person to their parent
  const parentUnions = relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
    .map(r => r.fromId);

  if (parentUnions.length === 0) {
    return 'direct';
  }

  // Find parents in the first union
  const firstUnionId = parentUnions[0];
  const parentIds = relationships
    .filter(r => r.type === 'PARTNER_IN' && r.toId === firstUnionId)
    .map(r => r.fromId);

  // Check which parent leads to the ancestor
  for (const parentId of parentIds) {
    const parent = persons.find(p => p.personId === parentId);
    if (!parent) continue;

    // Check if this parent is on the path to ancestor
    const canReachAncestor = await getGenerationalDistance(parentId, ancestorId, data);

    if (canReachAncestor !== Infinity) {
      // This parent is on the path
      if (parent.gender === 'male') {
        return 'paternal';
      } else if (parent.gender === 'female') {
        return 'maternal';
      }
    }
  }

  return 'mixed';
}

// ============================================================================
// Elder/Younger Status
// ============================================================================

/**
 * Determine if person B is elder or younger than person A
 */
function determineElderStatus(
  personA: Person,
  personB: Person
): 'elder' | 'younger' | null {
  // First check explicit elderStatus field
  if (personB.elderStatus) {
    return personB.elderStatus;
  }

  // Fall back to birth date comparison
  if (personA.birthDate && personB.birthDate) {
    const dateA = new Date(personA.birthDate);
    const dateB = new Date(personB.birthDate);

    if (dateB < dateA) {
      return 'elder';
    } else if (dateB > dateA) {
      return 'younger';
    }
  }

  return null;
}

// ============================================================================
// Relationship Classification
// ============================================================================

/**
 * Classify relationship type based on generational distances
 */
function classifyRelationship(
  depthA: number,
  depthB: number
): StructuralRelationship['relationship'] {
  // Same generation
  if (depthA === depthB) {
    if (depthA === 1) {
      return 'sibling';
    } else if (depthA >= 2) {
      return 'cousin';
    }
  }

  // Different generations
  const minDepth = Math.min(depthA, depthB);
  const maxDepth = Math.max(depthA, depthB);

  // One generation apart
  if (maxDepth - minDepth === 1) {
    if (minDepth === 0) {
      return depthA < depthB ? 'child' : 'parent';
    } else if (minDepth === 1) {
      if (depthA < depthB) {
        return 'nephew'; // Gender resolved via personB.gender → niece if female
      } else {
        return 'uncle';  // Gender resolved via personB.gender → aunt if female
      }
    }
  }

  // Two generations apart
  if (maxDepth - minDepth === 2) {
    if (minDepth === 0) {
      return depthA < depthB ? 'grandchild' : 'grandparent';
    }
  }

  // Cousin with "removed" generations
  if (minDepth >= 1) {
    return 'cousin';
  }

  return 'none';
}
