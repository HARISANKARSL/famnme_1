/**
 * Google Maps API Service — Frontend Client
 *
 * Thin wrappers around the backend sacred-places endpoints.
 * Mirrors the pattern used in templeLinkApiService.ts.
 */

import { resolveBackendUrl } from '@/config/api';
import type { PlaceSuggestion, DynamicTemple } from '@/types';

const API_BASE = resolveBackendUrl('/api');

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Request failed');
  }
  return res;
}

/**
 * Search for nearby sacred places based on user's location.
 * Returns empty array on error so callers can fail gracefully.
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  types: string[] = ['temple'],
  radius: number = 10,
): Promise<PlaceSuggestion[]> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      types: types.join(','),
      radius: String(radius),
    });
    const res = await apiFetch(`/sacred-places/nearby?${params.toString()}`);
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Search Google Maps for sacred places.
 * Returns empty array (not an error) if the API key is not configured.
 */
export async function searchGoogleMapsPlaces(
  query: string,
  type?: 'temple' | 'church' | 'mosque',
): Promise<PlaceSuggestion[]> {
  try {
    const params = new URLSearchParams({ q: query });
    if (type) params.set('type', type);
    const res = await apiFetch(`/sacred-places/search?${params.toString()}`);
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Trigger full AI enrichment for a Google Maps place.
 * This is the call that triggers the AI loading overlay.
 * May take 5–15 seconds for new places; cached places return immediately.
 * Pass refresh=true to force re-enrichment of already cached places.
 */
export async function enrichPlace(placeId: string, refresh: boolean = false): Promise<DynamicTemple> {
  const res = await apiFetch('/sacred-places/enrich', {
    method: 'POST',
    body: JSON.stringify({ placeId, refresh }),
  });
  return res.json();
}

/**
 * Get a cached DynamicTemple by placeId without triggering enrichment.
 * Returns null if not yet in cache.
 */
export async function getCachedDynamicTemple(placeId: string): Promise<DynamicTemple | null> {
  try {
    const res = await apiFetch(`/sacred-places/${encodeURIComponent(placeId)}`);
    return res.json();
  } catch {
    return null;
  }
}

interface LocalEnrichmentResult {
  aiRituals: string;
  aiSignificance: string;
  aiVisitorTips: string;
  aiHowToReach: string;
  aiEnrichedAt: string;
}

/**
 * AI enrichment for local DB temples (not Google Maps).
 * Caches result in a LocalTempleEnrichment Neo4j node.
 * Returns null on error so callers can fail gracefully.
 */
export async function enrichLocalTemple(params: {
  templeId: string;
  name: string;
  location: string;
  refresh?: boolean;
}): Promise<LocalEnrichmentResult | null> {
  try {
    const res = await apiFetch('/sacred-places/enrich-local', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.json();
  } catch {
    return null;
  }
}

export async function getLocalTempleEnrichment(templeId: string): Promise<LocalEnrichmentResult | null> {
  try {
    const res = await apiFetch(`/sacred-places/enrichment/${encodeURIComponent(templeId)}`);
    return res.json();
  } catch {
    return null;
  }
}

interface GotraEnrichmentResult {
  sage: string;
  deities: string;
  practices: string;
  significance: string;
}

/**
 * AI enrichment for gotra — returns founding sage, deities, practices, significance.
 * Caches result in a GotraEnrichment Neo4j node.
 */
export async function enrichGotra(gotra: string): Promise<GotraEnrichmentResult | null> {
  try {
    const res = await apiFetch('/sacred-places/enrich-gotra', {
      method: 'POST',
      body: JSON.stringify({ gotra }),
    });
    return res.json();
  } catch {
    return null;
  }
}
