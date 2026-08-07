/**
 * Place API Service (Phase 7 - Places Authority)
 *
 * Client-side API calls for place management.
 */

import { API_BASE_URL, AI_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';
import type { Place } from '@/types';
import type { IndianPlace } from '@/data/places';

function authHeaders(): Record<string, string> {
  const token = getAuthToken() || localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/**
 * Search places by name (including historical names).
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const url = `${API_BASE_URL}/places/search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to search places');
  return res.json();
}

/**
 * Create or find a standardized place.
 */
export async function createPlace(place: Partial<Place>): Promise<Place> {
  const res = await fetch(`${API_BASE_URL}/place`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error('Failed to create place');
  return res.json();
}

/**
 * Link a person to a place with a relationship type.
 */
export async function linkPersonToPlace(
  personId: string,
  placeName: string,
  relationType: string
): Promise<Place> {
  const res = await fetch(`${API_BASE_URL}/person/${personId}/place`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ placeName, relationType }),
  });
  if (!res.ok) throw new Error('Failed to link person to place');
  return res.json();
}

/**
 * Create or find a standardized place from the local Indian places dataset.
 * Maps IndianPlace fields to the Place API format. Fire-and-forget safe.
 */
export async function createStandardizedPlace(place: IndianPlace): Promise<Place> {
  const typeMap: Record<string, string> = {
    capital: 'city', district_hq: 'town', union_territory: 'state',
  };
  return createPlace({
    standardName: place.name,
    historicalNames: place.alternateNames,
    lat: place.lat,
    lng: place.lng,
    country: 'India',
    state: place.state,
    district: place.district,
    type: (typeMap[place.type] || place.type) as Place['type'],
  });
}

/**
 * Get all places for a tree with person counts.
 */
export async function getTreePlaces(treeId: string): Promise<Array<Place & { personCount: number }>> {
  const res = await fetch(`${API_BASE_URL}/tree/${treeId}/places-authority`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch tree places');
  return res.json();
}

export async function autocompletePlaces(query: string, limit: number = 10): Promise<string[]> {
  const url = `${AI_BASE_URL}/places/autocomplete?place=${encodeURIComponent(query.trim())}&limit=${limit}`;
  const token = getAuthToken() || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch place suggestions');
  return res.json();
}

