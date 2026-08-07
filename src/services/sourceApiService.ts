/**
 * Source & Evidence API Service (Phase 3)
 * Handles sources, citations, alert notes, and data quality scoring.
 */

import type { Source, SourceInput, SourceCitation, SourceCitationInput, AlertNote, DataQualityScore } from '@/types';
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
// Sources API
// ============================================================================

export async function createSource(treeId: string, source: SourceInput, file?: File): Promise<Source> {
  const token = getAuthToken();

  if (file) {
    // Use FormData when file is present
    const formData = new FormData();
    formData.append('title', source.title);
    formData.append('type', source.type);
    if (source.author) formData.append('author', source.author);
    if (source.publisher) formData.append('publisher', source.publisher);
    if (source.url) formData.append('url', source.url);
    if (source.repositoryName) formData.append('repositoryName', source.repositoryName);
    if (source.notes) formData.append('notes', source.notes);
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/tree/${treeId}/sources`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create source');
    return res.json();
  }

  // No file — use JSON
  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/sources`, {
    method: 'POST',
    body: JSON.stringify(source),
  });
  if (!res.ok) throw new Error('Failed to create source');
  return res.json();
}

export async function createPersonSource(personId: string, payload: any, file?: File): Promise<Source> {
  const token = getAuthToken();
  const formData = new FormData();

  // Add source & citation fields dynamically from payload
  Object.keys(payload).forEach(key => {
    if (payload[key] !== undefined && payload[key] !== null) {
      formData.append(key, payload[key]);
    }
  });

  if (file) {
    formData.append('file', file);
  }

  const res = await fetch(`${API_BASE_URL}/tree/profile/person/${personId}/sources`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to create person source');
  return res.json();
}

export async function getTreeSources(treeId: string): Promise<Source[]> {
  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/sources`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
}

export async function updateSource(sourceId: string, updates: Partial<SourceInput>): Promise<Source> {
  const res = await apiFetch(`${API_BASE_URL}/source/${sourceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update source');
  return res.json();
}

export async function deleteSource(sourceId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/source/${sourceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete source');
}

// ============================================================================
// Citations API
// ============================================================================

export async function addCitation(citation: SourceCitationInput): Promise<SourceCitation> {
  const res = await apiFetch(`${API_BASE_URL}/citation`, {
    method: 'POST',
    body: JSON.stringify(citation),
  });
  if (!res.ok) throw new Error('Failed to add citation');
  return res.json();
}

export async function getPersonCitations(personId: string): Promise<SourceCitation[]> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/citations`);
  if (!res.ok) throw new Error('Failed to fetch citations');
  return res.json();
}

export async function getPersonSources(personId: string): Promise<any[]> {
  const res = await apiFetch(`${API_BASE_URL}/tree/profile/person/${personId}/sources`);
  if (!res.ok) throw new Error('Failed to fetch person sources');
  const json = await res.json();
  return json.data || [];
}

export async function deleteCitation(citationId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/citation/${citationId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete citation');
}

export async function deletePersonSource(sourceId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/tree/profile/source/${sourceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete source');
}

// ============================================================================
// Alert Notes API
// ============================================================================

export async function createAlert(personId: string, treeId: string, alert: { message: string; severity: string }): Promise<AlertNote> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/alerts`, {
    method: 'POST',
    body: JSON.stringify({ ...alert, treeId }),
  });
  if (!res.ok) throw new Error('Failed to create alert');
  return res.json();
}

export async function getPersonAlerts(personId: string): Promise<AlertNote[]> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch person alerts');
  return res.json();
}

export async function getTreeAlerts(treeId: string, includeResolved?: boolean): Promise<AlertNote[]> {
  const params = includeResolved ? '?includeResolved=true' : '';
  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/alerts${params}`);
  if (!res.ok) throw new Error('Failed to fetch tree alerts');
  return res.json();
}

export async function resolveAlert(noteId: string): Promise<AlertNote> {
  const res = await apiFetch(`${API_BASE_URL}/alert/${noteId}/resolve`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function deleteAlert(noteId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/alert/${noteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete alert');
}

// ============================================================================
// Data Quality API
// ============================================================================

export async function getPersonQuality(personId: string): Promise<DataQualityScore> {
  const res = await apiFetch(`${API_BASE_URL}/person/${personId}/quality`);
  if (!res.ok) throw new Error('Failed to fetch person quality score');
  return res.json();
}

export async function getTreeQuality(treeId: string): Promise<{ averageScore: number; persons: DataQualityScore[] }> {
  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/quality`);
  if (!res.ok) throw new Error('Failed to fetch tree quality scores');
  return res.json();
}
