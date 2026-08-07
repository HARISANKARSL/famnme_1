/**
 * Migration Data Service
 *
 * Builds migration flow data from parent-child place pairs
 * for the Geographic Migration Map.
 */

import type { PlaceEntry, MigrationPerson } from './neo4jDataService';
import type { Relationship } from './elkLayoutService';

export interface GeocodedPoint {
  lat: number;
  lon: number;
}

/** Person entry within a map marker, enriched with photo/detail data */
export interface MarkerPerson {
  personId: string;
  personName: string;
  placeType: string;
  profilePhotoUrl?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  occupation?: string | null;
  gender?: string;
  isLiving?: boolean;
  birthPlace?: string | null;
  deathPlace?: string | null;
  nativePlace?: string | null;
}

export interface MapMarker {
  place: string;
  lat: number;
  lon: number;
  persons: MarkerPerson[];
  count: number;
}

export interface MigrationFlow {
  from: { place: string; lat: number; lon: number };
  to: { place: string; lat: number; lon: number };
  personName: string;
  parentName: string;
}

/**
 * Build map markers from place entries with geocoded coordinates.
 * When `personDetails` is provided, enriches each marker person with photo/date data.
 */
export function buildMapMarkers(
  places: PlaceEntry[],
  geocodedPlaces: Map<string, GeocodedPoint>,
  personDetails?: MigrationPerson[],
): MapMarker[] {
  // Index person details by ID for fast lookup
  const detailMap = new Map<string, MigrationPerson>();
  if (personDetails) {
    for (const p of personDetails) detailMap.set(p.personId, p);
  }

  const markerMap = new Map<string, MapMarker>();

  for (const entry of places) {
    const coords = geocodedPlaces.get(entry.place.toLowerCase().trim());
    if (!coords) continue;

    const key = entry.place.toLowerCase().trim();
    if (!markerMap.has(key)) {
      markerMap.set(key, {
        place: entry.place,
        lat: coords.lat,
        lon: coords.lon,
        persons: [],
        count: 0,
      });
    }

    const marker = markerMap.get(key)!;
    const detail = detailMap.get(entry.personId);
    marker.persons.push({
      personId: entry.personId,
      personName: entry.personName,
      placeType: entry.placeType,
      profilePhotoUrl: detail?.profilePhotoUrl,
      birthDate: detail?.birthDate,
      deathDate: detail?.deathDate,
      occupation: detail?.occupation,
      gender: detail?.gender,
      isLiving: detail?.isLiving,
      birthPlace: detail?.birthPlace,
      deathPlace: detail?.deathPlace,
      nativePlace: detail?.nativePlace,
    });
    marker.count = marker.persons.length;
  }

  return Array.from(markerMap.values());
}

/**
 * Get unique persons across all markers (deduplicated by personId).
 * Used for the person sidebar list.
 */
export function getUniquePersonsFromMarkers(markers: MapMarker[]): MarkerPerson[] {
  const seen = new Set<string>();
  const result: MarkerPerson[] = [];
  for (const marker of markers) {
    for (const p of marker.persons) {
      if (!seen.has(p.personId)) {
        seen.add(p.personId);
        result.push(p);
      }
    }
  }
  return result.sort((a, b) => a.personName.localeCompare(b.personName));
}

/**
 * Build migration flows from parent-child birthPlace pairs.
 * A flow represents a family moving from the parent's birthPlace
 * to the child's birthPlace.
 */
export function buildMigrationFlows(
  places: PlaceEntry[],
  relationships: Relationship[],
  geocodedPlaces: Map<string, GeocodedPoint>
): MigrationFlow[] {
  const flows: MigrationFlow[] = [];

  // Index birth places by personId
  const birthPlaceMap = new Map<string, { place: string; personName: string }>();
  for (const entry of places) {
    if (entry.placeType === 'birth') {
      birthPlaceMap.set(entry.personId, { place: entry.place, personName: entry.personName });
    }
  }

  // Find parent-child pairs and check if they have different birth places
  for (const rel of relationships) {
    if (rel.type !== 'HAS_CHILD') continue;

    // rel.fromId is a Union, find parents of that union
    const parentRels = relationships.filter(
      (r: Relationship) => r.type === 'PARTNER_IN' && r.toId === rel.fromId
    );

    for (const parentRel of parentRels) {
      const parentPlace = birthPlaceMap.get(parentRel.fromId);
      const childPlace = birthPlaceMap.get(rel.toId);

      if (!parentPlace || !childPlace) continue;
      if (parentPlace.place.toLowerCase() === childPlace.place.toLowerCase()) continue;

      const fromCoords = geocodedPlaces.get(parentPlace.place.toLowerCase().trim());
      const toCoords = geocodedPlaces.get(childPlace.place.toLowerCase().trim());

      if (!fromCoords || !toCoords) continue;

      flows.push({
        from: { place: parentPlace.place, lat: fromCoords.lat, lon: fromCoords.lon },
        to: { place: childPlace.place, lat: toCoords.lat, lon: toCoords.lon },
        personName: childPlace.personName,
        parentName: parentPlace.personName,
      });
    }
  }

  return flows;
}
