/**
 * Vamshavali Service — Progressive Disclosure Family Tree
 *
 * Implements the Vamshavali layout mode where the user starts with their
 * immediate family (Level 0) and expands branches on demand, one level at a time.
 *
 * Level 0 (default view):
 * - Home person + spouse(s)
 * - Parents (mother + father)
 * - Direct siblings + their spouses
 * - Own children
 *
 * Each expansion reveals ONE level of new connections:
 * - Expand parents → person's parents + their spouses
 * - Expand siblings → person's siblings + their spouses (NOT children)
 * - Expand children → person's children + their spouses
 */

import type {
  TreeWindowData,
  VamshavaliExpansionState,
  VamshavaliVisibleSet,
  VamshavaliExpandInfo,
} from '@/types';
import {
  getSpouses,
  getParents,
  getChildren,
  getSiblings,
  getVisibleUnionIds,
} from '@/services/graphTraversalHelpers';

// ============================================================================
// Level 0: Default View
// ============================================================================

/**
 * Compute the default Vamshavali view (Level 0) for the home person.
 *
 * Shows: home person, spouse(s), parents, siblings + their spouses, children.
 * Does NOT show: siblings' children, parents' siblings, grandparents.
 */
export function computeVamshavaliDefaultView(
  homePersonId: string,
  treeData: TreeWindowData
): VamshavaliVisibleSet {
  const { relationships, unions } = treeData;
  const visible = new Set<string>();

  // 1. Home person
  visible.add(homePersonId);

  // 2. Home person's spouses
  const homeSpouses = getSpouses(homePersonId, relationships);
  for (const sid of homeSpouses) {
    visible.add(sid);
  }

  // 3. Home person's parents
  const parents = getParents(homePersonId, relationships);
  for (const pid of parents) {
    visible.add(pid);
  }

  // 4. Home person's siblings + their spouses
  const siblings = getSiblings(homePersonId, relationships);
  for (const sid of siblings) {
    visible.add(sid);
    const sibSpouses = getSpouses(sid, relationships);
    for (const sp of sibSpouses) {
      visible.add(sp);
    }
  }

  // 5. Home person's children (through all unions including spouse's unions)
  const children = getChildren(homePersonId, relationships);
  for (const cid of children) {
    visible.add(cid);
  }
  // Also children via spouses (step-children scenario)
  for (const sid of homeSpouses) {
    const spouseChildren = getChildren(sid, relationships);
    for (const cid of spouseChildren) {
      visible.add(cid);
    }
  }

  // Compute visible unions — don't require visible children (sibling spouse lines should show)
  const visibleUnionIds = getVisibleUnionIds(visible, unions, relationships, false);

  return { visiblePersonIds: visible, visibleUnionIds };
}

// ============================================================================
// Apply Expansions
// ============================================================================

/**
 * Compute the full visible set after applying user expansions on top of Level 0.
 *
 * Expansions are additive: expanding person A's parents does NOT hide person B's siblings.
 * Each expansion adds the immediate relatives in that direction + their spouses.
 */
export function applyVamshavaliExpansions(
  homePersonId: string,
  treeData: TreeWindowData,
  expansionState: VamshavaliExpansionState
): VamshavaliVisibleSet {
  const { relationships, unions } = treeData;

  // Start with Level 0
  const base = computeVamshavaliDefaultView(homePersonId, treeData);
  const visible = new Set(base.visiblePersonIds);

  // Apply each person's expansions
  for (const [personId, directions] of expansionState.expansions) {
    if (directions.has('parents')) {
      const parents = getParents(personId, relationships);
      for (const pid of parents) {
        visible.add(pid);
        // Include parents' spouses (the other parent may not be visible yet)
        const parentSpouses = getSpouses(pid, relationships);
        for (const sp of parentSpouses) {
          visible.add(sp);
        }
      }
    }

    if (directions.has('siblings')) {
      const siblings = getSiblings(personId, relationships);
      for (const sid of siblings) {
        visible.add(sid);
        // Include siblings' spouses
        const sibSpouses = getSpouses(sid, relationships);
        for (const sp of sibSpouses) {
          visible.add(sp);
        }
      }
      // Also include parents — siblings are meaningless without the shared parent
      // union that connects them. Without parents, siblings float disconnected.
      const parents = getParents(personId, relationships);
      for (const pid of parents) {
        visible.add(pid);
        const parentSpouses = getSpouses(pid, relationships);
        for (const sp of parentSpouses) {
          visible.add(sp);
        }
      }
    }

    if (directions.has('children')) {
      const children = getChildren(personId, relationships);
      for (const cid of children) {
        visible.add(cid);
        // Include children's spouses
        const childSpouses = getSpouses(cid, relationships);
        for (const sp of childSpouses) {
          visible.add(sp);
        }
      }
    }
  }

  // Recompute visible unions with the expanded visible set
  // Must pass requireVisibleChild=false so spouse lines show even when children aren't expanded
  const visibleUnionIds = getVisibleUnionIds(visible, unions, relationships, false);

  return { visiblePersonIds: visible, visibleUnionIds };
}

