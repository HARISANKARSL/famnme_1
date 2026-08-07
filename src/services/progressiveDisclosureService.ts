/**
 * Progressive Disclosure Service
 *
 * Implements Ancestry.com-style progressive disclosure for the family tree.
 * Instead of showing all 50+ members at once, shows a focused view centered
 * on one person and allows per-node expand/collapse.
 *
 * Default visible set (Ancestry rules):
 * - Focus person + their spouse(s)
 * - Parents, grandparents, great-grandparents (3 gen ancestors)
 * - Children + their spouses (1 gen descendants)
 * - Siblings + their spouses
 * - Parent's siblings (aunts/uncles) + their spouses
 * - Children of parent's siblings (first cousins)
 */

import type {
  TreeWindowData,
} from '@/types';
import {
  getPartnersInUnion,
  getPersonUnionIds,
  getSpouses,
  getParentUnionIds,
  getParents,
  getChildren,
  getSiblings,
  type AnyRelationship,
} from '@/services/graphTraversalHelpers';

// ============================================================================
// Types
// ============================================================================

export type PerNodeCollapseState = {
  parentsHidden: boolean;
  siblingsHidden: boolean;
  childrenHidden: boolean;
};

export type CollapsedBubble = {
  bubbleId: string;
  type: 'parents' | 'siblings' | 'children';
  anchorPersonId: string;
  hiddenPersonIds: string[];
  count: number;
  label: string;
  placement: 'top' | 'side' | 'bottom';
};

export type NodeCollapseInfo = {
  hasParents: boolean;
  hasSiblings: boolean;
  hasChildren: boolean;
  parentsHidden: boolean;
  siblingsHidden: boolean;
  childrenHidden: boolean;
};

// ============================================================================
// Core: Compute Default Visible Set
// ============================================================================

/**
 * Compute the default set of visible person IDs using Ancestry's rules:
 * - 3 generations of ancestors
 * - 1 generation of descendants + their spouses
 * - Siblings + their spouses
 * - Aunts/uncles + their spouses
 * - First cousins
 * - Spouses of all visible persons
 *
 * Also includes all union IDs that connect visible persons.
 */
export function computeDefaultVisibleSet(
  focusPersonId: string,
  treeData: TreeWindowData
): { visiblePersonIds: Set<string>; visibleUnionIds: Set<string> } {
  const { relationships } = treeData;
  const visible = new Set<string>();

  // 1. Focus person
  visible.add(focusPersonId);

  // 2. Spouses of focus
  const focusSpouses = getSpouses(focusPersonId, relationships);
  focusSpouses.forEach(id => visible.add(id));

  // 3. Ancestors up to 3 generations
  const addAncestors = (personId: string, depth: number) => {
    if (depth <= 0) return;
    const parents = getParents(personId, relationships);
    for (const pid of parents) {
      visible.add(pid);
      // Also add spouses of ancestors
      const ancestorSpouses = getSpouses(pid, relationships);
      ancestorSpouses.forEach(s => visible.add(s));
      addAncestors(pid, depth - 1);
    }
  };
  addAncestors(focusPersonId, 3);

  // 4. Children of focus + their spouses
  const children = getChildren(focusPersonId, relationships);
  for (const cid of children) {
    visible.add(cid);
    const childSpouses = getSpouses(cid, relationships);
    childSpouses.forEach(s => visible.add(s));
  }
  // Also add children of focus's spouses (step-children scenario)
  for (const sid of focusSpouses) {
    const spouseChildren = getChildren(sid, relationships);
    for (const cid of spouseChildren) {
      visible.add(cid);
      const childSpouses = getSpouses(cid, relationships);
      childSpouses.forEach(s => visible.add(s));
    }
  }

  // 5. Siblings of focus + their spouses
  const siblings = getSiblings(focusPersonId, relationships);
  for (const sid of siblings) {
    visible.add(sid);
    const sibSpouses = getSpouses(sid, relationships);
    sibSpouses.forEach(s => visible.add(s));
  }

  // 6. Parents' siblings (aunts/uncles) + their spouses
  const focusParents = getParents(focusPersonId, relationships);
  for (const pid of focusParents) {
    const parentSiblings = getSiblings(pid, relationships);
    for (const auid of parentSiblings) {
      visible.add(auid);
      const auSpouses = getSpouses(auid, relationships);
      auSpouses.forEach(s => visible.add(s));

      // 7. First cousins (children of aunts/uncles)
      const cousins = getChildren(auid, relationships);
      for (const cid of cousins) {
        visible.add(cid);
      }
    }
  }

  // Compute visible union IDs: any union where at least one partner is visible
  const visibleUnionIds = new Set<string>();
  for (const union of treeData.unions) {
    const partners = getPartnersInUnion(union.unionId, relationships);
    const kidRels = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === union.unionId);
    const kids = kidRels.map(r => r.toId);

    const hasVisiblePartner = partners.some(p => visible.has(p));
    const hasVisibleChild = kids.some(c => visible.has(c));

    // Show union if both partners are visible, OR at least one partner and one child are visible
    const allPartnersVisible = partners.every(p => visible.has(p));
    if (allPartnersVisible || (hasVisiblePartner && hasVisibleChild)) {
      visibleUnionIds.add(union.unionId);
      // Ensure all partners of visible unions are also visible
      partners.forEach(p => visible.add(p));
    }
  }

  return { visiblePersonIds: visible, visibleUnionIds };
}

