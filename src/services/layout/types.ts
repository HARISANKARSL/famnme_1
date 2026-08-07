/**
 * Shared types for the custom family tree layout engine.
 *
 * These types define the data structures used across all layout phases:
 * family units, generation maps, positions, union anchors, and configuration.
 */

import type { Person, Union } from '@/types';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';

// ============================================================================
// Relationship type (formerly in elkLayoutService)
// ============================================================================

export interface Relationship {
  fromId: string;
  toId: string;
  type: 'PARTNER_IN' | 'HAS_CHILD' | 'GUARDIAN_OF' | 'MEMBER_OF';
  guardianType?: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian' | 'informal-caregiver';
  startDate?: string | null;
  endDate?: string | null;
}

// ============================================================================
// Family Unit — the atomic building block of a family tree layout
// ============================================================================

export interface FamilyUnit {
  /** Unique identifier for this family unit */
  unitId: string;
  /** Parents in this unit (1 for single parent, 2 for couple) */
  parents: Person[];
  /** The union (marriage/partnership) connecting the parents, null for single-parent synthetic units */
  union: Union | null;
  /** Children of this unit, ordered by birth date or elder status */
  children: Person[];
  /** Generation number assigned in Phase 2 */
  generation: number;
}

// ============================================================================
// Layout Configuration
// ============================================================================

export interface LayoutConfig {
  personWidth: number;
  personHeight: number;
  generationGap: number;
  nodeSpacing: number;
  spouseGap: number;
  familyUnitGap: number;
  unionWidth: number;
  unionHeight: number;
  canvasPadding: number;
}

/** Build a LayoutConfig from responsive breakpoint or static defaults */
export function buildLayoutConfig(responsive?: Partial<ResponsiveBreakpoint>): LayoutConfig {
  return {
    personWidth: responsive?.personWidth ?? 180,
    personHeight: responsive?.personHeight ?? 240,
    generationGap: responsive?.generationGap ?? 140,
    nodeSpacing: responsive?.nodeSpacing ?? 30,
    spouseGap: responsive?.spouseGap ?? 20,
    familyUnitGap: responsive?.familyUnitGap ?? 80,
    unionWidth: 24,
    unionHeight: 24,
    canvasPadding: 100,
  };
}

// ============================================================================
// Position types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

// ============================================================================
// Union Anchor — derived data for rendering edges
// ============================================================================

export interface UnionAnchor {
  unionId: string;
  /** X midpoint between spouses */
  x: number;
  /** Y at bottom edge of spouse row */
  y: number;
  partner1Pos: Position | null;
  partner2Pos: Position | null;
  childPositions: Position[];
}

// ============================================================================
// Layout Result — output of the layout engine
// ============================================================================

export interface LayoutResult {
  positions: Map<string, Position>;
  bounds: {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// ============================================================================
// Layout Strategy interface
// ============================================================================

export interface LayoutStrategy {
  calculate(
    familyUnits: FamilyUnit[],
    generations: Map<string, number>,
    persons: Person[],
    unions: Union[],
    relationships: Relationship[],
    config: LayoutConfig,
    injectedHomePersonId?: string
  ): Map<string, Position>;
}

// ============================================================================
// Layout Input — mirrors the ELK LayoutInput for compatibility
// ============================================================================

export interface CustomLayoutInput {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  homePersonId: string;
  strategy: 'tree' | 'pedigree' | 'descendant';
  layoutConstants?: Partial<ResponsiveBreakpoint>;
}

// ============================================================================
// LayoutInput — compatible with the former ELK interface
// ============================================================================

export interface LayoutInput {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  layoutConstants?: Partial<ResponsiveBreakpoint>;
  direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
  homePersonId?: string;
}

// ============================================================================
// Normalize duplicate single-parent unions (formerly in elkLayoutService)
// ============================================================================

/**
 * Normalize duplicate single-parent unions in memory (no Neo4j changes).
 * Collapses all of a person's `type:'unknown'` unions into the first one.
 */
export function normalizeSingleParentUnions(
  unions: Union[],
  relationships: Relationship[]
): { unions: Union[]; relationships: Relationship[] } {
  const singleUnionsByPerson = new Map<string, string[]>();

  // Collect union IDs that have children — these must NOT be merged
  const unionsWithChildren = new Set<string>();
  for (const rel of relationships) {
    if (rel.type === 'HAS_CHILD') unionsWithChildren.add(rel.fromId);
  }

  for (const rel of relationships) {
    if (rel.type !== 'PARTNER_IN') continue;
    const union = unions.find(u => u.unionId === rel.toId);
    if (!union || union.type !== 'unknown') continue;
    // Skip unions that have children — they carry parentage info and must not be merged
    if (unionsWithChildren.has(rel.toId)) continue;
    const list = singleUnionsByPerson.get(rel.fromId) ?? [];
    list.push(rel.toId);
    singleUnionsByPerson.set(rel.fromId, list);
  }

  const redirect = new Map<string, string>();
  for (const [, unionIds] of singleUnionsByPerson) {
    if (unionIds.length <= 1) continue;
    const [surviving, ...extras] = unionIds;
    for (const extra of extras) redirect.set(extra, surviving);
  }

  if (redirect.size === 0) return { unions, relationships };

  const mergedUnions = unions.filter(u => !redirect.has(u.unionId));
  const mergedRelationships = relationships
    .map(rel => {
      const newTo = redirect.get(rel.toId);
      const newFrom = redirect.get(rel.fromId);
      if (!newTo && !newFrom) return rel;
      return { ...rel, toId: newTo ?? rel.toId, fromId: newFrom ?? rel.fromId };
    })
    .filter((rel, idx, arr) => {
      if (rel.type !== 'PARTNER_IN') return true;
      return arr.findIndex(r => r.type === 'PARTNER_IN' && r.fromId === rel.fromId && r.toId === rel.toId) === idx;
    });

  console.log(`[normalizeSingleParentUnions] Merged ${redirect.size} redundant single-parent union(s)`);
  return { unions: mergedUnions, relationships: mergedRelationships };
}
