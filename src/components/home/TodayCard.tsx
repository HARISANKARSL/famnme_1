/**
 * TodayCard — Phase 2 / C1 + 6.1
 *
 * Purpose-first dashboard hero: one actionable cue per day, picked by a
 * priority algorithm. Users come to the dashboard to do one thing, not to
 * browse. The card surfaces that one thing above the fold.
 *
 * Priority order (first match wins):
 *   1. Birthday today / tomorrow
 *   2. Pending suggested edits (`pendingEditCount > 0`)
 *   3. Anniversary today
 *   4. Un-tagged memories
 *   5. Streak about to break (current=0 AND was active yesterday)
 *   6. Relive a memory from ≥ 1 year ago
 *   7. Streak milestone approaching
 *   8. Fallback: add a memory prompt
 */
import { useEffect, useState } from 'react'
import type { Person, Union, Memory } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { Cake, FileEdit, Heart, Image as ImageIcon, Flame, Gem, Calendar } from 'lucide-react'
import { nextBadge } from '@/data/streakBadges'
import { fetchTodayCue, type ServerTodayCue } from '@/services/todayCueService'

interface TodayCardProps {
  /** Backend ranks the cue when treeId is supplied; client-side rules are the fallback. */
  treeId?: string
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  memories: Memory[]
  pendingEditCount?: number
  streakDays?: number
  /** true when user was active yesterday but missed a recent streak beat. */
  streakAtRisk?: boolean
  onOpenMemories?: () => void
  onOpenPendingEdits?: () => void
  onOpenProfile?: (personId: string) => void
  onAddMemory?: () => void
}

interface Cue {
  key: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  headline: string
  body: string
  primaryLabel: string
  primaryAction?: () => void
  secondaryLabel?: string
  secondaryAction?: () => void
  accent: 'indigo' | 'gold' | 'coral' | 'green'
}

const ACCENTS = {
  indigo: { bg: 'bg-[#2F3E8F]/[0.06] dark:bg-[#2F3E8F]/[0.12]', ring: 'border-[#2F3E8F]/20 dark:border-[#2F3E8F]/30', icon: 'text-[#2F3E8F] dark:text-[#8CA0FF]', btn: 'bg-[#2F3E8F] hover:brightness-110' },
  gold:   { bg: 'bg-[#C2A46D]/[0.10] dark:bg-[#C2A46D]/[0.14]', ring: 'border-[#C2A46D]/30 dark:border-[#C2A46D]/30', icon: 'text-[#8B6C2E] dark:text-[#D9BE8A]', btn: 'bg-[#C2A46D] hover:brightness-110 text-[#3D2E1F]' },
  coral:  { bg: 'bg-[#C29A94]/[0.12] dark:bg-[#C29A94]/[0.18]', ring: 'border-[#C29A94]/30 dark:border-[#C29A94]/30', icon: 'text-[#8E5A55] dark:text-[#D9A8A1]', btn: 'bg-[#8E5A55] hover:brightness-110' },
  green:  { bg: 'bg-[#6B8E5A]/[0.10] dark:bg-[#6B8E5A]/[0.14]', ring: 'border-[#6B8E5A]/30 dark:border-[#6B8E5A]/30', icon: 'text-[#52744A] dark:text-[#A8C69C]', btn: 'bg-[#52744A] hover:brightness-110' },
} as const

function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function sameMonthDay(a: Date, b: Date): boolean { return a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }

export function TodayCard({
  treeId,
  persons, unions, relationships, memories,
  pendingEditCount = 0,
  streakDays = 0,
  streakAtRisk = false,
  onOpenMemories, onOpenPendingEdits, onOpenProfile, onAddMemory,
}: TodayCardProps) {
  // Backend priority engine — fetched once per treeId; falls back to client cue on null.
  // We render only AFTER the server fetch resolves so the user doesn't see a
  // client-computed cue flash to a server-picked one a moment later.
  const [serverCue, setServerCue] = useState<ServerTodayCue | null>(null)
  const [serverResolved, setServerResolved] = useState<boolean>(!treeId)
  useEffect(() => {
    if (!treeId) { setServerResolved(true); return }
    setServerResolved(false)
    let cancelled = false
    fetchTodayCue(treeId)
      .then(c => { if (!cancelled) setServerCue(c) })
      .catch(() => { /* fall back to client cue on error */ })
      .finally(() => { if (!cancelled) setServerResolved(true) })
    return () => { cancelled = true }
  }, [treeId])

  if (!serverResolved) {
    return (
      <section
        aria-label="Today on your tree"
        aria-busy="true"
        className="rounded-2xl border border-[#E2DBCE]/60 dark:border-[#2a2a2a] bg-white/40 dark:bg-[#1a1a1a]/40 p-5 md:p-6 animate-pulse"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-[#E2DBCE]/70 dark:bg-[#2a2a2a]" />
          <div className="h-3 w-32 rounded bg-[#E2DBCE]/70 dark:bg-[#2a2a2a]" />
        </div>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E2DBCE]/70 dark:bg-[#2a2a2a]" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-2/3 rounded bg-[#E2DBCE]/70 dark:bg-[#2a2a2a]" />
            <div className="h-3 w-1/2 rounded bg-[#E2DBCE]/60 dark:bg-[#2a2a2a]/80" />
            <div className="h-8 w-28 rounded-lg bg-[#E2DBCE]/60 dark:bg-[#2a2a2a]/80 mt-2" />
          </div>
        </div>
      </section>
    )
  }

  const cue = serverCue ? mapServerCue(serverCue) : pickCue()
  if (!cue) return null
  const accent = ACCENTS[cue.accent]
  const Icon = cue.icon

  function mapServerCue(s: ServerTodayCue): Cue {
    const iconByType: Record<ServerTodayCue['type'], Cue['icon']> = {
      birthday:        Cake,
      anniversary:     Heart,
      pending_cr:      FileEdit,
      streak_at_risk:  Flame,
      streak_milestone: Flame,
    }
    return {
      key: s.type,
      icon: iconByType[s.type] || Gem,
      headline: s.headline,
      body: s.body,
      primaryLabel: s.primaryLabel,
      primaryAction: () => {
        if (s.type === 'birthday' && s.payload?.personId) {
          onOpenProfile?.(String(s.payload.personId))
          return
        }
        if (s.type === 'pending_cr' && onOpenPendingEdits) {
          onOpenPendingEdits()
          return
        }
        if (s.primaryHref) {
          window.location.assign(s.primaryHref)
          return
        }
        onAddMemory?.()
      },
      secondaryLabel: s.secondaryLabel,
      secondaryAction: s.secondaryLabel ? onAddMemory : undefined,
      accent: s.accent,
    }
  }

  return (
    <section
      aria-label="Today on your tree"
      className={`rounded-2xl border ${accent.bg} ${accent.ring} p-5 md:p-6`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gem className={`w-4 h-4 ${accent.icon}`} strokeWidth={1.8} />
        <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${accent.icon}`}>
          Today on your tree
        </span>
      </div>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${accent.bg} ring-1 ${accent.ring} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${accent.icon}`} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-[18px] md:text-[20px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] leading-tight">
            {cue.headline}
          </h2>
          <p className="text-[13px] text-[#5B5449] dark:text-[#B8B8B8] mt-1">{cue.body}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {cue.primaryAction && (
              <button
                type="button"
                onClick={cue.primaryAction}
                className={`inline-flex items-center rounded-lg text-white text-[13px] font-semibold px-3.5 py-2 ${accent.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2F3E8F]/40`}
              >
                {cue.primaryLabel}
              </button>
            )}
            {cue.secondaryLabel && cue.secondaryAction && (
              <button
                type="button"
                onClick={cue.secondaryAction}
                className="inline-flex items-center rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] px-3.5 py-2 hover:border-[#2F3E8F]/50"
              >
                {cue.secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  function pickCue(): Cue | null {
    const today = new Date()
    const tomorrow = addDays(today, 1)

    // 1. Birthday today or tomorrow
    const upcomingBdays = persons
      .filter(p => !p.isDeleted && !!p.birthDate)
      .map(p => {
        const bd = new Date(p.birthDate!)
        const nextBirthday = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
        if (nextBirthday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          nextBirthday.setFullYear(today.getFullYear() + 1)
        }
        return { p, bd, nextBirthday }
      })
      .filter(({ nextBirthday }) => sameMonthDay(nextBirthday, today) || sameMonthDay(nextBirthday, tomorrow))
      .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
    if (upcomingBdays.length > 0) {
      const { p, nextBirthday } = upcomingBdays[0]
      const name = `${p.firstName} ${p.lastName || ''}`.trim()
      const when = sameMonthDay(nextBirthday, today) ? 'today' : 'tomorrow'
      return {
        key: 'birthday',
        icon: Cake,
        headline: `${name}'s birthday is ${when}`,
        body: 'Send a wish or drop a memory on their profile.',
        primaryLabel: 'Open profile',
        primaryAction: () => onOpenProfile?.(p.personId),
        secondaryLabel: 'Add a memory',
        secondaryAction: onAddMemory,
        accent: 'gold',
      }
    }

    // 2. Pending suggested edits
    if (pendingEditCount > 0 && onOpenPendingEdits) {
      return {
        key: 'cr',
        icon: FileEdit,
        headline: `${pendingEditCount} suggested edit${pendingEditCount === 1 ? '' : 's'} waiting for review`,
        body: 'Collaborators have proposed changes. Approve or request revisions.',
        primaryLabel: 'Review now',
        primaryAction: onOpenPendingEdits,
        accent: 'indigo',
      }
    }

    // 3. Anniversary today
    const annivToday = unions.find(u => {
      if (!u.startDate) return false
      const ad = new Date(u.startDate)
      return ad.getMonth() === today.getMonth() && ad.getDate() === today.getDate()
    })
    if (annivToday) {
      const partners = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === annivToday.unionId)
        .map(r => persons.find(p => p.personId === r.fromId)?.firstName)
        .filter(Boolean) as string[]
      const names = partners.join(' & ') || 'A couple'
      const years = today.getFullYear() - new Date(annivToday.startDate!).getFullYear()
      return {
        key: 'anniv',
        icon: Heart,
        headline: `${names} — ${years} year anniversary today`,
        body: 'Wish them. Add a memory of a favorite moment from their story.',
        primaryLabel: 'Add a memory',
        primaryAction: onAddMemory,
        accent: 'coral',
      }
    }

    // 4. Un-tagged photos — only count memories with media but no linked persons
    const untagged = memories.filter(m => {
      if (!m.mediaUrl) return false
      const tagged = m.taggedPersons || (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.files?.[0]?.taggedPersons
      return !tagged || (Array.isArray(tagged) && tagged.length === 0)
    }).length
    if (untagged >= 3) {
      return {
        key: 'untagged',
        icon: ImageIcon,
        headline: `${untagged} photos waiting to be tagged`,
        body: 'Tag family members so memories show up on their profiles.',
        primaryLabel: 'Open memories',
        primaryAction: onOpenMemories,
        accent: 'indigo',
      }
    }

    // 5. Streak about to break
    if (streakAtRisk && streakDays > 0) {
      return {
        key: 'streak-risk',
        icon: Flame,
        headline: `Don't break your ${streakDays}-day streak`,
        body: 'Drop a memory, leave a comment, or add a relative to keep it alive.',
        primaryLabel: 'Add a memory',
        primaryAction: onAddMemory,
        accent: 'coral',
      }
    }

    // 6. Relive a memory (≥ 1 year old)
    const yearAgo = addDays(today, -365)
    const old = memories
      .filter(m => {
        const d = new Date(m.createdAt)
        return !isNaN(d.getTime()) && d <= yearAgo
      })
      .sort(() => Math.random() - 0.5)[0]
    if (old) {
      const years = Math.max(1, Math.floor((Date.now() - new Date(old.createdAt).getTime()) / (365.25 * 86_400_000)))
      return {
        key: 'relive',
        icon: Calendar,
        headline: `A memory from ${years} year${years === 1 ? '' : 's'} ago`,
        body: old.title || 'Take a moment to reread what you captured.',
        primaryLabel: 'Relive it',
        primaryAction: onOpenMemories,
        accent: 'green',
      }
    }

    // 7. Streak milestone approaching
    const next = nextBadge(streakDays)
    if (streakDays > 0 && next && next.day - streakDays <= 3) {
      return {
        key: 'milestone',
        icon: Flame,
        headline: `${next.day - streakDays} day${next.day - streakDays === 1 ? '' : 's'} to your ${next.title} badge`,
        body: 'Keep the flame alive.',
        primaryLabel: 'Add a memory',
        primaryAction: onAddMemory,
        accent: 'gold',
      }
    }

    // 8. Fallback — invite prompt writing
    return {
      key: 'prompt',
      icon: Gem,
      headline: 'Tell us one small story today',
      body: 'Even a sentence becomes history once it\'s written down.',
      primaryLabel: 'Open prompts',
      primaryAction: onOpenMemories,
      accent: 'indigo',
    }
  }
}
