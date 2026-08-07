import type {
  TreeWindowData,
  CollapsedGroup,
  PlaceholderNode,
  ExtendedRelationship,
  ExpansionContext,
  ExpansionMetadata,
} from '@/types';
import { detectImmediateFamily } from './bloodRelationDetectionService';
import { detectExpandablePersons } from './bloodRelationExpansionService';

/**
 * Subtree Filter Service
 *
 * Filters tree data by removing collapsed persons/unions and inserting
 * placeholder nodes in their place. This allows the layout algorithm to
 * recalculate positions without the collapsed nodes.
 */

/**
 * Filter tree data by removing collapsed persons/unions
 * Returns filtered data + placeholder nodes
 */
export function filterCollapsedSubtrees(
  treeData: TreeWindowData,
  collapsedGroups: Map<string, CollapsedGroup>
): {
  filteredData: TreeWindowData;
  placeholderNodes: PlaceholderNode[];
} {
  const hiddenPersonIds = new Set<string>();
  const hiddenUnionIds = new Set<string>();

  // Collect all hidden IDs from collapsed groups
  collapsedGroups.forEach(group => {
    if (!group.isExpanded) {
      group.hiddenPersonIds.forEach(id => hiddenPersonIds.add(id));
      group.hiddenUnionIds.forEach(id => hiddenUnionIds.add(id));
    }
  });

  // Filter persons (keep visible ones)
  const visiblePersons = treeData.persons.filter(p =>
    !hiddenPersonIds.has(p.personId)
  );

  // Filter unions (keep visible ones)
  const visibleUnions = treeData.unions.filter(u =>
    !hiddenUnionIds.has(u.unionId)
  );

  // Filter relationships (remove edges to/from hidden nodes)
  const visibleRelationships = treeData.relationships.filter(r => {
    const fromIsHidden = hiddenPersonIds.has(r.fromId) || hiddenUnionIds.has(r.fromId);
    const toIsHidden = hiddenPersonIds.has(r.toId) || hiddenUnionIds.has(r.toId);
    return !fromIsHidden && !toIsHidden;
  });

  // Create placeholder nodes
  const placeholderNodes: PlaceholderNode[] = [];
  collapsedGroups.forEach(group => {
    if (!group.isExpanded) {
      placeholderNodes.push({
        personId: `placeholder-${group.groupId}`,
        type: 'placeholder',
        collapsedGroup: group,
        x: 0, // Will be calculated by layout
        y: 0,
        onExpand: () => {} // Will be bound later by component
      });
    }
  });

  return {
    filteredData: {
      persons: visiblePersons,
      unions: visibleUnions,
      relationships: visibleRelationships
    },
    placeholderNodes
  };
}

/**
 * Calculate all descendants of a person (for collapsing subtrees)
 * Uses BFS to traverse the tree
 */
export function getAllDescendants(
  rootPersonId: string,
  relationships: ExtendedRelationship[]
): string[] {
  const descendants: string[] = [];
  const queue = [rootPersonId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find children (HAS_CHILD edges)
    const children = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === currentId)
      .map(r => r.toId);

    descendants.push(...children);
    queue.push(...children);
  }

  return descendants;
}

/**
 * Calculate all ancestors of a person (for collapsing ancestor chains)
 * Uses BFS to traverse upward in the tree
 */
export function getAllAncestors(
  rootPersonId: string,
  relationships: ExtendedRelationship[]
): string[] {
  const ancestors: string[] = [];
  const queue = [rootPersonId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find parents (reverse of HAS_CHILD edges)
    const parents = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === currentId)
      .map(r => r.fromId);

    ancestors.push(...parents);
    queue.push(...parents);
  }

  return ancestors;
}

/**
 * Get all siblings of a person (people with same parents)
 */
export function getSiblings(
  personId: string,
  relationships: ExtendedRelationship[]
): string[] {
  // Find parents
  const parents = relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
    .map(r => r.fromId);

  if (parents.length === 0) return [];

  // Find all children of these parents
  const siblings = new Set<string>();
  parents.forEach(parentId => {
    const children = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === parentId)
      .map(r => r.toId);

    children.forEach(childId => {
      if (childId !== personId) {
        siblings.add(childId);
      }
    });
  });

  return Array.from(siblings);
}

