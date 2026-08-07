/**
 * OnboardingChecklist — Phase 2 / 5.4
 *
 * Zeigarnik-effect nudge: a small checklist of setup milestones that feels
 * incomplete until all items are done. Persists per-user in localStorage.
 * Dismissible for 30 days once completed.
 */
import { useMemo, useState } from 'react'
import { Check, X as XIcon, Circle } from 'lucide-react'
import type { Person } from '@/types'

interface OnboardingChecklistProps {
  userId: string
  persons: Person[]
  memoryCount: number
  collaboratorCount?: number
  onAddParent?: () => void
  onAddSibling?: () => void
  onAddMemory?: () => void
  onInvite?: () => void
  onOpenHomePerson?: () => void
}

interface Step {
  id: string
  label: string
  done: boolean
  action?: () => void
}

const DISMISS_KEY = (uid: string) => `onboarding.dismissedUntil.${uid}`

function isDismissed(userId: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY(userId))
    if (!raw) return false
    return new Date(raw).getTime() > Date.now()
  } catch { return false }
}
function dismissFor30Days(userId: string) {
  try {
    const until = new Date(); until.setDate(until.getDate() + 30)
    localStorage.setItem(DISMISS_KEY(userId), until.toISOString())
  } catch { /* noop */ }
}

export function OnboardingChecklist({
  userId, persons, memoryCount, collaboratorCount = 0,
  onAddParent, onAddSibling, onAddMemory, onInvite, onOpenHomePerson,
}: OnboardingChecklistProps) {
  const [hidden, setHidden] = useState<boolean>(() => isDismissed(userId))

  const home = persons.find(p => p.isHomePerson)
  const nonHome = persons.filter(p => !p.isHomePerson && !p.isDeleted)
  const hasAnyParent = nonHome.some(p => {
    const rel = (p as unknown as { relationship?: string }).relationship
    return rel === 'father' || rel === 'mother' || rel === 'parent'
  }) || persons.length >= 2 // pragmatic: any second person implies structure
  const hasSibling = (persons.length >= 3) // pragmatic heuristic
  const hasMemory = memoryCount > 0
  const hasCollaborator = collaboratorCount > 0

  const steps: Step[] = useMemo(() => [
    { id: 'tree', label: 'Create your tree', done: persons.length > 0 || !!home },
    { id: 'home', label: 'Add yourself', done: !!home, action: onOpenHomePerson },
    { id: 'parent', label: 'Add one parent', done: hasAnyParent, action: onAddParent },
    { id: 'sibling', label: 'Add one sibling', done: hasSibling, action: onAddSibling },
    { id: 'memory', label: 'Capture your first memory', done: hasMemory, action: onAddMemory },
    // { id: 'invite',   label: 'Invite one family member',  done: hasCollaborator, action: onInvite },
  ], [persons, home, hasAnyParent, hasSibling, hasMemory, hasCollaborator, onAddParent, onAddSibling, onAddMemory, onInvite, onOpenHomePerson])

  const doneCount = steps.filter(s => s.done).length
  const totalCount = steps.length
  const complete = doneCount === totalCount
  const pct = Math.round((doneCount / totalCount) * 100)

  if (hidden) return null
  if (complete && doneCount === totalCount) {
    // Auto-dismiss after a grace read of "All done!"
  }

  const handleDismiss = () => {
    dismissFor30Days(userId)
    setHidden(true)
  }

  return (
    <section
      aria-label="Getting started checklist"
      className="rounded-2xl bg-white dark:bg-[#141414] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] p-4 md:p-5"
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">
            {complete ? 'You\'re all set. Nicely done.' : 'Getting started'}
          </h3>
          {/* <p className="text-[12px] text-[#8B7355] dark:text-[#888] mt-0.5">
            {complete ? 'Close this card or keep it as a checklist.' : `${doneCount} of ${totalCount} steps complete`}
          </p> */}
        </div>
        {/* <button
          type="button"
          onClick={handleDismiss}
          aria-label="Hide the getting-started checklist"
          title="Hide for 30 days"
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#8B7355] dark:text-[#888] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        >
          <XIcon className="w-4 h-4" />
        </button> */}
      </header>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full bg-[#E2DBCE]/60 dark:bg-[#2a2a2a] overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full bg-[#2F3E8F] rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1" role="list">
        {steps.map(step => (
          <li key={step.id}>
            <button
              type="button"
              onClick={step.action}
              disabled={step.done || !step.action}
              className={`w-full flex items-center gap-2.5 text-left rounded-lg px-2.5 py-2 transition-colors disabled:cursor-default ${step.done
                ? 'text-[#8B7355]/80 dark:text-[#888]'
                : step.action
                  ? 'text-[#3D2E1F] dark:text-[#F3F2F1] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04]'
                  : 'text-[#3D2E1F] dark:text-[#F3F2F1]'
                }`}
            >
              {step.done ? (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6B8E5A] text-white shrink-0" aria-hidden="true">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
              ) : (
                <Circle className="w-5 h-5 shrink-0 text-[#B8A090]" strokeWidth={1.6} aria-hidden="true" />
              )}
              <span className={`text-[13px] ${step.done ? 'line-through' : 'font-medium'}`}>
                {step.label}
              </span>
              {!step.done && step.action && (
                <span className="ml-auto text-[11px] font-semibold text-[#2F3E8F] dark:text-[#8CA0FF]">
                  Start
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
