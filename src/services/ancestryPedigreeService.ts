/**
 * Ancestry Pedigree Service
 *
 * Data extraction and layout calculation for the Ancestry-style
 * horizontal pedigree view. Focus person on left, ancestors expand
 * rightward in binary-tree pattern.
 *
 * KEY DESIGN: Compact layout — only allocates vertical space for
 * nodes that actually exist (or are direct-parent placeholders of
 * existing nodes). No wasted space for empty binary-tree slots.
 */

import type { Person, Union, ExtendedRelationship } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface PedigreeAncestorNode {
  person: Person;
  generation: number;      // 0=focus, 1=parents, 2=grands...
  slot: number;            // Binary position (0 to 2^gen - 1)
  parentType: 'father' | 'mother' | null;
}

export interface PedigreeFocusContext {
  focusPerson: Person;
  spouses: Array<{ person: Person; children: Person[] }>;
  siblings: Person[];
  halfSiblings: Person[];
}

export interface MissingAncestorSlot {
  generation: number;
  slot: number;
  parentType: 'father' | 'mother';
  childPersonId: string;
}

export interface ConnectorLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  midX: number;
}

export interface PedigreeLayoutResult {
  focusPosition: { x: number; y: number };
  focusHeight: number;
  ancestorPositions: Map<string, { x: number; y: number; generation: number }>;
  placeholders: Array<MissingAncestorSlot & { x: number; y: number }>;
  connectors: ConnectorLine[];
  bounds: { width: number; height: number; minX: number; minY: number };
}

// ============================================================================
// Layout Constants (responsive)
// ============================================================================

export interface PedigreeLayoutConfig {
  cardWidth: number;
  cardHeight: number;
  focusCardWidth: number;
  columnGap: number;
  verticalGap: number;
  maxGenerations: number;
}

export function getPedigreeLayoutConfig(viewportWidth: number): PedigreeLayoutConfig {
  if (viewportWidth >= 1024) {
    return {
      cardWidth: 220,
      cardHeight: 56,
      focusCardWidth: 280,
      columnGap: 80,
      verticalGap: 20,
      maxGenerations: 20,
    };
  } else if (viewportWidth >= 768) {
    return {
      cardWidth: 180,
      cardHeight: 50,
      focusCardWidth: 240,
      columnGap: 60,
      verticalGap: 16,
      maxGenerations: 20,
    };
  } else {
    return {
      cardWidth: 150,
      cardHeight: 46,
      focusCardWidth: 210,
      columnGap: 40,
      verticalGap: 12,
      maxGenerations: 20,
    };
  }
}

// ============================================================================
// Data Extraction
// ============================================================================

type Rel = Relationship | ExtendedRelationship;

function getPartnersInUnion(unionId: string, relationships: Rel[]): string[] {
  return relationships
    .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
    .map(r => r.fromId);
}

function getChildrenOfUnion(unionId: string, relationships: Rel[]): string[] {
  return relationships
    .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
    .map(r => r.toId);
}

function getParentUnions(personId: string, relationships: Rel[]): string[] {
  return relationships
    .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
    .map(r => r.fromId);
}

function getSpouseUnions(personId: string, relationships: Rel[]): string[] {
  return relationships
    .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map(r => r.toId);
}

