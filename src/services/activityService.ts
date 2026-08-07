/**
 * Activity Feed Service - Frontend API Client
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

export async function getTreeActivity(
  treeId: string,
  limit = 50,
  offset = 0
): Promise<{ entries: ChangeLog[]; total: number }> {
  const res = await apiFetch(`/tree/${treeId}/activity?limit=${limit}&offset=${offset}`);
  return res.json();
}