// ============================================================================
// Per-Node Collapse/Expand
// ============================================================================

/**
 * Get the set of person IDs hidden by collapsing parents of a person.
 * Hides all ancestors above the person (recursively).
 */
function getHiddenParents(
  personId: string,
  relationships: AnyRelationship[],
  visibleSet: Set<string>
): string[] {
  const hidden: string[] = [];
  const queue = [...getParents(personId, relationships)];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const pid = queue.shift()!;
    if (visited.has(pid)) continue;
    visited.add(pid);

    if (visibleSet.has(pid) && pid !== personId) {
      hidden.push(pid);
      // Also hide their spouses (but not the person we're collapsing from)
      const spouses = getSpouses(pid, relationships);
      for (const s of spouses) {
        if (visibleSet.has(s) && s !== personId && !visited.has(s)) {
          hidden.push(s);
          visited.add(s);
        }
      }
      // Continue up
      const grandparents = getParents(pid, relationships);
      queue.push(...grandparents);
    }
  }

  return hidden;
}

/**
 * Get the set of person IDs hidden by collapsing siblings of a person.
 */
function getHiddenSiblings(
  personId: string,
  relationships: AnyRelationship[],
  visibleSet: Set<string>
): string[] {
  const siblings = getSiblings(personId, relationships);
  const hidden: string[] = [];

  for (const sid of siblings) {
    if (visibleSet.has(sid)) {
      hidden.push(sid);
      // Also hide sibling's spouses
      const sibSpouses = getSpouses(sid, relationships);
      for (const s of sibSpouses) {
        if (visibleSet.has(s)) hidden.push(s);
      }
      // Also hide sibling's children
      const sibChildren = getChildren(sid, relationships);
      for (const c of sibChildren) {
        if (visibleSet.has(c)) hidden.push(c);
      }
    }
  }

  return hidden;
}

/**
 * Get the set of person IDs hidden by collapsing children of a person.
 */
function getHiddenChildren(
  personId: string,
  relationships: AnyRelationship[],
  visibleSet: Set<string>
): string[] {
  const children = getChildren(personId, relationships);
  const hidden: string[] = [];
  const visited = new Set<string>();

  const collectDescendants = (pid: string) => {
    if (visited.has(pid)) return;
    visited.add(pid);
    if (visibleSet.has(pid)) {
      hidden.push(pid);
      // Hide their spouses
      const spouses = getSpouses(pid, relationships);
      for (const s of spouses) {
        if (visibleSet.has(s) && !visited.has(s)) {
          hidden.push(s);
          visited.add(s);
        }
      }
      // Recurse to grandchildren
      const grandchildren = getChildren(pid, relationships);
      for (const gc of grandchildren) {
        collectDescendants(gc);
      }
    }
  };

  for (const cid of children) {
    collectDescendants(cid);
  }

  return hidden;
}