export function extractPedigreeData(
  focusPersonId: string,
  persons: Person[],
  _unions: Union[],
  relationships: Rel[],
  maxGen: number = 20
): {
  ancestors: PedigreeAncestorNode[];
  focusContext: PedigreeFocusContext;
  missingSlots: MissingAncestorSlot[];
} {
  const personMap = new Map(persons.map(p => [p.personId, p]));
  const focusPerson = personMap.get(focusPersonId);
  if (!focusPerson) {
    return {
      ancestors: [],
      focusContext: {
        focusPerson: persons[0] || ({} as Person),
        spouses: [],
        siblings: [],
        halfSiblings: [],
      },
      missingSlots: [],
    };
  }

  const ancestors: PedigreeAncestorNode[] = [];
  const missingSlots: MissingAncestorSlot[] = [];

  type QueueItem = {
    personId: string;
    generation: number;
    slot: number;
    parentType: 'father' | 'mother' | null;
  };

  const queue: QueueItem[] = [
    { personId: focusPersonId, generation: 0, slot: 0, parentType: null },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.personId)) continue;
    visited.add(item.personId);

    const person = personMap.get(item.personId);
    if (!person) continue;

    ancestors.push({
      person,
      generation: item.generation,
      slot: item.slot,
      parentType: item.parentType,
    });

    if (item.generation >= maxGen - 1) continue;

    const parentUnionIds = getParentUnions(item.personId, relationships);

    let foundFather = false;
    let foundMother = false;

    for (const unionId of parentUnionIds) {
      const partnerIds = getPartnersInUnion(unionId, relationships);
      for (const pid of partnerIds) {
        const parent = personMap.get(pid);
        if (!parent || visited.has(pid)) continue;

        const isFather = parent.gender === 'male';
        const isMother = parent.gender === 'female';

        if (isFather && !foundFather) {
          foundFather = true;
          queue.push({
            personId: pid,
            generation: item.generation + 1,
            slot: item.slot * 2,
            parentType: 'father',
          });
        } else if (isMother && !foundMother) {
          foundMother = true;
          queue.push({
            personId: pid,
            generation: item.generation + 1,
            slot: item.slot * 2 + 1,
            parentType: 'mother',
          });
        } else if (!foundFather) {
          foundFather = true;
          queue.push({
            personId: pid,
            generation: item.generation + 1,
            slot: item.slot * 2,
            parentType: 'father',
          });
        } else if (!foundMother) {
          foundMother = true;
          queue.push({
            personId: pid,
            generation: item.generation + 1,
            slot: item.slot * 2 + 1,
            parentType: 'mother',
          });
        }
      }
    }

    // Only add placeholders for direct parents of existing people
    if (!foundFather) {
      missingSlots.push({
        generation: item.generation + 1,
        slot: item.slot * 2,
        parentType: 'father',
        childPersonId: item.personId,
      });
    }
    if (!foundMother) {
      missingSlots.push({
        generation: item.generation + 1,
        slot: item.slot * 2 + 1,
        parentType: 'mother',
        childPersonId: item.personId,
      });
    }
  }

  // Build focus context
  const spouseUnionIds = getSpouseUnions(focusPersonId, relationships);
  const spouses: PedigreeFocusContext['spouses'] = [];

  for (const unionId of spouseUnionIds) {
    const partnerIds = getPartnersInUnion(unionId, relationships);
    const spouseId = partnerIds.find(id => id !== focusPersonId);
    const spouse = spouseId ? personMap.get(spouseId) : undefined;
    const childIds = getChildrenOfUnion(unionId, relationships);
    const children = childIds.map(id => personMap.get(id)).filter(Boolean) as Person[];

    if (spouse) {
      spouses.push({ person: spouse, children });
    } else if (children.length > 0) {
      spouses.push({ person: { personId: 'single', firstName: 'Unknown', lastName: '' } as Person, children });
    }
  }

  const focusParentUnions = getParentUnions(focusPersonId, relationships);
  const allSiblingIds = new Set<string>();
  const halfSiblingIds = new Set<string>();

  for (const unionId of focusParentUnions) {
    const childIds = getChildrenOfUnion(unionId, relationships);
    for (const cid of childIds) {
      if (cid !== focusPersonId) allSiblingIds.add(cid);
    }
  }

  for (const unionId of focusParentUnions) {
    const partnerIds = getPartnersInUnion(unionId, relationships);
    for (const parentId of partnerIds) {
      const parentUnions = getSpouseUnions(parentId, relationships);
      for (const otherUnionId of parentUnions) {
        if (focusParentUnions.includes(otherUnionId)) continue;
        const childIds = getChildrenOfUnion(otherUnionId, relationships);
        for (const cid of childIds) {
          if (cid !== focusPersonId && !allSiblingIds.has(cid)) {
            halfSiblingIds.add(cid);
          }
        }
      }
    }
  }

  return {
    ancestors,
    focusContext: {
      focusPerson,
      spouses,
      siblings: Array.from(allSiblingIds).map(id => personMap.get(id)).filter(Boolean) as Person[],
      halfSiblings: Array.from(halfSiblingIds).map(id => personMap.get(id)).filter(Boolean) as Person[],
    },
    missingSlots,
  };
}

