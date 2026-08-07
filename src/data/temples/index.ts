/**
 * Sacred Places Registry
 *
 * Unified in-memory registry for temples, churches, and mosques.
 * Provides fast search (no API calls) for instant autocomplete.
 * Faith auto-filtered: filterByReligion('Christian') returns only churches, etc.
 */

import type { SacredPlace } from './types';
import { HINDU_TEMPLES } from './hindu-temples';
import { KERALA_TEMPLES } from './kerala-temples';
import { KERALA_CHURCHES } from './kerala-churches';
import { INDIA_CHURCHES } from './india-churches';
import { KERALA_MOSQUES } from './kerala-mosques';
import { INDIA_MOSQUES } from './india-mosques';
import { DEITY_LIST } from './deities';

export type { SacredPlace, Temple, TempleConnection } from './types';
export type { DeityInfo } from './deities';
export { DEITY_LIST } from './deities';
export type { FaithContext } from './sacredPlaceLabels';
export {
  SACRED_PLACE_NOUN,
  HERO_LABELS,
  CONNECTION_LABELS_BY_FAITH,
  RITUAL_PROMPTS_BY_FAITH,
  SECTION_TITLE_BY_FAITH,
} from './sacredPlaceLabels';

// ============================================================================
// Lazy-built search index
// ============================================================================

let _allPlaces: SacredPlace[] | null = null;
let _idIndex: Map<string, SacredPlace> | null = null;
let _nameIndex: Map<string, SacredPlace> | null = null;
let _stateIndex: Map<string, SacredPlace[]> | null = null;
let _deityIndex: Map<string, SacredPlace[]> | null = null;
let _religionIndex: Map<string, SacredPlace[]> | null = null;
let _typeIndex: Map<string, SacredPlace[]> | null = null;

function ensureIndex() {
  if (_allPlaces) return;

  _allPlaces = [
    ...HINDU_TEMPLES,
    ...KERALA_TEMPLES,
    ...KERALA_CHURCHES,
    ...INDIA_CHURCHES,
    ...KERALA_MOSQUES,
    ...INDIA_MOSQUES,
  ];

  _idIndex = new Map<string, SacredPlace>();
  _nameIndex = new Map<string, SacredPlace>();
  _stateIndex = new Map<string, SacredPlace[]>();
  _deityIndex = new Map<string, SacredPlace[]>();
  _religionIndex = new Map<string, SacredPlace[]>();
  _typeIndex = new Map<string, SacredPlace[]>();

  for (const place of _allPlaces) {
    // ID index
    _idIndex.set(place.templeId, place);

    // Name index (lowercase)
    _nameIndex.set(place.name.toLowerCase(), place);

    // State index
    if (place.state) {
      const stateKey = place.state.toLowerCase();
      if (!_stateIndex.has(stateKey)) _stateIndex.set(stateKey, []);
      _stateIndex.get(stateKey)!.push(place);
    }

    // Deity index (Hindu temples only)
    if (place.deities) {
      for (const deity of place.deities) {
        const deityKey = deity.toLowerCase();
        if (!_deityIndex.has(deityKey)) _deityIndex.set(deityKey, []);
        _deityIndex.get(deityKey)!.push(place);
      }
    }
    if (place.deity) {
      const deityKey = place.deity.toLowerCase();
      if (!_deityIndex.has(deityKey)) _deityIndex.set(deityKey, []);
      const list = _deityIndex.get(deityKey)!;
      if (!list.includes(place)) list.push(place);
    }

    // Religion index
    const religionKey = place.religion.toLowerCase();
    if (!_religionIndex.has(religionKey)) _religionIndex.set(religionKey, []);
    _religionIndex.get(religionKey)!.push(place);

    // Type index (treat undefined as 'temple')
    const typeKey = (place.type ?? 'temple').toLowerCase();
    if (!_typeIndex.has(typeKey)) _typeIndex.set(typeKey, []);
    _typeIndex.get(typeKey)!.push(place);
  }
}

// Reset index (called when data changes)
function resetIndex() {
  _allPlaces = null;
  _idIndex = null;
  _nameIndex = null;
  _stateIndex = null;
  _deityIndex = null;
  _religionIndex = null;
  _typeIndex = null;
}
// Export for testing / hot-reload
export { resetIndex };