/**
 * Toggle parents visibility for a person
 * @param effectiveHidden - The current effective hidden state (accounts for disclosure defaults)
 */
export function toggleParents(
  personId: string,
  perNodeCollapse: Map<string, PerNodeCollapseState>,
  effectiveHidden?: boolean
): Map<string, PerNodeCollapseState> {
  const next = new Map(perNodeCollapse);
  const current = next.get(personId) || { parentsHidden: false, siblingsHidden: false, childrenHidden: false };
  const currentlyHidden = effectiveHidden ?? current.parentsHidden;
  next.set(personId, { ...current, parentsHidden: !currentlyHidden });
  return next;
}

/**
 * Toggle siblings visibility for a person
 * @param effectiveHidden - The current effective hidden state (accounts for disclosure defaults)
 */
export function toggleSiblings(
  personId: string,
  perNodeCollapse: Map<string, PerNodeCollapseState>,
  effectiveHidden?: boolean
): Map<string, PerNodeCollapseState> {
  const next = new Map(perNodeCollapse);
  const current = next.get(personId) || { parentsHidden: false, siblingsHidden: false, childrenHidden: false };
  const currentlyHidden = effectiveHidden ?? current.siblingsHidden;
  next.set(personId, { ...current, siblingsHidden: !currentlyHidden });
  return next;
}

/**
 * Toggle children visibility for a person
 * @param effectiveHidden - The current effective hidden state (accounts for disclosure defaults)
 */
export function toggleChildren(
  personId: string,
  perNodeCollapse: Map<string, PerNodeCollapseState>,
  effectiveHidden?: boolean
): Map<string, PerNodeCollapseState> {
  const next = new Map(perNodeCollapse);
  const current = next.get(personId) || { parentsHidden: false, siblingsHidden: false, childrenHidden: false };
  const currentlyHidden = effectiveHidden ?? current.childrenHidden;
  next.set(personId, { ...current, childrenHidden: !currentlyHidden });
  return next;
}

/**
 * Compute the full set of visible person IDs after applying per-node collapse states.
 * Starts from the default visible set, then:
 * - Removes persons hidden by per-node collapses (collapse)
 * - Adds persons revealed by per-node expansions (expand children/parents/siblings
 *   that weren't in the default visible set)
 */
