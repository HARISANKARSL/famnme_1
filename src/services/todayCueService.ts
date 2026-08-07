/**
 * todayCueService — fetches the server-ranked Today cue.
 *
 * The TodayCard prefers the server cue when available (it has access to
 * cross-cutting signals like pending change requests and the user's streak
 * state from PostgreSQL) and falls back to its client-side engine on error
 * or when the server returns `cue: null`.
 */
import { API_BASE_URL } from '@/config/api'
import { getAuthToken } from '@/lib/auth'

export interface ServerTodayCue {
  type: 'birthday' | 'anniversary' | 'pending_cr' | 'streak_at_risk' | 'streak_milestone'
  priority: number
  headline: string
  body: string
  primaryLabel: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  accent: 'indigo' | 'gold' | 'coral' | 'green'
  payload?: Record<string, unknown>
}

export async function fetchTodayCue(treeId: string): Promise<ServerTodayCue | null> {
  if (!treeId) return null
  try {
    const token = getAuthToken()
    const r = await fetch(`${API_BASE_URL}/today-cue/${encodeURIComponent(treeId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!r.ok) return null
    const data = await r.json() as { cue: ServerTodayCue | null }
    return data.cue ?? null
  } catch {
    return null
  }
}
