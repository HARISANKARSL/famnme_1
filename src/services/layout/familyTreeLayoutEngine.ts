/**
 * Family Tree Layout Engine — Main Orchestrator
 *
 * Purpose-built layout engine for genealogical graphs.
 * Replaces the ELK.js dependency (1.4MB WASM) with a custom, synchronous,
 * deterministic engine that understands family tree semantics natively.
 *
 * Pipeline:
 *   Phase 1: Build Family Units (familyUnitBuilder)
 *   Phase 2: Assign Generations (generationAssigner)
 *   Phase 3: Position Nodes (strategy: tree | pedigree | descendant)
 *   Phase 4: Compute Union Anchors (unionAnchorComputer)
 *
 * Additional modules:
 *   Phase 5: Incremental Updates (incrementalUpdater)
 *   Phase 6: Viewport Culling (viewportCuller)
 */

import type { Person, Union } from '@/types';
import type { Relationship, LayoutResult, LayoutInput, CustomLayoutInput, Position } from './types';
import { buildLayoutConfig } from './types';
import { buildFamilyUnits } from './familyUnitBuilder';
import { assignGenerationsWithDisconnected } from './generationAssigner';
import { getStrategy } from './strategies';
import { computeBounds } from './unionAnchorComputer';
import {
  detectStructuralChange,
  tryIncrementalUpdate,
  type StructuralChangeType,
} from './incrementalUpdater';

// ============================================================================
// Layout Cache (LRU, matches ELK service behavior)
// ============================================================================

interface CacheEntry {
  result: LayoutResult;
  hash: string;
  lastAccessed: number;
}

const MAX_CACHE = 5;
const cache = new Map<string, CacheEntry>();

function computeHash(input: CustomLayoutInput): string {
  const pIds = input.persons.map(p => p.personId).sort().join(',');
  const uIds = input.unions.map(u => u.unionId).sort().join(',');
  const rels = input.relationships.map(r => `${r.fromId}-${r.type}-${r.toId}`).sort().join(',');
  const bp = input.layoutConstants
    ? `${input.layoutConstants.personWidth}:${input.layoutConstants.personHeight}:${input.layoutConstants.generationGap}`
    : 'default';
  return `${input.strategy}|${input.homePersonId}|${pIds}|${uIds}|${rels}|${bp}`;
}

export function clearCustomLayoutCache(): void {
  cache.clear();
}

// ============================================================================
// Main Layout Function
// ============================================================================

/**
 * Calculate family tree layout using the custom engine.
 *
 * This is a synchronous, deterministic function that produces correct
 * positions in a single pass — no post-processing needed.
 */
export function calculateCustomLayout(input: CustomLayoutInput): LayoutResult {
  const hash = computeHash(input);
  const cached = cache.get(hash);
  if (cached) {
    cached.lastAccessed = Date.now();
    console.log('[customLayout] Cache HIT');
    return cached.result;
  }

  const t0 = performance.now();
  const { persons, unions, relationships, homePersonId, strategy: strategyName } = input;
  const config = buildLayoutConfig(input.layoutConstants);

  // Phase 1: Build family units
  const familyUnits = buildFamilyUnits(persons, unions, relationships);

  // Phase 2: Assign generations
  const generations = assignGenerationsWithDisconnected(
    homePersonId,
    persons.map(p => p.personId),
    relationships
  );

  // Phase 3: Position nodes using the selected strategy
  const strategy = getStrategy(strategyName);
  const positions = strategy.calculate(
    familyUnits, generations, persons, unions, relationships, config, homePersonId
  );

  // Phase 4: Compute bounds
  const bounds = computeBounds(positions, config);

  const result: LayoutResult = { positions, bounds };

  // Store in cache (LRU eviction)
  if (cache.size >= MAX_CACHE && !cache.has(hash)) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(hash, { result, hash, lastAccessed: Date.now() });

  const elapsed = Math.round(performance.now() - t0);
  console.log(`[customLayout] Layout computed in ${elapsed}ms (${persons.length} persons, ${unions.length} unions, strategy=${strategyName})`);

  return result;
}

// ============================================================================
// Incremental Layout (delegates to incrementalUpdater)
// ============================================================================

/**
 * Calculate layout incrementally when possible, falling back to full recalc for complex changes.
 */
export function calculateCustomIncrementalLayout(
  prevPositions: Map<string, Position>,
  prevData: { persons: Person[]; unions: Union[]; relationships: Relationship[] },
  nextInput: CustomLayoutInput
): LayoutResult {
  const config = buildLayoutConfig(nextInput.layoutConstants);

  const result = tryIncrementalUpdate(
    prevPositions,
    prevData,
    {
      persons: nextInput.persons,
      unions: nextInput.unions,
      relationships: nextInput.relationships,
    },
    config
  );

  if (result) {
    console.log('[customLayout] Incremental update succeeded');
    return result;
  }

  // Fall back to full calculation
  console.log('[customLayout] Incremental failed — full recalc');
  return calculateCustomLayout(nextInput);
}

// ============================================================================
// Compatibility wrapper — matches LayoutInput/LayoutResult interface
// ============================================================================

/**
 * Calculate family tree layout. Accepts LayoutInput, returns LayoutResult.
 * Synchronous internally (returns Promise for API compatibility).
 * The homePersonId is inferred from persons where isHomePerson === true.
 */
export async function calculateFamilyTreeLayout(
  input: LayoutInput
): Promise<LayoutResult> {
  const homePerson = input.persons.find(p => p.isHomePerson);
  const homePersonId = input.homePersonId ?? homePerson?.personId ?? input.persons[0]?.personId ?? '';

  const direction = input.direction ?? 'DOWN';
  const strategy: 'tree' | 'pedigree' | 'descendant' =
    direction === 'RIGHT' ? 'pedigree' : 'tree';

  return calculateCustomLayout({
    persons: input.persons,
    unions: input.unions,
    relationships: input.relationships,
    homePersonId,
    strategy,
    layoutConstants: input.layoutConstants,
  });
}

/**
 * Drop-in replacement for the ELK calculateIncrementalLayout function.
 */
export async function calculateIncrementalLayout(
  prevPositions: Map<string, Position>,
  prevData: { persons: Person[]; unions: Union[]; relationships: Relationship[] },
  nextInput: LayoutInput
): Promise<LayoutResult> {
  const homePerson = nextInput.persons.find(p => p.isHomePerson);
  const homePersonId = nextInput.homePersonId ?? homePerson?.personId ?? nextInput.persons[0]?.personId ?? '';

  const direction = nextInput.direction ?? 'DOWN';
  const strategy: 'tree' | 'pedigree' | 'descendant' =
    direction === 'RIGHT' ? 'pedigree' : 'tree';

  return calculateCustomIncrementalLayout(
    prevPositions,
    prevData,
    {
      persons: nextInput.persons,
      unions: nextInput.unions,
      relationships: nextInput.relationships,
      homePersonId,
      strategy,
      layoutConstants: nextInput.layoutConstants,
    }
  );
}

// Re-export types and utilities for convenience
export type { StructuralChangeType };
export { detectStructuralChange };
export type { Position } from './types';