export function applyPerNodeCollapse(
  baseVisibleIds: Set<string>,
  perNodeCollapse: Map<string, PerNodeCollapseState>,
  treeData: TreeWindowData
): { visiblePersonIds: Set<string>; bubbles: CollapsedBubble[] } {
  const hidden = new Set<string>();
  const expanded = new Set<string>();
  const bubbles: CollapsedBubble[] = [];
  const { relationships } = treeData;

  perNodeCollapse.forEach((state, personId) => {
    // --- Parents ---
    if (state.parentsHidden) {
      const hiddenParents = getHiddenParents(personId, treeData.relationships, baseVisibleIds);
      const filtered = hiddenParents.filter(id => !hidden.has(id));
      filtered.forEach(id => hidden.add(id));
      if (filtered.length > 0) {
        bubbles.push({
          bubbleId: `parents-${personId}`,
          type: 'parents',
          anchorPersonId: personId,
          hiddenPersonIds: filtered,
          count: filtered.length,
          label: 'Parents',
          placement: 'top',
        });
      }
    } else {
      // Expand: if parents exist but aren't in base visible set, add them
      const parents = getParents(personId, relationships);
      const missingParents = parents.filter(p => !baseVisibleIds.has(p));
      if (missingParents.length > 0) {
        for (const pid of missingParents) {
          expanded.add(pid);
          // Also add spouses of revealed parents
          const parentSpouses = getSpouses(pid, relationships);
          parentSpouses.forEach(s => expanded.add(s));
        }
      }
    }

    // --- Siblings ---
    if (state.siblingsHidden) {
      const hiddenSibs = getHiddenSiblings(personId, treeData.relationships, baseVisibleIds);
      const filtered = hiddenSibs.filter(id => !hidden.has(id));
      filtered.forEach(id => hidden.add(id));
      if (filtered.length > 0) {
        bubbles.push({
          bubbleId: `siblings-${personId}`,
          type: 'siblings',
          anchorPersonId: personId,
          hiddenPersonIds: filtered,
          count: filtered.length,
          label: `${filtered.length} Sibling${filtered.length !== 1 ? 's' : ''}`,
          placement: 'side',
        });
      }
    } else {
      // Expand: if siblings exist but aren't in base visible set, add them
      const siblings = getSiblings(personId, relationships);
      const missingSiblings = siblings.filter(s => !baseVisibleIds.has(s));
      if (missingSiblings.length > 0) {
        for (const sid of missingSiblings) {
          expanded.add(sid);
          // Also add spouses of revealed siblings
          const sibSpouses = getSpouses(sid, relationships);
          sibSpouses.forEach(s => expanded.add(s));
        }
      }
    }

    // --- Children ---
    if (state.childrenHidden) {
      const hiddenKids = getHiddenChildren(personId, treeData.relationships, baseVisibleIds);
      const filtered = hiddenKids.filter(id => !hidden.has(id));
      filtered.forEach(id => hidden.add(id));
      if (filtered.length > 0) {
        bubbles.push({
          bubbleId: `children-${personId}`,
          type: 'children',
          anchorPersonId: personId,
          hiddenPersonIds: filtered,
          count: filtered.length,
          label: `${filtered.length} Child${filtered.length !== 1 ? 'ren' : ''}`,
          placement: 'bottom',
        });
      }
    } else {
      // Expand: if children exist but aren't in base visible set, add them
      const children = getChildren(personId, relationships);
      const missingChildren = children.filter(c => !baseVisibleIds.has(c));
      if (missingChildren.length > 0) {
        for (const cid of missingChildren) {
          expanded.add(cid);
          // Also add spouses of revealed children
          const childSpouses = getSpouses(cid, relationships);
          childSpouses.forEach(s => expanded.add(s));
        }
      }
    }
  });

  // Build final visible set: base + expanded - hidden
  const visiblePersonIds = new Set<string>();
  baseVisibleIds.forEach(id => {
    if (!hidden.has(id)) visiblePersonIds.add(id);
  });
  expanded.forEach(id => {
    if (!hidden.has(id)) visiblePersonIds.add(id);
  });

  return { visiblePersonIds, bubbles };
}

/**
 * Get collapse info for a specific person's card (which chevrons to show and their state)
 */
export function getNodeCollapseInfo(
  personId: string,
  treeData: TreeWindowData,
  perNodeCollapse: Map<string, PerNodeCollapseState>,
  disclosureVisibleIds: Set<string>
): NodeCollapseInfo {
  const { relationships } = treeData;
  const state = perNodeCollapse.get(personId);

  const parents = getParents(personId, relationships);
  const siblings = getSiblings(personId, relationships);
  const children = getChildren(personId, relationships);

  // Check if relatives exist but are NOT in the visible set (hidden by default disclosure)
  const parentsNotVisible = parents.length > 0 && parents.every(p => !disclosureVisibleIds.has(p));
  const siblingsNotVisible = siblings.length > 0 && siblings.every(s => !disclosureVisibleIds.has(s));
  const childrenNotVisible = children.length > 0 && children.every(c => !disclosureVisibleIds.has(c));

  // If relatives exist but none are in the visible set, they're hidden by disclosure
  // (user hasn't expanded them yet). Use toggle state, but default to hidden if not in visible set.
  return {
    hasParents: parents.length > 0,
    hasSiblings: siblings.length > 0,
    hasChildren: children.length > 0,
    parentsHidden: parentsNotVisible ? (state?.parentsHidden ?? true) : (state?.parentsHidden ?? false),
    siblingsHidden: siblingsNotVisible ? (state?.siblingsHidden ?? true) : (state?.siblingsHidden ?? false),
    childrenHidden: childrenNotVisible ? (state?.childrenHidden ?? true) : (state?.childrenHidden ?? false),
  };
}

