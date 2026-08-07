/**
 * Phase 1: Build Family Units
 *
 * Transforms the flat person/union/relationship graph into a hierarchical
 * structure of FamilyUnits — the atomic building block of a family tree.
 *
 * Key rule (from McGuffin 2005): A person appears in exactly ONE FamilyUnit
 * as a child, but in MULTIPLE FamilyUnits as a parent. This breaks the DAG
 * into a clean forest.
 */

import type { Person, Union } from '@/types';
import type { Relationship } from './types';
import type { FamilyUnit } from './types';

/**
 * Build FamilyUnits from raw persons, unions, and relationships.
 *
 * Algorithm:
 * 1. For each Union, create a FamilyUnit with its partners + children
 * 2. Handle multi-spouse: Person A married to B and C creates 2 FamilyUnits
 * 3. Handle single parents: Person with children but no union → synthetic unit
 * 4. Handle orphans: Persons with no family connections → solo unit
 */
export function buildFamilyUnits(
  persons: Person[],
  unions: Union[],
  relationships: Relationship[]
): FamilyUnit[] {
  const personMap = new Map(persons.map(p => [p.personId, p]));
  const familyUnits: FamilyUnit[] = [];
  const personsAsChildInUnit = new Set<string>();
  const personsAsParentInUnit = new Set<string>();

  // Build lookup maps from relationships
  const unionPartners = new Map<string, string[]>();   // unionId → [personId, ...]
  const unionChildren = new Map<string, string[]>();   // unionId → [personId, ...]

  for (const rel of relationships) {
    if (rel.type === 'PARTNER_IN') {
      const list = unionPartners.get(rel.toId) ?? [];
      list.push(rel.fromId);
      unionPartners.set(rel.toId, list);
    } else if (rel.type === 'HAS_CHILD') {
      const list = unionChildren.get(rel.fromId) ?? [];
      list.push(rel.toId);
      unionChildren.set(rel.fromId, list);
    }
  }

  // Step 1: Create a FamilyUnit for each Union
  for (const union of unions) {
    const partnerIds = unionPartners.get(union.unionId) ?? [];
    const childIds = unionChildren.get(union.unionId) ?? [];

    const parents = partnerIds
      .map(id => personMap.get(id))
      .filter((p): p is Person => p !== undefined);

    const children = childIds
      .map(id => personMap.get(id))
      .filter((p): p is Person => p !== undefined);

    // Sort children by birth date, then by elder status, then by first name
    children.sort((a, b) => {
      // Elder status first (elder before younger)
      if (a.elderStatus === 'elder' && b.elderStatus !== 'elder') return -1;
      if (b.elderStatus === 'elder' && a.elderStatus !== 'elder') return 1;
      if (a.elderStatus === 'younger' && b.elderStatus !== 'younger') return 1;
      if (b.elderStatus === 'younger' && a.elderStatus !== 'younger') return -1;

      // Then by birth date
      if (a.birthDate && b.birthDate) {
        return a.birthDate.localeCompare(b.birthDate);
      }
      if (a.birthDate) return -1;
      if (b.birthDate) return 1;

      // Then by birth order
      if (a.birthOrder != null && b.birthOrder != null) {
        return a.birthOrder - b.birthOrder;
      }

      // Finally alphabetical
      return a.firstName.localeCompare(b.firstName);
    });

    familyUnits.push({
      unitId: `unit_${union.unionId}`,
      parents,
      union,
      children,
      generation: 0, // assigned in Phase 2
    });

    for (const child of children) {
      personsAsChildInUnit.add(child.personId);
    }
    for (const parent of parents) {
      personsAsParentInUnit.add(parent.personId);
    }
  }

  // Step 2: Handle orphan persons (no union connection at all)
  // These get a solo FamilyUnit so they still appear in the layout
  for (const person of persons) {
    if (!personsAsChildInUnit.has(person.personId) && !personsAsParentInUnit.has(person.personId)) {
      familyUnits.push({
        unitId: `unit_solo_${person.personId}`,
        parents: [person],
        union: null,
        children: [],
        generation: 0,
      });
    }
  }

  return familyUnits;
}

/**
 * Build lookup maps for quick access to family unit relationships.
 */
export function buildFamilyUnitLookups(familyUnits: FamilyUnit[]) {
  /** Person ID → the FamilyUnit where this person is a CHILD */
  const personChildOf = new Map<string, FamilyUnit>();
  /** Person ID → all FamilyUnits where this person is a PARENT */
  const personParentIn = new Map<string, FamilyUnit[]>();
  /** Union ID → FamilyUnit */
  const unionToUnit = new Map<string, FamilyUnit>();

  for (const unit of familyUnits) {
    if (unit.union) {
      unionToUnit.set(unit.union.unionId, unit);
    }

    for (const child of unit.children) {
      personChildOf.set(child.personId, unit);
    }

    for (const parent of unit.parents) {
      const list = personParentIn.get(parent.personId) ?? [];
      list.push(unit);
      personParentIn.set(parent.personId, list);
    }
  }

  return { personChildOf, personParentIn, unionToUnit };
}