/**
 * Get all unions that a person participates in
 */
export function getPersonUnions(
  personId: string,
  relationships: ExtendedRelationship[]
): string[] {
  // Find all PARTNER_IN relationships for this person
  return relationships
    .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map(r => r.toId);
}

/**
 * Get all unions associated with a group of people
 * This includes unions where any person in the group is a partner
 */
export function getGroupUnions(
  personIds: string[],
  relationships: ExtendedRelationship[]
): string[] {
  const unionIds = new Set<string>();

  personIds.forEach(personId => {
    const personUnions = getPersonUnions(personId, relationships);
    personUnions.forEach(unionId => unionIds.add(unionId));
  });

  return Array.from(unionIds);
}

/**
 * Update placeholder node positions after layout calculation
 */
export function updatePlaceholderPositions(
  placeholderNodes: PlaceholderNode[],
  positions: Map<string, { x: number; y: number }>
): PlaceholderNode[] {
  return placeholderNodes.map(placeholder => {
    const pos = positions.get(placeholder.personId);
    if (pos) {
      return {
        ...placeholder,
        x: pos.x,
        y: pos.y
      };
    }
    return placeholder;
  });
}

/**
 * Filter tree data by blood relations with expansion support
 *
 * This filters the tree to show only:
 * 1. Primary person's blood relations
 * 2. Spouses of blood relations (non-blood but visible)
 * 3. Expanded non-blood person's blood families (recursively)
 *
 * @param treeData - Full tree data
 * @param primaryPersonId - The anchor person (home person)
 * @param expansionContexts - Map of expanded non-blood persons and their families
 * @returns Filtered tree data and metadata about expandable persons
 */
