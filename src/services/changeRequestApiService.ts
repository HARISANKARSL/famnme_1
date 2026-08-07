/**
 * Change Request API Service
 *
 * Client-side service for the GitHub PR-style change request system.
 */

import type { ChangeRequest, ChangeItem, ChangeComment, AutoMergeRule, AutoMergeRuleType } from '@/types'
import { getAuthToken } from '@/lib/auth'
import { API_BASE_URL } from '@/config/api'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers as Record<string, string>,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

// ── Change Requests ──────────────────────────────────────────────────────

/** List change requests for a tree. */
export async function getTreeCRs(
  treeId: string,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<{ crs: ChangeRequest[]; total: number }> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))
  const qs = params.toString()
  return apiFetch(`/tree/${treeId}/change-requests${qs ? `?${qs}` : ''}`)
}

/** Get pending CR count (for badge). */
export async function getPendingCRCount(treeId: string): Promise<{ count: number }> {
  return apiFetch(`/tree/${treeId}/change-requests/count`)
}

/** Create and submit a change request. */
export async function createChangeRequest(
  treeId: string,
  title: string,
  description: string | undefined,
  items: Omit<ChangeItem, 'itemId' | 'crId' | 'status' | 'createdAt'>[]
): Promise<{ changeRequest: ChangeRequest }> {
  return apiFetch(`/tree/${treeId}/change-requests`, {
    method: 'POST',
    body: JSON.stringify({ title, description, items }),
  })
}

/** Get a single CR with items and comments. */
export async function getCR(treeId: string, crId: string): Promise<{ changeRequest: ChangeRequest }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}`)
}

/** Merge a CR (apply approved changes to Neo4j). */
export async function mergeCR(treeId: string, crId: string): Promise<{ success: boolean; merged: number; rejected: number }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/merge`, { method: 'PUT' })
}

/** Close (reject) an entire CR. */
export async function closeCR(treeId: string, crId: string, reason?: string): Promise<{ success: boolean }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/close`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
}

/** Withdraw own CR. */
export async function withdrawCR(treeId: string, crId: string): Promise<{ success: boolean }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/withdraw`, { method: 'PUT' })
}

// ── Item-Level Actions ───────────────────────────────────────────────────

/** Approve a single change item. */
export async function approveItem(treeId: string, crId: string, itemId: string, note?: string): Promise<{ success: boolean }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/items/${itemId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  })
}

/** Reject a single change item. */
export async function rejectItem(treeId: string, crId: string, itemId: string, note?: string): Promise<{ success: boolean }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/items/${itemId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  })
}

// ── Comments ─────────────────────────────────────────────────────────────

/** Get comments for a CR. */
export async function getCRComments(treeId: string, crId: string): Promise<{ comments: ChangeComment[] }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/comments`)
}

/** Add a comment to a CR. */
export async function addCRComment(treeId: string, crId: string, text: string, itemId?: string): Promise<{ comment: ChangeComment }> {
  return apiFetch(`/tree/${treeId}/change-requests/${crId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, itemId }),
  })
}

// ── Auto-Merge Rules ─────────────────────────────────────────────────────

/** Get auto-merge rules for a tree. */
export async function getAutoMergeRules(treeId: string): Promise<{ rules: AutoMergeRule[] }> {
  return apiFetch(`/tree/${treeId}/auto-merge-rules`)
}

/** Update auto-merge rules. */
export async function updateAutoMergeRules(
  treeId: string,
  rules: { ruleType: AutoMergeRuleType; isEnabled: boolean }[]
): Promise<{ rules: AutoMergeRule[] }> {
  return apiFetch(`/tree/${treeId}/auto-merge-rules`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  })
}
