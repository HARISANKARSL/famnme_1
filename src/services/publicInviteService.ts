/**
 * Public Invite Service (frontend)
 *
 * Unauthenticated client for the /api/public/invite/:token endpoints.
 * Returns sanitized tree data (names, photos, relationships only).
 */

import { API_BASE_URL } from '@/config/api'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'

export interface PublicInvitation {
  invitationId: string
  treeId: string
  treeName: string | null
  invitedByName: string | null
  targetPersonId: string | null
  targetPersonName: string | null
  targetPersonPhoto: string | null
  personalMessage: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
}

export interface PublicTreeWindow {
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  focusPersonId: string | null
  invitedPersonId: string | null
  treeName: string | null
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function getPublicInvitation(token: string): Promise<PublicInvitation> {
  const data = await publicFetch<{ invitation: PublicInvitation }>(`/public/invite/${token}`)
  return data.invitation
}

export async function getPublicTreeWindow(
  token: string,
  focusPersonId?: string
): Promise<PublicTreeWindow> {
  const qs = focusPersonId ? `?focusPersonId=${encodeURIComponent(focusPersonId)}` : ''
  return publicFetch<PublicTreeWindow>(`/public/invite/${token}/tree-window${qs}`)
}