// ============================================================================
// Expand Info (per-person pill button data)
// ============================================================================

/**
 * Get expand info for a specific person — used to render the directional
 * expand pills on each PersonCard.
 *
 * Returns counts of hidden/visible relatives in each direction so the UI
 * can show "+3" or decide not to show a pill at all.
 */
export function getVamshavaliExpandInfo(
  personId: string,
  treeData: TreeWindowData,
  visiblePersonIds: Set<string>
): VamshavaliExpandInfo {
  const { relationships } = treeData;
  const allPersonIds = new Set(treeData.persons.map(p => p.personId));

  // Parents
  const parents = getParents(personId, relationships).filter(id => allPersonIds.has(id));
  const visibleParents = parents.filter(id => visiblePersonIds.has(id));
  const hiddenParents = parents.filter(id => !visiblePersonIds.has(id));

  // Siblings
  const siblings = getSiblings(personId, relationships).filter(id => allPersonIds.has(id));
  const visibleSiblings = siblings.filter(id => visiblePersonIds.has(id));
  const hiddenSiblings = siblings.filter(id => !visiblePersonIds.has(id));

  // Children
  const children = getChildren(personId, relationships).filter(id => allPersonIds.has(id));
  const visibleChildren = children.filter(id => visiblePersonIds.has(id));
  const hiddenChildren = children.filter(id => !visiblePersonIds.has(id));

  return {
    hasHiddenParents: hiddenParents.length > 0,
    hiddenParentCount: hiddenParents.length,
    hasHiddenSiblings: hiddenSiblings.length > 0,
    hiddenSiblingCount: hiddenSiblings.length,
    hasHiddenChildren: hiddenChildren.length > 0,
    hiddenChildrenCount: hiddenChildren.length,
    hasVisibleParents: visibleParents.length > 0,
    hasVisibleSiblings: visibleSiblings.length > 0,
    hasVisibleChildren: visibleChildren.length > 0,
  };
}

// ============================================================================
// Search: Auto-expand path to hidden person
// ============================================================================

/**
 * Compute the expansions needed to reveal a hidden person from the current
 * visible set. Uses BFS to find the shortest expansion path.
 *
 * Returns a new VamshavaliExpansionState that includes the existing expansions
 * plus the minimum additional expansions needed to reveal the target.
 */
export function computeExpansionPathTo(
  targetPersonId: string,
  homePersonId: string,
  treeData: TreeWindowData,
  currentExpansions: VamshavaliExpansionState
): VamshavaliExpansionState {
  const { relationships } = treeData;

  // If target is already visible, return current state unchanged
  const currentVisible = applyVamshavaliExpansions(homePersonId, treeData, currentExpansions);
  if (currentVisible.visiblePersonIds.has(targetPersonId)) {
    return currentExpansions;
  }

  // BFS from visible persons outward to find the target
  // Each step = one expand action (parents/siblings/children of a visible person)
  interface BfsNode {
    personId: string;
    expansionsNeeded: Array<{ personId: string; direction: 'parents' | 'siblings' | 'children' }>;
  }

  const visited = new Set<string>(currentVisible.visiblePersonIds);
  const queue: BfsNode[] = [];

  // Seed the BFS with all currently visible persons
  for (const visibleId of currentVisible.visiblePersonIds) {
    queue.push({ personId: visibleId, expansionsNeeded: [] });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Try each direction from this person
    const directions: Array<{ dir: 'parents' | 'siblings' | 'children'; getRelatives: () => string[] }> = [
      { dir: 'parents', getRelatives: () => getParents(current.personId, relationships) },
      { dir: 'siblings', getRelatives: () => getSiblings(current.personId, relationships) },
      { dir: 'children', getRelatives: () => getChildren(current.personId, relationships) },
    ];

    for (const { dir, getRelatives } of directions) {
      const relatives = getRelatives();
      const hasUnvisited = relatives.some(id => !visited.has(id));

      if (!hasUnvisited) continue;

      const newExpansions = [
        ...current.expansionsNeeded,
        { personId: current.personId, direction: dir },
      ];

      for (const relId of relatives) {
        if (visited.has(relId)) continue;
        visited.add(relId);

        if (relId === targetPersonId) {
          // Found! Build the expansion state
          const newState: VamshavaliExpansionState = {
            expansions: new Map(currentExpansions.expansions),
          };
          // Deep-clone existing Sets
          for (const [key, val] of currentExpansions.expansions) {
            newState.expansions.set(key, new Set(val));
          }
          // Add the new expansions
          for (const exp of newExpansions) {
            const existing = newState.expansions.get(exp.personId) || new Set();
            existing.add(exp.direction);
            newState.expansions.set(exp.personId, existing);
          }
          return newState;
        }

        queue.push({ personId: relId, expansionsNeeded: newExpansions });
      }
    }
  }

  // Target not reachable — return current state unchanged
  return currentExpansions;
}
