/**
 * Temple Link API Service - Frontend API Client
 *
 * Manages person-temple and memory-temple connections via the backend API.
 */

import { resolveBackendUrl } from '@/config/api';
import type { TempleLink, TempleLinkWithPerson, TempleLinkInput } from '@/types';

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
    throw new Error(err.message || err.error || 'Request failed');
  }
  return res;
}

// ============================================================================
// Person-Temple Links
// ============================================================================

/**
 * Get all temple links for a tree (with person info).
 */
export async function getTreeTempleLinks(treeId: string): Promise<TempleLinkWithPerson[]> {
  /*
  const res = await apiFetch(`/tree/${treeId}/temple-links`);
  return res.json();
  */
  return [];
}

/**
 * Get temple links for a specific person.
 */
export async function getPersonTempleLinks(
  treeId: string,
  personId: string
): Promise<TempleLink[]> {
  const res = await apiFetch(`/tree/${treeId}/person/${personId}/temple-links`);
  return res.json();
}

/**
 * Create a temple link for a person.
 */
export async function createTempleLink(
  treeId: string,
  personId: string,
  input: TempleLinkInput
): Promise<TempleLink> {
  const res = await apiFetch(`/tree/${treeId}/person/${personId}/temple-links`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.json();
}

/**
 * Update a temple link (connection type, notes).
 */
export async function updateTempleLink(
  treeId: string,
  templeLinkId: string,
  input: Partial<TempleLinkInput>
): Promise<TempleLink> {
  const res = await apiFetch(`/tree/${treeId}/temple-link/${templeLinkId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.json();
}

/**
 * Delete a temple link.
 */
export async function deleteTempleLink(
  treeId: string,
  templeLinkId: string
): Promise<void> {
  await apiFetch(`/tree/${treeId}/temple-link/${templeLinkId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Memory-Temple Links
// ============================================================================

/**
 * Link a memory to a temple (with optional festival and ritual).
 */
export async function linkMemoryToTemple(
  treeId: string,
  memoryId: string,
  templeId: string,
  options?: { festival?: string; ritual?: string; templeName?: string }
): Promise<void> {
  await apiFetch(`/tree/${treeId}/memory/${memoryId}/temple`, {
    method: 'POST',
    body: JSON.stringify({ templeId, ...options }),
  });
}

/**
 * Get the temple linked to a memory (with festival/ritual).
 */
export async function getMemoryTemple(
  treeId: string,
  memoryId: string
): Promise<{ templeId: string; festival: string | null; ritual: string | null } | null> {
  const res = await apiFetch(`/tree/${treeId}/memory/${memoryId}/temple`);
  return res.json();
}

/**
 * Update festival/ritual on an existing memory-temple link.
 */
export async function updateMemoryTempleLink(
  treeId: string,
  memoryId: string,
  data: { templeId: string; festival?: string; ritual?: string }
): Promise<void> {
  await apiFetch(`/tree/${treeId}/memory/${memoryId}/temple`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Unlink a memory from a temple.
 */
export async function unlinkMemoryFromTemple(
  treeId: string,
  memoryId: string,
  templeId: string
): Promise<void> {
  await apiFetch(`/tree/${treeId}/memory/${memoryId}/temple/${templeId}`, {
    method: 'DELETE',
  });
}

/**
 * Get all memories linked to a temple.
 */
export async function getTempleMemories(
  treeId: string,
  templeId: string
): Promise<{
  templeId: string;
  memoryCount: number;
  memories: Array<{
    memoryId: string;
    title: string;
    memoryType: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    dateTaken?: string;
  }>;
}> {
  const res = await apiFetch(`/tree/${treeId}/temple/${templeId}/memories`);
  return res.json();
}

/**
 * Get memory counts for all temples in a tree.
 */
export async function getTreeTempleMemoryCounts(
  treeId: string
): Promise<Record<string, number>> {
  /*
  const res = await apiFetch(`/tree/${treeId}/temple-memory-counts`);
  return res.json();
  */
  return {};
}

/**
 * Get generational presence at a temple (for continuity card).
 */
export async function getTempleGenerationalPresence(
  treeId: string,
  templeId: string
): Promise<{
  generationCount: number;
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl: string | null }>;
}> {
  const res = await apiFetch(`/tree/${treeId}/temple/${templeId}/generational-presence`);
  return res.json();
}

/**
 * Get persons tagged in memories at a specific temple (for "Also at this temple" panel).
 */
export async function getTempleMembers(
  treeId: string,
  templeId: string,
  excludeMemoryId?: string
): Promise<Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl: string | null; memoryCount: number }>> {
  const qs = excludeMemoryId ? `?excludeMemoryId=${encodeURIComponent(excludeMemoryId)}` : '';
  const res = await apiFetch(`/tree/${treeId}/temple/${templeId}/members-from-memories${qs}`);
  return res.json();
}

/**
 * Get festival coverage for a temple: how many memories exist per festival name.
 */
export async function getFestivalCoverage(
  treeId: string,
  templeId: string,
  festivals: string[]
): Promise<Record<string, number>> {
  const res = await apiFetch(`/tree/${treeId}/temple/${templeId}/festival-coverage`, {
    method: 'POST',
    body: JSON.stringify({ festivals }),
  });
  return res.json();
}

// ============================================================================
// Temple Insights
// ============================================================================

export interface TempleInsights {
  totalLinks: number;
  totalMemories: number;
  templeStats: Array<{
    templeId: string;
    connectionType: string;
    linkedPersonCount: number;
    memoryCount: number;
  }>;
}

/**
 * Get aggregated temple insights for a tree.
 */
export async function getTempleInsights(treeId: string): Promise<TempleInsights> {
  const res = await apiFetch(`/tree/${treeId}/temple-insights`);
  return res.json();
}
