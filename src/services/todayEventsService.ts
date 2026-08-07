/**
 * "On This Day" — client-side fetch helper.
 * Calls GET /api/today/events?treeId=... and returns warm-phrased events.
 */

import { resolveBackendUrl } from '@/config/api'

export type TodayEventType = 'birthday' | 'anniversary' | 'death_anniversary'

export interface TodayEvent {
  type: TodayEventType
  personId: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  isLiving: boolean
  eventDate: string
  eventYear: number
  yearsSince: number
  spouse?: {
    personId: string
    firstName: string
    lastName: string
  }
  unionId?: string
}

export interface TodayEventsResponse {
  events: TodayEvent[]
  totals: {
    birthdays: number
    anniversaries: number
    deathAnniversaries: number
    total: number
  }
}

export async function fetchTodayEvents(treeId: string): Promise<TodayEventsResponse> {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(resolveBackendUrl(`/api/today/events?treeId=${encodeURIComponent(treeId)}`), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Failed to load today\u2019s events')
  }
  return res.json()
}

/**
 * Warm, human-friendly message for an event — used in lists and the widget.
 * Example outputs:
 *   "Your grandfather Krishnan was born in 1932."
 *   "Ravi & Meera's wedding anniversary (23 years)."
 *   "Death anniversary of Lakshmi Amma."
 */
export function formatEventMessage(e: TodayEvent): string {
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || 'a family member'
  if (e.type === 'birthday') {
    if (e.isLiving && e.yearsSince > 0) return `${name}\u2019s birthday \u2014 turning ${e.yearsSince} today.`
    if (e.isLiving)                    return `${name}\u2019s birthday today.`
    if (e.eventYear > 0)               return `${name} was born in ${e.eventYear}.`
    return `${name}\u2019s birthday.`
  }
  if (e.type === 'anniversary') {
    const spouse = e.spouse
      ? [e.spouse.firstName, e.spouse.lastName].filter(Boolean).join(' ').trim()
      : ''
    const couple = spouse ? `${e.firstName} & ${spouse}` : name
    if (e.yearsSince > 0)     return `${couple} \u2014 ${e.yearsSince} years of marriage today.`
    if (e.eventYear > 0)      return `${couple} \u2014 wedding anniversary (${e.eventYear}).`
    return `${couple} \u2014 wedding anniversary today.`
  }
  // death_anniversary
  if (e.yearsSince > 0)   return `Remembering ${name} \u2014 ${e.yearsSince} years since their passing.`
  if (e.eventYear > 0)    return `Remembering ${name} (passed ${e.eventYear}).`
  return `Remembering ${name} today.`
}

/** Short label suitable for a list row (shorter than formatEventMessage). */
export function formatEventHeadline(e: TodayEvent): string {
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || 'a family member'
  if (e.type === 'birthday') {
    return e.isLiving && e.yearsSince > 0 ? `${name}\u2019s birthday (${e.yearsSince})` : `${name}\u2019s birthday`
  }
  if (e.type === 'anniversary') {
    const spouse = e.spouse
      ? [e.spouse.firstName, e.spouse.lastName].filter(Boolean).join(' ').trim()
      : ''
    const couple = spouse ? `${e.firstName} & ${spouse}` : name
    return e.yearsSince > 0 ? `${couple} \u2014 ${e.yearsSince} yrs` : `${couple} \u2014 anniversary`
  }
  return `Remembering ${name}${e.yearsSince > 0 ? ` (${e.yearsSince} yrs)` : ''}`
}
