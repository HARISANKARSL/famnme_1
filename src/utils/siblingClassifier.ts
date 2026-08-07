/**
 * Sibling Classifier
 *
 * Classifies sibling relationships based on shared parent unions.
 * Used to visually distinguish full, half, step, and adopted siblings.
 */

import type { ExtendedRelationship, Union } from '@/types';

export type SiblingType = 'full' | 'half' | 'step' | 'adopted' | 'unknown';

/**
 * Classify the sibling relationship between two persons.
 *
 * - Full: share the same union (both parents)
 * - Half: share one parent (different unions but a shared parent)
 * - Step: connected via step-parent relationship
 * - Adopted: connected via GUARDIAN_OF adoption
 * - Unknown: cannot determine
 */
export function classifySiblingType(
  person1Id: string,
  person2Id: string,
  relationships: ExtendedRelationship[],
  _unions: Union[]
): SiblingType {
  // Find which unions each person is a child of
  const person1UnionIds = new Set(
    relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === person1Id)
      .map(r => r.fromId)
  );

  const person2UnionIds = new Set(
    relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === person2Id)
      .map(r => r.fromId)
  );

  // Check for shared union (full siblings)
  for (const unionId of person1UnionIds) {
    if (person2UnionIds.has(unionId)) {
      return 'full';
    }
  }

  // Check for shared parent across different unions (half siblings)
  const person1Parents = new Set<string>();
  for (const unionId of person1UnionIds) {
    relationships
      .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
      .forEach(r => person1Parents.add(r.fromId));
  }

  const person2Parents = new Set<string>();
  for (const unionId of person2UnionIds) {
    relationships
      .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
      .forEach(r => person2Parents.add(r.fromId));
  }

  for (const parentId of person1Parents) {
    if (person2Parents.has(parentId)) {
      return 'half';
    }
  }

  // Check for adoption/guardian relationships
  const isAdopted1 = relationships.some(
    r => r.type === 'GUARDIAN_OF' && r.toId === person1Id && r.guardianType === 'adoption'
  );
  const isAdopted2 = relationships.some(
    r => r.type === 'GUARDIAN_OF' && r.toId === person2Id && r.guardianType === 'adoption'
  );
  if (isAdopted1 || isAdopted2) {
    return 'adopted';
  }

  // Check for step-parent relationships
  const isStep1 = relationships.some(
    r => r.type === 'GUARDIAN_OF' && r.toId === person1Id && r.guardianType === 'step-parent'
  );
  const isStep2 = relationships.some(
    r => r.type === 'GUARDIAN_OF' && r.toId === person2Id && r.guardianType === 'step-parent'
  );
  if (isStep1 || isStep2) {
    return 'step';
  }

  return 'unknown';
}

/**
 * Get edge style props for a sibling type
 */
export function getSiblingEdgeStyle(type: SiblingType): {
  strokeDasharray?: string;
  strokeOpacity: number;
  label?: string;
} {
  switch (type) {
    case 'full':
      return { strokeOpacity: 1 };
    case 'half':
      return { strokeDasharray: '6,3', strokeOpacity: 0.85, label: 'half' };
    case 'step':
      return { strokeDasharray: '3,3', strokeOpacity: 0.7, label: 'step' };
    case 'adopted':
      return { strokeDasharray: '8,4,2,4', strokeOpacity: 0.85, label: 'adopted' };
    case 'unknown':
    default:
      return { strokeOpacity: 1 };
  }
}
