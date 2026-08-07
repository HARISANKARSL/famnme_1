/**
 * ContinueWhereYouLeftOff — Phase 3 / 6.11
 *
 * Surface the last person the user touched in this tree as a one-tap
 * "pick up where you left off" card on the dashboard. Hidden when the
 * user has no recent interaction within the last 30 days.
 */
import { useEffect, useState } from 'react'
import { Clock, ArrowRight } from 'lucide-react'
import { getLastTouchedPerson } from '@/services/sessionContinuityService'

interface ContinueWhereYouLeftOffProps {
  treeId: string
  /** Resolves a personId → display name + photo when continuity store lacks it. */
  resolvePerson?: (personId: string) => { firstName?: string; lastName?: string; profilePhotoUrl?: string | null } | null
  onOpenProfile: (personId: string) => void
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function relativeTime(at: number): string {
  const diff = Date.now() - at
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000)
    if (hours <= 0) return 'just now'
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
  return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`
}

export function ContinueWhereYouLeftOff({
  treeId,
  resolvePerson,
  onOpenProfile,
}: ContinueWhereYouLeftOffProps) {
  const [last, setLast] = useState<{ personId: string; personName?: string; at: number } | null>(null)

  useEffect(() => {
    if (!treeId) { setLast(null); return }
    const v = getLastTouchedPerson(treeId)
    if (!v) { setLast(null); return }
    if (Date.now() - v.at > THIRTY_DAYS_MS) { setLast(null); return }
    setLast(v)
  }, [treeId])

  if (!last) return null

  const fallback = resolvePerson?.(last.personId)
  const displayName = last.personName
    || [fallback?.firstName, fallback?.lastName].filter(Boolean).join(' ')
    || 'this person'

  return (
    <button
      onClick={() => onOpenProfile(last.personId)}
      className="group w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-100 dark:ring-[#333] px-4 py-3 hover:bg-[#F8F6F1] dark:hover:bg-[#262626] transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-full bg-[#C2A46D]/15 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4 text-[#8B6C2E]" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-[#8B7355] dark:text-[#A19F9D]">
          Continue where you left off
        </p>
        <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] truncate">
          {displayName}
          <span className="ml-1.5 text-[11.5px] font-normal text-stone-400">
            · {relativeTime(last.at)}
          </span>
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4] group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  )
}