// ============================================================================
// Compact Layout Calculation
// ============================================================================

export function estimateFocusCardHeight(ctx: PedigreeFocusContext): number {
  let h = 64; // header
  if (ctx.spouses.length > 0) {
    h += 28; // section header
    for (const sg of ctx.spouses) {
      if (sg.person.personId !== 'single') h += 24;
      h += sg.children.length * 22;
    }
  }
  if (ctx.siblings.length > 0 || ctx.halfSiblings.length > 0) {
    h += 28; // section header (collapsed by default, so minimal)
  }
  h += 36; // add relative button
  return Math.max(h, 120);
}

/**
 * Compact layout: recursively position each node's parents relative to it.
 * Father goes above, mother below, each pair centered around their child's Y.
 */
export function calculateAncestryPedigreeLayout(
  ancestors: PedigreeAncestorNode[],
  missingSlots: MissingAncestorSlot[],
  focusContext: PedigreeFocusContext,
  config: PedigreeLayoutConfig
): PedigreeLayoutResult {
  const { cardWidth, cardHeight, focusCardWidth, columnGap, verticalGap } = config;

  const focusHeight = estimateFocusCardHeight(focusContext);

  // Build lookup: slot key -> ancestor node or placeholder
  const nodeBySlot = new Map<string, PedigreeAncestorNode>();
  for (const a of ancestors) {
    nodeBySlot.set(`${a.generation}-${a.slot}`, a);
  }
  const placeholderBySlot = new Map<string, MissingAncestorSlot>();
  for (const m of missingSlots) {
    placeholderBySlot.set(`${m.generation}-${m.slot}`, m);
  }

  // X position for each generation
  function genX(gen: number): number {
    if (gen === 0) return 40;
    return 40 + focusCardWidth + columnGap + (gen - 1) * (cardWidth + columnGap);
  }

  // Recursive: compute the Y extent needed for a subtree rooted at (gen, slot)
  // Returns the height needed for this subtree
  function subtreeHeight(gen: number, slot: number): number {
    const fatherSlot = slot * 2;
    const motherSlot = slot * 2 + 1;
    const fatherKey = `${gen + 1}-${fatherSlot}`;
    const motherKey = `${gen + 1}-${motherSlot}`;

    const hasFather = nodeBySlot.has(fatherKey) || placeholderBySlot.has(fatherKey);
    const hasMother = nodeBySlot.has(motherKey) || placeholderBySlot.has(motherKey);

    if (!hasFather && !hasMother) {
      return cardHeight;
    }

    const fatherH = hasFather ? subtreeHeight(gen + 1, fatherSlot) : cardHeight;
    const motherH = hasMother ? subtreeHeight(gen + 1, motherSlot) : cardHeight;

    return fatherH + verticalGap + motherH;
  }

  // Recursive: assign Y positions to all nodes in a subtree
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(gen: number, slot: number, topY: number, availableHeight: number) {
    const key = `${gen}-${slot}`;
    const x = genX(gen);
    const centerY = topY + availableHeight / 2 - cardHeight / 2;
    positions.set(key, { x, y: centerY });

    const fatherSlot = slot * 2;
    const motherSlot = slot * 2 + 1;
    const fatherKey = `${gen + 1}-${fatherSlot}`;
    const motherKey = `${gen + 1}-${motherSlot}`;

    const hasFather = nodeBySlot.has(fatherKey) || placeholderBySlot.has(fatherKey);
    const hasMother = nodeBySlot.has(motherKey) || placeholderBySlot.has(motherKey);

    if (!hasFather && !hasMother) return;

    const fatherH = hasFather ? subtreeHeight(gen + 1, fatherSlot) : cardHeight;
    const motherH = hasMother ? subtreeHeight(gen + 1, motherSlot) : cardHeight;
    const totalChildH = fatherH + verticalGap + motherH;

    // Center children around the parent's center
    const childrenTop = centerY + cardHeight / 2 - totalChildH / 2;

    if (hasFather) {
      layoutSubtree(gen + 1, fatherSlot, childrenTop, fatherH);
    }
    if (hasMother) {
      layoutSubtree(gen + 1, motherSlot, childrenTop + fatherH + verticalGap, motherH);
    }
  }

  // Compute total tree height from root
  const rootHeight = subtreeHeight(0, 0);
  const totalHeight = Math.max(rootHeight, focusHeight + 40);

  // Layout the tree
  layoutSubtree(0, 0, (totalHeight - rootHeight) / 2, rootHeight);

  // Extract positions
  const ancestorPositions = new Map<string, { x: number; y: number; generation: number }>();
  const focusPos = positions.get('0-0') || { x: 40, y: totalHeight / 2 - focusHeight / 2 };

  for (const node of ancestors) {
    if (node.generation === 0) continue;
    const key = `${node.generation}-${node.slot}`;
    const pos = positions.get(key);
    if (pos) {
      ancestorPositions.set(node.person.personId, { ...pos, generation: node.generation });
    }
  }

  const placeholders = missingSlots.map(slot => {
    const key = `${slot.generation}-${slot.slot}`;
    const pos = positions.get(key) || { x: genX(slot.generation), y: totalHeight / 2 };
    return { ...slot, x: pos.x, y: pos.y };
  });

  // Connectors
  const connectors: ConnectorLine[] = [];

  function addConnector(childGen: number, childSlot: number, parentGen: number, parentSlot: number) {
    let childRightEdge: number;
    let childCenterY: number;

    if (childGen === 0) {
      childRightEdge = focusPos.x + focusCardWidth;
      childCenterY = focusPos.y + focusHeight / 2;
    } else {
      const childKey = `${childGen}-${childSlot}`;
      const childPos = positions.get(childKey);
      if (!childPos) return;
      childRightEdge = childPos.x + cardWidth;
      childCenterY = childPos.y + cardHeight / 2;
    }

    const parentKey = `${parentGen}-${parentSlot}`;
    const parentPos = positions.get(parentKey);
    if (!parentPos) return;

    const parentLeftEdge = parentPos.x;
    const parentCenterY = parentPos.y + cardHeight / 2;
    const midX = (childRightEdge + parentLeftEdge) / 2;

    connectors.push({
      fromX: childRightEdge,
      fromY: childCenterY,
      toX: parentLeftEdge,
      toY: parentCenterY,
      midX,
    });
  }

  for (const node of ancestors) {
    if (node.generation === 0) continue;
    addConnector(node.generation - 1, Math.floor(node.slot / 2), node.generation, node.slot);
  }

  for (const ph of placeholders) {
    addConnector(ph.generation - 1, Math.floor(ph.slot / 2), ph.generation, ph.slot);
  }

  // Bounds
  const maxGenPresent = Math.max(
    ...ancestors.map(a => a.generation),
    ...missingSlots.map(m => m.generation),
    1
  );
  const boundsWidth = genX(maxGenPresent) + cardWidth + 80;
  const boundsHeight = totalHeight + 40;

  return {
    focusPosition: { x: focusPos.x, y: focusPos.y },
    focusHeight,
    ancestorPositions,
    placeholders,
    connectors,
    bounds: {
      width: boundsWidth,
      height: boundsHeight,
      minX: 0,
      minY: 0,
    },
  };
}
