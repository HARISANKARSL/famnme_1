/**
 * Attachment Service - Frontend API Client
 */

import { resolveBackendUrl } from '@/config/api';
import type { Attachment } from '@/types';

const API_BASE = resolveBackendUrl('/api');

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export async function uploadAttachments(
  personId: string,
  treeId: string,
  files: File[]
): Promise<Attachment[]> {
  const formData = new FormData();
  formData.append('treeId', treeId);
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/person/${personId}/attachments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message || err.error || 'Upload failed');
  }

  return res.json();
}

export async function listAttachments(personId: string): Promise<Attachment[]> {
  const res = await apiFetch(`/person/${personId}/attachments`);
  return res.json();
}

export async function updateCaption(attachmentId: string, caption: string): Promise<Attachment> {
  const res = await apiFetch(`/attachment/${attachmentId}`, {
    method: 'PUT',
    body: JSON.stringify({ caption }),
  });
  return res.json();
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiFetch(`/attachment/${attachmentId}`, { method: 'DELETE' });
}
