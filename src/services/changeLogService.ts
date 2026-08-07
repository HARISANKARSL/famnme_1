/**
 * ChangeLog Service - Frontend API Client
 */

import { resolveBackendUrl } from '@/config/api';
import type { ChangeLog } from '@/types';

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

export async function getPersonHistory(
  personId: string,
  limit = 20,
  offset = 0
): Promise<{ entries: ChangeLog[]; total: number }> {
  const res = await apiFetch(`/person/${personId}/history?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function revertChange(changeLogId: string): Promise<{ success: boolean; revertEntry?: ChangeLog }> {
  const res = await apiFetch(`/changelog/${changeLogId}/revert`, { method: 'POST' });
  return res.json();
}
