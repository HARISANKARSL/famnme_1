/**
 * Blood Relation Expansion Service
 *
 * Detects which non-blood persons are expandable (have their own blood families).
 * These are typically spouses of blood relations who have parents, siblings, or children
 * of their own that can be shown inline.
 *
 * Example:
 * - Mary (blood relation) is married to Tom (non-blood)
 * - Tom has parents Robert & Linda, and a brother Steve
 * - Tom is marked as expandable with familyMemberCount = 3
 * - Clicking + on Tom shows his blood family inline
 */

import type { Person, Union, ExtendedRelationship, ExpansionMetadata } from '@/types';
import { detectBloodRelations } from './bloodRelationDetectionService';

/**
 * Detect which non-blood persons are expandable
 *
 * @param bloodRelations - Set of primary person's blood relations
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns Map of expandable person IDs to their metadata
 */
export function detectExpandablePersons(
  bloodRelations: Set<string>,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): Map<string, ExpansionMetadata> {
  const expandablePersons = new Map<string, ExpansionMetadata>();

  // Find all non-blood persons who are married to blood relations
  const nonBloodPersons = persons.filter(p => !bloodRelations.has(p.personId));

  nonBloodPersons.forEach(person => {
    // Check if this non-blood person is married to a blood relation
    const spouseInfo = findBloodRelationSpouse(
      person.personId,
      bloodRelations,
      relationships
    );

    if (!spouseInfo) {
      // Not married to a blood relation, skip
      return;
    }

    // Calculate this person's own blood relations (with THEM as the anchor)
    const theirBloodRelations = detectBloodRelations(
      person.personId,
      persons,
      unions,
      relationships
    );

    // Count how many blood relatives they have (excluding themselves)
    const familyMemberCount = theirBloodRelations.size - 1;

    // They're expandable if they have at least one blood relative
    if (familyMemberCount > 0) {
      expandablePersons.set(person.personId, {
        personId: person.personId,
        isExpandable: true,
        familyMemberCount,
        spouseOfPersonId: spouseInfo.spouseId
      });
    }
  });

  return expandablePersons;
}

/**
 * Find if a person is married to a blood relation
 *
 * @param personId - Person to check
 * @param bloodRelations - Set of blood relation IDs
 * @param relationships - All relationships
 * @returns Spouse info if married to blood relation, null otherwise
 */
function findBloodRelationSpouse(
  personId: string,
  bloodRelations: Set<string>,
  relationships: ExtendedRelationship[]
): { spouseId: string; unionId: string } | null {
  // Find unions this person is a partner in
  const personUnionIds = relationships
    .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map(r => r.toId);

  // For each union, check if the other partner is a blood relation
  for (const unionId of personUnionIds) {
    const partners = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
      .map(r => r.fromId);

    // Find the other partner (not this person)
    const otherPartner = partners.find(p => p !== personId);

    if (otherPartner && bloodRelations.has(otherPartner)) {
      return {
        spouseId: otherPartner,
        unionId
      };
    }
  }

  return null;
}

/**
 * Check if a person is expandable
 *
 * @param personId - Person to check
 * @param bloodRelations - Set of primary person's blood relations
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns True if the person is expandable
 */
export function isExpandablePerson(
  personId: string,
  bloodRelations: Set<string>,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): boolean {
  // Blood relations are never expandable (they're already shown)
  if (bloodRelations.has(personId)) {
    return false;
  }

  const expandablePersons = detectExpandablePersons(
    bloodRelations,
    persons,
    unions,
    relationships
  );

  return expandablePersons.has(personId);
}

/**
 * Get the family member count for an expandable person
 *
 * @param personId - Person to check
 * @param bloodRelations - Set of primary person's blood relations
 * @param persons - All persons in the tree
 * @param unions - All unions in the tree
 * @param relationships - All relationships in the tree
 * @returns Number of blood relatives this person has, or 0 if not expandable
 */
export function getExpandableFamilyCount(
  personId: string,
  bloodRelations: Set<string>,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): number {
  const expandablePersons = detectExpandablePersons(
    bloodRelations,
    persons,
    unions,
    relationships
  );

  const metadata = expandablePersons.get(personId);
  return metadata ? metadata.familyMemberCount : 0;
}
