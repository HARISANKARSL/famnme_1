/**
 * institutionResolver — small helper that turns a templeId into a
 * "resolved" institution summary (name, location, photo, religion).
 *
 * The templeId can reference either:
 *   - a local SacredPlace from `src/data/temples/` (synchronous lookup), or
 *   - a Google Maps placeId cached as a DynamicTemple in Neo4j (async fetch).
 */

import { getTempleById } from '@/data/temples'
import { getCachedDynamicTemple } from '@/services/googleMapsApiService'
import type { DynamicTemple } from '@/types'
import type { SacredPlace } from '@/data/temples/types'

export interface ResolvedInstitution {
  templeId: string
  name: string
  location: string
  religion: 'Hindu' | 'Christian' | 'Islam' | 'Unknown'
  photoUrl?: string
  source: 'local' | 'dynamic' | 'unknown'
  local?: SacredPlace
  dynamic?: DynamicTemple
}

/** Synchronous try — only resolves local-DB temples. */
export function resolveLocalInstitution(templeId: string): ResolvedInstitution | null {
  const temple = getTempleById(templeId)
  if (!temple) return null
  return {
    templeId,
    name: temple.name,
    location: [temple.location, temple.state].filter(Boolean).join(', '),
    religion: temple.religion,
    source: 'local',
    local: temple,
  }
}

/** Async full resolve — checks local first, then Neo4j DynamicTemple cache. */
export async function resolveInstitution(templeId: string): Promise<ResolvedInstitution> {
  const local = resolveLocalInstitution(templeId)
  if (local) return local
  const dynamic = await getCachedDynamicTemple(templeId).catch(() => null)
  if (dynamic) {
    return {
      templeId,
      name: dynamic.name,
      location: dynamic.formattedAddress,
      religion: dynamic.religion === 'Unknown' ? 'Unknown' : dynamic.religion,
      photoUrl: dynamic.photoUrl,
      source: 'dynamic',
      dynamic,
    }
  }
  // Fallback: templeId is unknown on the client (maybe deleted or stale)
  return {
    templeId,
    name: 'Sacred place',
    location: '',
    religion: 'Unknown',
    source: 'unknown',
  }
}

/** Batch-resolve many templeIds in parallel. */
export async function resolveInstitutions(templeIds: string[]): Promise<Record<string, ResolvedInstitution>> {
  const entries = await Promise.all(
    templeIds.map(async id => [id, await resolveInstitution(id)] as const)
  )
  return Object.fromEntries(entries)
}
