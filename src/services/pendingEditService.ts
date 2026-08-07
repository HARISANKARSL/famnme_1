/**
 * Pending Edit Service - Frontend API Client
 */

import { resolveBackendUrl } from '@/config/api';
import type { PendingEdit } from '@/types';

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

export async function getReviewMode(treeId: string): Promise<boolean> {
  const res = await apiFetch(`/tree/${treeId}/review-mode`);
  const data = await res.json();
  return data.reviewMode;
}

export async function setReviewMode(treeId: string, enabled: boolean): Promise<void> {
  await apiFetch(`/tree/${treeId}/review-mode`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

export async function getPendingEditCount(treeId: string): Promise<number> {
  const res = await apiFetch(`/tree/${treeId}/pending-edit-count`);
  const data = await res.json();
  return data.count;
}

export async function listPendingEdits(
  treeId: string,
  status = 'pending',
  limit = 50,
  offset = 0
): Promise<{ edits: PendingEdit[]; total: number }> {
  const res = await apiFetch(`/tree/${treeId}/pending-edits?status=${status}&limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function approvePendingEdit(editId: string): Promise<{ edit: PendingEdit }> {
  const res = await apiFetch(`/pending-edit/${editId}/approve`, { method: 'POST' });
  return res.json();
}

export async function rejectPendingEdit(editId: string, reason?: string): Promise<PendingEdit> {
  const res = await apiFetch(`/pending-edit/${editId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.json();
}
