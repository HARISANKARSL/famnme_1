/**
 * Graph Traversal Helpers
 *
 * Shared utility functions for traversing the family tree graph structure.
 * Used by progressiveDisclosureService, vamshavaliService, and other services
 * that need to navigate person/union/relationship data.
 */

import type { ExtendedRelationship } from '@/types';
import type { Relationship } from '@/services/layout/types';

/** Accepted relationship types for all helpers */
export type AnyRelationship = ExtendedRelationship | Relationship;

/** Get person IDs who are partners in a union */
export function getPartnersInUnion(
  unionId: string,
  relationships: AnyRelationship[]
): string[] {
  return relationships
    .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
    .map(r => r.fromId);
}

/** Get union IDs a person participates in */
export function getPersonUnionIds(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  return relationships
    .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map(r => r.toId);
}

/** Get spouse person IDs for a person */
export function getSpouses(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  const unionIds = getPersonUnionIds(personId, relationships);
  const spouses: string[] = [];
  for (const uid of unionIds) {
    const partners = getPartnersInUnion(uid, relationships);
    for (const p of partners) {
      if (p !== personId) spouses.push(p);
    }
  }
  return spouses;
}

/** Get the parent union IDs for a person (unions that have this person as child) */
export function getParentUnionIds(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  return relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
    .map(r => r.fromId);
}

/** Get parent person IDs for a person */
export function getParents(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  const parentUnionIds = getParentUnionIds(personId, relationships);
  const parents: string[] = [];
  for (const uid of parentUnionIds) {
    const partners = getPartnersInUnion(uid, relationships);
    parents.push(...partners);
  }
  return [...new Set(parents)];
}

/** Get children person IDs for a person (through all their unions) */
export function getChildren(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  const unionIds = getPersonUnionIds(personId, relationships);
  const children: string[] = [];
  for (const uid of unionIds) {
    const kids = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid)
      .map(r => r.toId);
    children.push(...kids);
  }
  return [...new Set(children)];
}

/** Get siblings (same parent union, excluding self) */
export function getSiblings(
  personId: string,
  relationships: AnyRelationship[]
): string[] {
  const parentUnionIds = getParentUnionIds(personId, relationships);
  const siblings = new Set<string>();
  for (const uid of parentUnionIds) {
    const kids = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid)
      .map(r => r.toId);
    for (const k of kids) {
      if (k !== personId) siblings.add(k);
    }
  }
  return [...siblings];
}

/**
 * Compute visible union IDs given a set of visible person IDs.
 *
 * @param requireVisibleChild - If true (default), unions with children require at least
 *   one visible child. If false, unions are visible as long as all partners are visible.
 *   Vamshavali mode uses false because sibling's spouses should show spouse lines even
 *   when the sibling's children are not yet expanded.
 */
export function getVisibleUnionIds(
  visiblePersonIds: Set<string>,
  unions: Array<{ unionId: string }>,
  relationships: AnyRelationship[],
  requireVisibleChild = true
): Set<string> {
  const visibleUnionIds = new Set<string>();

  for (const union of unions) {
    const partners = getPartnersInUnion(union.unionId, relationships);
    if (partners.length === 0) continue;

    const allPartnersVisible = partners.every(p => visiblePersonIds.has(p));
    if (!allPartnersVisible) continue;

    if (!requireVisibleChild) {
      // Vamshavali mode: union visible as long as all partners are visible
      visibleUnionIds.add(union.unionId);
      continue;
    }

    const childRels = relationships.filter(
      r => r.type === 'HAS_CHILD' && r.fromId === union.unionId
    );

    if (childRels.length === 0) {
      // Union with no children — visible if both partners are visible
      visibleUnionIds.add(union.unionId);
    } else {
      // Union with children — visible if at least one child is also visible
      const hasVisibleChild = childRels.some(r => visiblePersonIds.has(r.toId));
      if (hasVisibleChild) {
        visibleUnionIds.add(union.unionId);
      }
    }
  }

  return visibleUnionIds;
}
