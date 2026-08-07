/**
 * ancestrySideFilter — Filters the tree to only show paternal or maternal lineage.
 *
 * Algorithm:
 * 1. Find the home person's parent union
 * 2. Identify the male parent (paternal root) and female parent (maternal root)
 * 3. BFS from each root following PARTNER_IN / HAS_CHILD relationships
 * 4. Return the set of personIds belonging to each side
 *
 * The home person itself is included in both sides.
 */

import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

export type SideFilter = 'all' | 'paternal' | 'maternal';

/**
 * Returns the set of personIds visible on the paternal side (father's lineage).
 * Always includes the home person.
 */
export function getPaternalSideIds(
  persons: Person[],
  unions: Union[],
  relationships: Relationship[],
  homePerson: Person
): Set<string> {
  const { father } = findParents(persons, unions, relationships, homePerson.personId);
  if (!father) return new Set([homePerson.personId]);

  const side = new Set<string>([homePerson.personId]);
  collectLineage(father.personId, persons, unions, relationships, side, homePerson.personId);
  return side;
}

/**
 * Returns the set of personIds visible on the maternal side (mother's lineage).
 * Always includes the home person.
 */
export function getMaternalSideIds(
  persons: Person[],
  unions: Union[],
  relationships: Relationship[],
  homePerson: Person
): Set<string> {
  const { mother } = findParents(persons, unions, relationships, homePerson.personId);
  if (!mother) return new Set([homePerson.personId]);

  const side = new Set<string>([homePerson.personId]);
  collectLineage(mother.personId, persons, unions, relationships, side, homePerson.personId);
  return side;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function findParents(
  persons: Person[],
  _unions: Union[],
  relationships: Relationship[],
  personId: string
): { father: Person | null; mother: Person | null } {
  const personMap = new Map(persons.map(p => [p.personId, p]));

  // Find parent union(s): unions that have HAS_CHILD → personId
  const parentUnionIds = relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
    .map(r => r.fromId);

  if (parentUnionIds.length === 0) return { father: null, mother: null };

  // Use first parent union found
  const parentUnionId = parentUnionIds[0];

  // Find partners in that union
  const partnerIds = relationships
    .filter(r => r.type === 'PARTNER_IN' && r.toId === parentUnionId)
    .map(r => r.fromId);

  let father: Person | null = null;
  let mother: Person | null = null;

  for (const pid of partnerIds) {
    const p = personMap.get(pid);
    if (!p) continue;
    if (p.gender === 'male') father = p;
    else if (p.gender === 'female') mother = p;
    else if (!father) father = p; // fallback: first unknown-gender person as father
  }

  return { father, mother };
}

/**
 * BFS from rootPersonId — collects all persons in that lineage (ancestors +
 * their spouses + descendants). Excludes the home person (already in both sets).
 */
function collectLineage(
  rootPersonId: string,
  persons: Person[],
  _unions: Union[],
  relationships: Relationship[],
  result: Set<string>,
  excludePersonId: string
): void {
  const personMap = new Map(persons.map(p => [p.personId, p]));

  // Build quick lookups
  const unionPartners = new Map<string, string[]>(); // unionId → partnerIds
  const unionChildren = new Map<string, string[]>(); // unionId → childIds
  const personUnions = new Map<string, string[]>();  // personId → unionIds (as partner)

  for (const rel of relationships) {
    if (rel.type === 'PARTNER_IN') {
      const list = unionPartners.get(rel.toId) ?? [];
      list.push(rel.fromId);
      unionPartners.set(rel.toId, list);

      const pList = personUnions.get(rel.fromId) ?? [];
      pList.push(rel.toId);
      personUnions.set(rel.fromId, pList);
    } else if (rel.type === 'HAS_CHILD') {
      const list = unionChildren.get(rel.fromId) ?? [];
      list.push(rel.toId);
      unionChildren.set(rel.fromId, list);
    }
  }

  // BFS queue starting from root
  const visited = new Set<string>();
  const queue: string[] = [rootPersonId];

  while (queue.length > 0) {
    const pid = queue.shift()!;
    if (visited.has(pid)) continue;
    visited.add(pid);

    if (pid !== excludePersonId && personMap.has(pid)) {
      result.add(pid);
    }

    // Walk to spouses (partners in same unions)
    for (const uid of personUnions.get(pid) ?? []) {
      for (const partnerId of unionPartners.get(uid) ?? []) {
        if (!visited.has(partnerId)) queue.push(partnerId);
      }
      // Walk to children
      for (const childId of unionChildren.get(uid) ?? []) {
        if (childId !== excludePersonId && !visited.has(childId)) queue.push(childId);
      }
    }

    // Walk to parents (find unions where this person is a child, then get partners)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === pid)
      .map(r => r.fromId);

    for (const puid of parentUnionIds) {
      for (const partnerId of unionPartners.get(puid) ?? []) {
        if (!visited.has(partnerId)) queue.push(partnerId);
      }
    }
  }
}
