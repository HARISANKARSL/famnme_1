/**
 * Union Helper Functions
 *
 * Utilities for working with Union-based family tree model
 */

import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

/**
 * Find all unions (marriages) a person is a partner in
 */
export function getPersonUnions(
  personId: string,
  unions: Union[],
  relationships: Relationship[]
): Union[] {
  // Find all PARTNER_IN relationships for this person
  const unionIds = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map((r) => r.toId);

  return unions.filter((u) => unionIds.includes(u.unionId));
}

/**
 * Find all spouses of a person
 * Only returns partners from marriage/partnership unions (excludes parent-child unions)
 */
export function getPersonSpouses(
  personId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[]
): Array<{ spouse: Person; union: Union }> {
  // Get all unions the person is in
  const personUnions = getPersonUnions(personId, unions, relationships);

  // Filter to only marriage/partnership unions (exclude parent-child unions)
  const marriageUnions = personUnions.filter(
    (u) => u.type === 'marriage' || u.type === 'partnership'
  );

  const spouses: Array<{ spouse: Person; union: Union }> = [];

  // For each marriage union, find the other partner
  for (const union of marriageUnions) {
    // Find all people in this union
    const partnersInUnion = relationships
      .filter((r) => r.type === 'PARTNER_IN' && r.toId === union.unionId)
      .map((r) => r.fromId);

    // Find the other partner (not the person we're checking)
    const spouseId = partnersInUnion.find((id) => id !== personId);

    if (spouseId) {
      const spouse = persons.find((p) => p.personId === spouseId);
      if (spouse) {
        spouses.push({ spouse, union });
      }
    }
  }

  return spouses;
}

/**
 * Check if a person has any active (non-ended) marriages
 * Only checks marriage/partnership unions (excludes parent-child unions)
 */
export function hasActiveMarriage(
  personId: string,
  unions: Union[],
  relationships: Relationship[]
): boolean {
  const personUnions = getPersonUnions(personId, unions, relationships);

  // Filter to only marriage/partnership unions
  const marriageUnions = personUnions.filter(
    (u) => u.type === 'marriage' || u.type === 'partnership'
  );

  return marriageUnions.some((union) => {
    // Active if no endDate or endDate is in the future
    if (!union.endDate) return true;
    return new Date(union.endDate) > new Date();
  });
}

/**
 * Get children of a union
 */
export function getUnionChildren(
  unionId: string,
  persons: Person[],
  relationships: Relationship[]
): Person[] {
  const childIds = relationships
    .filter((r) => r.type === 'HAS_CHILD' && r.fromId === unionId)
    .map((r) => r.toId);

  return persons.filter((p) => childIds.includes(p.personId));
}

/**
 * Get all children of a person (across all unions)
 */
export function getPersonChildren(
  personId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[]
): Person[] {
  const personUnions = getPersonUnions(personId, unions, relationships);
  const children: Person[] = [];

  for (const union of personUnions) {
    const unionChildren = getUnionChildren(union.unionId, persons, relationships);
    children.push(...unionChildren);
  }

  return children;
}

/**
 * Check if a person is already married to another specific person
 */
export function areMarried(
  person1Id: string,
  person2Id: string,
  relationships: Relationship[]
): boolean {
  // Find unions that person1 is in
  const person1Unions = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === person1Id)
    .map((r) => r.toId);

  // Find unions that person2 is in
  const person2Unions = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === person2Id)
    .map((r) => r.toId);

  // Check for intersection
  return person1Unions.some((unionId) => person2Unions.includes(unionId));
}
