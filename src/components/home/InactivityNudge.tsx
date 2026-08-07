/**
 * InactivityNudge — Phase 3 / contextual in-app messages.
 *
 * Shows a gentle, dismissible nudge bar after the user has been idle on the
 * dashboard for `idleSeconds`. Rotates through a short list of "you could…"
 * prompts. Persists dismissal for 24 hours so the user isn't pestered.
 *
 * Designed to be lightweight and zero-backend — purely a client-side UX
 * affordance to surface "what could I do next?" when the user is paused.
 */
import { useEffect, useMemo, useState } from 'react'
import { Gem, X } from 'lucide-react'

interface InactivityNudgeProps {
  /** Seconds of idle before showing the nudge (default 60). */
  idleSeconds?: number
  /** Optional callbacks — when present, the nudge can offer them as actions. */
  onAddMemory?: () => void
  onInviteFamily?: () => void
  onOpenTree?: () => void
}

const DISMISS_KEY = 'fc_inactivity_nudge_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000  // 24 h

interface Prompt {
  id: string
  body: string
  ctaLabel: string
  cta: 'addMemory' | 'invite' | 'openTree'
}

const PROMPTS: Prompt[] = [
  { id: 'add-memory', body: 'Got a minute? One memory now is a story your grandkids will read.',         ctaLabel: 'Add a memory',  cta: 'addMemory' },
  { id: 'invite',     body: 'A tree is brighter with cousins. Invite one family member today.',           ctaLabel: 'Invite family',  cta: 'invite'    },
  { id: 'open-tree',  body: 'Open your tree — see what\'s changed since you last looked.',                ctaLabel: 'Open tree',     cta: 'openTree'  },
  { id: 'reflect',    body: 'Pick one elder. Write down one story you\'ve heard them tell. Just one.',    ctaLabel: 'Add a memory',  cta: 'addMemory' },
]

function isRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || '0')
    return Date.now() - at < DISMISS_TTL_MS
  } catch { return false }
}

export function InactivityNudge({
  idleSeconds = 60,
  onAddMemory,
  onInviteFamily,
  onOpenTree,
}: InactivityNudgeProps) {
  const [visible, setVisible] = useState(false)

  const prompt = useMemo(() => {
    // Rotate by date so the suggestion changes through the day, not per second.
    const slot = Math.floor(Date.now() / (4 * 60 * 60 * 1000)) // every 4h
    return PROMPTS[slot % PROMPTS.length]
  }, [])

  useEffect(() => {
    if (isRecentlyDismissed()) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const reset = () => {
      if (timer) clearTimeout(timer)
      if (visible) setVisible(false)
      timer = setTimeout(() => setVisible(true), idleSeconds * 1000)
    }
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    for (const e of events) document.addEventListener(e, reset, { passive: true })
    reset()
    return () => {
      if (timer) clearTimeout(timer)
      for (const e of events) document.removeEventListener(e, reset)
    }
  }, [idleSeconds, visible])

  if (!visible) return null

  const action =
    prompt.cta === 'addMemory' ? onAddMemory :
    prompt.cta === 'invite'    ? onInviteFamily :
    prompt.cta === 'openTree'  ? onOpenTree :
    undefined

  if (!action) return null  // Don't show a nudge whose action isn't wired.

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* noop */ }
    setVisible(false)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)] rounded-2xl bg-[#3D2E1F] dark:bg-[#1E1E1E] text-white px-4 py-3 shadow-2xl ring-1 ring-black/10 flex items-center gap-3 animate-fade-in-up"
    >
      <div className="w-8 h-8 rounded-full bg-[#C2A46D]/30 flex items-center justify-center shrink-0">
        <Gem className="w-4 h-4 text-[#FFD583]" strokeWidth={2.25} />
      </div>
      <p className="flex-1 min-w-0 text-[13px] leading-snug">{prompt.body}</p>
      <button
        onClick={() => { action(); dismiss() }}
        className="shrink-0 h-8 px-3 rounded-full bg-white text-[#2F3E8F] text-[12px] font-semibold hover:bg-stone-100"
      >
        {prompt.ctaLabel}
      </button>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-full hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  )
}
