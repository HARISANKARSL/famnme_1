/**
 * Ancestral Identity API Service — frontend client.
 */

import { API_BASE_URL } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface AncestralIdentityData {
  summary: {
    narrative: string
    heritageTags: string[]
    isSparse: boolean
  }
  surname: {
    name: string
    meaning: string
    originRegion: string
    communityNotes: string[]
    historicalNotes: string
    learnMore: string
  } | null
  lineage: {
    oldestAncestor: { name: string; birthYear?: string; place?: string } | null
    generations: number
    spread: string[]
  }
  migration: {
    points: Array<{ place: string; generation: number }>
    path: string[]
  }
  culture: {
    language: string
    festivals: string[]
    traditions: string[]
    food: string[]
    languageNotes: string
  }
  patterns: {
    professions: string[]
    education: string[]
    roles: string[]
  }
  cacheInfo: {
    sharedHits: number
    personalHit: boolean
  }
}

export async function fetchAncestralIdentity(
  treeId: string,
  personId: string,
): Promise<AncestralIdentityData> {
  const res = await fetch(
    `${API_BASE_URL}/ancestral-identity/${encodeURIComponent(personId)}?treeId=${encodeURIComponent(treeId)}`,
    { headers: getHeaders() },
  )
  if (!res.ok) throw new Error('Failed to load ancestral identity')
  return res.json() as Promise<AncestralIdentityData>
}

export async function regenerateAncestralIdentity(
  treeId: string,
  personId: string,
  section: 'narrative' | 'patterns' | 'all' = 'all',
): Promise<AncestralIdentityData> {
  const res = await fetch(
    `${API_BASE_URL}/ancestral-identity/${encodeURIComponent(personId)}/regenerate`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ treeId, section }),
    },
  )
  if (!res.ok) throw new Error('Failed to regenerate ancestral identity')
  return res.json() as Promise<AncestralIdentityData>
}
