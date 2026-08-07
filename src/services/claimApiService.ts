/**
 * Claim API Service
 *
 * Client-side service for person claims and the invite-to-claim flow.
 */

import type { PersonClaim, TreeInvitation } from '@/types'
import { getAuthToken } from '@/lib/auth'
import { API_BASE_URL } from '@/config/api'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

// ── Invitation by Token (public — no auth required) ──────────────────────

/** Fetch invitation details by invite token (public, for claim landing page). */
export async function getInvitationByToken(token: string): Promise<TreeInvitation> {
  return apiFetch<TreeInvitation>(`/invitation/by-token/${token}`)
}

/** Accept invitation and claim the person node in one step. */
export async function acceptAndClaim(token: string): Promise<{
  success: boolean
  treeId: string
  treeName?: string
  personId?: string
  claimId?: string
  alreadyClaimed?: boolean
}> {
  return apiFetch(`/invitation/by-token/${token}/accept-and-claim`, { method: 'POST' })
}

// ── Claims (auth required) ───────────────────────────────────────────────

/** Get my claim for a tree. */
export async function getMyClaim(treeId: string): Promise<{ claim: PersonClaim | null }> {
  return apiFetch(`/tree/${treeId}/claim/me`)
}

/** List all claims for a tree (owner view). */
export async function getTreeClaims(treeId: string): Promise<{ claims: PersonClaim[] }> {
  return apiFetch(`/tree/${treeId}/claims`)
}

/** Get claim statuses for all persons in a tree (visual indicators). */
export async function getTreeClaimStatuses(treeId: string): Promise<{
  claimStatuses: Record<string, { status: string; userId: string }>
}> {
  return apiFetch(`/tree/${treeId}/claim-statuses`)
}

/** Self-service claim request. */
export async function requestClaim(treeId: string, personId: string): Promise<{ claim: PersonClaim }> {
  return apiFetch(`/tree/${treeId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ personId }),
  })
}

/** Approve a claim (owner). */
export async function approveClaim(treeId: string, claimId: string): Promise<{ claim: PersonClaim }> {
  return apiFetch(`/tree/${treeId}/claim/${claimId}/approve`, { method: 'PUT' })
}

/** Reject a claim (owner). */
export async function rejectClaim(treeId: string, claimId: string): Promise<{ claim: PersonClaim }> {
  return apiFetch(`/tree/${treeId}/claim/${claimId}/reject`, { method: 'PUT' })
}

/** Revoke a claim (owner). */
export async function revokeClaim(treeId: string, claimId: string): Promise<{ claim: PersonClaim }> {
  return apiFetch(`/tree/${treeId}/claim/${claimId}/revoke`, { method: 'PUT' })
}

/** Unclaim — remove my own claim. */
export async function unclaim(treeId: string): Promise<{ success: boolean }> {
  return apiFetch(`/tree/${treeId}/claim/me`, { method: 'DELETE' })
}
