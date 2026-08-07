/**
 * Phase 1 API Service - Life Events, Alternate Names, Custom Facts, Bookmarks, Search
 */

import type { AlternateName, AlternateNameInput, LifeEvent, LifeEventInput, CustomFact, CustomFactInput, Bookmark, Person } from '@/types';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ============================================================================
// Alternate Names API (Phase 1.1)
// ============================================================================

export async function getAlternateNames(personId: string): Promise<AlternateName[]> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/alternate-names`);
  if (!res.ok) throw new Error('Failed to fetch alternate names');
  return res.json();
}

export async function addAlternateName(personId: string, name: AlternateNameInput): Promise<AlternateName> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/alternate-names`, {
    method: 'POST',
    body: JSON.stringify(name),
  });
  if (!res.ok) throw new Error('Failed to add alternate name');
  return res.json();
}

export async function updateAlternateName(nameId: string, updates: Partial<AlternateNameInput>): Promise<AlternateName> {
  const res = await apiFetch(`${API_BASE_URL}/alternate-name/${nameId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update alternate name');
  return res.json();
}

export async function deleteAlternateName(nameId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/alternate-name/${nameId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete alternate name');
}

// ============================================================================
// Life Events API (Phase 1.3)
// ============================================================================

export async function getLifeEvents(personId: string): Promise<LifeEvent[]> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/life-events`);
  if (!res.ok) throw new Error('Failed to fetch life events');
  return res.json();
}

export async function createLifeEvent(personId: string, treeId: string, event: LifeEventInput): Promise<LifeEvent> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/life-events`, {
    method: 'POST',
    body: JSON.stringify({ ...event, treeId }),
  });
  if (!res.ok) throw new Error('Failed to create life event');
  return res.json();
}

export async function updateLifeEvent(eventId: string, updates: Partial<LifeEventInput>): Promise<LifeEvent> {
  const res = await apiFetch(`${API_BASE_URL}/life-event/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update life event');
  return res.json();
}

export async function deleteLifeEvent(eventId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/life-event/${eventId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete life event');
}

// ============================================================================
// Custom Facts API (Phase 1.4)
// ============================================================================

export async function getCustomFacts(personId: string): Promise<CustomFact[]> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/custom-facts`);
  if (!res.ok) throw new Error('Failed to fetch custom facts');
  return res.json();
}

export async function addCustomFact(personId: string, treeId: string, fact: CustomFactInput): Promise<CustomFact> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/custom-facts`, {
    method: 'POST',
    body: JSON.stringify({ ...fact, treeId }),
  });
  if (!res.ok) throw new Error('Failed to add custom fact');
  return res.json();
}

export async function updateCustomFact(factId: string, updates: Partial<CustomFactInput>): Promise<CustomFact> {
  const res = await apiFetch(`${API_BASE_URL}/custom-fact/${factId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update custom fact');
  return res.json();
}

export async function deleteCustomFact(factId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/custom-fact/${factId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete custom fact');
}

// ============================================================================
// Bookmarks API (Phase 1.6)
// ============================================================================

export async function getBookmarks(treeId?: string): Promise<Bookmark[]> {
  const params = treeId ? `?treeId=${treeId}` : '';
  const res = await apiFetch(`${API_BASE_URL}/bookmarks${params}`);
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  return res.json();
}

export async function addBookmark(personId: string, treeId: string): Promise<Bookmark> {
  const res = await apiFetch(`${API_BASE_URL}/bookmark`, {
    method: 'POST',
    body: JSON.stringify({ personId, treeId }),
  });
  if (!res.ok) throw new Error('Failed to add bookmark');
  return res.json();
}

export async function removeBookmark(personId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/bookmark/${personId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove bookmark');
}

export async function isBookmarked(personId: string): Promise<boolean> {
  const res = await apiFetch(`${API_BASE_URL}/bookmark/${personId}/status`);
  if (!res.ok) throw new Error('Failed to check bookmark status');
  const data = await res.json();
  return data.bookmarked;
}

// ============================================================================
// Search API (Phase 1.5)
// ============================================================================

export async function searchPersons(treeId: string, query: string): Promise<Person[]> {
  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}
