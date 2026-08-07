/**
 * Temple Connection Service
 *
 * Infers family-temple connections from tree data without any user input.
 * Uses nativePlace, gotra/deity affinity, and ceremony locations.
 */

import type { Person, Union } from '@/types';
import type { Temple, TempleConnection } from '@/data/temples/types';
import { filterByState, filterByDeity, getAllTemples } from '@/data/temples';
import type { SacredPlace } from '@/data/temples/types';
import { detectFamilyReligion } from '@/services/religionDetectionService';
import { searchIndianPlaces } from '@/data/places';

// ============================================================================
// Gotra → Deity affinity (light heuristic, not authoritative)
// ============================================================================

const GOTRA_DEITY_AFFINITY: Record<string, string[]> = {
  // Shaiva gotras
  kashyapa: ['Shiva', 'Parvati'],
  bharadvaja: ['Shiva', 'Vishnu'],
  vasishtha: ['Shiva', 'Vishnu'],
  // Vaishnava gotras
  atri: ['Vishnu', 'Rama'],
  vishvamitra: ['Vishnu', 'Rama'],
  gautama: ['Vishnu', 'Shiva'],
  jamadagni: ['Vishnu', 'Shiva'],
  // Common gotras with general affinity
  agastya: ['Shiva', 'Vishnu'],
  angirasa: ['Vishnu', 'Shiva'],
  kaushika: ['Shiva', 'Vishnu'],
  shandilya: ['Vishnu', 'Krishna'],
  harita: ['Vishnu'],
  mudgala: ['Ganesha', 'Vishnu'],
  parashara: ['Vishnu', 'Krishna'],
  vatsa: ['Shiva'],
  garga: ['Krishna', 'Vishnu'],
  maudgalya: ['Ganesha'],
  kaundinya: ['Shiva', 'Vishnu'],
};

// ============================================================================
// State name normalization (handles common variants)
// ============================================================================

function normalizeState(state: string): string {
  const s = state.trim().toLowerCase();
  const MAP: Record<string, string> = {
    'ap': 'andhra pradesh',
    'ts': 'telangana',
    'tn': 'tamil nadu',
    'tamilnadu': 'tamil nadu',
    'ka': 'karnataka',
    'kl': 'kerala',
    'mh': 'maharashtra',
    'gj': 'gujarat',
    'rj': 'rajasthan',
    'up': 'uttar pradesh',
    'mp': 'madhya pradesh',
    'wb': 'west bengal',
    'od': 'odisha',
    'orissa': 'odisha',
    'jk': 'jammu and kashmir',
    'j&k': 'jammu and kashmir',
    'hp': 'himachal pradesh',
    'uk': 'uttarakhand',
    'uttaranchal': 'uttarakhand',
    'cg': 'chhattisgarh',
    'chattisgarh': 'chhattisgarh',
    'jh': 'jharkhand',
    'ga': 'goa',
    'pb': 'punjab',
    'hr': 'haryana',
    'dl': 'delhi',
    'new delhi': 'delhi',
  };
  return MAP[s] || s;
}

function resolveNativePlaceToState(nativePlace: string): string | null {
  if (!nativePlace) return null;

  const STATES = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'jammu and kashmir', 'ladakh',
  ];

  // Try checking parts of a comma-separated address from right to left (most general first)
  const parts = nativePlace.split(',').map(p => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (!part) continue;

    const normalized = normalizeState(part);
    if (STATES.includes(normalized)) return normalized;

    const results = searchIndianPlaces(part, 1);
    if (results.length > 0) {
      return results[0].state.toLowerCase();
    }
  }

  return null;
}

// ============================================================================
// Connection inference
// ============================================================================

/**
 * Find temples connected to the family based on tree data.
 * Returns scored connections with reasons.
 */
