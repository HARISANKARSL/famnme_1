/**
 * Indian Places Registry
 *
 * Provides fast in-memory search over a comprehensive Indian places dataset.
 * Search works locally (no API calls) for instant autocomplete.
 */

import type { IndianPlace } from './types';

export type { IndianPlace } from './types';

// Region data files — eagerly imported since total data is small (~500 entries)
import { KERALA_PLACES } from './south-kerala';
import { SOUTH_OTHER_PLACES } from './south-other';
import { NORTH_PLACES } from './north';
import { EAST_PLACES } from './east';
import { WEST_PLACES } from './west';
import { NORTHEAST_UT_PLACES } from './northeast-and-uts';

// ============================================================================
// Lazy-built search index
// ============================================================================

let _allPlaces: IndianPlace[] | null = null;
let _nameIndex: Map<string, IndianPlace> | null = null;

function ensureIndex() {
  if (_allPlaces) return;

  _allPlaces = [
    ...KERALA_PLACES,
    ...SOUTH_OTHER_PLACES,
    ...NORTH_PLACES,
    ...EAST_PLACES,
    ...WEST_PLACES,
    ...NORTHEAST_UT_PLACES,
  ];

  _nameIndex = new Map<string, IndianPlace>();
  for (const place of _allPlaces) {
    _nameIndex.set(place.name.toLowerCase(), place);
    for (const alt of place.alternateNames) {
      _nameIndex.set(alt.toLowerCase(), place);
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search Indian places by query string.
 * Returns results ranked: exact match → prefix match → substring match.
 */
export function searchIndianPlaces(query: string, limit: number = 10): IndianPlace[] {
  ensureIndex();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const results: IndianPlace[] = [];

  const add = (place: IndianPlace) => {
    if (seen.has(place.name)) return;
    seen.add(place.name);
    results.push(place);
  };

  // 1. Exact match on name or alternate
  const exact = _nameIndex!.get(q);
  if (exact) add(exact);

  // 2. Prefix matches
  for (const place of _allPlaces!) {
    if (results.length >= limit) break;
    if (place.name.toLowerCase().startsWith(q)) add(place);
    else {
      for (const alt of place.alternateNames) {
        if (alt.toLowerCase().startsWith(q)) { add(place); break; }
      }
    }
  }

  // 3. Substring matches (only if we still need more)
  if (results.length < limit) {
    for (const place of _allPlaces!) {
      if (results.length >= limit) break;
      if (place.name.toLowerCase().includes(q)) add(place);
      else if (place.state.toLowerCase().includes(q)) add(place);
      else {
        for (const alt of place.alternateNames) {
          if (alt.toLowerCase().includes(q)) { add(place); break; }
        }
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * Get an Indian place by exact name or alternate name (case-insensitive).
 */
export function getIndianPlaceByName(name: string): IndianPlace | undefined {
  ensureIndex();
  return _nameIndex!.get(name.trim().toLowerCase());
}

/**
 * Get all places in the dataset.
 */
export function getAllIndianPlaces(): IndianPlace[] {
  ensureIndex();
  return _allPlaces!;
}

/**
 * Format a place for display: "City, District, State" or "City, State".
 */
export function formatPlaceDisplay(place: IndianPlace): string {
  if (place.type === 'state' || place.type === 'union_territory') {
    return place.name;
  }
  return place.district && place.district !== place.name
    ? `${place.name}, ${place.district}, ${place.state}`
    : `${place.name}, ${place.state}`;
}
