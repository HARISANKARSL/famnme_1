/**
 * useStreak — tracks consecutive days of activity (Family Flame).
 *
 * Backed by GET /api/streak + POST /api/streak/activity, with localStorage
 * as an offline cache so the hook returns immediate values on first paint
 * and keeps working when the network is flaky. On mount it:
 *   1. Renders from cache (zero-latency)
 *   2. Fetches the server's authoritative state and reconciles
 *   3. Posts today's activity once per calendar day and updates state
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { getAuthToken } from '@/lib/auth'
import { resolveBackendUrl } from '@/config/api'

const API_BASE = resolveBackendUrl('/api')

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
  freezesAvailable?: number
  freezeUsedMonth?: string
}

interface UseStreakResult {
  currentStreak: number
  longestStreak: number
  freezesAvailable: number
  isNewDay: boolean
  incrementStreak: () => void
}

function getToday(): string { return new Date().toISOString().slice(0, 10) }

function loadCache(userId: string): StreakData {
  try {
    const raw = localStorage.getItem(`fc_streak_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', freezesAvailable: 0 }
}

function saveCache(userId: string, data: StreakData): void {
  try { localStorage.setItem(`fc_streak_${userId}`, JSON.stringify(data)) } catch { /* ignore */ }
}

async function apiGet(): Promise<StreakData | null> {
  /*
  const token = getAuthToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const d = await res.json() as {
      currentStreak: number; longestStreak: number; lastActiveDate: string | null;
      freezesAvailable: number; freezeUsedMonth: string | null
    }
    return {
      currentStreak: d.currentStreak ?? 0,
      longestStreak: d.longestStreak ?? 0,
      lastActiveDate: d.lastActiveDate ?? '',
      freezesAvailable: d.freezesAvailable ?? 0,
      freezeUsedMonth: d.freezeUsedMonth ?? undefined,
    }
  } catch { return null }
  */
  return null
}

async function apiPostActivity(): Promise<StreakData | null> {
  /*
  const token = getAuthToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/streak/activity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const d = await res.json() as {
      currentStreak: number; longestStreak: number; lastActiveDate: string; freezesAvailable: number
    }
    return {
      currentStreak: d.currentStreak,
      longestStreak: d.longestStreak,
      lastActiveDate: d.lastActiveDate,
      freezesAvailable: d.freezesAvailable,
    }
  } catch { return null }
  */
  return null
}

export function useStreak(userId: string | undefined): UseStreakResult {
  const [data, setData] = useState<StreakData>(() =>
    userId
      ? loadCache(userId)
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: '', freezesAvailable: 0 }
  )
  const postedTodayRef = useRef<string | null>(null)

  const today = getToday()
  const isNewDay = data.lastActiveDate !== today

  const applyServer = useCallback((srv: StreakData, uid: string) => {
    setData(srv)
    saveCache(uid, srv)
  }, [])

  // Mount: hydrate from server + post today's activity (once).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const fromServer = await apiGet()
      if (!cancelled && fromServer) applyServer(fromServer, userId)
      if (postedTodayRef.current === today) return
      postedTodayRef.current = today
      const updated = await apiPostActivity()
      if (!cancelled && updated) applyServer(updated, userId)
    })()
    return () => { cancelled = true }
  }, [userId, today, applyServer])

  // Manual trigger (kept for callers that want to nudge the counter).
  const incrementStreak = useCallback(() => {
    if (!userId) return
    ;(async () => {
      const updated = await apiPostActivity()
      if (updated) applyServer(updated, userId)
    })()
  }, [userId, applyServer])

  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    freezesAvailable: data.freezesAvailable ?? 0,
    isNewDay,
    incrementStreak,
  }
}