/**
 * Check if a person is an in-law (not a blood relation of the focus person).
 * Simple heuristic: person is in-law if they're a spouse of someone and
 * entered the tree through marriage rather than birth.
 */
export function isInLaw(
  personId: string,
  focusPersonId: string,
  treeData: TreeWindowData
): boolean {
  const { relationships } = treeData;

  // Focus person is never an in-law
  if (personId === focusPersonId) return false;

  // Check if this person has a parent union in the tree
  const parentUnions = getParentUnionIds(personId, relationships);
  const hasParentsInTree = parentUnions.length > 0;

  // Check if this person is a spouse of someone
  const spouses = getSpouses(personId, relationships);
  const isSpouse = spouses.length > 0;

  // In-law: is a spouse but has no parents in the tree
  // (i.e., married into the family, their ancestors aren't shown)
  return isSpouse && !hasParentsInTree;
}

/**
 * Detect the focus person's lineage — ancestors, descendants, and siblings.
 * Unlike detectBloodRelations(), this does NOT count spouses as lineage members,
 * even if they share children with a lineage member.
 *
 * Phase 1 (Upward): Traces through parent unions, adding BOTH parents (they're
 * direct ancestors), then continues upward from each parent.
 *
 * Phase 2 (Downward): From each lineage member, finds their unions' children,
 * adds the children but NOT the other partner in the union.
 *
 * Phase 3 (Sideways): From parent unions found during upward traversal, adds
 * sibling children and traces their descendants too.
 *
 * Result: all people connected by birth/ancestry to the focus person.
 * Anyone NOT in this set who has a PARTNER_IN relationship is a "spouse/in-law".
 */
export function detectFocusLineage(
  focusPersonId: string,
  treeData: TreeWindowData
): Set<string> {
  const { relationships } = treeData;
  const lineage = new Set<string>();
  lineage.add(focusPersonId);

  // Phase 1: Trace ancestors upward
  // Both parents in a parent union are direct ancestors — include them both
  const upQueue = [focusPersonId];
  const visitedUp = new Set<string>();

  while (upQueue.length > 0) {
    const current = upQueue.shift()!;
    if (visitedUp.has(current)) continue;
    visitedUp.add(current);

    const parentUnionIds = getParentUnionIds(current, relationships);
    for (const unionId of parentUnionIds) {
      // Add both parents (direct ancestors)
      const parents = getPartnersInUnion(unionId, relationships);
      for (const parentId of parents) {
        if (!lineage.has(parentId)) {
          lineage.add(parentId);
          upQueue.push(parentId);
        }
      }
      // Add siblings (other children of same parent union)
      const siblingIds = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId && r.toId !== current)
        .map(r => r.toId);
      for (const sibId of siblingIds) {
        lineage.add(sibId);
      }
    }
  }

  // Phase 2: Trace descendants downward from ALL lineage members found so far
  // Add children but NOT the other partner in the union
  const downQueue = [...lineage];
  const visitedDown = new Set<string>();

  while (downQueue.length > 0) {
    const current = downQueue.shift()!;
    if (visitedDown.has(current)) continue;
    visitedDown.add(current);

    const personUnionIds = getPersonUnionIds(current, relationships);
    for (const unionId of personUnionIds) {
      const children = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);
      for (const childId of children) {
        if (!lineage.has(childId)) {
          lineage.add(childId);
          downQueue.push(childId);
        }
      }
    }
  }

  return lineage;
}
