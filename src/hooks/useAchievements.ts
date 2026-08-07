/**
 * useAchievements — Computes milestone badges from tree data
 *
 * Returns all earned achievements and any newly-earned ones since last session.
 */

import { useMemo } from 'react'
import type { Person, Union } from '@/types'

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
}

const MILESTONES: Array<{
  id: string
  emoji: string
  title: string
  description: string
  check: (stats: TreeStats) => boolean
}> = [
  { id: 'first-5', emoji: '\uD83C\uDF31', title: 'Seedling', description: '5 family members added', check: s => s.memberCount >= 5 },
  { id: 'first-10', emoji: '\uD83C\uDF33', title: 'Growing Tree', description: '10 family members added', check: s => s.memberCount >= 10 },
  { id: 'first-25', emoji: '\uD83C\uDF32', title: 'Branching Out', description: '25 family members added', check: s => s.memberCount >= 25 },
  { id: 'first-50', emoji: '\uD83C\uDFF0', title: 'Family Estate', description: '50 family members added', check: s => s.memberCount >= 50 },
  { id: 'century', emoji: '\uD83D\uDC51', title: 'Century Tree', description: '100 family members!', check: s => s.memberCount >= 100 },
  { id: 'gen-3', emoji: '\uD83D\uDCDA', title: 'Three Generations', description: 'Your tree spans 3 generations', check: s => s.generationDepth >= 3 },
  { id: 'gen-5', emoji: '\uD83C\uDFDB\uFE0F', title: 'Deep Roots', description: 'Your tree spans 5 generations', check: s => s.generationDepth >= 5 },
  { id: 'gen-7', emoji: '\u2B50', title: 'Ancient Lineage', description: 'Your tree spans 7 generations', check: s => s.generationDepth >= 7 },
  { id: 'locations-5', emoji: '\uD83D\uDDFA\uFE0F', title: 'Map Maker', description: '5 locations recorded', check: s => s.locationCount >= 5 },
  { id: 'locations-10', emoji: '\u2708\uFE0F', title: 'Far & Wide', description: '10 locations recorded', check: s => s.locationCount >= 10 },
  { id: 'marriages-3', emoji: '\uD83D\uDC9E', title: 'Family Bonds', description: '3 marriages recorded', check: s => s.unionCount >= 3 },
  { id: 'photos-5', emoji: '\uD83D\uDCF8', title: 'Memory Keeper', description: '5 members with photos', check: s => s.photosCount >= 5 },
]

interface TreeStats {
  memberCount: number
  generationDepth: number
  locationCount: number
  unionCount: number
  photosCount: number
}

function computeStats(persons: Person[], unions: Union[], generationDepth: number): TreeStats {
  const locationSet = new Set<string>()
  let photosCount = 0

  for (const p of persons) {
    if (p.birthPlace) locationSet.add(p.birthPlace.toLowerCase().trim())
    if (p.nativePlace) locationSet.add(p.nativePlace.toLowerCase().trim())
    if (p.profilePhotoUrl) photosCount++
  }

  return {
    memberCount: persons.length,
    generationDepth,
    locationCount: locationSet.size,
    unionCount: unions.length,
    photosCount,
  }
}

function loadSeenAchievements(treeId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`fc_achievements_${treeId}`)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveSeenAchievements(treeId: string, seen: Set<string>): void {
  try {
    localStorage.setItem(`fc_achievements_${treeId}`, JSON.stringify([...seen]))
  } catch { /* ignore */ }
}

export function useAchievements(
  treeId: string,
  persons: Person[],
  unions: Union[],
  generationDepth: number
): { earned: Achievement[]; newlyEarned: Achievement[] } {
  return useMemo(() => {
    const stats = computeStats(persons, unions, generationDepth)
    const earned: Achievement[] = []
    const seen = loadSeenAchievements(treeId)
    const newlyEarned: Achievement[] = []

    for (const m of MILESTONES) {
      if (m.check(stats)) {
        const achievement: Achievement = { id: m.id, emoji: m.emoji, title: m.title, description: m.description }
        earned.push(achievement)
        if (!seen.has(m.id)) {
          newlyEarned.push(achievement)
          seen.add(m.id)
        }
      }
    }

    if (newlyEarned.length > 0) {
      saveSeenAchievements(treeId, seen)
    }

    return { earned, newlyEarned }
  }, [treeId, persons, unions, generationDepth])
}