export function filterByBloodRelationsWithExpansions(
  treeData: TreeWindowData,
  primaryPersonId: string,
  expansionContexts: Map<string, ExpansionContext>
): {
  filteredData: TreeWindowData;
  expandablePersons: Map<string, ExpansionMetadata>;
} {
  // ============================================================================
  // Step 1: Calculate primary blood relations
  // ============================================================================

  // Use immediate family detection (scoped view) as default.
  // This shows direct ancestors, descendants, siblings + spouses — but NOT
  // extended relatives like uncles, great-uncles, or in-laws' parents.
  const primaryBloodRelations = detectImmediateFamily(
    primaryPersonId,
    treeData.persons,
    treeData.unions,
    treeData.relationships
  );

  console.log('[filterByBloodRelationsWithExpansions] Immediate family:', primaryBloodRelations.size);

  // ============================================================================
  // Step 2: Build set of all visible person IDs
  // ============================================================================

  const visiblePersonIds = new Set<string>(primaryBloodRelations);

  // Add expanded blood relations and anchor persons
  expansionContexts.forEach(context => {
    // Add the anchor person (non-blood but visible because they're expanded)
    visiblePersonIds.add(context.anchorPersonId);

    // Add their blood relations
    context.expandedBloodRelations.forEach(id => {
      visiblePersonIds.add(id);
    });
  });

  console.log('[filterByBloodRelationsWithExpansions] After expansions:', visiblePersonIds.size);

  // ============================================================================
  // Step 3: Add spouses of blood relations ONLY (not spouses of spouses)
  // ============================================================================

  // Build combined set of all blood relations (primary + expanded)
  const allBloodRelations = new Set(primaryBloodRelations);
  expansionContexts.forEach(context => {
    context.expandedBloodRelations.forEach(id => allBloodRelations.add(id));
  });

  console.log('[filterByBloodRelationsWithExpansions] All blood relations (primary + expanded):', allBloodRelations.size);

  // Find all unions where at least one partner is a blood relation
  const visibleUnionIds = new Set<string>();

  treeData.unions.forEach(union => {
    // Get partners in this union
    const partners = treeData.relationships
      .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
      .map(r => r.fromId);

    // IMPORTANT: Only show union if at least one partner is a BLOOD RELATION
    // This prevents showing ex-spouses who are not blood related
    const hasBloodRelation = partners.some(p => allBloodRelations.has(p));

    if (hasBloodRelation) {
      visibleUnionIds.add(union.unionId);

      // Add all partners (spouses must be shown with blood relations)
      partners.forEach(p => visiblePersonIds.add(p));
    }
  });

  // Add unions from expansion contexts
  expansionContexts.forEach(context => {
    context.expandedUnionIds.forEach(unionId => {
      visibleUnionIds.add(unionId);
    });
  });

  console.log('[filterByBloodRelationsWithExpansions] Visible persons (with spouses):', visiblePersonIds.size);
  console.log('[filterByBloodRelationsWithExpansions] Visible unions:', visibleUnionIds.size);

  // ============================================================================
  // Step 4: Filter persons, unions, and relationships
  // ============================================================================

  const filteredPersons = treeData.persons.filter(p =>
    visiblePersonIds.has(p.personId)
  );

  const filteredUnions = treeData.unions.filter(u =>
    visibleUnionIds.has(u.unionId)
  );

  const filteredRelationships = treeData.relationships.filter(r => {
    // Keep relationships where both endpoints are visible
    if (r.type === 'PARTNER_IN') {
      // fromId is person, toId is union
      return visiblePersonIds.has(r.fromId) && visibleUnionIds.has(r.toId);
    } else if (r.type === 'HAS_CHILD') {
      // fromId is union, toId is person
      return visibleUnionIds.has(r.fromId) && visiblePersonIds.has(r.toId);
    } else if (r.type === 'GUARDIAN_OF') {
      // fromId is guardian, toId is child
      return visiblePersonIds.has(r.fromId) && visiblePersonIds.has(r.toId);
    } else if (r.type === 'MEMBER_OF') {
      // Tree membership relationship
      return visiblePersonIds.has(r.fromId);
    }
    return false;
  });

  const filteredData: TreeWindowData = {
    persons: filteredPersons,
    unions: filteredUnions,
    relationships: filteredRelationships
  };

  // ============================================================================
  // Step 5: Detect expandable persons using FULL tree data
  // ============================================================================
  // NOTE: We need to use the full tree data here, not filtered data,
  // because detectExpandablePersons needs to calculate blood relations
  // for non-blood persons, which requires access to their families
  // (who might not be in the filtered data yet)

  const expandablePersons = detectExpandablePersons(
    primaryBloodRelations,
    treeData.persons,  // Use FULL persons array
    treeData.unions,   // Use FULL unions array
    treeData.relationships  // Use FULL relationships array
  );

  // Also detect VISIBLE persons who have hidden relatives (siblings, parents, children)
  // that are in the full tree but not in the immediate family set.
  // These get an expand indicator showing hidden family members.
  const allPersonIds = new Set(treeData.persons.map(p => p.personId));
  for (const pid of primaryBloodRelations) {
    if (expandablePersons.has(pid)) continue; // Already expandable

    // Check: does this person have relatives in the tree that are NOT visible?
    let hiddenCount = 0;

    // Check siblings
    const parentUnionIds = treeData.relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === pid)
      .map(r => r.fromId);
    for (const uid of parentUnionIds) {
      const siblings = treeData.relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid && r.toId !== pid)
        .map(r => r.toId);
      hiddenCount += siblings.filter(sid => allPersonIds.has(sid) && !visiblePersonIds.has(sid)).length;
    }

    // Check children not visible
    const personUnions = treeData.relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === pid)
      .map(r => r.toId);
    for (const uid of personUnions) {
      const children = treeData.relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid)
        .map(r => r.toId);
      hiddenCount += children.filter(cid => allPersonIds.has(cid) && !visiblePersonIds.has(cid)).length;
    }

    // Check parents not visible
    for (const uid of parentUnionIds) {
      const parents = treeData.relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === uid)
        .map(r => r.fromId);
      hiddenCount += parents.filter(ppid => allPersonIds.has(ppid) && !visiblePersonIds.has(ppid)).length;
    }

    if (hiddenCount > 0) {
      expandablePersons.set(pid, {
        personId: pid,
        isExpandable: true,
        familyMemberCount: hiddenCount,
        spouseOfPersonId: undefined,
      });
    }
  }

  console.log('[filterByBloodRelationsWithExpansions] Expandable persons:', expandablePersons.size);

  return {
    filteredData,
    expandablePersons
  };
}



