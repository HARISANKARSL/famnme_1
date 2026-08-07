/**
 * TaskWalkthrough — A13 (interactive walkthrough that waits for real actions).
 *
 * Unlike the existing TutorialOverlay (which click-throughs explanatory cards),
 * this component watches for the user to *actually do* the task before advancing.
 * Steps are observed via DOM/state events rather than "Next" clicks.
 *
 *   const steps: WalkthroughStep[] = [
 *     { id: 'open-tree',  label: 'Open your family tree',
 *       isComplete: () => location.hash === '#tree' || /\/tree/.test(location.pathname) },
 *     { id: 'add-person', label: 'Add your first relative',
 *       isComplete: () => persons.length > 1 },
 *   ]
 *
 * Persists progress per (userId, walkthroughId) in localStorage so refreshes
 * pick up where the user was.
 */
import { useEffect, useState, useCallback } from 'react'
import { Check, Circle, X, Gem } from 'lucide-react'

export interface WalkthroughStep {
  id: string
  label: string
  hint?: string
  /** Polled ~ every 1.5 s; return true once the user has done the task. */
  isComplete: () => boolean
}

interface TaskWalkthroughProps {
  walkthroughId: string
  userId?: string
  steps: WalkthroughStep[]
  onComplete?: () => void
}

const POLL_MS = 1500
const STORAGE_KEY_PREFIX = 'fc_task_walkthrough'

function key(walkthroughId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${walkthroughId}_${userId}`
}

interface SavedState { completedIds: string[]; dismissedAt?: number }

function load(walkthroughId: string, userId: string): SavedState {
  try {
    const raw = localStorage.getItem(key(walkthroughId, userId))
    if (!raw) return { completedIds: [] }
    const parsed = JSON.parse(raw) as SavedState
    return parsed && typeof parsed === 'object' ? parsed : { completedIds: [] }
  } catch { return { completedIds: [] } }
}

function persist(walkthroughId: string, userId: string, state: SavedState) {
  try {
    localStorage.setItem(key(walkthroughId, userId), JSON.stringify(state))
  } catch { /* noop */ }
}

export function TaskWalkthrough({
  walkthroughId,
  userId = 'anon',
  steps,
  onComplete,
}: TaskWalkthroughProps) {
  const initial = load(walkthroughId, userId)
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(initial.completedIds))
  const [dismissed, setDismissed] = useState<boolean>(() => Boolean(initial.dismissedAt))

  // Poll completion predicates and advance state.
  useEffect(() => {
    if (dismissed) return
    if (completed.size >= steps.length) return
    const tick = () => {
      let changed = false
      const next = new Set(completed)
      for (const step of steps) {
        if (next.has(step.id)) continue
        try {
          if (step.isComplete()) { next.add(step.id); changed = true }
        } catch { /* predicate threw — skip silently */ }
      }
      if (changed) {
        setCompleted(next)
        persist(walkthroughId, userId, { completedIds: [...next] })
        if (next.size >= steps.length) onComplete?.()
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => clearInterval(id)
  }, [steps, completed, walkthroughId, userId, dismissed, onComplete])

  if (dismissed || completed.size >= steps.length) return null

  const dismiss = () => {
    setDismissed(true)
    persist(walkthroughId, userId, { completedIds: [...completed], dismissedAt: Date.now() })
  }

  // Identify the current step (first not-yet-complete).
  const currentStep = steps.find(s => !completed.has(s.id))

  return (
    <></>
    // <div
    //   role="status"
    //   aria-live="polite"
    //   className="fixed bottom-4 right-4 z-[55] w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] shadow-2xl overflow-hidden"
    // >
    //   <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] text-white">
    //     <Gem className="w-4 h-4 shrink-0" strokeWidth={2.25} />
    //     <p className="text-[13px] font-semibold flex-1">Quick start</p>
    //     <span className="text-[11px] text-white/80">{completed.size} of {steps.length}</span>
    //     <button
    //       onClick={dismiss}
    //       className="p-1 rounded-full hover:bg-white/15"
    //       aria-label="Dismiss walkthrough"
    //     >
    //       <X className="w-3.5 h-3.5" />
    //     </button>
    //   </div>

    //   <ul className="px-4 py-3 space-y-2">
    //     {steps.map(step => {
    //       const done = completed.has(step.id)
    //       const isCurrent = step.id === currentStep?.id
    //       return (
    //         <li
    //           key={step.id}
    //           className={`flex items-start gap-2 text-[12.5px] ${done ? 'opacity-60' : ''}`}
    //         >
    //           {done
    //             ? <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
    //             : <Circle className={`w-4 h-4 mt-0.5 shrink-0 ${isCurrent ? 'text-[#2F3E8F] animate-pulse' : 'text-stone-300'}`} strokeWidth={2} />
    //           }
    //           <div className="flex-1 min-w-0">
    //             <span className={done ? 'line-through text-stone-500' : 'text-[#3D2E1F] dark:text-[#F5F1E8] font-medium'}>
    //               {step.label}
    //             </span>
    //             {isCurrent && step.hint && (
    //               <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5">{step.hint}</p>
    //             )}
    //           </div>
    //         </li>
    //       )
    //     })}
    //   </ul>
    // </div>
  )
}
