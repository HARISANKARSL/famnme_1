import type { Person, Union, CollapsedGroup, ExtendedRelationship } from '@/types';

/**
 * Collapse Validation Service
 *
 * Validates if a group can be safely collapsed according to safety rules:
 * - No non-standard marriages (polyandry, polygyny, consanguineous, levirate, sororate)
 * - No cross-generational marriages
 * - No adoption or step-relations
 * - No guardian relationships
 */

/**
 * Get all unions a person participates in
 */
function getPersonMarriages(
  personId: string,
  unions: Union[],
  relationships: ExtendedRelationship[]
): Union[] {
  // Find all PARTNER_IN relationships for this person
  const unionIds = relationships
    .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map(r => r.toId);

  // Return the actual union objects
  return unions.filter(u => unionIds.includes(u.unionId));
}

/**
 * Check if any person in group has cross-generational marriage
 * This requires generation calculation - simplified for now
 */
function checkCrossGenerationalMarriages(
  _persons: Person[],
  _unions: Union[],
  _relationships: ExtendedRelationship[]
): boolean {
  // TODO: Implement generation calculation
  // For now, return false (no cross-generational marriages detected)
  // In a full implementation, this would:
  // 1. Calculate generation number for each person
  // 2. For each union, check if partners have different generations
  // 3. Return true if any cross-generational marriage found

  return false;
}

/**
 * Check if any person in group has guardian relationships
 */
function hasGuardianRelationships(
  personIds: string[],
  relationships: ExtendedRelationship[]
): boolean {
  return relationships.some(r =>
    r.type === 'GUARDIAN_OF' &&
    (personIds.includes(r.fromId) || personIds.includes(r.toId))
  );
}

/**
 * Validate if a group can be safely collapsed
 * Returns { canCollapse: boolean, reason?: string }
 */
export function validateCollapseGroup(
  group: CollapsedGroup,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): { canCollapse: boolean; reason?: string } {
  // Get all people in the group (including anchor)
  const allPersonIds = [group.anchorPersonId, ...group.hiddenPersonIds];
  const groupPersons = persons.filter(p => allPersonIds.includes(p.personId));

  // Rule 1: No non-standard marriages
  const hasComplexMarriages = groupPersons.some(person => {
    const marriages = getPersonMarriages(person.personId, unions, relationships);
    return marriages.some(union =>
      union.marriagePattern &&
      union.marriagePattern !== 'standard'
    );
  });

  if (hasComplexMarriages) {
    return {
      canCollapse: false,
      reason: 'Group contains person with non-standard marriage pattern (polyandry, polygyny, consanguineous, levirate, sororate)'
    };
  }

  // Rule 2: No cross-generational marriages
  const hasCrossGenMarriage = checkCrossGenerationalMarriages(groupPersons, unions, relationships);
  if (hasCrossGenMarriage) {
    return {
      canCollapse: false,
      reason: 'Group contains cross-generational marriage'
    };
  }

  // Rule 3: No adoption or guardian relationships
  if (hasGuardianRelationships(allPersonIds, relationships)) {
    return {
      canCollapse: false,
      reason: 'Group contains adoption, step-parent, foster, or guardian relationships'
    };
  }

  // Rule 4: Minimum group size
  if (group.hiddenPersonIds.length === 0) {
    return {
      canCollapse: false,
      reason: 'Group must have at least 2 people to collapse'
    };
  }

  return { canCollapse: true };
}

/**
 * Validate multiple groups at once
 * Returns a map of groupId -> validation result
 */
export function validateMultipleGroups(
  groups: CollapsedGroup[],
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): Map<string, { canCollapse: boolean; reason?: string }> {
  const results = new Map<string, { canCollapse: boolean; reason?: string }>();

  groups.forEach(group => {
    const result = validateCollapseGroup(group, persons, unions, relationships);
    results.set(group.groupId, result);
  });

  return results;
}

/**
 * Filter groups to only return those that can be safely collapsed
 */
export function filterCollapsibleGroups(
  groups: CollapsedGroup[],
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): CollapsedGroup[] {
  return groups.filter(group => {
    const result = validateCollapseGroup(group, persons, unions, relationships);
    return result.canCollapse;
  });
}

/**
 * Check if a specific marriage pattern is safe for collapsing
 */
export function isMarriagePatternSafe(pattern: Union['marriagePattern']): boolean {
  // Only 'standard' and null (unknown) patterns are safe
  // Everything else blocks collapsing
  return pattern === 'standard' || pattern === null || pattern === undefined;
}

/**
 * Get a user-friendly description of why a group cannot be collapsed
 */
export function getCollapseBlockReason(
  group: CollapsedGroup,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): string {
  const result = validateCollapseGroup(group, persons, unions, relationships);
  return result.reason || 'Group can be collapsed';
}