// ============================================================================
// Public API
// ============================================================================

/**
 * Search sacred places by query string.
 * Returns results ranked: exact match → prefix match → substring match.
 * Optionally filter by religion.
 */
export function searchTemples(query: string, limit: number = 10, religion?: SacredPlace['religion']): SacredPlace[] {
  ensureIndex();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const results: SacredPlace[] = [];

  const source = religion ? (_religionIndex!.get(religion.toLowerCase()) ?? []) : _allPlaces!;

  const add = (place: SacredPlace) => {
    if (seen.has(place.templeId)) return;
    seen.add(place.templeId);
    results.push(place);
  };

  // 1. Exact match on name
  const exact = _nameIndex!.get(q);
  if (exact && (!religion || exact.religion === religion)) add(exact);

  // 2. Prefix matches
  for (const place of source) {
    if (results.length >= limit) break;
    if (place.name.toLowerCase().startsWith(q)) add(place);
    else if (place.location.toLowerCase().startsWith(q)) add(place);
  }

  // 3. Substring matches
  if (results.length < limit) {
    for (const place of source) {
      if (results.length >= limit) break;
      if (place.name.toLowerCase().includes(q)) add(place);
      else if (place.state.toLowerCase().includes(q)) add(place);
      else if (place.deity?.toLowerCase().includes(q)) add(place);
      else if (place.denomination?.toLowerCase().includes(q)) add(place);
      else if (place.location.toLowerCase().includes(q)) add(place);
    }
  }

  return results.slice(0, limit);
}

/**
 * Get a sacred place by its unique ID.
 */
export function getTempleById(id: string): SacredPlace | undefined {
  ensureIndex();
  return _idIndex!.get(id);
}

/**
 * Filter sacred places by Indian state (case-insensitive).
 * Optionally filter by religion too.
 */
export function filterByState(state: string, religion?: SacredPlace['religion']): SacredPlace[] {
  ensureIndex();
  const results = _stateIndex!.get(state.trim().toLowerCase()) ?? [];
  if (!religion) return results;
  return results.filter(p => p.religion === religion);
}

/**
 * Filter by deity name (case-insensitive). Hindu temples only.
 */
export function filterByDeity(deity: string): SacredPlace[] {
  ensureIndex();
  return _deityIndex!.get(deity.trim().toLowerCase()) ?? [];
}

/**
 * Filter by religion.
 */
export function filterByReligion(religion: SacredPlace['religion']): SacredPlace[] {
  ensureIndex();
  return _religionIndex!.get(religion.toLowerCase()) ?? [];
}

/**
 * Filter by type ('temple' | 'church' | 'mosque').
 * Existing temple entries with no type field are treated as 'temple'.
 */
export function filterByType(type: NonNullable<SacredPlace['type']>): SacredPlace[] {
  ensureIndex();
  return _typeIndex!.get(type.toLowerCase()) ?? [];
}

/**
 * Get all unique state names (optionally filtered by religion).
 */
export function getAllStates(religion?: SacredPlace['religion']): string[] {
  ensureIndex();
  const states = new Set<string>();
  const source = religion ? (_religionIndex!.get(religion.toLowerCase()) ?? []) : _allPlaces!;
  for (const place of source) {
    if (place.state) states.add(place.state);
  }
  return Array.from(states).sort();
}

/**
 * Get all unique deity names from the dataset.
 */
export function getAllDeities(): string[] {
  ensureIndex();
  return DEITY_LIST.map(d => d.name).sort();
}

/**
 * Get all unique denomination names for a given type.
 */
export function getAllDenominations(type: NonNullable<SacredPlace['type']>): string[] {
  ensureIndex();
  const denoms = new Set<string>();
  for (const place of (_typeIndex!.get(type.toLowerCase()) ?? [])) {
    if (place.denomination) denoms.add(place.denomination);
  }
  return Array.from(denoms).sort();
}

/**
 * Get all sacred places (temples + churches + mosques).
 */
export function getAllTemples(): SacredPlace[] {
  ensureIndex();
  return _allPlaces!;
}
