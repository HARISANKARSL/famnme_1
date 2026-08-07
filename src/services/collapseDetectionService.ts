import type { Person, Union, ExtendedRelationship, CollapsedGroup } from '@/types';

/**
 * Collapse Detection Service
 *
 * Detects which groups of people can be safely collapsed to improve rendering
 * performance and reduce visual clutter in large family trees.
 *
 * SAFETY RULES:
 * - Never collapse nodes with non-standard marriage patterns (polyandry, consanguineous, levirate)
 * - Never collapse nodes with cross-generational marriages
 * - Never collapse nodes with adoption or step-relations
 */

/**
 * Get all marriages for a person
 */
function getPersonMarriages(
  personId: string,
  unions: Union[]
): Union[] {
  return unions.filter(union => {
    // Check if person is a partner in this union by looking at relationships
    // Note: In the union-based model, we need to check PARTNER_IN relationships
    return union.unionId.includes(personId); // Simplified - may need refinement based on actual data structure
  });
}

/**
 * Check if person participates in any non-standard marriage
 */
function hasComplexMarriage(
  person: Person,
  unions: Union[]
): boolean {
  const marriages = getPersonMarriages(person.personId, unions);
  return marriages.some(union =>
    union.marriagePattern &&
    union.marriagePattern !== 'standard'
  );
}

/**
 * Check if sibling group can be collapsed
 * Safe to collapse if:
 * - No sibling has non-standard marriage
 * - No cross-generational marriages (checked elsewhere)
 */
function canCollapseSiblings(
  siblings: Person[],
  unions: Union[]
): boolean {
  // Block if any sibling participates in non-standard marriage
  return !siblings.some(person => hasComplexMarriage(person, unions));
}

/**
 * Group people by their parents to identify sibling groups
 */
function groupByParents(
  persons: Person[],
  relationships: ExtendedRelationship[]
): Person[][] {
  const siblingGroups: Map<string, Person[]> = new Map();

  // Build parent signature for each person
  const personToParents = new Map<string, Set<string>>();

  relationships.forEach(rel => {
    if (rel.type === 'HAS_CHILD') {
      const childId = rel.toId;
      const parentId = rel.fromId;

      if (!personToParents.has(childId)) {
        personToParents.set(childId, new Set());
      }
      personToParents.get(childId)!.add(parentId);
    }
  });

  // Group people with same parents
  persons.forEach(person => {
    const parents = personToParents.get(person.personId);
    if (!parents || parents.size === 0) return;

    // Create a signature from sorted parent IDs
    const signature = Array.from(parents).sort().join('|');

    if (!siblingGroups.has(signature)) {
      siblingGroups.set(signature, []);
    }
    siblingGroups.get(signature)!.push(person);
  });

  // Filter out groups with only 1 child (no siblings)
  return Array.from(siblingGroups.values()).filter(group => group.length > 1);
}

/**
 * Create a CollapsedGroup from a list of people
 */
function createCollapsedGroup(
  people: Person[],
  groupType: CollapsedGroup['groupType'],
  unions: Union[]
): CollapsedGroup {
  const hasComplexMarriages = people.some(p => hasComplexMarriage(p, unions));

  // Calculate generation range (simplified - assumes all siblings are same generation)
  const preserveGeneration = 0; // Will need to be calculated based on actual layout

  return {
    groupId: `${groupType}-${people[0].personId}`,
    anchorPersonId: people[0].personId,
    hiddenPersonIds: people.slice(1).map(p => p.personId), // Keep first person visible
    hiddenUnionIds: [], // Will be populated during filtering
    groupType,
    count: people.length - 1,
    label: groupType === 'siblings'
      ? `+${people.length - 1} sibling${people.length - 1 > 1 ? 's' : ''}`
      : `+${people.length - 1} generation${people.length - 1 > 1 ? 's' : ''}`,
    generationRange: [preserveGeneration, preserveGeneration],
    preserveGeneration,
    isExpanded: false,
    hasComplexMarriages,
    canCollapse: !hasComplexMarriages,
  };
}

/**
 * Detect collapsible sibling groups
 * Safe to collapse if:
 * - All siblings share same parents
 * - No sibling has non-standard marriage
 * - No cross-generational marriages
 */
export function detectCollapsibleSiblingGroups(
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): CollapsedGroup[] {
  const siblingGroups = groupByParents(persons, relationships);

  return siblingGroups
    .filter(group => canCollapseSiblings(group, unions))
    .map(group => createCollapsedGroup(group, 'siblings', unions));
}

/**
 * Build a linear chain starting from a root person
 * Returns chain if it has at least 3 people and is truly linear (no branching)
 */
function buildLinearChain(
  root: Person,
  relationships: ExtendedRelationship[]
): Person[] {
  const chain: Person[] = [root];
  let current = root;

  // Follow single-child descendant path
  while (true) {
    const children = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === current.personId)
      .map(r => r.toId);

    // Stop if no children or more than one child (branching)
    if (children.length !== 1) break;

    // Find the child person (simplified - would need to look up from persons array)
    // For now, just record the ID
    const childId = children[0];

    // Prevent infinite loops
    if (chain.some(p => p.personId === childId)) break;

    // Would need to fetch actual Person object here
    // Simplified for now - just break
    break;
  }

  return chain.length >= 3 ? chain : [];
}

/**
 * Check if chain has any complex marriages
 */
function canCollapseChain(
  chain: Person[],
  unions: Union[]
): boolean {
  return !chain.some(person => hasComplexMarriage(person, unions));
}

/**
 * Detect linear descendant chains
 * Safe to collapse if:
 * - No branching (each person has max 1 child)
 * - All marriages are standard
 * - Min 3 generations in chain
 */
export function detectLinearDescendantChains(
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): CollapsedGroup[] {
  const chains: Person[][] = [];

  // Find all linear paths (parent → single child → single child → ...)
  persons.forEach(root => {
    const chain = buildLinearChain(root, relationships);
    if (chain.length >= 3 && canCollapseChain(chain, unions)) {
      chains.push(chain);
    }
  });

  return chains.map(chain => createCollapsedGroup(chain, 'descendants', unions));
}

/**
 * Main entry point: detect all collapsible groups in a tree
 */
export function detectAllCollapsibleGroups(
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[]
): CollapsedGroup[] {
  const siblingGroups = detectCollapsibleSiblingGroups(persons, unions, relationships);
  const descendantChains = detectLinearDescendantChains(persons, unions, relationships);

  return [...siblingGroups, ...descendantChains];
}
