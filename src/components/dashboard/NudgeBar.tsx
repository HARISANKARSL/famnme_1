/**
 * NudgeBar — Slim dismissible nudge bar below greeting
 *
 * Shows one contextual nudge at a time (birthday soon, missing photos, etc.)
 * Dismissed nudges are stored in localStorage and don't reappear for 24 hours.
 */

import { useMemo, useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import type { Person } from '@/types'

interface Props {
  persons: Person[]
  onOpenProfile?: (personId: string) => void
  onOpenMemories?: () => void
}

interface Nudge {
  id: string
  text: string
  cta: string
  action?: () => void
}

function isDismissed(id: string): boolean {
  try {
    const raw = localStorage.getItem(`fc_nudge_dismissed_${id}`)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    return Date.now() - ts < 86400000 // 24h
  } catch { return false }
}

function dismiss(id: string) {
  try { localStorage.setItem(`fc_nudge_dismissed_${id}`, String(Date.now())) } catch {}
}

function daysUntilBirthday(birthDate: string): number {
  const [, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(today.getFullYear(), m - 1, d)
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}

export function NudgeBar({ persons, onOpenProfile, onOpenMemories }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const nudges = useMemo((): Nudge[] => {
    const result: Nudge[] = []

    // 1. Upcoming birthday in 1-5 days
    const soonBirthday = persons.find(p => {
      if (!p.birthDate || p.isLiving === false || p.deathDate) return false
      const d = daysUntilBirthday(p.birthDate)
      return d >= 1 && d <= 5
    })
    if (soonBirthday) {
      const d = daysUntilBirthday(soonBirthday.birthDate!)
      const id = `birthday_${soonBirthday.personId}_${new Date().toDateString()}`
      result.push({
        id,
        text: `${soonBirthday.firstName}'s birthday is in ${d} day${d !== 1 ? 's' : ''}`,
        cta: 'View profile',
        action: onOpenProfile ? () => onOpenProfile(soonBirthday.personId) : undefined,
      })
    }

    // 2. Missing photos
    const missingPhotos = persons.filter(p => !p.profilePhotoUrl).length
    if (missingPhotos >= 3) {
      const id = `missing_photos_${Math.floor(Date.now() / 604800000)}`
      result.push({
        id,
        text: `${missingPhotos} family members have no profile photo`,
        cta: 'Fix now',
        action: onOpenProfile && persons.find(p => !p.profilePhotoUrl)
          ? () => onOpenProfile!(persons.find(p => !p.profilePhotoUrl)!.personId)
          : undefined,
      })
    }

    // 3. Memories nudge (if tree is non-empty)
    if (persons.length >= 3 && onOpenMemories) {
      const id = `add_memory_${Math.floor(Date.now() / 604800000)}`
      result.push({
        id,
        text: "Capture a family memory before it's forgotten",
        cta: 'Add memory',
        action: onOpenMemories,
      })
    }

    return result.filter(n => !isDismissed(n.id) && !dismissedIds.has(n.id))
  }, [persons, onOpenProfile, onOpenMemories, dismissedIds])

  const [currentIdx, setCurrentIdx] = useState(0)

  if (nudges.length === 0) return null

  const safeIdx = Math.min(currentIdx, nudges.length - 1)
  const nudge = nudges[safeIdx]

  function handleDismiss() {
    dismiss(nudge.id)
    setDismissedIds(prev => new Set([...prev, nudge.id]))
    if (safeIdx >= nudges.length - 1) setCurrentIdx(Math.max(0, nudges.length - 2))
  }

  return (
    <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50/80 to-sky-50/60 dark:from-blue-950/30 dark:to-blue-950/20 border border-[#2F3E8F]/30/50 dark:border-blue-800/30 text-sm animate-fade-in">
      <p className="flex-1 min-w-0 text-[13px] text-[#1e3a5f] dark:text-[#93c5fd] truncate">{nudge.text}</p>
      {nudge.action && (
        <button
          onClick={nudge.action}
          className="flex items-center gap-0.5 text-[12px] font-medium text-[#2F3E8F] hover:text-[#A8603A] shrink-0 transition-colors"
        >
          {nudge.cta} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="p-0.5 text-[#8B7355] hover:text-[#3D2E1F] transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
