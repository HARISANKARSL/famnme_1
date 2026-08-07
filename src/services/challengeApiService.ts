/**
 * challengeApiService — Frontend API client for Daily Challenge stats.
 * Fetches/saves gamification stats from the backend.
 */

import { resolveBackendUrl } from '@/config/api'

const API_BASE = resolveBackendUrl('/api')

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface ChallengeStats {
  totalXP: number
  challengesCompleted: number
  correctAnswers: number
  currentStreak: number
  longestStreak: number
  lastPlayedDate: string
  level: number
}

/** Fetch stats from backend. Returns null on error (offline/first-time). */
export async function fetchChallengeStats(treeId: string): Promise<ChallengeStats | null> {
  try {
    const res = await fetch(`${API_BASE}/tree/${treeId}/challenge-stats`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Save stats to backend. Fire-and-forget — does not throw. */
export async function saveChallengeStats(treeId: string, stats: ChallengeStats): Promise<void> {
  try {
    await fetch(`${API_BASE}/tree/${treeId}/challenge-stats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(stats),
    })
  } catch {
    // Silently fail — localStorage is the fallback
  }
}

/** Merge two stats objects, taking the maximum of each numeric field. */
export function mergeStats(local: ChallengeStats, remote: ChallengeStats): ChallengeStats {
  return {
    totalXP: Math.max(local.totalXP, remote.totalXP),
    challengesCompleted: Math.max(local.challengesCompleted, remote.challengesCompleted),
    correctAnswers: Math.max(local.correctAnswers, remote.correctAnswers),
    currentStreak: Math.max(local.currentStreak, remote.currentStreak),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastPlayedDate: local.lastPlayedDate > remote.lastPlayedDate ? local.lastPlayedDate : remote.lastPlayedDate,
    level: Math.max(local.level, remote.level),
  }
}