export function findFamilyTempleConnections(
  persons: Person[],
  unions?: Union[],
): TempleConnection[] {
  const connections = new Map<string, TempleConnection>();
  const familyReligion = detectFamilyReligion(persons);

  // Determine which religion's sacred places to surface
  const faithFilter: SacredPlace['religion'] =
    familyReligion?.toLowerCase().includes('christian') ? 'Christian' :
    (familyReligion?.toLowerCase().includes('islam') || familyReligion?.toLowerCase().includes('muslim')) ? 'Islam' :
    'Hindu';

  // ---- Signal 1: Native Place → State → Sacred Places (faith-filtered) ----
  const statePersonMap = new Map<string, string[]>();
  for (const person of persons) {
    if (person.nativePlace) {
      const state = resolveNativePlaceToState(person.nativePlace);
      if (state) {
        const existing = statePersonMap.get(state) || [];
        existing.push(person.personId);
        statePersonMap.set(state, existing);
      }
    }
  }

  for (const [state, personIds] of statePersonMap) {
    const temples = filterByState(state, faithFilter);
    for (const temple of temples) {
      const count = personIds.length;
      const key = temple.templeId;
      const existing = connections.get(key);
      const score = count * 10; // More family from that state = higher score
      if (!existing || existing.score < score) {
        connections.set(key, {
          temple,
          connectionType: 'native_place',
          reason: `Near ${state.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} \u2014 native place of ${count} family member${count > 1 ? 's' : ''}`,
          score,
          linkedPersonIds: personIds,
        });
      }
    }
  }

  // ---- Signal 2: Gotra → Deity → Temples (Hindu only) ----
  if (faithFilter === 'Hindu') {
    const familyGotras = new Set<string>();
    for (const person of persons) {
      if (person.gotra) {
        familyGotras.add(person.gotra.trim().toLowerCase());
      }
    }

    for (const gotra of familyGotras) {
      const deities = GOTRA_DEITY_AFFINITY[gotra];
      if (deities) {
        for (const deity of deities) {
          const temples = filterByDeity(deity);
          for (const temple of temples) {
            const key = temple.templeId;
            const existing = connections.get(key);
            const score = 15;
            if (!existing || (existing.connectionType !== 'native_place' && existing.score < score)) {
              connections.set(key, {
                temple,
                connectionType: 'deity_affinity',
                reason: `Your family's gotra (${gotra.charAt(0).toUpperCase() + gotra.slice(1)}) is associated with ${deity}`,
                score,
              });
            }
          }
        }
      }
    }
  }

  // ---- Signal 3: Ceremony/Marriage locations matching sacred place names ----
  const allTemples = getAllTemples().filter(t => !t.religion || t.religion === faithFilter);
  const templeNameMap = new Map<string, Temple>();
  for (const t of allTemples) {
    // Index by short name fragments for fuzzy matching
    const nameParts = t.name.toLowerCase().split(/[,\s]+/).filter(p => p.length > 3);
    for (const part of nameParts) {
      templeNameMap.set(part, t);
    }
    templeNameMap.set(t.name.toLowerCase(), t);
    if (t.location) {
      templeNameMap.set(t.location.toLowerCase(), t);
    }
  }

  if (unions) {
    for (const union of unions) {
      if (union.marriagePlace) {
        const place = union.marriagePlace.toLowerCase();
        for (const [key, temple] of templeNameMap) {
          if (place.includes(key) || key.includes(place)) {
            const existing = connections.get(temple.templeId);
            const score = 25; // Ceremony match is the strongest signal
            if (!existing || existing.score < score) {
              connections.set(temple.templeId, {
                temple,
                connectionType: 'ceremony_location',
                reason: `A family ceremony took place at ${union.marriagePlace}`,
                score,
              });
            }
          }
        }
      }
    }
  }

  // Sort by score descending
  const result = Array.from(connections.values());
  result.sort((a, b) => b.score - a.score);
  return result;
}

/**
 * Find temples connected specifically to the HOME PERSON (primary user).
 * Uses only the home person's own attributes for inference, not the whole family.
 * Returns connections sorted by score descending.
 */
