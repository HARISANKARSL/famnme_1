/**
 * Strategy A: Full Tree Layout — Ancestry-style Union-Block Recursive
 *
 * Algorithm:
 *   1. Build spouse groups (atomic rigid bodies)
 *   2. From focus person, split into father's side (LEFT) and mother's side (RIGHT)
 *   3. Recursive union-block layout: each union lays out its children,
 *      each child recursively lays out its own unions below
 *   4. Width bubbles up — parent centered above children's total width
 *   5. No global balancing — only local composition
 *
 * Key rules:
 *   - Father's family → LEFT of focus person
 *   - Mother's family → RIGHT of focus person
 *   - Within a sibling ribbon: eldest LEFT, youngest RIGHT
 *   - Bridge couple (focus person's parents) sits at the junction
 *   - Each union block is independent — composed, not globally balanced
 */

import type { Person, Union } from '@/types';
import type { Relationship } from '../types';
import type { FamilyUnit, LayoutConfig, LayoutStrategy, Position } from '../types';

interface SpouseGroup {
  id: string;
  personIds: string[];
  width: number;
  x: number;
  gen: number;
}

export class FullTreeStrategy implements LayoutStrategy {
  calculate(
    _familyUnits: FamilyUnit[],
    generations: Map<string, number>,
    persons: Person[],
    unions: Union[],
    relationships: Relationship[],
    config: LayoutConfig,
    injectedHomePersonId?: string
  ): Map<string, Position> {
    const positions = new Map<string, Position>();
    const personMap = new Map(persons.map(p => [p.personId, p]));
    if (persons.length === 0) return positions;

    // ── Relationship lookups ──
    const unionPartners = new Map<string, string[]>();
    const unionChildren = new Map<string, string[]>();
    const childToParentUnion = new Map<string, string>();
    const personToPartnerUnions = new Map<string, string[]>();

    for (const rel of relationships) {
      if (rel.type === 'PARTNER_IN') {
        const list = unionPartners.get(rel.toId) ?? [];
        if (!list.includes(rel.fromId)) list.push(rel.fromId);
        unionPartners.set(rel.toId, list);
        const pU = personToPartnerUnions.get(rel.fromId) ?? [];
        if (!pU.includes(rel.toId)) pU.push(rel.toId);
        personToPartnerUnions.set(rel.fromId, pU);
      } else if (rel.type === 'HAS_CHILD') {
        const list = unionChildren.get(rel.fromId) ?? [];
        if (!list.includes(rel.toId)) list.push(rel.toId);
        unionChildren.set(rel.fromId, list);
        childToParentUnion.set(rel.toId, rel.fromId);
      }
    }

    // Spouse map
    const spouseMap = new Map<string, Set<string>>();
    for (const [, partners] of unionPartners) {
      for (let i = 0; i < partners.length; i++) {
        for (let j = i + 1; j < partners.length; j++) {
          if (!spouseMap.has(partners[i])) spouseMap.set(partners[i], new Set());
          if (!spouseMap.has(partners[j])) spouseMap.set(partners[j], new Set());
          spouseMap.get(partners[i])!.add(partners[j]);
          spouseMap.get(partners[j])!.add(partners[i]);
        }
      }
    }

    // ── Generation basics (Y-map computed after genPersons, to allow dynamic gaps) ──
    const genValues = [...new Set(generations.values())];
    const _minGen = Math.min(...genValues);
    const _maxGen = Math.max(...genValues);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Build spouse groups
    // ═══════════════════════════════════════════════════════════════════

    const genPersons = new Map<number, Person[]>();
    for (const person of persons) {
      const gen = generations.get(person.personId);
      if (gen !== undefined) {
        const list = genPersons.get(gen) ?? [];
        list.push(person);
        genPersons.set(gen, list);
      }
    }

    const allGroups: SpouseGroup[] = [];
    const personToGroup = new Map<string, SpouseGroup>();

    for (const [gen, personsInRow] of genPersons) {
      const processed = new Set<string>();

      // Couples first
      const hubCandidates = personsInRow
        .filter(p => !processed.has(p.personId))
        .map(p => {
          const spouses = spouseMap.get(p.personId);
          const sameGen = spouses
            ? [...spouses].filter(sid => generations.get(sid) === gen && !processed.has(sid))
            : [];
          return { person: p, sameGenSpouses: sameGen };
        })
        .filter(h => h.sameGenSpouses.length > 0)
        .sort((a, b) => b.sameGenSpouses.length - a.sameGenSpouses.length);

      for (const { person, sameGenSpouses } of hubCandidates) {
        if (processed.has(person.personId)) continue;
        const availableSpouses = sameGenSpouses.filter(sid => !processed.has(sid));
        if (availableSpouses.length === 0) continue;

        if (availableSpouses.length >= 2) {
          const spousePersons = availableSpouses.map(id => personMap.get(id)!).filter(Boolean);
          const half = Math.floor(spousePersons.length / 2);
          const ids = [
            ...spousePersons.slice(0, half).map(p => p.personId),
            person.personId,
            ...spousePersons.slice(half).map(p => p.personId),
          ];
          const width = ids.length * config.personWidth + (ids.length - 1) * config.spouseGap;
          const group: SpouseGroup = { id: `g_${person.personId}`, personIds: ids, width, x: 0, gen };
          allGroups.push(group);
          ids.forEach(id => { processed.add(id); personToGroup.set(id, group); });
        } else {
          // Single spouse: MALE on LEFT, FEMALE on RIGHT (Ancestry convention)
          // When gender is empty, infer from name patterns
          const inferGender = (p: Person): string => {
            if (p.gender === 'male' || p.gender === 'female') return p.gender;
            const name = (p.firstName + ' ' + p.lastName).toLowerCase();
            // Common Indian female name endings
            if (/amma|kumari|devi|lakshmi|mani|mini|geetha|rema|girija|anjali|rohini|anitha|gayathri|akhila|ponnamma|meenamma|biji|jeevani/i.test(name)) return 'female';
            // Common Indian male indicators
            if (/nair$|pillai$|kumar|das|an$|sh$|krishna|mohan|gopal|ram|ravi|vikram|sathee|ani /i.test(name)) return 'male';
            return '';
          };
          const allIds = [person.personId, availableSpouses[0]];
          const ordered = allIds.map(id => personMap.get(id)!).filter(Boolean)
            .sort((a, b) => {
              const gA = inferGender(a);
              const gB = inferGender(b);
              if (gA === 'male' && gB !== 'male') return -1;
              if (gB === 'male' && gA !== 'male') return 1;
              return 0;
            });
          const ids = ordered.map(p => p.personId);
          const width = ids.length * config.personWidth + (ids.length - 1) * config.spouseGap;
          const group: SpouseGroup = { id: `g_${ids[0]}`, personIds: ids, width, x: 0, gen };
          allGroups.push(group);
          ids.forEach(id => { processed.add(id); personToGroup.set(id, group); });
        }
      }

      // Solo persons
      for (const person of personsInRow) {
        if (processed.has(person.personId)) continue;
        processed.add(person.personId);
        const group: SpouseGroup = {
          id: `g_${person.personId}`, personIds: [person.personId],
          width: config.personWidth, x: 0, gen,
        };
        allGroups.push(group);
        personToGroup.set(person.personId, group);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: Recursive union-block layout
    //
    // Core idea: layout each "family cluster" (a union + its children)
    // as an independent block, then compose the blocks.
    //
    // For the focus person's generation:
    //   [Father's siblings...] [Father+Mother] [Mother's siblings...]
    // Each sibling's own children are laid out recursively below them.
    // ═══════════════════════════════════════════════════════════════════

    const homePerson = persons.find(p => p.isHomePerson);
    const homePersonId = injectedHomePersonId || homePerson?.personId || '';

    // Helper: get all children groups for a union, sorted by birth order
    const getChildGroups = (unionId: string): SpouseGroup[] => {
      const childIds = unionChildren.get(unionId) ?? [];
      const groups: SpouseGroup[] = [];
      const seen = new Set<string>();
      for (const cid of childIds) {
        const g = personToGroup.get(cid);
        if (g && !seen.has(g.id)) { seen.add(g.id); groups.push(g); }
      }
      return groups;
    };

    // Helper: find parent union of a person
    const getParentUnion = (personId: string): string | undefined => childToParentUnion.get(personId);

    // Helper: find the partner in a union who is NOT the given person
    const _getPartner = (personId: string, unionId: string): string | undefined => {
      const partners = unionPartners.get(unionId) ?? [];
      return partners.find(p => p !== personId);
    };

    // Helper: get siblings of a person (other children of the same parent union)
    const _getSiblingGroups = (personId: string): SpouseGroup[] => {
      const parentUid = getParentUnion(personId);
      if (!parentUid) return [];
      const childGroups = getChildGroups(parentUid);
      return childGroups;
    };

    // ── Recursive width calculation ──
    // Each group's "subtree width" = max(own width, sum of children subtree widths + gaps)
    const subtreeWidths = new Map<string, number>();
    const computed = new Set<string>();
    // O(1) group lookup instead of O(n) .find() per recursive call
    const groupById = new Map(allGroups.map(g => [g.id, g]));

    const computeSubtreeWidth = (groupId: string, depth: number): number => {
      if (computed.has(groupId) || depth > 10) return subtreeWidths.get(groupId) ?? config.personWidth;
      computed.add(groupId);

      const group = groupById.get(groupId);
      if (!group) return config.personWidth;

      // Find all children of this group's persons
      const childGroups: SpouseGroup[] = [];
      const seenChildren = new Set<string>();
      for (const pid of group.personIds) {
        const partnerUnions = personToPartnerUnions.get(pid) ?? [];
        for (const uid of partnerUnions) {
          for (const cid of unionChildren.get(uid) ?? []) {
            const cg = personToGroup.get(cid);
            if (cg && !seenChildren.has(cg.id)) {
              seenChildren.add(cg.id);
              childGroups.push(cg);
            }
          }
        }
      }

      if (childGroups.length === 0) {
        subtreeWidths.set(groupId, group.width);
        return group.width;
      }

      let totalChildWidth = 0;
      for (let i = 0; i < childGroups.length; i++) {
        totalChildWidth += computeSubtreeWidth(childGroups[i].id, depth + 1);
        if (i < childGroups.length - 1) totalChildWidth += config.nodeSpacing;
      }

      const width = Math.max(group.width, totalChildWidth);
      subtreeWidths.set(groupId, width);
      return width;
    };

    // Compute all subtree widths
    for (const g of allGroups) computeSubtreeWidth(g.id, 0);

    // ═══════════════════════════════════════════════════════════════════
    // DYNAMIC GENERATION GAPS
    //
    // Count how many unions in each generation have children in the next
    // generation. More branches = wider gap needed so bracket lines
    // can stagger vertically without overlapping.
    // ═══════════════════════════════════════════════════════════════════

    const sortedGensForGap = [...genPersons.keys()].sort((a, b) => a - b);
    const dynamicGaps = new Map<number, number>();
    const homeGen = homePersonId ? generations.get(homePersonId) : undefined;

    for (let i = 0; i < sortedGensForGap.length - 1; i++) {
      const parentGen = sortedGensForGap[i];
      const childGen = sortedGensForGap[i + 1];

      // Count distinct unions in parentGen that have at least one child in childGen
      let branchCount = 0;
      const counted = new Set<string>();

      for (const person of genPersons.get(parentGen) ?? []) {
        const pUnions = personToPartnerUnions.get(person.personId) ?? [];
        for (const uid of pUnions) {
          if (counted.has(uid)) continue;
          const children = unionChildren.get(uid) ?? [];
          const hasChildInNextGen = children.some(cid => generations.get(cid) === childGen);
          if (hasChildInNextGen) {
            branchCount++;
            counted.add(uid);
          }
        }
      }

      // Gap = max(baseline, space needed for stacked brackets)
      // Each bracket needs vertical offset for clear separation
      // Plus corner arcs (2 × 14px) and clearance (24px)
      // Larger stagger ensures cross-marriage brackets don't visually overlap
      const STAGGER = 40;
      const CORNER = 14;
      const CLEARANCE = 24;
      
      let requiredGap;
      if (homeGen !== undefined && parentGen < homeGen) {
        // Ancestor generations: use a tighter, fixed gap to reduce vertical space (e.g. 55% of standard gap)
        requiredGap = Math.round(config.generationGap * 0.55);
      } else {
        requiredGap = Math.max(
          config.generationGap,
          branchCount * STAGGER + 2 * CORNER + CLEARANCE
        );
      }

      dynamicGaps.set(parentGen, requiredGap);
    }

    // Build genYMap with variable gaps per generation
    const genYMap = new Map<number, number>();
    let currentGenY = config.canvasPadding;
    for (const gen of sortedGensForGap) {
      genYMap.set(gen, currentGenY);
      const gap = dynamicGaps.get(gen) ?? config.generationGap;
      currentGenY += config.personHeight + gap;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECURSIVE SIDE ASSIGNMENT
    //
    // From home person, trace UP through father's lineage → mark ALL
    // connected persons as 'left' (paternal). Trace UP through mother's
    // lineage → mark ALL as 'right' (maternal). Home person + siblings
    // + children = 'center'.
    //
    // Then collect all persons into: leftGroups, bridgeGroup, rightGroups
    // and place them: [LEFT] [BRIDGE] [RIGHT]
    // ═══════════════════════════════════════════════════════════════════

    const personSide = new Map<string, 'left' | 'right' | 'center'>();
    const placedGroups = new Set<string>();

    const homeParentUnion = homePersonId ? getParentUnion(homePersonId) : undefined;
    let fatherId: string | undefined;
    let motherId: string | undefined;

    if (homeParentUnion) {
      const partners = unionPartners.get(homeParentUnion) ?? [];
      if (partners.length >= 2) {
        const p0 = personMap.get(partners[0]);
        const p1 = personMap.get(partners[1]);
        if (p0 && p1) {
          fatherId = (p0.gender === 'male' ? p0 : p1).personId;
          motherId = (p0.gender === 'male' ? p1 : p0).personId;
        }
      }
    }

    // Mark home person and siblings as center
    if (homePersonId) personSide.set(homePersonId, 'center');
    // Home person's siblings
    if (homeParentUnion) {
      for (const cid of unionChildren.get(homeParentUnion) ?? []) {
        personSide.set(cid, 'center');
        // Their spouses too
        const sp = spouseMap.get(cid);
        if (sp) for (const sid of sp) personSide.set(sid, 'center');
      }
    }
    // Home person's children
    if (homePersonId) {
      const homeUnions = personToPartnerUnions.get(homePersonId) ?? [];
      for (const uid of homeUnions) {
        for (const cid of unionChildren.get(uid) ?? []) {
          personSide.set(cid, 'center');
          const sp = spouseMap.get(cid);
          if (sp) for (const sid of sp) personSide.set(sid, 'center');
        }
      }
    }

    // Recursive function: mark a person and ALL their ancestors + ancestor's
    // descendants + their spouses as a given side
    const markSide = (personId: string, side: 'left' | 'right') => {
      const queue = [personId];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const pid = queue.shift()!;
        if (visited.has(pid)) continue;
        visited.add(pid);

        // Mark this person
        if (!personSide.has(pid)) personSide.set(pid, side);

        // Mark their spouse(s)
        const sp = spouseMap.get(pid);
        if (sp) {
          for (const sid of sp) {
            if (!personSide.has(sid)) personSide.set(sid, side);
          }
        }

        // Mark their children (through ALL their unions)
        const pUnions = personToPartnerUnions.get(pid) ?? [];
        for (const uid of pUnions) {
          for (const cid of unionChildren.get(uid) ?? []) {
            if (!visited.has(cid) && !personSide.has(cid)) {
              personSide.set(cid, side);
              // Also mark child's spouse
              const csp = spouseMap.get(cid);
              if (csp) for (const csid of csp) {
                if (!personSide.has(csid)) personSide.set(csid, side);
              }
              queue.push(cid);
            }
          }
        }

        // Go UP: mark parents AND this person's own siblings
        const parentUid = childToParentUnion.get(pid);
        if (parentUid) {
          // Add parent partners to queue
          const parentPartners = unionPartners.get(parentUid) ?? [];
          for (const ppid of parentPartners) {
            if (!visited.has(ppid)) queue.push(ppid);
          }

          // Add this person's OWN siblings (other children of same parent union)
          for (const sibId of unionChildren.get(parentUid) ?? []) {
            if (!visited.has(sibId) && !personSide.has(sibId)) {
              queue.push(sibId);
            }
          }

          // Mark parent's siblings (other children of same grandparent union)
          for (const ppid of parentPartners) {
            const gpUid = childToParentUnion.get(ppid);
            if (gpUid) {
              for (const sibId of unionChildren.get(gpUid) ?? []) {
                if (!visited.has(sibId) && !personSide.has(sibId)) {
                  queue.push(sibId);
                }
              }
            }
          }
        }
      }
    };

    // Mark father's entire lineage as LEFT, mother's as RIGHT
    if (fatherId) markSide(fatherId, 'left');
    if (motherId) markSide(motherId, 'right');

    // ── Collect groups by side ──
    const getGroupSide = (group: SpouseGroup): 'left' | 'right' | 'center' | 'unknown' => {
      for (const pid of group.personIds) {
        const side = personSide.get(pid);
        if (side) return side;
      }
      return 'unknown';
    };

    // ── Placement helpers ──
    const placeGroup = (group: SpouseGroup, x: number) => {
      if (placedGroups.has(group.id)) return;
      placedGroups.add(group.id);
      const stw = subtreeWidths.get(group.id) ?? group.width;
      group.x = x + (stw - group.width) / 2;
    };

    const placeChildrenOf = (parentGroup: SpouseGroup) => {
      const childGroups: SpouseGroup[] = [];
      const seen = new Set<string>();
      for (const pid of parentGroup.personIds) {
        const pUnions = personToPartnerUnions.get(pid) ?? [];
        for (const uid of pUnions) {
          for (const cid of unionChildren.get(uid) ?? []) {
            const cg = personToGroup.get(cid);
            if (cg && !seen.has(cg.id)) { seen.add(cg.id); childGroups.push(cg); }
          }
        }
      }
      if (childGroups.length === 0) return;

      let totalChildW = 0;
      for (let i = 0; i < childGroups.length; i++) {
        totalChildW += subtreeWidths.get(childGroups[i].id) ?? childGroups[i].width;
        if (i < childGroups.length - 1) totalChildW += config.nodeSpacing;
      }

      const parentCenter = parentGroup.x + parentGroup.width / 2;
      let cx = parentCenter - totalChildW / 2;

      for (const cg of childGroups) {
        const childStw = subtreeWidths.get(cg.id) ?? cg.width;
        placeGroup(cg, cx);
        placeChildrenOf(cg);
        cx += childStw + config.nodeSpacing;
      }
    };

    // ── Build parent-gen ribbon with side-aware ordering ──
    // Collect ALL groups in the parents' generation, split by side
    const parentGen = homeGen !== undefined ? homeGen - 1 : undefined;

    // Get the bridge group (father's couple group)
    const bridgeGroup = fatherId ? personToGroup.get(fatherId) : undefined;

    if (parentGen !== undefined) {
      const parentGenGroups = this.getRowGroups(parentGen, genPersons, personToGroup);

      const leftGroups = parentGenGroups.filter(g => getGroupSide(g) === 'left' && g !== bridgeGroup);
      const rightGroups = parentGenGroups.filter(g => getGroupSide(g) === 'right' && g !== bridgeGroup);
      const centerGroups = parentGenGroups.filter(g => g === bridgeGroup);
      const unknownGroups = parentGenGroups.filter(g => getGroupSide(g) === 'unknown' && g !== bridgeGroup);

      // Reverse left groups so eldest are closest to bridge (Ancestry convention)
      leftGroups.reverse();

      // Build ribbon: [LEFT reversed] [BRIDGE] [RIGHT] [UNKNOWN]
      const ribbon = [...leftGroups, ...centerGroups, ...rightGroups, ...unknownGroups];

      const ISOLATION_GAP = Math.round(config.personWidth * 1.4);
      let x = config.canvasPadding;

      for (let i = 0; i < ribbon.length; i++) {
        const group = ribbon[i];
        const stw = subtreeWidths.get(group.id) ?? group.width;

        if (i > 0) {
          if (group === bridgeGroup) {
            x += ISOLATION_GAP;
          } else if (ribbon[i - 1] === bridgeGroup) {
            x += config.nodeSpacing;
          } else {
            x += config.nodeSpacing;
          }
        }

        placeGroup(group, x);
        placeChildrenOf(group);
        x += stw;
      }

      // ── Compute ancestor union centers for the root person ──
      const ancestorUnionCenters = new Map<string, number>();
      const ancestorSubtreeWidths = new Map<string, number>();

      const computeAncestorSubtreeWidth = (uid: string): number => {
        if (ancestorSubtreeWidths.has(uid)) return ancestorSubtreeWidths.get(uid)!;

        const partners = unionPartners.get(uid) ?? [];
        if (partners.length === 0) return 0;

        const group = personToGroup.get(partners[0]);
        const groupWidth = group ? group.width : config.personWidth;

        const parentUnions: string[] = [];
        for (const pid of partners) {
          const pUid = childToParentUnion.get(pid);
          if (pUid) {
            const pPartners = unionPartners.get(pUid) ?? [];
            const hasVisiblePartner = pPartners.some(ppid => personMap.has(ppid));
            if (hasVisiblePartner) {
              parentUnions.push(pUid);
            }
          }
        }

        if (parentUnions.length === 0) {
          ancestorSubtreeWidths.set(uid, groupWidth);
          return groupWidth;
        }

        let totalParentSubtreeWidth = 0;
        for (let i = 0; i < parentUnions.length; i++) {
          totalParentSubtreeWidth += computeAncestorSubtreeWidth(parentUnions[i]);
          if (i < parentUnions.length - 1) {
            totalParentSubtreeWidth += config.nodeSpacing;
          }
        }

        const width = Math.max(groupWidth, totalParentSubtreeWidth);
        ancestorSubtreeWidths.set(uid, width);
        return width;
      };

      const assignAncestorCenters = (uid: string, center: number, depth: number) => {
        ancestorUnionCenters.set(uid, center);
        const partners = unionPartners.get(uid) ?? [];

        const parentUnions: { pUid: string; partnerId: string }[] = [];
        for (const pid of partners) {
          const pUid = childToParentUnion.get(pid);
          if (pUid) {
            const pPartners = unionPartners.get(pUid) ?? [];
            const hasVisiblePartner = pPartners.some(ppid => personMap.has(ppid));
            if (hasVisiblePartner) {
              parentUnions.push({ pUid, partnerId: pid });
            }
          }
        }

        if (parentUnions.length === 2) {
          const uid0 = parentUnions[0].pUid;
          const uid1 = parentUnions[1].pUid;
          const w0 = computeAncestorSubtreeWidth(uid0);
          const w1 = computeAncestorSubtreeWidth(uid1);

          const group = personToGroup.get(partners[0]);
          let idx0 = 0;
          let idx1 = 1;
          if (group) {
            idx0 = group.personIds.indexOf(parentUnions[0].partnerId);
            idx1 = group.personIds.indexOf(parentUnions[1].partnerId);
          }

          const centerOffset = (w0 + w1 + config.nodeSpacing) / 2;
          const c0 = center - centerOffset + w0 / 2;
          const c1 = center + centerOffset - w1 / 2;

          if (idx0 <= idx1) {
            assignAncestorCenters(uid0, c0, depth + 1);
            assignAncestorCenters(uid1, c1, depth + 1);
          } else {
            assignAncestorCenters(uid0, c1, depth + 1);
            assignAncestorCenters(uid1, c0, depth + 1);
          }
        } else if (parentUnions.length === 1) {
          assignAncestorCenters(parentUnions[0].pUid, center, depth + 1);
        }
      };

      // Fallback for when descendants are collapsed (home person is hidden)
      console.log('[Layout] placedGroups.size:', placedGroups.size, 'allGroups.length:', allGroups.length, 'homePersonId:', homePersonId);
      if (placedGroups.size === 0 && allGroups.length > 0) {
        let maxGen = -Infinity;
        let bottomGroup: SpouseGroup | undefined;
        for (const g of allGroups) {
          if (g.gen > maxGen) {
            maxGen = g.gen;
            bottomGroup = g;
          } else if (g.gen === maxGen && bottomGroup) {
            const hasParents = g.personIds.some(pid => childToParentUnion.has(pid));
            const prevHasParents = bottomGroup.personIds.some(pid => childToParentUnion.has(pid));
            if (hasParents && !prevHasParents) {
              bottomGroup = g;
            }
          }
        }

        console.log('[Layout] bottomGroup found:', bottomGroup?.id, 'personIds:', bottomGroup?.personIds);
        if (bottomGroup) {
          bottomGroup.x = config.canvasPadding;
          placedGroups.add(bottomGroup.id);
          placeChildrenOf(bottomGroup);
          
          const pUnions = personToPartnerUnions.get(bottomGroup.personIds[0]) ?? [];
          console.log('[Layout] bottomGroup pUnions:', pUnions);
          if (pUnions.length > 0) {
            assignAncestorCenters(pUnions[0], bottomGroup.x + bottomGroup.width / 2, 1);
          }
        }
      }

      if (homePersonId && homeParentUnion) {
        const homeParentPartners = unionPartners.get(homeParentUnion) ?? [];
        const homeParentGroup = homeParentPartners.length > 0 ? personToGroup.get(homeParentPartners[0]) : undefined;
        
        if (homeParentGroup && placedGroups.has(homeParentGroup.id)) {
          const homeParentUnionCenter = homeParentGroup.x + homeParentGroup.width / 2;
          assignAncestorCenters(homeParentUnion, homeParentUnionCenter, 1);
        }
      }

      // Place ancestors and remaining groups using multi-pass strategy:
      // Pass A: center above placed children (grandparents, great-grandparents)
      // Pass B: place siblings next to already-placed relatives
      // Pass C: place remaining by side assignment
      for (let pass = 0; pass < 15; pass++) {
        let anyPlaced = false;
        for (const group of allGroups) {
          if (placedGroups.has(group.id)) continue;

          // Strategy 0: Exact center placement for ancestor couples
          let assignedCenter: number | undefined;
          for (const pid of group.personIds) {
            const pUnions = personToPartnerUnions.get(pid) ?? [];
            for (const uid of pUnions) {
              if (ancestorUnionCenters.has(uid)) {
                assignedCenter = ancestorUnionCenters.get(uid);
                break;
              }
            }
            if (assignedCenter !== undefined) break;
          }

          if (assignedCenter !== undefined) {
            console.log('[Layout] Strategy 0 placing group:', group.id, 'at center:', assignedCenter, 'width:', group.width);
            group.x = assignedCenter - group.width / 2;
            placedGroups.add(group.id);
            placeChildrenOf(group);
            anyPlaced = true;
            continue;
          }

          // Strategy 1: Center above placed children
          let sumChildX = 0;
          let placedChildrenCount = 0;

          for (const pid of group.personIds) {
            const pUnions = personToPartnerUnions.get(pid) ?? [];
            for (const uid of pUnions) {
              for (const cid of unionChildren.get(uid) ?? []) {
                const cg = personToGroup.get(cid);
                if (cg && placedGroups.has(cg.id)) {
                  const childIndex = cg.personIds.indexOf(cid);
                  if (childIndex !== -1) {
                    const childCenterX = cg.x + childIndex * (config.personWidth + config.spouseGap) + config.personWidth / 2;
                    sumChildX += childCenterX;
                    placedChildrenCount++;
                  }
                }
              }
            }
          }

          if (placedChildrenCount > 0) {
            const avgChildCenterX = sumChildX / placedChildrenCount;
            group.x = avgChildCenterX - group.width / 2;
            placedGroups.add(group.id);
            anyPlaced = true;
            continue;
          }

          // Strategy 2: Place next to a placed sibling (same parent union)
          for (const pid of group.personIds) {
            const pUid = childToParentUnion.get(pid);
            if (!pUid) continue;
            const siblings = unionChildren.get(pUid) ?? [];
            for (const sibId of siblings) {
              const sibGroup = personToGroup.get(sibId);
              if (sibGroup && placedGroups.has(sibGroup.id) && sibGroup.id !== group.id) {
                // Place this group next to the sibling
                const side = getGroupSide(group);
                if (side === 'left') {
                  group.x = sibGroup.x - group.width - config.nodeSpacing;
                } else {
                  group.x = sibGroup.x + sibGroup.width + config.nodeSpacing;
                }
                placedGroups.add(group.id);
                placeChildrenOf(group);
                anyPlaced = true;
                break;
              }
            }
            if (placedGroups.has(group.id)) break;
          }
          if (placedGroups.has(group.id)) continue;

          // Strategy 3: Place next to placed spouse
          for (const pid of group.personIds) {
            const sp = spouseMap.get(pid);
            if (!sp) continue;
            for (const sid of sp) {
              const sGroup = personToGroup.get(sid);
              if (sGroup && placedGroups.has(sGroup.id) && sGroup.id !== group.id) {
                const side = getGroupSide(group);
                if (side === 'left') {
                  group.x = sGroup.x - group.width - config.spouseGap;
                } else {
                  group.x = sGroup.x + sGroup.width + config.spouseGap;
                }
                placedGroups.add(group.id);
                placeChildrenOf(group);
                anyPlaced = true;
                break;
              }
            }
            if (placedGroups.has(group.id)) break;
          }
        }
        if (!anyPlaced) break;
      }
    }

    // Place any truly remaining unplaced groups using side assignment
    // LEFT-side groups go before the bridge, RIGHT-side groups go after
    let _leftEdge = config.canvasPadding;
    let rightEdge = config.canvasPadding;
    for (const g of allGroups) {
      if (placedGroups.has(g.id)) {
        rightEdge = Math.max(rightEdge, g.x + g.width + config.familyUnitGap);
      }
    }
    for (const group of allGroups) {
      if (!placedGroups.has(group.id)) {
        const side = getGroupSide(group);
        if (side === 'left') {
          // Find leftmost placed group and place before it
          let minPlacedX = Infinity;
          for (const g of allGroups) {
            if (placedGroups.has(g.id)) minPlacedX = Math.min(minPlacedX, g.x);
          }
          group.x = minPlacedX - group.width - config.nodeSpacing;
          placedGroups.add(group.id);
          placeChildrenOf(group);
        } else {
          group.x = rightEdge;
          placedGroups.add(group.id);
          placeChildrenOf(group);
          rightEdge += (subtreeWidths.get(group.id) ?? group.width) + config.familyUnitGap;
        }
      }
    }

    // ── Enforce global minimum X ──
    let globalMinX = Infinity;
    for (const g of allGroups) {
      if (placedGroups.has(g.id)) globalMinX = Math.min(globalMinX, g.x);
    }
    if (globalMinX < config.canvasPadding) {
      const shift = config.canvasPadding - globalMinX;
      for (const g of allGroups) g.x += shift;
    }

    // ── Resolve any remaining overlaps per row ──
    const sortedGens = [...genPersons.keys()].sort((a, b) => a - b);
    for (const gen of sortedGens) {
      const rowGroups = this.getRowGroups(gen, genPersons, personToGroup);
      rowGroups.sort((a, b) => a.x - b.x);
      for (let i = 1; i < rowGroups.length; i++) {
        const minX = rowGroups[i - 1].x + rowGroups[i - 1].width + config.nodeSpacing;
        if (rowGroups[i].x < minX) rowGroups[i].x = minX;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: Extract person positions + place union anchors
    // ═══════════════════════════════════════════════════════════════════

    for (const group of allGroups) {
      const y = genYMap.get(group.gen) ?? config.canvasPadding;
      for (let i = 0; i < group.personIds.length; i++) {
        positions.set(group.personIds[i], {
          x: group.x + i * (config.personWidth + config.spouseGap),
          y,
        });
      }
    }

    for (const union of unions) {
      const partners = unionPartners.get(union.unionId) ?? [];
      if (partners.length >= 2) {
        const pos1 = positions.get(partners[0]);
        const pos2 = positions.get(partners[1]);
        if (pos1 && pos2) {
          const midX = (pos1.x + pos2.x + config.personWidth) / 2;
          positions.set(union.unionId, {
            x: midX - config.unionWidth / 2,
            y: Math.min(pos1.y, pos2.y) + config.personHeight / 2 - config.unionHeight,
          });
        }
      } else if (partners.length === 1) {
        const pos = positions.get(partners[0]);
        if (pos) {
          positions.set(union.unionId, {
            x: pos.x + config.personWidth / 2 - config.unionWidth / 2,
            y: pos.y + config.personHeight / 2 - config.unionHeight,
          });
        }
      }
    }

    return positions;
  }

  private getRowGroups(
    gen: number,
    genPersons: Map<number, Person[]>,
    personToGroup: Map<string, SpouseGroup>
  ): SpouseGroup[] {
    const seen = new Set<string>();
    const groups: SpouseGroup[] = [];
    for (const p of (genPersons.get(gen) ?? [])) {
      const g = personToGroup.get(p.personId);
      if (g && !seen.has(g.id)) { seen.add(g.id); groups.push(g); }
    }
    return groups.sort((a, b) => a.x - b.x);
  }
}