export function getHomePersonTempleConnections(
  persons: Person[],
  unions?: Union[],
): TempleConnection[] {
  const homePerson = persons.find(p => p.isHomePerson);
  if (!homePerson) return [];

  const connections = new Map<string, TempleConnection>();
  const familyReligion = detectFamilyReligion(persons);

  const faithFilter2: SacredPlace['religion'] =
    familyReligion?.toLowerCase().includes('christian') ? 'Christian' :
    (familyReligion?.toLowerCase().includes('islam') || familyReligion?.toLowerCase().includes('muslim')) ? 'Islam' :
    'Hindu';

  // ---- Signal 1: Home person's native place → state → sacred places ----
  if (homePerson.nativePlace) {
    const state = resolveNativePlaceToState(homePerson.nativePlace);
    if (state) {
      const temples = filterByState(state, faithFilter2);
      for (const temple of temples) {
        connections.set(temple.templeId, {
          temple,
          connectionType: 'native_place',
          reason: `Near ${state.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} — your native place`,
          score: 10,
          linkedPersonIds: [homePerson.personId],
        });
      }
    }
  }

  // ---- Signal 2: Home person's gotra → deity → temples (Hindu only) ----
  if (faithFilter2 === 'Hindu' && homePerson.gotra) {
    const gotra = homePerson.gotra.trim().toLowerCase();
    const deities = GOTRA_DEITY_AFFINITY[gotra];
    if (deities) {
      for (const deity of deities) {
        const temples = filterByDeity(deity);
        for (const temple of temples) {
          const key = temple.templeId;
          const existing = connections.get(key);
          const score = 15;
          if (!existing || (existing.connectionType !== 'native_place' && existing.score < score)) {
            connections.set(key, {
              temple,
              connectionType: 'deity_affinity',
              reason: `Your gotra (${homePerson.gotra}) is associated with ${deity}`,
              score,
            });
          }
        }
      }
    }
  }

  // ---- Signal 3: Home person's ceremony locations ----
  if (unions) {
    const allTemples = getAllTemples().filter(t => !t.religion || t.religion === faithFilter2);
    const templeNameMap = new Map<string, Temple>();
    for (const t of allTemples) {
      const nameParts = t.name.toLowerCase().split(/[,\s]+/).filter(p => p.length > 3);
      for (const part of nameParts) {
        templeNameMap.set(part, t);
      }
      templeNameMap.set(t.name.toLowerCase(), t);
      if (t.location) {
        templeNameMap.set(t.location.toLowerCase(), t);
      }
    }

    for (const union of unions) {
      if (union.marriagePlace) {
        const place = union.marriagePlace.toLowerCase();
        for (const [key, temple] of templeNameMap) {
          if (place.includes(key) || key.includes(place)) {
            const existing = connections.get(temple.templeId);
            const score = 25;
            if (!existing || existing.score < score) {
              connections.set(temple.templeId, {
                temple,
                connectionType: 'ceremony_location',
                reason: `Your ceremony took place at ${union.marriagePlace}`,
                score,
              });
            }
          }
        }
      }
    }
  }

  const result = Array.from(connections.values());
  result.sort((a, b) => b.score - a.score);
  return result;
}

/**
 * Get a summary of family's spiritual profile.
 */
export function getFamilySpiritualProfile(persons: Person[]) {
  const religion = detectFamilyReligion(persons);
  const gotras = new Set<string>();
  const nativePlaces = new Set<string>();
  const states = new Set<string>();

  for (const person of persons) {
    if (person.gotra) gotras.add(person.gotra);
    if (person.nativePlace) {
      const trimmedPlace = person.nativePlace.split(',')[0].trim();
      if (trimmedPlace) {
        nativePlaces.add(trimmedPlace);
      }
      const state = resolveNativePlaceToState(person.nativePlace);
      if (state) {
        const capitalized = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        states.add(capitalized);
      }
    }
  }

  // Deity affinities from gotras
  const deityAffinities = new Set<string>();
  for (const gotra of gotras) {
    const deities = GOTRA_DEITY_AFFINITY[gotra.toLowerCase()];
    if (deities) deities.forEach(d => deityAffinities.add(d));
  }

  return {
    religion,
    gotras: Array.from(gotras),
    nativePlaces: Array.from(nativePlaces),
    states: Array.from(states),
    deityAffinities: Array.from(deityAffinities),
    memberCount: persons.length,
  };
}
